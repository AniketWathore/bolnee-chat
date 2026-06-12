import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });

const PROVIDER = {
  name: 'nvidia',
  apiKey: process.env.NVIDIA_API_KEY,
  url: 'https://integrate.api.nvidia.com/v1/chat/completions',
  model: 'meta/llama-3.1-8b-instruct',
  headers: {},
};

const MAX_INPUT_CHARS = 20000;

// ── Truncation ──────────────────────────────────────────────────
function truncateRawData(raw) {
  const out = { domain: raw.domain, crawled_at: raw.crawled_at, products: {}, pages: {} };
  const entries = Object.keys(raw.products || {}).length + Object.keys(raw.pages || {}).length || 1;
  const budgetPerEntry = Math.floor((MAX_INPUT_CHARS * 0.7) / entries);

  function trimBlocks(blocks, max) {
    let used = 0;
    const kept = [];
    for (const b of blocks || []) {
      const t = (b.text || '').trim();
      if (!t) continue;
      if (used + t.length > max) {
        const rem = max - used;
        if (rem > 30) kept.push({ tag: b.tag, text: t.slice(0, rem) });
        break;
      }
      kept.push(b);
      used += t.length;
    }
    return kept;
  }

  for (const [slug, p] of Object.entries(raw.products || {})) {
    const title = (p.title || '').trim();
    if (/^404|not found/i.test(title) && !p.price) continue;
    out.products[slug] = { url: p.url, title: p.title, content: trimBlocks(p.content, budgetPerEntry) };
    if (p.price) out.products[slug].price = p.price;
  }

  for (const [slug, p] of Object.entries(raw.pages || {})) {
    const title = (p.title || '').trim();
    if (/^404|not found/i.test(title)) continue;
    out.pages[slug] = { url: p.url, title: p.title, content: trimBlocks(p.content, budgetPerEntry) };
  }
  return out;
}

// ── Split data into chunks ──────────────────────────────────────
function splitProducts(data, chunkSize = 10) {
  const slugs = Object.keys(data.products || {});
  if (slugs.length <= chunkSize) return [data];

  const chunks = [];
  for (let i = 0; i < slugs.length; i += chunkSize) {
    const chunk = { domain: data.domain, crawled_at: data.crawled_at, products: {}, pages: data.pages || {} };
    for (const slug of slugs.slice(i, i + chunkSize)) {
      chunk.products[slug] = data.products[slug];
    }
    chunks.push(chunk);
  }
  return chunks;
}

// ── Build prompt for responses.json generation ──────────────────
function buildSystemPrompt() {
  return `You write conversation scripts for a friendly bike shop chatbot. Each response must sound like a real person talking — warm, specific, and helpful. No robotic answers.

RULES:
1. Output valid JSON. No reasoning, no thinking, no explanations.
2. Each variation: 3-6 sentences, 40-80 words, detailed and conversational. Sound like a real store associate.
3. Vary openings and flow — never repeat the same pattern.
4. Never make up facts.
5. Use the provided pages data for store info (hours, contact, policies, about).
6. PRODUCT_SEARCH responses: list at least 5 real product names from the data. Don't be generic.
7. PRICE responses: mention actual price ranges, say "most of our bikes range from $X to $Y".
8. BUDGET_FILTER: use real product names with specific prices.

Here is the exact output schema:

{
  "domain": "example.com",
  "generated_at": "ISO timestamp",
  "product_count": 0,
  "responses": {
    "GREETING": ["First friendly greeting", "Second different greeting", "Third greeting with warm opening"],
    "THANKS": ["First thank you response", "Second thank you variation", "Third thank you response"],
    "GENERAL": ["First general help response", "Second general response", "Third general variation"],
    "ABOUT": ["First store description", "Second about us variation", "Third store description"],
    "RETURN_POLICY": ["First return policy explanation", "Second return policy variation", "Third return policy response"],
    "SHIPPING": ["First shipping info response", "Second shipping variation", "Third shipping info"],
    "WARRANTY": ["First warranty response", "Second warranty variation", "Third warranty explanation"],
    "CONTACT": ["First contact info response", "Second contact variation", "Third contact response"],
    "HOURS": ["First hours response", "Second hours variation", "Third hours info"],
    "BUDGET_FILTER": ["First budget response with prices", "Second budget variation", "Third budget response"],
    "PRODUCT_SEARCH": ["First product listing with actual names", "Second product search variation", "Third product listing"],
    "PRICE": ["First price response with actual prices", "Second price variation", "Third price info"],
    "STOCK": ["First stock response", "Second stock variation", "Third stock info"]
  },
  "product_responses": {
    "product_slug_1": {
      "name": "Product Name",
      "url": "https://...",
      "price_range": "e.g. $38.99 - $47.99",
      "about_responses": ["First conversational description of this product", "Second variation with different opening", "Third variation mentioning different features"],
      "price_responses": ["First pricing response mentioning price and value", "Second price response with different framing", "Third price response highlighting affordability"],
      "stock_responses": ["First stock response", "Second stock variation", "Third stock variation"]
    }
  },
  "faq_responses": [
    {
      "question": "FAQ question here?",
      "responses": ["3 detailed answer variations"]
    }
  ]}`;
}

