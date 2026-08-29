# Bolnee — Self-Hosted RAG Chatbot Platform

> Create a bot, add website/PDF knowledge, configure any OpenAI-compatible provider, and embed a 2-line snippet. No vendor lock-in. No login required for self-hosted.

<p>
  <img src="https://img.shields.io/badge/Node-18%2B-339933?style=flat&logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/DB-SQLite-003B57?style=flat&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat" alt="License" />
  <img src="https://img.shields.io/badge/Deploy-Vercel%20%7C%20Cloudflare-black?style=flat" alt="Deploy" />
</p>

![Bolnee Dashboard — Your Chatbots](images/main.png)

**Ground rules (Bolnee):**
- No vendor lock-in — any OpenAI-compatible provider (OpenRouter, OpenAI, Groq, Ollama, vLLM, LM Studio).
- RAG-first — grounded answers from your own website + PDFs, with sources cited.
- Self-hosted in minutes — `DISABLE_AUTH=true`, SQLite, no external DB.

---

## Status Board

| Area | Goal | Status |
|---|---|---|
| Dashboard | Dark-mode console, bot lifecycle | ✅ Done |
| Crawler | Same-origin crawl, robots.txt, `data/{id}_website.json` | ✅ Done |
| Ingestion | PDF/TXT/MD/DOCX/FAQ → chunk → SQLite FTS | ✅ Done |
| RAG Chat | `POST /api/public/chat/:id` SSE, grounded prompt, visitor grouping | ✅ Done |
| Widget | Greeting once, history in localStorage, theme (light/dark/auto), avatar | ✅ Done |
| Providers | OpenRouter/OpenAI/Groq/Together/Ollama/vLLM, `Fetch models`, AES-256-GCM keys | ✅ Done |
| Hosting | `vercel.json` / `wrangler.toml`, `dist` static | ✅ Done |

---

## Features

### 1. Create Chatbots — Brand in Seconds
Name + avatar (PNG/JPG/WEBP ≤2MB, preview) → stored as `/api/public/avatar/:id`.

![Create Chatbot](images/create_chatbot.png)

### 2. Add Knowledge — Website + Files
URL-only, files-only, or both. Same-origin crawler (`crawler/crawler.py` + `crawler/run_crawler_for_bolnee.py`) respects `robots.txt`, extracts `h1/h2/p/li`, dedups, saves `data/{chatbotId}_website.json`. PDFs/TXT/MD/DOCX/CSV/FAQ chunked to SQLite. Status polled: `queued → crawling → parsing → indexing → indexed`.

![Add Knowledge](images/add_knowledge.png)

### 3. Configure Provider — Any OpenAI-Compatible API
Pick provider → Base URL auto-fills → paste API key → **Fetch models** lists live models (prioritizes `:free` for OpenRouter). Stored encrypted (AES-256-GCM), never in embed code. Works with OpenRouter, OpenAI, Groq, Together, Anthropic, Ollama (`http://localhost:11434/v1`), vLLM, LM Studio, Custom.

![Configure Provider](images/configure_provider.png)

### 4. Embed — 2 Lines
Copy from **Overview → Embed code** or **Knowledge → Step 4**. Auto-configures origin, works on any site.

![Embed Code](images/embed_code.png)

### 5. Bot Console — Your Chatbots
Live status, messages, users, sources, creation date — at a glance. Dark-mode only, border `slate-800`.

![Main Console](images/main.png)

### 6. Appearance — Live Preview
Bot name, avatar upload/preview, accent/background colour, theme `light/dark/auto`, greeting. Preview updates live; saved via `PATCH /api/chatbots/:id`.

![Appearance](images/chatbot_appearance.png)

### 7. Chats — Grouped by Visitor
Grouped by `visitorId` → `IP`, then by date, chronological. CSV (Excel) / JSON / PDF (print) export. Polls `/api/chatbots/:id/stats` every 5s (`activeSessions` = distinct visitors last 5m).

![Chats](images/chatbot_chats.png)

### 8. Knowledge Base — Manage Sources
Lists `locator · type · status · error · date` with delete. Append more via **Add knowledge**. Sources under `data/` + chunks in SQLite.

*(see `images/add_knowledge.png` flow)*

### 9. Settings — Provider, Prompts, Danger Zone
Provider/model/baseUrl/apiKey, default message (pre-first-turn), fallback message (no sources matched), delete bot + chats + sources + chunks.

![Settings](images/chatbot_settings.png)

### 10. Widget — Embed on Any Site
Fixed bottom-right bubble → sliding window (`360×520`, `75vh` mobile). Header with accent + avatar, typing dots, SSE streaming, sources cited, `VISITOR_ID` in `localStorage` for grouping, history in `localStorage` so greeting shows once and chats survive close/open.

![Widget](images/chatbot_widget.png)

### 11. Bot Overview — Embed + Stats
Per-bot: status `Live`, message/user counts, creation date, source count, embed snippet with `botName/avatar/chatUrl/accent/greeting/theme`.

![Bot Overview](images/chatbot_overview.png)

