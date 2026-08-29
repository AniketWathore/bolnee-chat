# Bolnee — RAG Chatbot Platform

Self-hosted, multi-tenant RAG chatbot: create a bot, add website/PDF knowledge, configure an OpenAI-compatible provider, and embed a snippet. No login required for self-hosted dashboard.

## Setup Guide

### 1. Requirements
- Node.js 18+
- Python 3.10+ (for website crawler, optional but recommended)
- `pip install aiohttp beautifulsoup4 lxml requests brotli` (+ `playwright` for JS-heavy sites)

### 2. Local quick start
```bash
cp .env.example .env
# edit .env — for simple self-hosted set:
# DISABLE_AUTH=true
# LLM_BASE_URL=https://openrouter.ai/api/v1
# LLM_API_KEY=sk-or-v1-... (optional global fallback, else set per-bot)

npm install
npm run lint    # tsc --noEmit
npm run build   # vite + esbuild → dist/
npm run dev     # http://localhost:3000 (auto-fallback to 3001 if busy)
```

SQLite is created at `data/bolnee.db` (git-ignored). Crawled sites are saved to `data/{chatbotId}_website.json` and chunked in SQLite.

### 3. Dashboard flow
1. **Create chatbot** — name + optional avatar/logo (PNG/JPG/WEBP ≤2 MB, preview)
2. **Add knowledge** — website URL (crawls same-origin via `crawler/crawler.py` + `crawler/run_crawler_for_bolnee.py`, respects `robots.txt`, stores in `/data`) and/or PDF/TXT/Markdown/DOCX/FAQ uploads. Shows status: `queued → crawling → parsing → indexing → indexed | empty | failed`.
3. **Provider / Model** — choose provider (OpenRouter, OpenAI, Groq, Together, Ollama, vLLM, LM Studio, Custom), Base URL auto-filled, enter API key, **Fetch models** to list provider models and pick one. Stored encrypted (`AES-256-GCM`), never in embed code.
4. **Processing** — polls source status
5. **Embed** — copy minimal snippet:
```html
<script>
  window.BotConfig = {
    botName: "Customer Bot",
    avatar: "",
    chatUrl: "https://your-domain/api/public/chat/BOT_ID",
    accentColor: "#111111",
    greeting: "Hi! How can I help?"
  };
</script>
<script src="https://your-domain/chatbot-widget.js" async></script>
```

### 4. Bot console (dashboard)
- **Overview** — live status, message/user counts, source counts, embed copy
- **Appearance** (after Overview, before Chats) — edit bot name, avatar (upload/preview), accent/background colour, theme (light/dark/auto), greeting. Live preview.
- **Chats** — all conversations with visitor IP, identifier, date/time, role, message, model. Refresh + download **CSV (Excel)** / **JSON** / **PDF** (print).
- **Knowledge** — lists already added sources (`locator`, `type`, `status`, error, date) with delete; **Add knowledge** opens the same link+file picker to append more.
- **Settings** — provider/model/baseUrl/apiKey, default message, fallback message, delete bot.

### 5. Hosting on Vercel / Cloudflare

Dashboard is fully API-driven (`/api/*` relative) and auto-configures origin.

**Vercel:**
- Set env `DISABLE_AUTH=true` (no login) and `JWT_SECRET` not required for simple mode
- `vercel.json` already has `rewrites: /api/:path* → /api` and `/(.*) → /index.html`, `outputDirectory: dist`
- `npm run build` then `vercel --prod`

**Cloudflare Pages / Workers:**
- `wrangler.toml` (`bucket = "./dist"`, `DISABLE_AUTH=true`)
- Build: `npm run build`
- Deploy: `wrangler pages deploy dist` or `npx wrangler deploy`

Chat endpoint `POST /api/public/chat/:chatbotId` streams SSE, handles OpenRouter/OpenAI-compatible/Ollama/vLLM, saves `messages` with `ip`, `userIdentifier`, `model`, `createdAt`.

### 6. File reference
- `server.ts` — Express + Vite dev, auth (or `DISABLE_AUTH` local), ingestion, RAG, SSE chat
- `server/db.ts` — SQLite (`better-sqlite3`) with `chatbots/sources/chunks/messages`
- `server/ingestion.ts` + `crawler/run_crawler_for_bolnee.py` — website crawl → `/data/{id}_website.json` → chunks
- `public/chatbot-widget.js` — embeddable widget (`BotConfig.chatUrl`)
- `src/components/` — `Overview`, `ChatbotDashboard`, `BotCreationWizard`, `KnowledgeSection`
- `vercel.json`, `wrangler.toml` — hosting rewrites

### 7. Troubleshooting
- Port `3000 in use → 3001` — embed uses `window.location.origin`, regenerate after restart or deploy to public URL (localhost embed won’t work on `https://` external site due to mixed-content/CORS)
- `getReader locked` — bumped `public/sw.js` to `v3` to skip caching `POST /api/public/chat`; hard-refresh to update
- Model `404` → pick a `:free` model via **Fetch models** (e.g., `inclusionai/ling-3.0-flash-fin:free`)