function buildUserPrompt(truncatedData) {
  const productSummary = Object.entries(truncatedData.products || {})
    .map(([slug, p]) => `- ${p.title || slug}: ${p.price || 'price unknown'}`)
    .join('\n');

  return `Generate the "responses" and "faq_responses" sections of a responses.json file from this store crawl data.
Do NOT include product_responses — only responses and faq_responses.

Summary:
- Domain: ${truncatedData.domain}
- Pages: ${Object.keys(truncatedData.pages || {}).length}

Here are some product names and prices for reference (for PRODUCT_SEARCH and PRICE responses):
${productSummary || '(no product data available)'}

Pages data (use this for detailed store info, policies, hours, contact, shipping, returns, warranty):
${JSON.stringify(truncatedData.pages, null, 2)}

Generate exactly 15 FAQ items using actual details from the pages data (return windows, shipping times, payment options, warranty terms).
Output valid JSON following the schema in the system prompt. No markdown, no reasoning.`;
}

function buildProductPrompt(truncatedData) {
  return `Generate the "product_responses" object for a bike shop chatbot JSON.

CRITICAL: Output valid JSON with this structure. Each array must have exactly 3 separate string elements, comma-separated.

Structure for each product:
  "product_slug": {
    "name": "Product Name from data",
    "url": "URL from data",
    "price_range": "price from data",
    "about_responses": ["string 1", "string 2", "string 3"],
    "price_responses": ["string 1", "string 2", "string 3"],
    "stock_responses": ["string 1", "string 2", "string 3"]
  }

Each response string: 2-4 sentences, warm, use actual product names and prices from data.

Products:
${JSON.stringify(truncatedData.products, null, 2)}

Return: {"product_responses": { ... }} with one entry per product above. No markdown. No reasoning. Valid JSON only.`;
}