---

## Screenshots

| | | |
|---|---|---|
| ![Main](images/main.png) Main | ![Create](images/create_chatbot.png) Create | ![Knowledge](images/add_knowledge.png) Add Knowledge |
| ![Provider](images/configure_provider.png) Provider | ![Embed](images/embed_code.png) Embed | ![Overview](images/chatbot_overview.png) Bot Overview |
| ![Appearance](images/chatbot_appearance.png) Appearance | ![Chats](images/chatbot_chats.png) Chats | ![Settings](images/chatbot_settings.png) Settings |
| ![Widget](images/chatbot_widget.png) Widget | | |

---

## Quick Start

### Requirements
- Node.js 18+
- Python 3.10+ (crawler, optional but recommended)
- `pip install aiohttp beautifulsoup4 lxml requests brotli` (+ `playwright` for JS-heavy sites)

### Installation

```bash
git clone https://github.com/AniketWathore/bolnee-chat.git
cd bolnee-chat

cp .env.example .env
# edit .env — simplest self-hosted:
# DISABLE_AUTH=true
# JWT_SECRET=change-me-32-chars
# LLM_BASE_URL=https://openrouter.ai/api/v1   # optional global fallback
# LLM_API_KEY=sk-or-v1-...                     # optional global fallback

npm install

# Python crawler deps (site crawl)
pip install aiohttp beautifulsoup4 lxml requests brotli

# verify
npm run lint    # tsc --noEmit
npm run build   # vite + esbuild → dist/
npm run dev     # http://localhost:3000 (auto-fallback to 3001 if busy)
```

SQLite is created at `data/bolnee.db` (git-ignored). Crawled sites → `data/{chatbotId}_website.json`, chunks in SQLite.

### Usage — Dashboard Flow

1. **Create chatbot** — `+ New chatbot` → name + avatar (preview ≤2MB).
2. **Add knowledge** — enter `https://your-site.com` and/or upload PDF/TXT/MD/DOCX/FAQ → status `queued → indexed`.
3. **Configure provider** — choose provider → `Fetch models` → pick model → Save. Keys encrypted, not in embed.
4. **Embed** — copy snippet from `Overview`:

```html
<script>
  window.BotConfig = {
    botName: "Customer Bot",
    avatar: "https://your-domain/api/public/avatar/BOT_ID",
    chatUrl: "https://your-domain/api/public/chat/BOT_ID",
    accentColor: "#111111",
    greeting: "Hi! How can I help?",
    theme: "dark"
  };
</script>
<script src="https://your-domain/chatbot-widget.js" async></script>
```

Paste before `</body>`. Widget stores `VISITOR_ID` + chat history in `localStorage`; greeting shows once.

---

## Bot Console Reference

| Tab | What it does |
|---|---|
| **Overview** | Live status, messages/users/sources, embed copy (`src/components/ChatbotDashboard.tsx:244`) |
| **Appearance** | `name/avatar/accent/theme/greeting` + live preview (`src/components/ChatbotDashboard.tsx:282`) |
| **Chats** | Grouped by visitor → date, `CSV/JSON/PDF`, `Refresh` (`src/components/ChatbotDashboard.tsx:371`) |
| **Knowledge** | Sources + `Add knowledge` wizard (`src/components/ChatbotDashboard.tsx:449`) |
| **Settings** | `provider/model/baseUrl/apiKey`, `defaultMessage/fallbackMessage`, `Danger zone` delete (`src/components/ChatbotDashboard.tsx:493`) |

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chatbots` | Create bot |
| `GET` | `/api/chatbots` | List bots |
| `PATCH` | `/api/chatbots/:id` | Appearance + provider (`name/avatar/accent/theme/greeting` + `provider/model/apiKey/baseUrl`) |
| `GET` | `/api/chatbots/:id/appearance` | Get appearance (`src/server.ts:728`) |
| `GET` | `/api/chatbots/:id/messages?limit=200` | Grouped messages |
| `GET` | `/api/chatbots/:id/stats` | `total/users` |
| `GET` | `/api/chatbots/:id/messages/export?format=csv\|json` | Export |
| `GET` | `/api/knowledge/sources?chatbotId=ID` | List sources |
| `POST` | `/api/knowledge/sources/:chatbotId` | Add URL (`{url}`) or file (`multipart`) → status `queued` |
| `DELETE` | `/api/knowledge/sources/:sourceId?chatbotId=ID` | Delete source + chunks |
| `POST` | `/api/public/chat/:chatbotId` | SSE chat `{message, visitorId}` → `data: {token\|error\|sources}` + `data: [DONE]` |
| `GET` | `/api/public/knowledge/:chatbotId` | Public knowledge (cached) |
| `GET` | `/api/public/avatar/:chatbotId` | Avatar file or redirect |
| `POST` | `/api/providers/models` | List models for `provider/baseUrl/apiKey` |
| `GET` | `/api/stats` | Global `totalMessages/activeSessions` |

Streaming details: `public/chatbot-widget.js:311` reads SSE via `getReader()`, falls back to `text()` + SW bypass for `locked` streams. Visitor grouping via `X-Visitor-Id` (`VISITOR_ID` in `localStorage`).

---

## File Reference

| Path | Role |
|---|---|
| `server.ts` | Express + Vite dev, auth (`DISABLE_AUTH`), ingestion, RAG, SSE chat (`src/server.ts:282`) |
| `server/db.ts` | SQLite (`better-sqlite3`) — `chatbots/sources/chunks/messages`, `getChatbotAppearance` |
| `server/ingestion.ts` + `crawler/run_crawler_for_bolnee.py` | Crawl → `/data/{id}_website.json` → chunks |
| `crawler/crawler.py` | Same-origin crawl, `robots.txt`, `h1/h2/p/li` extraction, sitemap + homepage |
| `public/chatbot-widget.js` | Embeddable widget — `BotConfig.chatUrl`, accent, greeting, theme, `VISITOR_ID`, history |
| `src/components/ChatbotDashboard.tsx` | Tabs: overview/appearance/chats/knowledge/settings, `embedCode` with `theme` |
| `src/components/KnowledgeSection.tsx` | 4-step wizard: Knowledge → Provider → Processing (polls status) → Embed |
| `src/components/Overview.tsx` | Stats + grid of 4 bots + `View all` |
| `src/components/BotCreationWizard.tsx` | Name + avatar upload (2MB limit) |
| `src/index.css` | Dark-mode design tokens (`--color-bg #020617`, `--color-card #1e293b`) |
| `vercel.json` / `wrangler.toml` | Hosting rewrites, `bucket = "./dist"`, `DISABLE_AUTH` |

