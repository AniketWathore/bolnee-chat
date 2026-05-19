# Bolnee — In-Browser AI Chatbot Platform

AI chatbots that run 100% in the browser. No API keys, no server-side LLM calls, no data leaving the user's device.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [System Flow (End-to-End)](#system-flow-end-to-end)
- [Component Breakdown](#component-breakdown)
  - [Chatbot Widget (`chatbot-widget.js`)](#1-chatbot-widget-chatbot-widgetjs)
  - [Web Worker (`chat-worker.js`)](#2-web-worker-chat-workerjs)
  - [Intent Detector (`intent-detection.js`)](#3-intent-detector-intent-detectionjs)
  - [Backend (`server.ts`)](#4-backend-serverts)
  - [Dashboard (React)](#5-dashboard-react)
- [Two-Model AI Strategy](#two-model-ai-strategy)
  - [Classification Model (all-MiniLM-L6-v2)](#classification-model-all-minilm-l6-v2)
  - [Generation Model (Qwen2.5-0.5B-Instruct)](#generation-model-qwen25-05b-instruct)
- [Message Processing Pipeline](#message-processing-pipeline)
- [Intent Classification (Embedding-Based)](#intent-classification-embedding-based)
- [Knowledge Data Querying](#knowledge-data-querying)
- [Response Generation](#response-generation)
  - [Predefined Responses](#1-predefined-responses)
  - [Template Responses (Fallback)](#2-template-responses-fallback)
  - [NL Generation (Primary)](#3-nl-generation-primary)
- [Model Download & Caching](#model-download--caching)
- [13 Intent Labels](#13-intent-labels)
- [Pros & Cons](#pros--cons)
- [Configuration Reference](#configuration-reference)
- [File Reference](#file-reference)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (User Device)                      │
│                                                                   │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐   │
│  │  Chat Widget  │◄──►│   Web Worker     │    │ Intent        │   │
│  │ chatbot-      │    │  chat-worker.js  │    │ Detector      │   │
│  │ widget.js     │    │                  │    │ intent-       │   │
│  │               │    │  ┌────────────┐  │    │ detection.js  │   │
│  │  CLASSIFY ────┼───►│  │ all-MiniLM │  │    │               │   │
│  │               │    │  │ L6-v2      │  │    │ queryByIntent │   │
│  │  ◄────────────┼────│  │ (embedding) │  │    │ formatResponse│   │
│  │  CLASSIFY_    │    │  └────────────┘  │    │               │   │
│  │  RESULT       │    │                  │    └───────┬───────┘   │
│  │               │    │  ┌────────────┐  │            │           │
│  │  GENERATE ────┼───►│  │ Qwen2.5-   │  │            │           │
│  │               │    │  │ 0.5B-      │  │  ┌─────────▼────────┐ │
│  │  ◄────────────┼────│  │ Instruct   │  │  │  Knowledge Data  │ │
│  │  TOKEN / DONE │    │  │ (generation)│  │  │  (fetched from   │ │
│  └──────────────┘    │  └────────────┘  │  │   API at boot)    │ │
│                      └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                              ▲
         │ fetch knowledge, models      │ serve files, data
         ▼                              │
┌──────────────────────────────────────────────────────────────────┐
│                         Backend (Express)                         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Knowledge   │  │  Static      │  │  Model Proxy           │ │
│  │  API         │  │  Files       │  │  /models/* → HF Hub    │ │
│  │  /api/public │  │  / → dist/   │  │  (with disk cache)     │ │
│  │  /knowledge/ │  │  /chat-*.js  │  └────────────────────────┘ │
│  └──────┬───────┘  │  (via Vite)  │                              │
│         │          └──────────────┘                              │
│         ▼                                                        │
│  ┌──────────────┐                                                │
│  │  data/       │                                                │
│  │  *.json      │  (bot configs, knowledge)                      │
│  └──────────────┘                                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## System Flow (End-to-End)

### Boot Sequence

```
Visitor opens site
        │
        ▼
Widget script loads (chatbot-widget.js)
        │
        ├──► Creates Web Worker from chat-worker.js
        │        │
        │        ├──► Worker loads all-MiniLM-L6-v2 (feature-extraction)
        │        │        │
        │        │        ├──► Computes intent embeddings (13 labels)
        │        │        │
        │        │        └──► Sends STATUS → READY to widget
        │        │
        │        └──► Worker loads Qwen2.5-0.5B-Instruct (text-generation)
        │                 │
        │                 ├──► Sends GEN_READY on success
        │                 └──► Sends STATUS message on failure (non-fatal)
        │
        ├──► Fetches knowledge data from /api/public/knowledge/:id
        │        │
        │        └──► Creates BolneeIntentDetector instance
        │
        └──► Shows greeting message, enables input
```

### Message Processing Sequence

```
User types message
        │
        ▼
doSend() — disables input, adds user bubble
        │
        ▼
sendToWorker('CLASSIFY', { text })
        │
        ▼
Worker: classify(text)
  - Computes embedding for user message
  - Finds closest intent by cosine similarity
  - Returns CLASSIFY_RESULT { intent, confidence }
        │
        ▼
handleClassifyResult(intent, confidence)
        │
        ├── intent === GREETING  → hardcoded response
        ├── intent === THANKS    → hardcoded response
        ├── GENERAL/confidence < 25 → generic fallback message
        │
        └── knowledge intent →
                │
                ▼
          detector.queryByIntent(intent, text)
                │
                ▼
          ┌── genReady AND found data? ──► GENERATE with data → stream NL response
          │
          └── no → formatResponse(detection) → template response
```

---

## Component Breakdown

### 1. Chatbot Widget (`chatbot-widget.js`)

**Role**: Embeddable chat UI. Handles user interaction, worker communication, and response display.

**Key responsibilities**:
- Injects CSS + HTML into the page (chat bubble, window, input)
- Creates Web Worker (with blob fallback for cross-origin)
- Fetches knowledge data from API
- Sends CLASSIFY/GENERATE messages to worker
- Routes classification results through `handleClassifyResult`
- Streams TOKEN/DONE responses from generation model
- Falls back to `formatResponse()` when generation model unavailable

**Message types handled from worker**:

| Type | Action |
|---|---|
| `STATUS` | Shows download status in the progress bar |
| `DOWNLOAD_PROGRESS` | Updates download progress bar percentage |
| `READY` | Classification model loaded → enables input |
| `GEN_READY` | Generation model loaded → upgrades response quality |
| `CLASSIFY_RESULT` | Routes intent through `handleClassifyResult` |
| `TOKEN` | Appends token to streaming message element |
| `DONE` | Finalizes streaming, re-enables input |
| `ERROR` | Shows error message, re-enables input |

**Worker construction strategy**:
1. Try `new Worker(url, { type: 'module' })` directly
2. If cross-origin error → fetch script as text → `Blob` → `URL.createObjectURL` → create Worker

### 2. Web Worker (`chat-worker.js`)

**Role**: Isolated thread for AI model inference. Loads and runs two Transformers.js models.

**Three message handlers**:

| Message | Action |
|---|---|
| `LOAD_MODEL` | Calls `init()` — loads both models sequentially |
| `CLASSIFY` | Calls `classify()` — embedding + cosine similarity |
| `GENERATE` | Calls `generate()` — streams NL text response |

**Model loading order**:
1. classification model (`all-MiniLM-L6-v2`) — required, blocks until ready
2. generation model (`Qwen2.5-0.5B-Instruct`) — optional, failure is non-fatal

**Environment configuration**:
```js
env.allowRemoteModels = true;     // download from HF via proxy
env.useBrowserCache = true;       // browser HTTP cache
env.remoteURL = '/models/';       // local proxy for model files
env.onnx.numThreads = navigator.hardwareConcurrency ?? 2;
```

### 3. Intent Detector (`intent-detection.js`)

**Role**: Provides `BolneeIntentDetector` class for knowledge data querying and template response formatting.

**Key methods**:

| Method | Purpose |
|---|---|
| `.detect(text)` | Keyword-based intent detection (used standalone, replaced by embedding in current flow) |
| `.queryByIntent(intent, text)` | Given an embedding-classified intent + user text, queries knowledge data and returns detection result |
| `.formatResponse(detection)` | Formats detection result into a human-readable template string |
| `._query(intent, entities, tokens)` | Internal: queries knowledge JSON for the given intent |
| `._extractEntities(intent, tokens, cleaned)` | Internal: extracts product tokens and numbers from user message |
| `._matchFAQ(tokens)` | Internal: matches user tokens against FAQ question/answer text |
| `.buildModelPrompt(detection)` | Builds a structured prompt + data block for the generation model |

### 4. Backend (`server.ts`)

**Role**: Express server serving the dashboard, knowledge API, model proxy, and static files.

**Key routes**:

| Route | Auth | Purpose |
|---|---|---|
| `/api/public/knowledge/:chatbotId` | None | Serves knowledge JSON for widget |
| `/api/auth/register` | None | User registration |
| `/api/auth/login` | None | User login |
| `/api/chatbots` | JWT | CRUD chatbot configurations |
| `/api/knowledge` | JWT | Read/write knowledge data |
| `/models/*` | None | Proxies model files from HuggingFace Hub (with local disk cache + browser HTTP cache) |

### 5. Dashboard (React)

**Role**: Admin UI for creating/managing chatbots and their knowledge bases.

**Sections**:
- **Overview** — Stats, quick actions, view all chatbots
- **Chatbots** — List of created bots with Create/Remove
- **Knowledge Section** — Edit about, products, policies, contact, FAQs + "Code" tab with embed snippet
- **Login/Register** — Auth flow

---

## Two-Model AI Strategy

### Classification Model (all-MiniLM-L6-v2)

| Property | Value |
|---|---|
| **Model ID** | `Xenova/all-MiniLM-L6-v2` |
| **Pipeline** | `feature-extraction` |
| **Size** | ~80MB (quantized) |
| **Purpose** | Intent classification only |
| **Output** | 384-dimensional embedding vector |
| **Loading** | Synchronous (blocks before READY sent) |
| **Failure** | Fatal — chatbot cannot function without it |

**How it's used**:
1. On init, compute embeddings for all 13 intent descriptions
2. On each message, compute embedding for user text
3. Compare via cosine similarity against all intent embeddings
4. Return the best-matching intent + confidence score

### Generation Model (Qwen2.5-0.5B-Instruct)

| Property | Value |
|---|---|
| **Model ID** | `onnx-community/Qwen2.5-0.5B-Instruct` |
| **Pipeline** | `text-generation` |
| **Size** | ~250MB (int8 quantization) |
| **Purpose** | Natural language response generation |
| **Loading** | Asynchronous (non-blocking, failure non-fatal) |
| **Failure** | Non-fatal — chatbot falls back to template responses |

**How it's used**:
1. Only invoked when knowledge data is found AND model is ready
2. Receives a prompt with system instruction + fetched data
3. Streams tokens one-by-one via `TextStreamer`
4. Widget renders tokens into a streaming message bubble

---

## Message Processing Pipeline

### Step-by-step for a knowledge query

```
Input: "What is your return policy?"

1. Worker receives CLASSIFY { text: "What is your return policy?" }
2. Computes embedding, finds best intent: RETURN_POLICY (confidence: 74%)
3. Widget receives CLASSIFY_RESULT { intent: "RETURN_POLICY", confidence: 74 }

4. handleClassifyResult:
   a. Not GREETING/THANKS/GENERAL → proceed
   b. confidence >= 25 → proceed
   c. detector.queryByIntent("RETURN_POLICY", "What is your return policy?")

5. queryByIntent:
   a. Clean + tokenize user text
   b. Extract entities (product tokens, numbers)
   c. _query("RETURN_POLICY", entities, tokens)
      → Returns { intent: "RETURN_POLICY", found: true, data: { policy: "..." } }

6a. [If gen model ready + data found]:
    buildDataLines(detection) → "Return Policy:\nWe offer a 20-day..."
    Send GENERATE with prompt containing the data
    Model streams: "You can return items within 20 days of delivery..."
    Widget renders tokens as they arrive

6b. [If gen model NOT ready]:
    detector.formatResponse(detection)
    → "Return Policy:\nWe offer a 20-day easy return policy..."
    → Displayed immediately as a single message
```

---

## Intent Classification (Embedding-Based)

### How it works

1. **Pre-computation** (once at init): Each of the 13 intent descriptions is passed through the embedding model to produce a 384-dimensional vector. These are stored in `intentEmbeddings` map.

2. **Per-message classification**: The user's message is embedded with the same model, then cosine similarity is computed against each intent's pre-computed embedding.

3. **Winner-take-all**: The intent with the highest similarity score wins. Score is converted to 0-100 confidence percentage.

### Cosine Similarity

```python
cosine_similarity(a, b) = dot(a, b) / (sqrt(dot(a,a)) * sqrt(dot(b,b)))
```

Range: 0 to 1 (with normalized embeddings). 0 = no similarity, 1 = identical.

### Confidence Thresholds

| Threshold | Behavior |
|---|---|
| `>= 25` | Knowledge intent — query data and respond |
| `< 25` | Treated as GENERAL — show generic help message |
| Any for GREETING/THANKS | Always handled (checked before threshold) |

---

## Knowledge Data Querying

### Data Shape

```json
{
  "chatbotId": "bot_xxx",
  "about": "Store description",
  "products": [
    {
      "productId": "xxx",
      "name": "Product Name",
      "tags": ["tag1", "tag2"],
      "price": "999",
      "inStock": true
    }
  ],
  "hours": "Store hours string",
  "policyReturn": "Return policy string",
  "policyShipping": "Shipping policy string",
  "policyWarranty": "Warranty policy string",
  "contact": {
    "mobile": "phone",
    "email": "email",
    "address": "address",
    "website": "url"
  },
  "faqs": [
    { "question": "...", "answer": "..." }
  ]
}
```

### Query Mapping by Intent

| Intent | Knowledge Field | Data Shape Returned |
|---|---|---|
| `ABOUT` | `k.about` | `{ about: string }` |
| `RETURN_POLICY` | `k.policyReturn` | `{ policy: string }` |
| `SHIPPING` | `k.policyShipping` | `{ policy: string }` |
| `WARRANTY` | `k.policyWarranty` | `{ policy: string }` |
| `CONTACT` | `k.contact` | `{ contact: object }` |
| `HOURS` | `k.hours` | `{ hours: string }` |
| `FAQ` | `k.faqs` | FAQ object (best token match) |
| `BUDGET_FILTER` | `k.products` | Array (filtered by price ≤ entity.number, ranked by token overlap) |
| `PRICE` | `k.products` | Array (ranked by token overlap) |
| `STOCK` | `k.products` | Array (ranked by token overlap) |
| `PRODUCT_SEARCH` | `k.products` | Array (ranked by token overlap) |

### Product Ranking

Products are ranked by token overlap score: the number of tokens from the user's message (excluding intent trigger words) that appear in the product's name or tags. Higher overlap → higher rank.

---

## Response Generation

There are three tiers of responses, from fastest to most intelligent:

### 1. Predefined Responses

Used for: `GREETING`, `THANKS`, `GENERAL`

These are hardcoded strings in `chatbot-widget.js`. No model invocation, no data lookup. Fastest path.

**Examples**:
- "Hi there! How can I help you today?" (GREETING)
- "You're welcome! Let me know if there's anything else I can help with." (THANKS)
- "I'm a shopping assistant for this store..." (GENERAL / low confidence)

### 2. Template Responses (Fallback)

Used for: All knowledge intents when generation model is unavailable

These are formatted by `formatResponse()` in `intent-detection.js`. They use the queried data directly with preset sentence structures.

**Examples**:
- "Here are options within your budget of ₹10000:\n\n1. sparx runner — ₹1000 (In Stock) [running]\n\nWould you like more details on any of these?"
- "Return Policy:\nWe offer a 20-day easy return policy..."
- "You can reach us at:\n📞 9090909090\n✉️ support@shoemart.com"

### 3. NL Generation (Primary)

Used for: All knowledge intents when generation model is ready

When `genReady` is true and data is found, the widget builds a prompt with the fetched data and sends it to the generation model:

```
System: You are a friendly shopping assistant. Answer the customer using
        ONLY the data below. Be concise (1-3 sentences). Do not make up
        information.

User:   Customer question: what is your return policy

Data:
We offer a 20-day easy return policy. Items must be unused and in original
packaging. Refunds are processed within 5-7 business days after we receive
the returned item.
```

The model streams tokens back, which the widget renders in real-time.

---

## Model Download & Caching

### Download Path

1. Widget sends LOAD_MODEL to worker
2. Worker calls Transformers.js `pipeline()` with model ID
3. Transformers.js constructs URL: `<remoteURL>/<modelID>/resolve/main/<filename>`
4. With `env.remoteURL = location.origin + '/models/'`:
   - URL becomes `http://localhost:3000/models/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/onnx/model_int8.onnx`
5. Server's `/models/*` handler receives the request
6. Checks local disk cache at `models/<modelPath>`
   - Cache hit → serves from disk with `Cache-Control: public, max-age=2592000, immutable`
   - Cache miss → streams from HuggingFace Hub (`https://huggingface.co/<modelPath>/resolve/main`) while simultaneously writing to disk cache

### Caching Layers

| Layer | What's Cached | Duration |
|---|---|---|
| Server disk (`models/`) | Model ONNX files, config, tokenizer | Persistent (until deleted) |
| Browser HTTP cache | Model files | 30 days (immutable) |
| Browser IndexedDB | Transformers.js internal cache | Persistent |

### Models Downloaded

| Model | Files | Size |
|---|---|---|
| `Xenova/all-MiniLM-L6-v2` | config.json, tokenizer.json, model_quantized.onnx | ~80MB |
| `onnx-community/Qwen2.5-0.5B-Instruct` | config.json, tokenizer.json, generation_config.json, onnx/model_int8.onnx | ~250MB |

---

## 13 Intent Labels

| # | Intent | Description (for embedding) | Trigger Keywords |
|---|---|---|---|
| 1 | `PRODUCT_SEARCH` | user wants to find or search for specific products | show, find, recommend, looking for, got |
| 2 | `BUDGET_FILTER` | user wants products within a budget or under a price | under, budget, below, affordable, max (requires number) |
| 3 | `PRICE` | user asks about the price or cost of products | price, cost, how much, rate, charge |
| 4 | `STOCK` | user asks if a product is available or in stock | available, in stock, buy, purchase, get |
| 5 | `RETURN_POLICY` | user asks about return or refund policy | return, refund, exchange, cancel |
| 6 | `SHIPPING` | user asks about shipping or delivery | shipping, delivery, ship, courier, track |
| 7 | `WARRANTY` | user asks about warranty or guarantee | warranty, guarantee, repair, replacement |
| 8 | `ABOUT` | user asks about the company or what the store is about | about, who, describe, tell me about |
| 9 | `CONTACT` | user asks for contact information or phone number | contact, phone, email, address, call |
| 10 | `HOURS` | user asks about store hours or opening time | hours, open, close, timing, today |
| 11 | `FAQ` | user asks a common frequently asked question | (matched via token overlap with FAQ entries) |
| 12 | `GREETING` | user says hello hi or greets | hi, hello, hey, good morning |
| 13 | `THANKS` | user says thank you or expresses gratitude | thank, thanks, appreciate, grateful |

---

## Pros & Cons

### Pros

| Aspect | Benefit |
|---|---|
| **Privacy** | All AI runs on-device. No data sent to any server. |
| **Cost** | Zero ongoing LLM API costs. No per-message fees. |
| **Latency** | No network calls for inference. Response time depends only on device CPU. |
| **Offline-capable** | After initial model download, can operate without internet (models cached in browser). |
| **No API keys** | No third-party service registration needed. |
| **Two-model efficiency** | Small 80MB model handles intent classification; larger generation model only loads when needed. |
| **Graceful degradation** | If generation model fails to load, template responses still work. |
| **Streaming** | Generation model streams tokens for real-time response display. |
| **Customizable** | Intent descriptions can be tuned without retraining. Knowledge data is just JSON. |

### Cons

| Aspect | Limitation |
|---|---|
| **Model size** | ~330MB total download (80MB + 250MB) on first visit. |
| **Browser compatibility** | Requires Web Worker + WASM support. No IE11. |
| **Device performance** | Generation model (0.5B params) is slow on low-end mobile devices. |
| **Model accuracy** | Embedding-based intent classification ≈85-90% accurate. May confuse similar intents. |
| **No fine-tuning** | Intent classification uses zero-shot embedding similarity. No per-domain training. |
| **Knowledge scope** | Only answers from provided knowledge data. Cannot reason beyond it. |
| **WASM memory** | Large models may hit WASM memory limits (~2GB). Quantization helps but can cause operator compatibility issues. |
| **Template fallback** | When generation model unavailable, responses are robotic/structured. |
| **No conversation memory** | Each message classified independently. No multi-turn context. |

---

## Configuration Reference

### BotConfig (window.BotConfig)

Set before `chatbot-widget.js` loads:

```js
window.BotConfig = {
  botName:       'Bolnee',           // Display name in chat header
  accentColor:   '#6366f1',          // Primary UI color (hex)
  greeting:      'Hi! How can I...', // Initial bot message
  workerUrl:     '/chat-worker.js',  // Path to worker script
  knowledgeUrl:  '/api/public/...',  // Knowledge JSON endpoint
};
```

### Worker Environment (chat-worker.js)

| Setting | Value | Effect |
|---|---|---|
| `env.allowRemoteModels` | `true` | Allow fetching from HuggingFace Hub |
| `env.useBrowserCache` | `true` | Use browser HTTP CacheStorage |
| `env.cacheDir` | `'models/'` | IndexedDB cache root path |
| `env.remoteURL` | `location.origin + '/models/'` | Base URL for model file downloads |
| `env.onnx.numThreads` | `hardwareConcurrency ?? 2` | WASM thread count |

### Generation Parameters (chatbot-widget.js)

```js
config: {
  max_new_tokens:    100,              // Maximum response length
  temperature:       0.3,              // Lower = more deterministic
  do_sample:         true,             // Sampling vs greedy
  repetition_penalty: 1.05,            // Penalize repeated tokens
}
```

---

## File Reference

| File | Size | Purpose |
|---|---|---|
| `public/chatbot-widget.js` | ~440 lines | Embeddable chat UI and widget-worker bridge |
| `public/chat-worker.js` | ~163 lines | Web Worker: loads models, classifies intents, generates responses |
| `public/intent-detection.js` | ~1130 lines | Knowledge data querying, entity extraction, template formatting |
| `public/shoemart.html` | Demo page | Example store with embedded chatbot |
| `public/style.css` | Demo styles | Styling for shoemart demo page |
| `public/script.js` | Demo script | Product catalog, cart for shoemart demo |
| `server.ts` | ~338 lines | Express backend: API, auth, model proxy |
| `data/*.json` | Varies | Knowledge data files (one per chatbot) |

---

## Troubleshooting

### `GatherBlockQuantized not supported`

The ONNX WASM runtime doesn't support GPTQ-style 4-bit quantization. Use int8 quantization instead:
```js
dtype: 'int8'  // instead of dtype: 'q4'
```

### `std::bad_alloc`

The model is too large for WASM memory. Use a quantized variant (int8 or q8 instead of fp16).

### Worker cross-origin error

If the page is opened from `file://` protocol, module workers may fail due to CORS. The widget automatically falls back to fetch+blob approach.

### Model download fails

Check that:
1. The server's `/models/*` proxy is working
2. The model exists on HuggingFace Hub
3. Internet connectivity allows reaching HF Hub

### Classification accuracy is low

Tune the intent descriptions in `chat-worker.js:9-24`. More specific descriptions improve embedding similarity.

---

## References

| Resource | Link |
|---|---|
| **all-MiniLM-L6-v2** | https://huggingface.co/Xenova/all-MiniLM-L6-v2 |
| **Qwen2.5-0.5B-Instruct ONNX** | https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct |
| **Transformers.js** | https://huggingface.co/docs/transformers.js |
| **ONNX Runtime Web** | https://onnxruntime.ai/ |
| **Lucide Icons** | https://lucide.dev/ |
| **Tailwind CSS** | https://tailwindcss.com/ |
| **Vite** | https://vite.dev/ |
| **React** | https://react.dev/ |
| **Express** | https://expressjs.com/ |
