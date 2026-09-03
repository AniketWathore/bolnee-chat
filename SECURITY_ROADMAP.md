# Security Roadmap — Bolnee Chat

> Generated from the 2026-08-31 audit. Fixes are applied one-by-one, each tested with `npm run build` + manual smoke test before moving to the next. Do not change unrelated code in a step.

## How to use

- Each item has **Priority** (P0 = must fix before public deploy), **Status**, and **Test**.
- Mark an item `Done` only after `npm run build` passes and the manual test in *Test* succeeds.
- Keep `DISABLE_AUTH` and API-key isolation fixes already shipped (`36b0059`, `c6ff198`, `4f66836`) — they are listed as *Done* for reference.

---

### Done (already shipped)

| ID | Issue | Fix | Test |
|---|---|---|---|
| D1 | Per-bot API key fallback to env/other bots (`server.ts:319`) | Strict per-bot `apiKey/baseUrl/model`, `hasProvider` checks `apiKey` for cloud, PATCH validates per-bot | Chat without key now returns "An AI provider is not configured..." |
| D2 | Hardcoded StackCostAI system prompt (`server.ts:364`) | Generic `You are "${botName}" … use SOURCES` | `demo` with `kndrd` knowledge now answers as that site |
| D3 | Widget/Preview cache + live-sync (`public/chatbot-widget.js`, `server.ts:511`) | `no-cache` for avatar/widget-icon, `?v=` bust, live-sync polls 15s, `needsUpdate` checks all fields | Upload → Save → preview + embedded widget update without re-copying embed |

---

### P0 — Must fix before public Cloudflare/Vercel deploy

| ID | Severity | File:Lines | Issue | Fix | Test |
|---|---|---|---|---|---|
| P0-1 | Critical 9.1 | `server.ts:1014` `GET /models/*` | Path traversal LFI: `path.join(cwd,'models', modelPath)` where `modelPath` is `../../data/bolnee.db` → leaks DB, hashes, ciphertext | `safe = path.resolve(modelsDir, modelPath); if (!safe.startsWith(modelsDir+sep)) return 403;` + restrict HF fetch to allow-list; add test `GET /models/../../data/bolnee.db → 403` | `npm run build` + `curl /models/../../data/bolnee.db` = 403 |
| P0-2 | Critical 9.8 | `server.ts:45,181` `wrangler.toml:17` `.env:2` | `DISABLE_AUTH=true` hard-coded and default → anonymous full CRUD (`POST /api/chatbots`, `DELETE`, `GET /messages/export`) on deploy | Default `DISABLE_AUTH=false`; remove `[vars] DISABLE_AUTH=true` from `wrangler.toml`; add `WARN [auth] DISABLE_AUTH in production` and require `ALLOW_ANONYMOUS_WRITE=false`; use `wrangler secret put JWT_SECRET` | Deploy to Pages with no `DISABLE_AUTH` → `GET /api/chatbots` without token = 401 |
| P0-3 | High 8.0 | `public/chatbot-widget.js:143,209` `server.ts:POST/PATCH /api/chatbots` | Stored XSS via `avatar/widgetIcon/name`: `esc = src.replace(/"/g,'"')` no-op, `innerHTML` with `onerror`, server allows arbitrary string (`https://evil.com/" onerror="…`) → executes in victim origin; `name` raw in `BotConfig` | Widget: `createElement('img'); img.src=…; img.onerror=…` never `innerHTML`; server: validate `avatar/widgetIcon` allow-list (`https://`+`http://`+`data:image/`+`/api/...`, reject `" ' < >`), `name/greeting` regex `^[\p{L}\p{N} _-]{1,80}$` or `escapeHtml` | Inject `widgetIcon: 'https://x/" onerror="alert(1)'` → stored sanitized, widget shows no alert |
| P0-4 | High 8.0 | `vite.config.ts:11` | `define: {'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)}` bundles Gemini key into client `dist/assets/*.js` | Remove `define` or scope to server only (`server.ts` reads `process.env` directly) | `grep -r GEMINI dist/assets` = no hit |

---

### P1 — High, fix before handling untrusted uploads