---

## Hosting

Dashboard is fully API-driven (`/api/*` relative) and auto-configures `window.location.origin` for embed URLs.

**Vercel:**
```bash
# env
DISABLE_AUTH=true
# JWT_SECRET not required for simple mode

# vercel.json already: rewrites /api/:path* → /api, /(.*) → /index.html, outputDirectory: dist
npm run build && vercel --prod
```

**Cloudflare Pages / Workers:**
```bash
# wrangler.toml: bucket = "./dist", DISABLE_AUTH=true
npm run build
wrangler pages deploy dist
# or: npx wrangler deploy
```

Chat endpoint streams SSE; for external sites use public `https://` `chatUrl` (not `localhost`).

---

## Configuration

| Env | Description | Default |
|---|---|---|
| `DISABLE_AUTH` / `VITE_DISABLE_AUTH` | No-login console (single-tenant) | `false` |
| `JWT_SECRET` | Auth signing key (16+ chars, prod required) | `development-secret-change-me` |
| `LLM_BASE_URL` / `OPENROUTER_API_KEY` / `NVIDIA_API_KEY` | Global provider fallback (per-bot settings take precedence) | — |
| `LLM_API_KEY` | Global API key fallback | — |
| `LLM_MODEL` | Global model fallback (e.g. `openai/gpt-4o-mini`) | `gpt-4o-mini` |
| `PORT` | Server port (auto-fallback `+1` if busy) | `3000` |

`.env.example` documents all.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Port `3000 in use → 3001` and embed fails on external site | Embed uses `window.location.origin`; regenerate after restart or deploy to public URL (localhost embed is `https://` mixed-content) |
| `getReader locked` / `ReadableStream locked` | Bump `public/sw.js` to `v3` skips `POST /api/public/chat`; hard-refresh to update SW |
| Model `404` / `402` | Use **Fetch models** → pick `:free` (e.g. `inclusionai/ling-3.0-flash-fin:free`) or add credits |
| `404` knowledge/avatar | Ensure `data/bolnee.db` exists and bot `id` matches `data/{id}_website.json` |
| Avatar too large | PNG/JPG/WEBP ≤2MB; data URLs auto-converted to `/api/public/avatar/:id` |
| Greeting repeats on open/close | Fixed in `public/chatbot-widget.js:115` — `saveHistory/loadHistory` in `localStorage` + `engine=true` guard; clear `bolnee_msgs_*` to reset |

---

## Verification Checklist

```bash
npm run lint      # tsc --noEmit clean
npm run build     # vite + esbuild → dist/
npm run dev       # http://localhost:3000
# Manual:
# 1. Create bot → avatar preview → Save appearance → preview updates
# 2. Add knowledge: URL + PDF → status queued → indexed
# 3. Provider → Fetch models → pick :free → Save
# 4. Overview → Copy embed → paste in plain HTML → widget loads, greeting once, close/open keeps history, dark/light/auto themes correct
# 5. Chats → grouped by visitor → CSV/JSON/PDF export
# 6. Settings → default/fallback messages → Chat without sources returns fallback
```

---

## License

MIT — see `LICENSE` (if not present, treat as MIT). Contributions welcome. Self-host freely, no vendor lock-in.

## Credits

Built with Vite + React + Express + `better-sqlite3` + Tailwind. Crawler in Python (`aiohttp`, `beautifulsoup4`, `lxml`). RAG via grounded prompts with source citation.
