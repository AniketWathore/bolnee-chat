# Bolnee 🤖

## AI Chatbots — No API keys, no third-party LLM calls.

Bolnee lets you create, add knowledge, and embed AI chatbots on your website — all running **100% in the browser** using on-device AI. No external API, no server processing, no data leaving your users' devices.

---

## How It Works

### 1. Create a Bot
Give your chatbot a name. Bolnee sets up a dedicated knowledge base for it.

### 2. Add Knowledge
Add your business info — company description, product catalog, policies, FAQs, and contact details. This becomes the chatbot's brain.

### 3. Deploy It
Click **Save & Deploy**. Bolnee gives you a code snippet. Paste it into your website's HTML — done.

### 4. It Runs on Device
When a visitor opens your site, the chatbot loads a small AI model directly in their browser (via Transformers.js + ONNX). No server processing, no API calls, no latency. Everything stays private.

---

## What's Inside

| Layer | What it does |
|---|---|
| **Dashboard** (React) | Create & manage bots, edit knowledge base, get embed codes |
| **Backend** (Express) | Serves the app, stores bot data and knowledge as JSON files |
| **Widget** (`chatbot-widget.js`) | The embeddable chat bubble your visitors see |
| **AI Worker** (`chat-worker.js`) | Runs the Qwen2.5 model in the browser using Web Workers |
| **Intent Detection** (`intent-detection.js`) | Matches user questions to your products, policies, and contacts |
| **Model** (Qwen2.5-0.5B) | A small, fast language model that runs entirely on-device |

---

## Getting Started

### Prerequisites
- Node.js v18+
- npm

### Install & Run
```bash
cd bolnee
npm install
npm run dev
```

Opens at `http://localhost:3000`.

---

## Tech Stack
- **React 19** + **Vite** — Dashboard UI
- **Express** — API & data storage
- **Tailwind CSS** — Styling
- **Transformers.js** + **ONNX** — Browser-based AI
- **Qwen2.5-0.5B** — Language model

---

## How Intent Detection Works

When a user types a message, `intent-detection.js` tries to answer **without using the AI model at all**:

1. **Product matching** — Scans your product catalog and ranks items by how many words overlap with the user's question
2. **Contact matching** — Checks if the question matches any Contact with a confidence score above 20%
3. **Policy lookup** — Searches your company policies for relevant text

If intent detection finds a good match, it responds instantly — no model needed. If nothing matches confidently enough, it falls back to the AI model (`chat-worker.js`) to generate a response.

This makes the chatbot **fast and lightweight** — most common questions (pricing, hours, policies) are handled without loading the AI model at all.

---

## The Full Workflow

```
You create a bot → Add knowledge (products, policies, contacts)
        ↓
Get embed code → Paste into your website
        ↓
Visitor asks a question
        ↓
Intent Detection checks products, contacts and policies first
        ↓
    ┌── Match found? → Instant answer (no AI needed)
    └── No match? → AI model generates a reply in the browser
        ↓
Response appears in the chat widget
```

---

## References & Resources

| Resource | Link |
|---|---|
| **Qwen2.5-0.5B ONNX Model** | https://huggingface.co/onnx-community/Qwen2.5-0.5B-ONNX |
| **Transformers.js** | https://huggingface.co/docs/transformers.js |
| **ONNX Runtime Web** | https://onnxruntime.ai/ |
| **Hugging Face** | https://huggingface.co/ |
| **Lucide Icons** | https://lucide.dev/ |
| **Motion (Framer Motion)** | https://motion.dev/ |
| **Tailwind CSS** | https://tailwindcss.com/ |
| **Vite** | https://vite.dev/ |
| **React** | https://react.dev/ |

Everything runs inside the visitor's browser — the backend only serves the initial files and knowledge data. There's no ongoing server cost per message.
