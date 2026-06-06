import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ── Provider chain ──────────────────────────────────────────────
const PROVIDERS = [
  {
    name: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct',
    headers: { 'HTTP-Referer': 'https://bolnee.ai', 'X-Title': 'Bolnee Data Processor' },
  },
  {
    name: 'nvidia',
    apiKey: process.env.NVIDIA_API_KEY,
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'nvidia/nemotron-3-nano-30b-a3b',
    headers: {},
  },
];

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

// ── Build prompt for responses.json generation ──────────────────
function buildSystemPrompt() {
  return `You are a response generation engine for an e-commerce chatbot. Your ONLY job is to produce a JSON file containing pre-written, natural-sounding responses.

RULES:
1. Output ONLY valid JSON — no markdown, no explanations.
2. For each response slot, generate EXACTLY 5 variations with PROGRESSIVE detail:
   - Variation 1: VERY SHORT (1 sentence, 5-10 words)
   - Variation 2: SHORT (1-2 sentences, brief summary)
   - Variation 3: MEDIUM (2-3 sentences, standard info)
   - Variation 4: LONG (3-4 sentences, detailed)
   - Variation 5: COMPREHENSIVE (full answer with examples or extra context)
3. Variations must use DIFFERENT sentence structures, wording, and tones.
4. Responses must sound like a helpful, friendly shopping assistant — natural and conversational.
5. Never fabricate information — only use what's in the provided data.
6. COVER EVERY SINGLE PRODUCT in the input data. No product should be skipped.
7. For product descriptions: extract the key product name from the URL slug and title. Summarize descriptions naturally.
8. For prices: include the actual price from the data (include currency symbol like $).
9. For policies: summarize key points in friendly language.
10. For CONTACT: use real phone/email/address from the crawled pages if available. If not found, say "Please visit our website for contact details".
11. If data for a section is missing, produce 5 variations politely saying info is unavailable.
12. The "product_responses" section MUST include an entry for EVERY product in the input.
13. CRITICAL — PRODUCT_SEARCH responses MUST reference actual product names from the data (e.g. Gold Cuban Choke Chain, Rose Gold Choke Chain, Silver Miami Cuban Clasp). Do not use generic descriptions.
14. CRITICAL — BUDGET_FILTER responses MUST reference actual product names with their price ranges.
15. PRICE responses for the generic price intent must mention the store's actual price range and product names.
16. Generate as many FAQ items as possible (minimum 10, aim for 15-20). Cover: shipping, returns, sizing, materials, payment, contact, warranty, customization, care instructions, bulk orders.
17. FAQ answers must also be progressively detailed (5 variations each, short to comprehensive).

Here is the exact output schema:

{
  "domain": "example.com",
  "generated_at": "ISO timestamp",
  "product_count": 0,
  "responses": {
    "GREETING": ["5 progressive greeting variations"],
    "THANKS": ["5 progressive thank you variations"],
    "GENERAL": ["5 progressive fallback variations"],
    "ABOUT": ["5 progressive store description variations — mention actual products"],
    "RETURN_POLICY": ["5 progressive return policy variations"],
    "SHIPPING": ["5 progressive shipping info variations"],
    "WARRANTY": ["5 progressive warranty info variations"],
    "CONTACT": ["5 progressive contact info variations"],
    "HOURS": ["5 progressive hours variations"],
    "BUDGET_FILTER": ["5 progressive budget variations — reference actual product names and prices"],
    "PRODUCT_SEARCH": ["5 progressive search variations — MUST list actual product names from data"],
    "PRICE": ["5 progressive price variations — mention actual price range and product names"],
    "STOCK": ["5 progressive stock variations"]
  },
  "product_responses": {
    "product_slug_1": {
      "name": "Product Name",
      "url": "https://...",
      "price_range": "e.g. $38.99 - $47.99",
      "about_responses": ["5 progressive product description variations"],
      "price_responses": ["5 progressive pricing variations for this specific product"],
      "stock_responses": ["5 progressive stock variations for this product"]
    }
  },
  "faq_responses": [
    {
      "question": "FAQ question here?",
      "responses": ["5 progressive answer variations"]
    }
  ]
}`;
}

function buildUserPrompt(truncatedData) {
  return `Generate a complete responses.json file from this e-commerce crawl data.

Summary:
- Domain: ${truncatedData.domain}
- Products: ${Object.keys(truncatedData.products || {}).length}
- Pages: ${Object.keys(truncatedData.pages || {}).length}

IMPORTANT RULES:
1. product_responses MUST include EVERY product below — do not skip any.
2. PRODUCT_SEARCH responses MUST list actual product names from the data.
3. BUDGET_FILTER responses MUST reference actual products and prices.
4. Generate 10-20 FAQ items covering all common topics.
5. All response slots need exactly 5 variations (short → long).

Products:
${JSON.stringify(truncatedData.products, null, 2)}

Pages:
${JSON.stringify(truncatedData.pages, null, 2)}

Output ONLY valid JSON. No markdown. No explanations.`;

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
    max_tokens: 32000,
  };

  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
      ...provider.headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${provider.name} (${response.status}): ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${provider.name}: empty response`);
  const cleaned = content.replace(/```(?:json)?\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (parseErr) {
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const cut = Math.max(lastBrace, lastBracket) + 1;
    if (cut > 10) {
      const fixed = cleaned.slice(0, cut);
      try {
        return JSON.parse(fixed);
      } catch {}
    }
    throw new Error(`${provider.name}: ${parseErr.message}`);
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
  const truncated = truncateRawData(raw);

  const inSize = JSON.stringify(raw).length;
  const outSize = JSON.stringify(truncated).length;

  console.log(`\n🧠  Response Generator (OpenRouter → NVIDIA fallback)`);
  console.log(`   Input:  ${inputFile}`);
  console.log(`   Output: ${outputFile}\n`);
  console.log(`   • Products: ${Object.keys(truncated.products).length}`);
  console.log(`   • Pages:    ${Object.keys(truncated.pages).length}`);
  console.log(`   • Size:     ${(inSize / 1024).toFixed(0)} KB → ${(outSize / 1024).toFixed(0)} KB`);

  if (Object.keys(truncated.products).length === 0 && Object.keys(truncated.pages).length === 0) {
    console.error('\n⚠️  No valid data.');
    process.exit(1);
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(truncated);

  let lastError = null;
  for (const provider of PROVIDERS) {
    if (!provider.apiKey || provider.apiKey.includes('your-key-here') || provider.apiKey === '') {
      console.log(`   ⏭  ${provider.name}: no API key set`);
      continue;
    }
    console.log(`\n⏳  Generating responses via ${provider.name} (${provider.model})...`);
    try {
      const result = await callProvider(provider, systemPrompt, userPrompt);

      result.generated_at = new Date().toISOString();
      result.product_count = Object.keys(result.product_responses || {}).length;

      const outDir = path.dirname(outputFile);
      if (outDir) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

      console.log(`\n✅  Responses generated via ${provider.name}!`);
      console.log(`   Products with responses: ${result.product_count}`);
      console.log(`   Intents covered:         ${Object.keys(result.responses || {}).length}`);
      console.log(`   FAQs:                   ${(result.faq_responses || []).length}`);
      console.log(`   File:                   ${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB`);
      return;
    } catch (err) {
      lastError = err;
      console.log(`   ✗  ${err.message.slice(0, 120)}`);
    }
  }

  console.error(`\n❌  All providers failed. Last error: ${lastError?.message}`);
  process.exit(1);
}

main();