// ── API call ────────────────────────────────────────────────────
async function callProvider(provider, systemPrompt, userPrompt) {
  if (!provider.apiKey || provider.apiKey.includes('your-key-here')) {
    throw new Error(`${provider.name}: API key not set`);
  }

  const body = {
    model: provider.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 40000,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600000);

  let response;
  try {
    response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
        ...provider.headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error(`${provider.name}: request timed out after 600s`);
    }
    throw new Error(`${provider.name}: ${err.message} (${err.name})`);
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${provider.name} (${response.status}): ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content;
  if (!content) {
    content = data.choices?.[0]?.message?.reasoning || data.choices?.[0]?.message?.reasoning_content;
  }
  if (!content) throw new Error(`${provider.name}: empty response`);
  const cleaned = content.replace(/```(?:json)?\s*/g, '').trim();

  function recoverJSON(str) {
    // 1. Direct parse
    try { return JSON.parse(str); } catch {}

    // 2. Fix trailing commas before ] or }
    const noTrailing = str.replace(/,(\s*[\]}])/g, '$1');
    try { return JSON.parse(noTrailing); } catch {}

    // 3. Fix single quotes → double quotes (but not inside already-valid strings)
    const unquoted = str.replace(/'/g, '"');
    try { return JSON.parse(unquoted); } catch {}

    // 4. Flatten nested arrays [["text"]] → ["text"]
    const flat = str.replace(/\[(\[[^\[\]]+\])\]/g, '$1').replace(/,(\s*[\]}])/g, '$1');
    try { return JSON.parse(flat); } catch {}

    // 5. Mixed arrays: [["a"], "b"] → ["a", "b"]
    const mixed = str.replace(/\[\[([^\[\]]+)\]\],?\s*/g, '[$1,').replace(/,\s*\]/g, ']');
    try { return JSON.parse(mixed); } catch {}

    // 6. Slice from rightmost closing brace/bracket
    for (let i = str.length - 1; i >= 0; i--) {
      const ch = str[i];
      if (ch === '}' || ch === ']') {
        const slice = str.slice(0, i + 1).replace(/,(\s*[\]}])/g, '$1');
        try { return JSON.parse(slice); } catch {}
      }
    }

    throw new Error('Could not recover JSON after 6 attempts');
  }

  try {
    return recoverJSON(cleaned);
  } catch (recoverErr) {
    throw new Error(`${provider.name}: ${recoverErr.message}`);
  }
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  const inputFile = process.argv[2];
  const outputFile = process.argv[3];

  if (!inputFile || !outputFile) {
    console.error('Usage: node llm-processor.js <input-raw.json> <output-responses.json>');
    process.exit(1);
  }
  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

  // Truncate pages with full 20000-char budget (no products competing)
  const pagesOnly = { domain: raw.domain, crawled_at: raw.crawled_at, products: {}, pages: raw.pages || {} };
  const pagesTruncated = truncateRawData(pagesOnly);

  // Truncate products with full budget (no pages competing)
  const productsOnly = { domain: raw.domain, crawled_at: raw.crawled_at, products: raw.products || {}, pages: {} };
  const productsTruncated = truncateRawData(productsOnly);

  const chunks = splitProducts(productsTruncated, 10);

  const inSize = JSON.stringify(raw).length;

  console.log(`\n🧠  Response Generator`);
  console.log(`   Input:  ${inputFile}`);
  console.log(`   Output: ${outputFile}\n`);
  console.log(`   • Products: ${Object.keys(productsTruncated.products).length}`);
  console.log(`   • Pages:    ${Object.keys(pagesTruncated.pages).length}`);
  console.log(`   • Size:     ${(inSize / 1024).toFixed(0)} KB`);
  console.log(`   • Product chunks: ${chunks.length}\n`);

  if (Object.keys(productsTruncated.products).length === 0 && Object.keys(pagesTruncated.pages).length === 0) {
    console.error('\n⚠️  No valid data.');
    process.exit(1);
  }

  if (!PROVIDER.apiKey || PROVIDER.apiKey.includes('your-key-here')) {
    console.log(`\n❌  NVIDIA_API_KEY not set in .env`);
    process.exit(1);
  }

  const systemPrompt = buildSystemPrompt();
  let merged = null;

  // Phase 1: Generate intents + FAQs
  // Include product names/prices as text so PRODUCT_SEARCH/PRICE responses can reference real products
  const allProdSlugs = Object.keys(productsTruncated.products || {});
  const sampleProducts = {};
  for (let i = 0; i < Math.min(5, allProdSlugs.length); i++) {
    sampleProducts[allProdSlugs[i]] = productsTruncated.products[allProdSlugs[i]];
  }
  const intentData = { ...pagesTruncated, products: sampleProducts };
  const intentPrompt = buildUserPrompt(intentData);
  console.log(`\n⏳  Phase 1: Generating intents + FAQs (5 sample products for reference)...`);
  merged = await callProvider(PROVIDER, systemPrompt, intentPrompt);
  merged.product_responses = merged.product_responses || {};
  merged.faq_responses = merged.faq_responses || [];
  console.log(`   ✅  Intents: ${Object.keys(merged.responses || {}).length}, FAQs: ${(merged.faq_responses || []).length}`);

  // Phase 2: Generate products in chunks (full budget per product too)
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (Object.keys(chunk.products || {}).length === 0) continue;
    
    const productPrompt = buildProductPrompt(chunk);
    console.log(`\n⏳  Phase 2 / chunk ${i + 1}: ${Object.keys(chunk.products).length} products...`);
    
    const result = await callProvider(PROVIDER, systemPrompt, productPrompt);
    Object.assign(merged.product_responses, result.product_responses || {});
    console.log(`   ✅  Products in chunk: ${Object.keys(result.product_responses || {}).length}`);
  }

  // Flatten nested arrays (model sometimes wraps responses in extra arrays)
  function flattenNestedArrays(obj, keys) {
    for (const p of Object.values(obj || {})) {
      for (const key of keys) {
        if (Array.isArray(p[key]) && p[key].length > 0 && Array.isArray(p[key][0])) {
          p[key] = p[key].map(arr => Array.isArray(arr) ? arr[0] : arr).filter(Boolean);
        }
      }
    }
  }
  flattenNestedArrays(merged.product_responses, ['about_responses', 'price_responses', 'stock_responses']);
  // Also flatten top-level response arrays
  if (merged.responses) {
    for (const [k, arr] of Object.entries(merged.responses)) {
      if (Array.isArray(arr) && arr.length > 0 && Array.isArray(arr[0])) {
        merged.responses[k] = arr.map(v => Array.isArray(v) ? v[0] : v).filter(Boolean);
      }
    }
  }
  // Flatten FAQ response arrays
  for (const faq of (merged.faq_responses || [])) {
    if (Array.isArray(faq.responses) && faq.responses.length > 0 && Array.isArray(faq.responses[0])) {
      faq.responses = faq.responses.map(v => Array.isArray(v) ? v[0] : v).filter(Boolean);
    }
  }

  merged.generated_at = new Date().toISOString();
  merged.product_count = Object.keys(merged.product_responses || {}).length;

  const outDir = path.dirname(outputFile);
  if (outDir) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2));

  console.log(`\n✅  All chunks complete!`);
  console.log(`   Products with responses: ${merged.product_count}`);
  console.log(`   Intents covered:         ${Object.keys(merged.responses || {}).length}`);
  console.log(`   FAQs:                   ${(merged.faq_responses || []).length}`);
  console.log(`   File:                   ${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB`);
}

main();
