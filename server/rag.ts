import fs from "fs-extra";
import path from "path";
import { listChunks } from "./db.ts";

export interface RetrievedChunk {
  text: string;
  title?: string;
  url?: string;
  score: number;
}

interface CorpusDocument {
  text?: string;
  meta?: {
    title?: string;
    url?: string;
  };
}

interface CorpusFile {
  documents?: CorpusDocument[];
}

function tokenize(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}\p{N}_]+/gu) || [];
}

const STOPWORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being","am","are","is",
  "what","who","whom","which","when","where","why","how","whose","whos",
  "is","are","was","do","does","did","can","could","would","should","will","shall",
  "i","you","we","they","he","she","it","me","him","her","us","them",
  "and","or","but","if","then","so","as","at","by","for","of","on","in","to","with","about","from","up","out","into","over","after",
  "this","that","these","those","there","here","my","your","our","its","isnt","arent","whats","whos"
]);

export async function retrieveFromCorpus(
  chatbotId: string,
  query: string,
  limit = 5,
): Promise<RetrievedChunk[]> {
  if (!/^bot_[a-zA-Z0-9-]+$/.test(chatbotId)) {
    throw new Error("Invalid chatbot ID");
  }

  const indexedChunks = listChunks(chatbotId);
  let documents: CorpusDocument[] = indexedChunks.map((chunk) => {
    const metadata = JSON.parse(chunk.metadata || "{}") as Record<string, unknown>;
    const title = (metadata.pageTitle as string) || (metadata.title as string) || (metadata.filename as string) || undefined;
    const url = (metadata.pageUrl as string) || (metadata.url as string) || (metadata.sourceUrl as string) || undefined;
    return { text: chunk.content, meta: { title, url } };
  });
  if (documents.length === 0) {
    const corpusPath = path.join(process.cwd(), "data", `${chatbotId}_corpus.json`);
    if (!(await fs.pathExists(corpusPath))) return [];
    const corpus = (await fs.readJson(corpusPath)) as CorpusFile;
    documents = (corpus.documents || []).filter((document) => document.text?.trim());
  }
  const rawQueryTerms = tokenize(query);
  if (rawQueryTerms.length === 0) return [];
  // Filter stopwords for better relevance (e.g. "what is price" -> "price"), keep original if all filtered
  const filtered = rawQueryTerms.filter((t) => !STOPWORDS.has(t));
  const queryTerms = filtered.length > 0 ? filtered : rawQueryTerms;

  const documentTerms = documents.map((document) => tokenize(document.text || ""));
  const averageLength = documentTerms.reduce((sum, terms) => sum + terms.length, 0) /
    Math.max(documentTerms.length, 1);
  const documentFrequency = new Map<string, number>();

  for (const terms of documentTerms) {
    for (const term of new Set(terms)) {
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    }
  }

  const scored = documents.map((document, index) => {
    const terms = documentTerms[index];
    const frequencies = new Map<string, number>();
    for (const term of terms) frequencies.set(term, (frequencies.get(term) || 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const frequency = frequencies.get(term) || 0;
      if (!frequency) continue;

      const idf = Math.log(
        (documents.length - (documentFrequency.get(term) || 0) + 0.5) /
          ((documentFrequency.get(term) || 0) + 0.5) + 1,
      );
      const denominator = frequency + 1.5 * (
        1 - 0.75 + 0.75 * (terms.length / Math.max(averageLength, 1))
      );
      score += idf * ((frequency * 2.5) / denominator);
    }

    return {
      text: document.text || "",
      title: document.meta?.title,
      url: document.meta?.url,
      score,
    };
  });

  return scored
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Math.min(limit, 10)));
}

export function buildGroundedPrompt(chunks: RetrievedChunk[]): string {
  return chunks.map((chunk, index) => {
    const source = [chunk.title, chunk.url].filter(Boolean).join(" - ");
    return `[Source ${index + 1}${source ? `: ${source}` : ""}]\n${chunk.text}`;
  }).join("\n\n");
}