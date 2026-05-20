/**
 * chatbot-widget.js — self-contained embeddable AI chatbot
 *
 * EMBED ON ANY WEBSITE:
 *   <script>
 *     window.BotConfig = {
 *       botName:      'Aria',
 *       accentColor:  '#6366f1',
 *       greeting:     'Hi! How can I help?',
 *       systemPrompt: 'You are a helpful assistant.',
 *       modelId:      'onnx-community/SmolLM2-135M-Instruct-ONNX',
 *     };
 *   </script>
 *   <script src="https://bolneedemovercel.vercel.app/chatbot-widget.js" async></script>
 */
(function () {
  'use strict';

  const cfg      = window.BotConfig || {};
  const ACCENT   = cfg.accentColor  || '#6366f1';
  const BOT_NAME = cfg.botName      || 'AI Assistant';
  const GREETING = cfg.greeting     || "Hi! I'm running entirely in your browser. How can I help?";
  const SYSTEM   = cfg.systemPrompt || 'You are a friendly, concise AI assistant.';
  const MODEL_ID = cfg.modelId      || 'onnx-community/SmolLM2-135M-Instruct-ONNX';
  const TF_URL   = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.0';

  /* ── Styles ── */
  document.head.insertAdjacentHTML('beforeend', `<style>
    #_cw*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,sans-serif}
    #_cw_b{position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:${ACCENT};border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px ${ACCENT}55;z-index:2147483647;transition:transform .2s,box-shadow .2s}
    #_cw_b:hover{transform:scale(1.08)}
    #_cw_b svg{width:24px;height:24px;fill:#fff;transition:transform .25s}
    #_cw_b.open svg{transform:rotate(45deg)}
    #_cw_w{position:fixed;bottom:92px;right:24px;width:360px;height:500px;background:#fff;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,.18);z-index:2147483646;opacity:0;pointer-events:none;transform:translateY(12px) scale(.97);transition:opacity .22s,transform .22s cubic-bezier(.34,1.56,.64,1)}
    #_cw_w.open{opacity:1;pointer-events:all;transform:none}
    #_cw_h{background:${ACCENT};padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}
    #_cw_av{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
    #_cw_hn{color:#fff;font-weight:600;font-size:14px}
    #_cw_hs{color:rgba(255,255,255,.7);font-size:11px;margin-top:1px}
    #_cw_dl{background:#f5f5fa;border-bottom:1px solid #eee;padding:8px 14px;font-size:12px;color:#555;display:none;align-items:center;gap:8px;flex-shrink:0}
    #_cw_dl.on{display:flex}
    #_cw_db{flex:1;height:4px;background:#ddd;border-radius:99px;overflow:hidden}
    #_cw_df{height:100%;background:${ACCENT};width:0%;transition:width .3s;border-radius:99px}
    #_cw_ms{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}
    #_cw_ms::-webkit-scrollbar{width:3px}
    #_cw_ms::-webkit-scrollbar-thumb{background:#ddd;border-radius:99px}
    ._m{display:flex;flex-direction:column;max-width:80%;animation:_pop .18s ease}
    @keyframes _pop{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
    ._m.b{align-self:flex-start}._m.u{align-self:flex-end}
    ._mb{padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.55;word-break:break-word}
    ._m.b ._mb{background:#f0f0f7;color:#111;border-bottom-left-radius:3px}
    ._m.u ._mb{background:${ACCENT};color:#fff;border-bottom-right-radius:3px}
    ._ml{font-size:10.5px;color:#aaa;margin-bottom:3px;font-weight:500}
    ._m.u ._ml{text-align:right}
    ._dots{display:inline-flex;gap:4px;padding:4px 0}
    ._dots span{width:6px;height:6px;border-radius:50%;background:#bbb;animation:_dt 1.1s infinite ease-in-out}
    ._dots span:nth-child(2){animation-delay:.18s}._dots span:nth-child(3){animation-delay:.36s}
    @keyframes _dt{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}
    #_cw_ia{display:flex;align-items:flex-end;gap:8px;padding:10px 12px;border-top:1px solid #f0f0f5;flex-shrink:0;background:#fff}
    #_cw_i{flex:1;border:1.5px solid #e0e0ea;border-radius:10px;padding:8px 12px;font-size:13.5px;resize:none;outline:none;max-height:90px;overflow-y:auto;line-height:1.45;background:#fafafd;color:#111;transition:border-color .2s;font-family:inherit}
    #_cw_i:focus{border-color:${ACCENT};background:#fff}
    #_cw_i:disabled{opacity:.45}
    #_cw_i::placeholder{color:#bbb}
    #_cw_s{width:36px;height:36px;border-radius:9px;background:${ACCENT};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s}
    #_cw_s:hover:not(:disabled){opacity:.85}
    #_cw_s:disabled{opacity:.35;cursor:default}
    #_cw_s svg{width:15px;height:15px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
    #_cw_ft{text-align:center;font-size:10px;color:#ccc;padding:0 0 8px;flex-shrink:0}
    @media(max-width:420px){#_cw_w{right:0;left:0;bottom:0;width:100%;height:72vh;border-radius:20px 20px 0 0}#_cw_b{bottom:16px;right:16px}}
  </style>`);

  /* ── HTML ── */
  document.body.insertAdjacentHTML('beforeend', `
    <div id="_cw">
      <button id="_cw_b" aria-label="Open chat">
        <svg viewBox="0 0 24 24"><path d="M12 3C6.48 3 2 6.92 2 11.8c0 2.2.87 4.2 2.32 5.74L3 21l4.13-1.59A10.97 10.97 0 0012 20.6c5.52 0 10-3.92 10-8.8C22 6.92 17.52 3 12 3z"/></svg>
      </button>
      <div id="_cw_w">
        <div id="_cw_h">
          <div id="_cw_av">🤖</div>
          <div><div id="_cw_hn">${BOT_NAME}</div><div id="_cw_hs">Runs in your browser · No server</div></div>
        </div>
        <div id="_cw_dl">
          <span id="_cw_dt">Downloading model…</span>
          <div id="_cw_db"><div id="_cw_df"></div></div>
          <span id="_cw_dp">0%</span>
        </div>
        <div id="_cw_ms"></div>
        <div id="_cw_ia">
          <textarea id="_cw_i" placeholder="Message…" rows="1" disabled></textarea>
          <button id="_cw_s" disabled>
            <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div id="_cw_ft">Powered by Transformers.js · 100% in-browser</div>
      </div>
    </div>`);

  /* ── Refs ── */
  const B  = id => document.getElementById(id);
  const bubble = B('_cw_b'), win = B('_cw_w');
  const dlBar  = B('_cw_dl'), dlText = B('_cw_dt'), dlFill = B('_cw_df'), dlPct = B('_cw_dp');
  const msgs   = B('_cw_ms'), inp = B('_cw_i'), send = B('_cw_s'), hstatus = B('_cw_hs');

  /* ── State ── */
  let worker = null, isOpen = false, ready = false, generating = false;
  let history = [{ role: 'system', content: SYSTEM }];
  let streamEl = null;

  /* ── Toggle ── */
  bubble.addEventListener('click', () => {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    bubble.classList.toggle('open', isOpen);
    if (isOpen && !worker) boot();
    if (isOpen && ready) inp.focus();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) bubble.click(); });

  /* ────────────────────────────────────────────────────────────────────────
     WORKER CODE — classic worker using dynamic import()
     • Classic worker (no type:'module') = works in ALL browsers
     • Dynamic import() inside classic worker = supported since Chrome80/FF89
     • numThreads:1 = disables WASM sub-worker spawning (the root cause of
       the SecurityError when running inside a blob worker context)
  ──────────────────────────────────────────────────────────────────────── */
  const WORKER_SRC = `
let tf = null;
let pipe = null;

// Load Transformers.js via dynamic import (works in classic workers)
const tfReady = import('${TF_URL}').then(m => { tf = m; });

self.onmessage = async ({ data }) => {
  await tfReady; // wait for transformers.js before doing anything
  if (data.type === 'LOAD') await load(data.modelId);
  if (data.type === 'GEN')  await gen(data.messages, data.config);
};

async function load(modelId) {
  self.postMessage({ type: 'STATUS', text: 'Downloading model...' });
  try {
    tf.env.allowRemoteModels = true;
    tf.env.useBrowserCache   = true;

    // CRITICAL: disable multi-threading so Transformers.js does NOT try to
    // spawn sub-workers (which fail from a blob worker context)
    tf.env.backends.onnx.wasm.numThreads = 1;

    pipe = await tf.pipeline('text-generation', modelId, {
      device: 'wasm',
      dtype:  'q4',
      progress_callback(p) {
        if (p.status === 'progress' && p.total) {
          self.postMessage({ type: 'DL', pct: Math.round(p.loaded / p.total * 100) });
        }
      },
    });
    self.postMessage({ type: 'READY' });
  } catch(e) {
    self.postMessage({ type: 'ERR', msg: e.message });
  }
}

async function gen(messages, config) {
  if (!pipe) return self.postMessage({ type: 'ERR', msg: 'Model not loaded.' });
  try {
    const streamer = new tf.TextStreamer(pipe.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function(tok) { self.postMessage({ type: 'TOKEN', token: tok }); },
    });
    await pipe(messages, {
      max_new_tokens:     config.max_new_tokens || 200,
      temperature:        config.temperature    || 0.7,
      do_sample:          true,
      repetition_penalty: 1.1,
      streamer,
    });
    self.postMessage({ type: 'DONE' });
  } catch(e) {
    self.postMessage({ type: 'ERR', msg: e.message });
  }
}
`;

  /* ── Boot ── */
  function boot() {
    addMsg('bot', GREETING);
    const blob = new Blob([WORKER_SRC], { type: 'application/javascript' });
    const url  = URL.createObjectURL(blob);
    // Classic worker — NO { type:'module' }
    worker = new Worker(url);
    URL.revokeObjectURL(url);

    worker.onerror = e => {
      addErr('Engine error: ' + (e.message || 'check browser console for details'));
      console.error('[chatbot-widget] worker error:', e);
    };

    worker.onmessage = ({ data }) => {
      if (data.type === 'STATUS') {
        dlText.textContent = data.text;
        dlBar.classList.add('on');
      }
      if (data.type === 'DL') {
        dlFill.style.width = data.pct + '%';
        dlPct.textContent  = data.pct + '%';
        dlText.textContent = 'Downloading... ' + data.pct + '%';
      }
      if (data.type === 'READY') {
        ready = true;
        dlBar.classList.remove('on');
        hstatus.textContent = '● Online · In-browser AI';
        inp.disabled = false;
        send.disabled = false;
        inp.focus();
      }
      if (data.type === 'TOKEN') {
        if (!streamEl) { rmTyping(); streamEl = addMsg('bot', ''); }
        streamEl.querySelector('._mb').textContent += data.token;
        msgs.scrollTop = msgs.scrollHeight;
      }
      if (data.type === 'DONE') {
        generating = false;
        if (streamEl) {
          history.push({ role: 'assistant', content: streamEl.querySelector('._mb').textContent });
          streamEl = null;
        }
        rmTyping();
        inp.disabled = false; send.disabled = false; inp.focus();
      }
      if (data.type === 'ERR') {
        addErr(data.msg); generating = false; streamEl = null;
        rmTyping(); inp.disabled = false; send.disabled = false;
      }
    };

    worker.postMessage({ type: 'LOAD', modelId: MODEL_ID });
  }

  /* ── Send ── */
  function doSend() {
    const text = inp.value.trim();
    if (!text || !ready || generating) return;
    generating = true; inp.value = ''; resize();
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    addTyping();
    inp.disabled = true; send.disabled = true;
    worker.postMessage({ type: 'GEN', messages: history, config: { max_new_tokens: 200, temperature: 0.7 } });
  }
  send.addEventListener('click', doSend);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
  inp.addEventListener('input', resize);
  function resize() { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 90) + 'px'; }

  /* ── UI helpers ── */
  function addMsg(who, text) {
    const d = document.createElement('div');
    d.className = '_m ' + (who === 'bot' ? 'b' : 'u');
    d.innerHTML = `<div class="_ml">${who === 'bot' ? BOT_NAME : 'You'}</div><div class="_mb">${esc(text)}</div>`;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
  }
  function addTyping() {
    if (document.getElementById('_cwt')) return;
    const d = document.createElement('div');
    d.className = '_m b'; d.id = '_cwt';
    d.innerHTML = `<div class="_ml">${BOT_NAME}</div><div class="_mb"><div class="_dots"><span></span><span></span><span></span></div></div>`;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }
  function rmTyping() { const t = document.getElementById('_cwt'); if (t) t.remove(); }
  function addErr(msg) {
    const d = document.createElement('div'); d.className = '_m b';
    d.innerHTML = `<div class="_mb" style="background:#fee2e2;color:#991b1b;">⚠ ${esc(msg)}</div>`;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
