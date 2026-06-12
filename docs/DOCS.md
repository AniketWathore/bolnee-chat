# Bolnee Chatbot Pipeline

## Overview

A **no-LLM-at-runtime** chatbot. All responses are pre-generated (via Nvidia NIM / Llama 3.1) into a JSON file. At runtime, the bot uses BM25 search + intent detection + fuzzy matching to pick the right response — no API calls, no latency, no cost.

```
Crawl ──► Generate Responses ──► Test ──► Deploy (no LLM)
```

---

## Step 1: Crawl a Website

```bash
python3 crawler.py
```

Scrapes the site and saves `data/{domain}_raw_data.json` with:
- `products` — product pages (title, price, content blocks)
- `pages` — info pages (about, contact, shipping, etc.)
- `categories` — category/collection pages

---

## Step 2: Generate Responses (LLM)

```bash
node crawler/llm-processor.js data/{domain}_raw_data.json data/{domain}_responses.json
```

Uses **Nvidia NIM** (Llama 3.1 8B) to generate a `responses.json` file containing:

| Section | What it has |
|---|---|
| `responses` | 13 intents × 3 variations (GREETING, ABOUT, PRICE, RETURN_POLICY, etc.) |
| `product_responses` | Per-product: `about_responses[3]`, `price_responses[3]`, `stock_responses[3]` |
| `faq_responses` | 15 FAQ question/answer groups, 3 variations each |

### Why two phases?
1. **Phase 1**: Generate intents + FAQs (uses 5 sample products as reference). Full 20K budget for pages.
2. **Phase 2**: Generate products in chunks of 10. Full 20K budget per chunk.

### If LLM output has bad JSON
The parser auto-recovers from common Llama mistakes:
- Trailing commas: `["text",]` → `["text"]`
- Nested arrays: `[["text"]]` → `["text"]`
- Mixed arrays: `[["a"], "b"]` → `["a", "b"]`

---

## Step 3: Test Locally

Open `test-bm25.html?domain={domain}` in a browser (served by your dev server).

### What happens on each query:

```
User: "show me bikes under $1000"
              │
              ▼
    1. Preprocess — clean whitespace, fix typos ("biles"→"bikes", "shoe"→"show")
              │
              ▼
    2. Context Memory — resolve pronouns ("it", "this"), detect follow-ups ("any other")
              │
              ▼
    3. BM25 Search — find top-matching document from corpus
              │
              ▼
    4. ResponseSelector — 4 strategies run in parallel:
       ├── Strategy 1 (BM25): use intent detection + response lookup
       ├── Strategy 2 (Fuzzy): Levenshtein + Jaccard match product names
       ├── Strategy 3 (Direct): intent keyword → canned response
       └── Strategy 4 (Utility): math, time, unit conversion
              │
              ▼
    5. Voting — pick the strategy with highest confidence score
              │
              ▼
    6. Naturalize — add opening phrase, occasional follow-up
              │
              ▼
    "Our most affordable bike is the MADSEN Electric Assist Kit
     at $1815, which is above your $1000 budget."
```

### Switching domains
- **URL param**: `?domain=truff`
- **Button**: Type domain in the box, click "Switch Domain"
- Loads `data/{domain}_corpus.json` + `data/{domain}_responses.json` (falls back from API)

---

## Architecture

### Files

| File | Purpose |
|---|---|
| `crawler/llm-processor.js` | Calls Nvidia NIM to generate responses JSON |
| `public/bm25.js` | BM25 search engine |
| `public/retrieval-engine.js` | Corpus loader + search with prioritization |
| `public/response-selector.js` | Multi-strategy voting response picker |
| `public/context-memory.js` | Pronoun resolution, follow-up detection, entity history |
| `public/comparisons.js` | Levenshtein distance, Jaccard similarity |
| `public/preprocessors.js` | Typo correction, whitespace/HTML cleanup |
| `public/filters.js` | Repetition prevention (tracks last 5 responses) |
| `public/test-bm25.html` | Test harness |
| `data/*_responses.json` | Pre-generated response data |
| `data/*_corpus.json` | BM25 document corpus |

### Intent Detection Order

Each query is checked against these patterns (first match wins):

1. **PRICE** — "price", "cost", "how much", "$", "budget"
2. **RETURN_POLICY** — "return", "refund", "exchange", "cancel"
3. **SHIPPING** — "ship", "delivery", "shipping"
4. **WARRANTY** — "warranty", "guarantee", "defect"
5. **HOURS** — "hours", "open", "close", "timing"
6. **CONTACT** — "contact", "email", "phone", "address"
7. **ABOUT** — "tell me about", "about the company", "who are you"
8. **PRODUCT_SEARCH** — "show", "list", "bike", "accessory", "under $X"
9. **GENERAL** (follow-up detection: "any other", "yes", "more")
10. **GENERAL** (fallback)

### Category-Aware Product Listing

When the query mentions:
- **"bike" / "bicycle" / "cargo"** → shows only bike models (Electric DK2, MADSEN Electric Assist Kit)
- **"accessory" / "part" / "replacement"** → shows only non-bike products
- **"under $X"** → filters by price within the relevant category
- Neither → shows all products

### Confidence Scoring

| Strategy | Typical confidence | When it wins |
|---|---|---|
| BM25 + specific intent | 0.78 | Direct price/policy queries with product match |
| Fuzzy product name | 0.95 | Exact product name match |
| Direct lookup | 0.45 | Simple intent keywords, no product needed |
| Utility (math/time) | 0.90–0.95 | "2+3", "what time is it", "5 inches to cm" |

### Response Text Rules

- Each response gets a random opening: "Sure thing! ", "Absolutely! ", "Great question — ", etc.
- Every 3rd turn, a follow-up is appended: "Let me know if you want more info!"
- Utility responses skip follow-up questions
- Repetition filter blocks the exact same response text within the last 5 turns

---

## Quick Start for a New Website

```bash
# 1. Crawl
python3 crawler.py
# → saves data/{domain}_raw_data.json

# 2. Generate responses
node crawler/llm-processor.js data/{domain}_raw_data.json data/{domain}_responses.json
# → saves data/{domain}_responses.json

# 3. Make sure data/{domain}_corpus.json exists
#    (generated separately by the backend pipeline)

# 4. Test
#    Open: http://localhost:3000/test-bm25.html?domain={domain}
#    Or type domain in the box and click "Switch Domain"
```
