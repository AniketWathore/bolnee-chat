import crypto from "crypto";
import { PDFParse } from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import { replaceChunks, updateSource } from "./db.ts";
import fs from "fs-extra";
import path from "path";
import net from "net";
import { spawn } from "child_process";

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 180;
const CRAWL_LIMIT = 40;
const FETCH_TIMEOUT_MS = 12000;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end === text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

function htmlToText(html: string): string {
  return cleanText(html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'"));
}

function isPrivateIp(hostname: string): boolean {
  const h = hostname.toLowerCase().trim();
  if (h === "localhost" || h === "::1" || h === "0.0.0.0") return true;
  // Block decimal/hex/octal encodings like 2130706433 (=127.0.0.1), 0x7f.0.0.1, 0177.0.0.1
  if (/^\d+$/.test(h)) {
    const n = Number(h);
    if (!Number.isNaN(n) && n >= 0 && n <= 0xFFFFFFFF) {
      const ip = `${(n >>> 24) & 0xFF}.${(n >>> 16) & 0xFF}.${(n >>> 8) & 0xFF}.${n & 0xFF}`;
      return isPrivateIp(ip);
    }
  }
  if (/^0x[0-9a-f]+\.[0-9a-f.]+/i.test(h) || /^0[0-7]+\.[0-9.]+/.test(h)) return true;
  if (h.includes(":")) {
    const lower = h.toLowerCase();
    if (lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80") || lower.includes("127.0.0.1") || lower.includes("10.") || lower.includes("192.168.")) return true;
  }
  if (net.isIP(h)) {
    if (net.isIPv4(h)) {
      const parts = h.split(".").map(Number);
      if (parts[0] === 10) return true;
      if (parts[0] === 127) return true;
      if (parts[0] === 169 && parts[1] === 254) return true; // link-local + metadata
      if (parts[0] === 192 && parts[1] === 168) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 0) return true;
      if (h === "169.254.169.254") return true;
    }
    if (net.isIPv6(h)) {
      if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true;
    }
    return false;
  }
  // hostname containing private hints
  if (h.endsWith(".local") || h.endsWith(".internal") || h === "metadata.google.internal") return true;
  return false;
}

export function validateUrlForSSRF(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return "Only HTTP and HTTPS URLs are supported";
    if (isPrivateIp(parsed.hostname)) return "URL targets a private or internal address and is not allowed";
    if (parsed.hostname.includes("169.254.169.254")) return "URL targets a metadata service and is not allowed";
    // Block non-standard ports to reduce SSRF surface slightly
    return null;
  } catch {
    return "Invalid URL";
  }
}

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Use manual redirect so we can re-validate each redirect target for SSRF
    let currentUrl = url;
    for (let i = 0; i < 5; i++) {
      const res = await fetch(currentUrl, {
        headers: { "User-Agent": "BolneeBot/1.0 (+https://github.com/bolnee)" },
        signal: controller.signal,
        redirect: "manual",
      } as RequestInit);
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return res;
        const nextUrl = new URL(loc, currentUrl).href;
        const err = validateUrlForSSRF(nextUrl);
        if (err) throw new Error(`Redirect blocked: ${err}`);
        currentUrl = nextUrl;
        continue;
      }
      return res;
    }
    throw new Error("Too many redirects");
  } finally {
    clearTimeout(timer);
  }
}

