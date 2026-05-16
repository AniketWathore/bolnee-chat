/**
 * chatbot-widget.js  — self-contained, zero-dependency embeddable AI chatbot
 *
 * HOW TO EMBED ON ANY WEBSITE:
 * ─────────────────────────────
 *   <script>
 *     window.BotConfig = {
 *       botName:      'Aria',           // optional
 *       accentColor:  '#6366f1',        // optional
 *       greeting:     'Hi! How can I help?', // optional
 *       systemPrompt: 'You are a helpful assistant.', // optional
 *       modelId:      'onnx-community/SmolLM2-135M-Instruct-ONNX', // optional
 *     };
 *   </script>
 *   <script src="https://bolneedemovercel.vercel.app/chatbot-widget.js" async></script>
 */

(function () {
  'use strict';

  /* ── Config ────────────────────────────────────────────────────────────── */
  const cfg        = window.BotConfig || {};
  const ACCENT     = cfg.accentColor  || '#6366f1';
  const BOT_NAME   = cfg.botName      || 'AI Assistant';
  const GREETING   = cfg.greeting     || "Hi! I'm running entirely in your browser — no server needed. How can I help?";
  const SYSTEM     = cfg.systemPrompt || 'You are a friendly, concise AI assistant. Keep answers short and helpful.';
  const MODEL_ID   = cfg.modelId      || 'onnx-community/SmolLM2-135M-Instruct-ONNX';
  const TF_VERSION = '3.1.0';  // pinned — known working release

  /* ── Styles ─────────────────────────────────────────────────────────────── */
  const css = `
    #_cw * { box-sizing:border-box; margin:0; padding:0; font-family:system-ui,sans-serif; }

    #_cw_bubble {
      position:fixed; bottom:24px; right:24px; width:56px; height:56px;
      background:${ACCENT}; border-radius:50%; border:none; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 20px ${ACCENT}55; z-index:2147483647;
      transition:transform .2s, box-shadow .2s;
    }
    #_cw_bubble:hover { transform:scale(1.08); box-shadow:0 6px 28px ${ACCENT}88; }
    #_cw_bubble svg { width:24px; height:24px; fill:#fff; transition:transform .25s; }
    #_cw_bubble.open svg { transform:rotate(45deg); }

    #_cw_win {
      position:fixed; bottom:92px; right:24px; width:360px; height:500px;
      background:#fff; border-radius:18px; overflow:hidden; display:flex; flex-direction:column;
      box-shadow:0 16px 48px rgba(0,0,0,.18); z-index:2147483646;
      opacity:0; pointer-events:none; transform:translateY(12px) scale(.97);
      transition:opacity .22s, transform .22s cubic-bezier(.34,1.56,.64,1);
    }
    #_cw_win.open { opacity:1; pointer-events:all; transform:none; }

    #_cw_head {
      background:${ACCENT}; padding:14px 16px; display:flex; align-items:center; gap:10px; flex-shrink:0;
    }
    #_cw_avatar {
      width:34px; height:34px; border-radius:50%; background:rgba(255,255,255,.2);
      display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;
    }
    #_cw_hname { color:#fff; font-weight:600; font-size:14px; }
    #_cw_hstatus { color:rgba(255,255,255,.7); font-size:11px; margin-top:1px; }

    #_cw_dl {
      background:#f5f5fa; border-bottom:1px solid #eee; padding:8px 14px;
      font-size:12px; color:#555; display:none; align-items:center; gap:8px; flex-shrink:0;
    }
    #_cw_dl.on { display:flex; }
    #_cw_dlbar { flex:1; height:4px; background:#ddd; border-radius:99px; overflow:hidden; }
    #_cw_dlfill { height:100%; background:${ACCENT}; width:0%; transition:width .3s; border-radius:99px; }

    #_cw_msgs {
      flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column;
      gap:10px; scroll-behavior:smooth;
    }
    #_cw_msgs::-webkit-scrollbar { width:3px; }
    #_cw_msgs::-webkit-scrollbar-thumb { background:#ddd; border-radius:99px; }

    ._m { display:flex; flex-direction:column; max-width:80%; animation:_pop .18s ease; }
    @keyframes _pop { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
    ._m.b { align-self:flex-start; }
    ._m.u { align-self:flex-end; }
    ._mb { padding:9px 13px; border-radius:14px; font-size:13.5px; line-height:1.55; word-break:break-word; }
    ._m.b ._mb { background:#f0f0f7; color:#111; border-bottom-left-radius:3px; }
    ._m.u ._mb { background:${ACCENT}; color:#fff; border-bottom-right-radius:3px; }
    ._ml { font-size:10.5px; color:#aaa; margin-bottom:3px; font-weight:500; }
    ._m.u ._ml { text-align:right; }

    ._dots { display:inline-flex; gap:4px; padding:4px 0; }
    ._dots span { width:6px; height:6px; border-radius:50%; background:#bbb; animation:_dot 1.1s infinite ease-in-out; }
    ._dots span:nth-child(2){animation-delay:.18s} ._dots span:nth-child(3){animation-delay:.36s}
    @keyframes _dot { 0%,80%,100%{transform:scale(.6);opacity:.5} 40%{transform:scale(1);opacity:1} }

    #_cw_inp_wrap {
      display:flex; align-items:flex-end; gap:8px; padding:10px 12px;
      border-top:1px solid #f0f0f5; flex-shrink:0; background:#fff;
    }
    #_cw_inp {
      flex:1; border:1.5px solid #e0e0ea; border-radius:10px; padding:8px 12px;
      font-size:13.5px; resize:none; outline:none; max-height:90px; overflow-y:auto;
      line-height:1.45; background:#fafafd; color:#111; transition:border-color .2s;
      font-family:inherit;
    }
    #_cw_inp:focus { border-color:${ACCENT}; background:#fff; }
    #_cw_inp:disabled { opacity:.45; }
    #_cw_inp::placeholder { color:#bbb; }
    #_cw_send {
      width:36px; height:36px; border-radius:9px; background:${ACCENT}; border:none;
      cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;
      transition:opacity .2s;
    }
    #_cw_send:hover:not(:disabled) { opacity:.85; }
    #_cw_send:disabled { opacity:.35; cursor:default; }
    #_cw_send svg { width:15px; height:15px; fill:none; stroke:#fff; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; }

    #_cw_footer { text-align:center; font-size:10px; color:#ccc; padding:0 0 8px; flex-shrink:0; }

    @media(max-width:420px){
      #_cw_win{right:0;left:0;bottom:0;width:100%;height:72vh;border-radius:20px 20px 0 0;}
      #_cw_bubble{bottom:16px;right:16px;}
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ── HTML ───────────────────────────────────────────────────────────────── */
  const root = document.createElement('div');
  root.id = '_cw';
  root.innerHTML = `
    <button id="_cw_bubble" aria-label="Open chat">
      <svg viewBox="0 0 24 24"><path d="M12 3C6.48 3 2 6.92 2 11.8c0 2.2.87 4.2 2.32 5.74L3 21l4.13-1.59A10.97 10.97 0 0012 20.6c5.52 0 10-3.92 10-8.8C22 6.92 17.52 3 12 3z"/></svg>
    </button>
    <div id="_cw_win">
      <div id="_cw_head">
        <div id="_cw_avatar">🤖</div>
        <div>
          <div id="_cw_hname">${BOT_NAME}</div>
          <div id="_cw_hstatus">Runs in your browser · No server</div>
        </div>
      </div>
      <div id="_cw_dl">
        <span id="_cw_dltext">Downloading model…</span>
        <div id="_cw_dlbar"><div id="_cw_dlfill"></div></div>
        <span id="_cw_dlpct">0%</span>
      </div>
      <div id="_cw_msgs"></div>
      <div id="_cw_inp_wrap">
        <textarea id="_cw_inp" placeholder="Message…" rows="1" disabled></textarea>
        <button id="_cw_send" disabled>
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <div id="_cw_footer">Powered by Transformers.js · 100% in-browser</div>
    </div>`;
  document.body.appendChild(root);

  /* ── DOM refs ───────────────────────────────────────────────────────────── */
  const bubble  = document.getElementById('_cw_bubble');
  const win     = document.getElementById('_cw_win');
  const dlBar   = document.getElementById('_cw_dl');
  const dlText  = document.getElementById('_cw_dltext');
  const dlFill  = document.getElementById('_cw_dlfill');
  const dlPct   = document.getElementById('_cw_dlpct');
  const msgs    = document.getElementById('_cw_msgs');
  const inp     = document.getElementById('_cw_inp');
  const sendBtn = document.getElementById('_cw_send');

  /* ── State ──────────────────────────────────────────────────────────────── */
  let worker       = null;
  let isOpen       = false;
  let ready        = false;
  let generating   = false;
  let history      = [{ role: 'system', content: SYSTEM }];
  let streamingEl  = null;

  /* ── Bubble toggle ──────────────────────────────────────────────────────── */
  bubble.addEventListener('click', () => {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    bubble.classList.toggle('open', isOpen);
    if (isOpen && !worker) startWorker();
    if (isOpen && ready)   inp.focus();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) bubble.click(); });

  /* ── Inline worker code ─────────────────────────────────────────────────── */
  // The worker code lives HERE as a template literal, avoiding all
  // cross-origin Worker restrictions — no separate file fetch needed.
  const WORKER_CODE = `
import { pipeline, env, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TF_VERSION}';

env.allowRemoteModels = true;
env.useBrowserCache   = true;

let pipe = null;

self.addEventListener('message', async ({ data }) => {
  if (data.type === 'LOAD') await loadModel(data.modelId);
  if (data.type === 'GEN')  await generate(data.messages, data.config);
});

async function loadModel(modelId) {
  self.postMessage({ type: 'STATUS', text: 'Downloading model…' });
  try {
    pipe = await pipeline('text-generation', modelId, {
      device: 'wasm',
      dtype:  'q4',
      progress_callback(p) {
        if (p.status === 'progress' && p.total) {
          const pct = Math.round((p.loaded / p.total) * 100);
          self.postMessage({ type: 'DL', pct, file: p.file });
        }
      },
    });
    self.postMessage({ type: 'READY' });
  } catch (err) {
    self.postMessage({ type: 'ERR', msg: err.message });
  }
}

async function generate(messages, config) {
  if (!pipe) { self.postMessage({ type: 'ERR', msg: 'Model not loaded.' }); return; }
  try {
    const streamer = new TextStreamer(pipe.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function(token) {
        self.postMessage({ type: 'TOKEN', token });
      },
    });
    await pipe(messages, {
      max_new_tokens:     config.max_new_tokens || 200,
      temperature:        config.temperature    || 0.7,
      do_sample:          true,
      repetition_penalty: 1.1,
      streamer,
    });
    self.postMessage({ type: 'DONE' });
  } catch (err) {
    self.postMessage({ type: 'ERR', msg: err.message });
  }
}
`;

  /* ── Start worker ───────────────────────────────────────────────────────── */
  function startWorker() {
    addMsg('bot', GREETING);

    const blob    = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    worker        = new Worker(blobUrl, { type: 'module' });
    URL.revokeObjectURL(blobUrl);

    worker.onerror = e => {
      addErr('Engine failed to start. Your browser may not support WebAssembly modules. Error: ' + (e.message || 'unknown'));
      console.error('[chatbot]', e);
    };

    worker.onmessage = ({ data }) => {
      if (data.type === 'STATUS') {
        dlText.textContent = data.text;
        dlBar.classList.add('on');
      }
      if (data.type === 'DL') {
        dlFill.style.width  = data.pct + '%';
        dlPct.textContent   = data.pct + '%';
        dlText.textContent  = 'Downloading… ' + data.pct + '%';
      }
      if (data.type === 'READY') {
        ready = true;
        dlBar.classList.remove('on');
        document.getElementById('_cw_hstatus').textContent = '● Online · In-browser AI';
        document.getElementById('_cw_hstatus').style.color = 'rgba(255,255,255,.9)';
        inp.disabled    = false;
        sendBtn.disabled = false;
        inp.focus();
      }
      if (data.type === 'TOKEN') {
        if (!streamingEl) {
          removeTyping();
          streamingEl = addMsg('bot', '');
        }
        streamingEl.querySelector('._mb').textContent += data.token;
        msgs.scrollTop = msgs.scrollHeight;
      }
      if (data.type === 'DONE') {
        generating = false;
        if (streamingEl) {
          history.push({ role: 'assistant', content: streamingEl.querySelector('._mb').textContent });
          streamingEl = null;
        }
        removeTyping();
        inp.disabled     = false;
        sendBtn.disabled = false;
        inp.focus();
      }
      if (data.type === 'ERR') {
        addErr(data.msg);
        generating       = false;
        streamingEl      = null;
        inp.disabled     = false;
        sendBtn.disabled = false;
        removeTyping();
      }
    };

    worker.postMessage({ type: 'LOAD', modelId: MODEL_ID });
  }

  /* ── Send ───────────────────────────────────────────────────────────────── */
  function send() {
    const text = inp.value.trim();
    if (!text || !ready || generating) return;
    generating = true;
    inp.value  = '';
    resize();
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    addTyping();
    inp.disabled     = true;
    sendBtn.disabled = true;
    worker.postMessage({ type: 'GEN', messages: history, config: { max_new_tokens: 200, temperature: 0.7 } });
  }

  sendBtn.addEventListener('click', send);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  inp.addEventListener('input', resize);

  function resize() {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 90) + 'px';
  }

  /* ── UI helpers ─────────────────────────────────────────────────────────── */
  function addMsg(who, text) {
    const d = document.createElement('div');
    d.className = '_m ' + (who === 'bot' ? 'b' : 'u');
    d.innerHTML = `<div class="_ml">${who === 'bot' ? BOT_NAME : 'You'}</div><div class="_mb">${esc(text)}</div>`;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function addTyping() {
    if (document.getElementById('_cw_typing')) return;
    const d = document.createElement('div');
    d.className = '_m b'; d.id = '_cw_typing';
    d.innerHTML = `<div class="_ml">${BOT_NAME}</div><div class="_mb"><div class="_dots"><span></span><span></span><span></span></div></div>`;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function removeTyping() { const t = document.getElementById('_cw_typing'); if (t) t.remove(); }
  function addErr(msg) {
    const d = document.createElement('div');
    d.className = '_m b';
    d.innerHTML = `<div class="_mb" style="background:#fee2e2;color:#991b1b;">⚠ ${esc(msg)}</div>`;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

})();