| ID | Severity | File:Lines | Issue | Fix | Test |
|---|---|---|---|---|---|
| P1-1 | High 8.2 | `server/ingestion.ts:69,86,341` | SSRF: `isPrivateIp` only literal host, `net.isIP("2130706433")` false → `http://2130706433` (=127.0.0.1) passes; `redirect:follow` not re-validated; DNS rebinding | Resolve DNS `dns.lookup`, re-validate after each redirect (`redirect:manual`), block decimal/hex/octal `0x7f…` encodings, allow-list crawler origins | `http://2130706433`, `http://0x7f.0.0.1`, `http://[::ffff:127.0.0.1]`, redirect to `169.254…` → 400 |
| P1-2 | High | `server.ts:189` | JWT `jwt.verify(token, JWT_SECRET)` without `algorithms` pin, `7d` expiry, `localStorage` token + any XSS → steal | `jwt.verify(token, JWT_SECRET, {algorithms:["HS256"]})`, shorten to `1h` + refresh endpoint, `httpOnly` cookie option | `jwt.sign({alg:'none'})` → 401 |
| P1-3 | High | `server/db.ts:98` `server.ts:38` | Encryption key = `SHA256(JWT_SECRET)` no salt/KDF, low-entropy default `replace-with-…` exposes all stored keys; rotation breaks `decryptApiKey` → `""` | Separate `ENCRYPTION_KEY` via `HKDF`/`scrypt` with per-install salt, store via Vercel/Cloudflare secrets, envelope `kid:iv:tag:ct`, migration script | Rotate `JWT_SECRET` → old keys still decrypt |
| P1-4 | Medium | `server/db.ts:116` | Plaintext fallback `if (!stored.includes(":")) return stored` keeps old rows plaintext forever | Migration on read: if plaintext, re-encrypt and update row | Old row after read → ciphertext in DB |
| P1-5 | High | `server.ts:289` | `cors()` default `origin:*` + `allowedHeaders:*`, no `helmet` → missing `X-Content-Type-Options`, `X-Frame-Options`, `HSTS`, `CSP` | Add `helmet({contentSecurityPolicy:false})`, scoped `cors({origin: /bolnee|localhost/, credentials:false})` for `/api/*` but open for `/api/public/*` | `curl -I /api/chatbots` shows `X-Content-Type-Options: nosniff` |

---

### P2 — Medium, fix before opening to untrusted users

| ID | Severity | File | Issue | Fix | Test |
|---|---|---|---|---|---|
| P2-1 | Medium | `server.ts:293,278` | Rate-limit only `POST /api/public/chat` 60/min in-memory, `req.ip` without `trust proxy`, no limit on `login/register`, `knowledge/sources`, `providers/models`, `memoryStorage` 15 MB × concurrent → OOM | `express-rate-limit` + `trust proxy`, per-endpoint limits, per-bot `max 5 sources`, per-user `10 crawls/hour`, queue crawlers, `diskStorage` or streaming | `POST /api/auth/login` 6×/min → 429 |
| P2-2 | Medium | `server.ts:467,487` | `GET /api/public/knowledge|corpus/:id` unauthenticated, `public, max-age=3600` → scrape `BotConfig.chatUrl` → exfiltrate all PDFs | Make `private, no-store` or require signed token / `DISABLE_PUBLIC_KNOWLEDGE` flag | `curl` without token with `Cache-Control: private` |
| P2-3 | Medium | `server/ingestion.ts:395` `crawler.py:272` | PDF/text decompression bomb: 15 MB compressed → GB text, no cap | Cap `text.length` (e.g., 1 M chars) and chunk count per source | Upload 15 MB highly compressible PDF → truncated, no OOM |
| P2-4 | Medium | `public/chatbot-widget.js:76` `server.ts:76` | SVG `image/svg+xml` `onload` XSS when visiting `/api/public/widget-icon/...` directly | Disallow `svg+xml` or sanitize via `sanitizeSvg`, serve `image/svg+xml` only after sanitizing | Upload `svg onload` → served as `text/plain` or sanitized |
| P2-5 | Medium | `vercel.json` `wrangler.toml` | `better-sqlite3` needs FS + native bindings → `Workers/Pages` has no FS, ephemeral; `[site] bucket` legacy; `Vercel` `initData` race (`server.ts:1067`) | Use `[d1_databases]` + `nodejs_compat` or keep `dist/server.cjs` on VPS; fix `vercel.json` to set `DISABLE_AUTH=false` and require `JWT_SECRET` | `wrangler dev` with D1 → `SELECT` works, `fs.ensureDir` not called |
| P2-6 | Low | Various | Log injection (`server.ts:989`), provider error leak (`server.ts:409`), missing audit log, `localStorage` chat history cleartext | Sanitize `locator` in logs, truncate provider errors already, add `who/when` audit for `DELETE` | Check logs for newlines/ANSI |

---

### Execution order

1. **P0-1** → test LFI blocked
2. **P0-2** → test 401 without token
3. **P0-3** → test XSS sanitized + widget DOM APIs
4. **P0-4** → rebuild and verify no secret in `dist`
5. Then **P1-1 … P1-5** one by one, each with `npm run build` + manual smoke test
6. Finally **P2** items

*Do not combine unrelated fixes in one commit. Each step gets its own commit and push.*