async function getRobotsDisallowed(origin: string): Promise<Set<string>> {
  const disallowed = new Set<string>();
  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`, 5000);
    if (!res.ok) return disallowed;
    const text = await res.text();
    let inWildcard = false;
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (/^User-agent:\s*\*/i.test(trimmed)) inWildcard = true;
      else if (/^User-agent:/i.test(trimmed)) inWildcard = false;
      else if (inWildcard) {
        const m = trimmed.match(/^Disallow:\s*(\S*)/i);
        if (m && m[1]) disallowed.add(m[1]);
      }
    }
  } catch { /* ignore robots failures */ }
  return disallowed;
}

function isRobotsDisallowed(pathname: string, disallowed: Set<string>): boolean {
  for (const rule of disallowed) {
    if (rule === "/") return true;
    if (pathname.startsWith(rule)) return true;
  }
  return false;
}

async function storeText(sourceId: string, chatbotId: string, text: string, metadata: Record<string, unknown>) {
  updateSource(sourceId, "indexing");
  const chunks = chunkText(cleanText(text));
  if (chunks.length === 0) {
    updateSource(sourceId, "empty");
    return;
  }
  replaceChunks(chatbotId, sourceId, chunks.map((content, index) => ({
    id: `${sourceId}_${index}_${uuidv4().slice(0, 8)}`,
    content,
    metadata: { ...metadata, chunk: index, chunkNumber: index },
  })));
  updateSource(sourceId, "indexed");
}

function chunksFromPythonOutput(data: Record<string, unknown>, sourceId: string, sourceUrl: string): Array<{ id: string; content: string; metadata: unknown }> {
  const allChunks: Array<{ id: string; content: string; metadata: unknown }> = [];
  const collections = [
    { dict: (data.products as Record<string, Record<string, unknown>>) || {}, type: "product" },
    { dict: (data.categories as Record<string, Record<string, unknown>>) || {}, type: "category" },
    { dict: (data.pages as Record<string, Record<string, unknown>>) || {}, type: "page" },
  ];
  for (const { dict, type } of collections) {
    for (const slug of Object.keys(dict)) {
      const entry = dict[slug] as { url?: string; title?: string; content?: Array<{ text: string; tag: string }>; price?: string };
      const url = entry.url || sourceUrl;
      const title = entry.title || slug;
      const contentItems: Array<{ text: string }> = entry.content || [];
      const price = entry.price ? ` Price: ${entry.price}` : "";
      const joined = cleanText([title + price, ...contentItems.map(c => c.text)].join("\n"));
      if (!joined || joined.length < 10) continue;
      const pageChunks = chunkText(joined);
      pageChunks.forEach((content, idx) => {
        allChunks.push({
          id: `${sourceId}_${slug}_${idx}_${uuidv4().slice(0, 8)}`,
          content,
          metadata: {
            sourceUrl,
            pageUrl: url,
            pageTitle: title,
            url,
            title,
            pageType: type,
            slug,
            chunk: idx,
            chunkNumber: idx,
            documentFilename: undefined,
          },
        });
      });
    }
  }
  // Also index contact_info / locations if present
  const contact = data.contact_info as Record<string, unknown> | undefined;
  if (contact) {
    const contactText = cleanText(JSON.stringify(contact));
    if (contactText.length > 20) {
      const cChunks = chunkText(contactText);
      cChunks.forEach((content, idx) => {
        allChunks.push({
          id: `${sourceId}_contact_${idx}_${uuidv4().slice(0, 8)}`,
          content,
          metadata: { sourceUrl, pageType: "contact", chunk: idx, chunkNumber: idx },
        });
      });
    }
  }
  return allChunks;
}

async function runPythonCrawler(url: string, chatbotId: string, outputPath: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const python = process.platform === "win32" ? "python" : "python3";
    const script = path.join(process.cwd(), "crawler", "run_crawler_for_bolnee.py");
    if (!fs.existsSync(script)) {
      console.warn("[crawler] runner script not found, fallback to Node");
      return resolve(false);
    }
    const args = ["--url", url, "--output", outputPath, "--chatbot-id", chatbotId, "--max-pages", String(CRAWL_LIMIT)];
    // Try without playwright if env suggests low memory; otherwise allow playwright
    console.log(`[crawler] Spawning ${python} ${script} ${args.join(" ")}`);
    const child = spawn(python, [script, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      console.warn("[crawler] Python crawler timed out after 120s");
    }, 120000);

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => {
      clearTimeout(timeout);
      console.warn("[crawler] spawn error, fallback to Node:", err.message);
      resolve(false);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (stdout) console.log(stdout.slice(-2000));
      if (stderr) console.warn(stderr.slice(-2000));
      if (timedOut) return resolve(false);
      if (code === 0 && fs.existsSync(outputPath)) {
        console.log(`[crawler] Python crawler succeeded, output exists`);
        return resolve(true);
      }
      console.warn(`[crawler] Python crawler failed code=${code}, fallback to Node`);
      return resolve(false);
    });
  });
}

async function ingestUrlNode(sourceId: string, chatbotId: string, url: string): Promise<void> {
  const parsed = new URL(url);
  const origin = parsed.origin;
  const disallowed = await getRobotsDisallowed(origin);
  const pending = [parsed.href];
  const visited = new Set<string>();
  const pages: Array<{ url: string; title: string; text: string }> = [];
  let totalBytes = 0;

  while (pending.length && visited.size < CRAWL_LIMIT) {
    const pageUrl = pending.shift()!;
    if (visited.has(pageUrl)) continue;
    visited.add(pageUrl);
    let urlObj: URL;
    try { urlObj = new URL(pageUrl); } catch { continue; }
    if (urlObj.origin !== origin) continue;
    if (isPrivateIp(urlObj.hostname)) continue;
    if (isRobotsDisallowed(urlObj.pathname, disallowed)) continue;

    let response: Response;
    try {
      response = await fetchWithTimeout(pageUrl);
    } catch {
      continue;
    }
    if (!response.ok) continue;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("html") && !contentType.includes("text")) continue;
    const body = await response.arrayBuffer();
    totalBytes += body.byteLength;
    if (totalBytes > MAX_SOURCE_BYTES) break;
    const html = new TextDecoder().decode(body);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || pageUrl;
    const text = htmlToText(html);
    if (text.length < 20) continue;
    pages.push({ url: pageUrl, title, text });
    for (const href of html.matchAll(/href=["']([^"']+)["']/gi)) {
      try {
        const next = new URL(href[1], pageUrl);
        if (next.origin === origin && ["http:", "https:"].includes(next.protocol)) {
          next.hash = "";
          const normalized = next.href;
          if (!visited.has(normalized) && !pending.includes(normalized)) {
            if (!isRobotsDisallowed(next.pathname, disallowed)) pending.push(normalized);
          }
        }
      } catch { /* Ignore malformed links. */ }
    }
  }

  if (pages.length === 0) {
    updateSource(sourceId, "empty", "No indexable content found");
    await fs.writeJson(path.join(process.cwd(), "data", `${chatbotId}_website.json`), {
      domain: origin,
      crawledAt: new Date().toISOString(),
      sourceUrl: url,
      pages: [],
    }, { spaces: 2 });
    return;
  }

  updateSource(sourceId, "parsing");
  await fs.writeJson(path.join(process.cwd(), "data", `${chatbotId}_website.json`), {
    domain: origin,
    sourceUrl: url,
    crawledAt: new Date().toISOString(),
    pages,
  }, { spaces: 2 });

  updateSource(sourceId, "indexing");
  const allChunks: Array<{ id: string; content: string; metadata: unknown }> = [];
  for (const page of pages) {
    const pageChunks = chunkText(cleanText(`${page.title}\n${page.text}`));
    pageChunks.forEach((content, idx) => {
      allChunks.push({
        id: `${sourceId}_${pages.indexOf(page)}_${idx}_${uuidv4().slice(0, 8)}`,
        content,
        metadata: {
          sourceUrl: url,
          pageUrl: page.url,
          pageTitle: page.title,
          url: page.url,
          title: page.title,
          chunk: idx,
          chunkNumber: idx,
        },
      });
    });
  }
  if (allChunks.length === 0) {
    updateSource(sourceId, "empty");
    return;
  }
  replaceChunks(chatbotId, sourceId, allChunks);
  updateSource(sourceId, "indexed");
}

export async function ingestUrl(sourceId: string, chatbotId: string, url: string): Promise<void> {
  const ssrfError = validateUrlForSSRF(url);
  if (ssrfError) {
    updateSource(sourceId, "failed", ssrfError);
    return;
  }
  try {
    updateSource(sourceId, "crawling");
    const outputPath = path.join(process.cwd(), "data", `${chatbotId}_website.json`);

    // Try Python crawler first (full sitemap + homepage + Playwright + filtered processing)
    const pythonSuccess = await runPythonCrawler(url, chatbotId, outputPath);
    if (pythonSuccess) {
      try {
        updateSource(sourceId, "parsing");
        const data = await fs.readJson(outputPath) as Record<string, unknown>;
        // Check if crawler produced valid counts
        const counts = data.counts as Record<string, number> | undefined;
        const totalPages = (counts?.pages || 0) + (counts?.products || 0) + (counts?.categories || 0);
        if (totalPages === 0 && !data.error) {
          // Fallback if python produced empty but no error - try Node
          console.warn("[ingestUrl] Python produced 0 pages, falling back to Node fetch");
          await ingestUrlNode(sourceId, chatbotId, url);
          return;
        }
        if (data.error) {
          updateSource(sourceId, "failed", String(data.error));
          return;
        }
        updateSource(sourceId, "indexing");
        const allChunks = chunksFromPythonOutput(data, sourceId, url);
        if (allChunks.length === 0) {
          updateSource(sourceId, "empty", "No indexable content after processing");
          return;
        }
        replaceChunks(chatbotId, sourceId, allChunks);
        updateSource(sourceId, "indexed");
        console.log(`[ingestUrl] Python crawler indexed ${allChunks.length} chunks for ${chatbotId}`);
        return;
      } catch (e) {
        console.warn("[ingestUrl] Failed to process Python output, falling back to Node:", e);
        // fallback below
      }
    }

    // Fallback to Node fetch crawler
    console.log("[ingestUrl] Using Node fallback crawler");
    await ingestUrlNode(sourceId, chatbotId, url);
  } catch (error) {
    updateSource(sourceId, "failed", error instanceof Error ? error.message : "Source ingestion failed");
  }
}

export async function ingestFile(sourceId: string, chatbotId: string, buffer: Buffer, filename: string, mimetype: string): Promise<void> {
  try {
    updateSource(sourceId, "parsing");
    if (buffer.byteLength > MAX_SOURCE_BYTES) throw new Error("File is larger than 15 MB");
    const isPdf = mimetype === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
    let text = "";
    let pageCount: number | undefined;
    if (isPdf) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text;
      // Try to infer pages if available (pdf-parse may expose totalPages)
      const anyResult = result as unknown as Record<string, unknown>;
      pageCount = typeof anyResult.total === "number" ? (anyResult.total as number) : undefined;
      if (!pageCount && typeof anyResult.numpages === "number") pageCount = anyResult.numpages as number;
      await parser.destroy();
    } else {
      text = buffer.toString("utf8");
    }
    if (text.length > 1_000_000) {
      console.warn(`[ingestFile] Truncating large file ${filename} from ${text.length} to 1M chars to prevent OOM`);
      text = text.slice(0, 1_000_000);
    }
    if (!cleanText(text)) {
      updateSource(sourceId, "empty", "File contains no extractable text");
      return;
    }
    // Include filename and page metadata
    await storeText(sourceId, chatbotId, text, {
      filename,
      mimetype,
      documentFilename: filename,
      pageCount,
      sourceUrl: filename,
    });
  } catch (error) {
    updateSource(sourceId, "failed", error instanceof Error ? error.message : "File ingestion failed");
  }
}

export function hashContent(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
