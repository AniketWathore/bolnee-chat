/**
 * chatbot-widget.js  (v2 — Hybrid Engine)
 * ─────────────────────────────────────────────────────────────────────────────
 * Embeddable chat widget. Paste these two tags into any website <body>:
 *
 *   <script>
 *     window.BotConfig = {
 *       // Required for low-end mobile fallback:
 *       groqApiKey:   'gsk_xxxxxxxxxxxxxxxxxxxx',   // free at console.groq.com
 *
 *       // Optional:
 *       modelId:      'onnx-community/SmolLM2-135M-Instruct-ONNX',
 *       groqModel:    'llama-3.1-8b-instant',       // or 'gemma2-9b-it' etc.
 *       botName:      'Aria',
 *       accentColor:  '#6366f1',
 *       greeting:     'Hi! How can I help?',
 *       systemPrompt: 'You are a helpful assistant.',
 *       workerUrl:    'https://cdn.yourdomain.com/chat-worker.js',
 *     };
 *   </script>
 *   <script src="https://cdn.yourdomain.com/chatbot-widget.js" async></script>
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ─── Read config ─────────────────────────────────────────────────────────
  const cfg = window.BotConfig || {};
  const ACCENT      = cfg.accentColor  || '#6366f1';
  const BOT_NAME    = cfg.botName      || 'AI Assistant';
  const GREETING    = cfg.greeting     || "Hello! I'm your in-browser AI assistant. How can I help?";
  const SYSTEM      = cfg.systemPrompt || 'You are a friendly, concise AI assistant.';
  const WORKER_URL  = cfg.workerUrl    || 'chat-worker.js';
  const MODEL_ID    = cfg.modelId      || 'onnx-community/SmolLM2-135M-Instruct-ONNX';
  const GROQ_KEY    = cfg.groqApiKey   || '';
  const GROQ_MODEL  = cfg.groqModel    || 'llama-3.1-8b-instant';

  // ─── Inject styles ───────────────────────────────────────────────────────
  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

    #_aicw_root * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', system-ui, sans-serif; }

    #_aicw_bubble {
      position: fixed; bottom: 24px; right: 24px;
      width: 58px; height: 58px; background: ${ACCENT};
      border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px ${ACCENT}66;
      z-index: 2147483647; border: none; outline: none;
      transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
    }
    #_aicw_bubble:hover { transform: scale(1.1); box-shadow: 0 6px 28px ${ACCENT}88; }
    #_aicw_bubble svg { width: 26px; height: 26px; fill: #fff; transition: transform .3s; }
    #_aicw_bubble.open svg { transform: rotate(45deg); }

    #_aicw_window {
      position: fixed; bottom: 96px; right: 24px;
      width: 360px; height: 520px;
      background: #fff; border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,.18);
      display: flex; flex-direction: column;
      z-index: 2147483646; overflow: hidden;
      opacity: 0; pointer-events: none;
      transform: translateY(16px) scale(.97);
      transition: opacity .25s ease, transform .25s cubic-bezier(.34,1.56,.64,1);
    }
    #_aicw_window.open { opacity: 1; pointer-events: all; transform: translateY(0) scale(1); }

    #_aicw_header {
      background: ${ACCENT}; padding: 14px 16px;
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    #_aicw_avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    #_aicw_header_info { flex: 1; min-width: 0; }
    #_aicw_header_name  { color:#fff; font-weight:600; font-size:15px; line-height:1.2; }
    #_aicw_header_status { color:rgba(255,255,255,.75); font-size:11px; margin-top:2px; display:flex; align-items:center; gap:5px; }

    /* Engine badge */
    #_aicw_engine_badge {
      font-size:10px; font-weight:600; padding:2px 7px; border-radius:99px;
      background:rgba(255,255,255,.2); color:#fff; letter-spacing:.03em;
      flex-shrink:0;
    }

    /* Progress bar */
    #_aicw_status_bar {
      background:#f8f8fc; padding:10px 16px; font-size:12px; color:#666;
      display:none; align-items:center; gap:10px;
      border-bottom:1px solid #eee; flex-shrink:0;
    }
    #_aicw_status_bar.visible { display:flex; }
    #_aicw_progress_wrap { flex:1; height:4px; background:#e5e5ef; border-radius:99px; overflow:hidden; }
    #_aicw_progress_bar  { height:100%; background:${ACCENT}; border-radius:99px; width:0%; transition:width .3s; }

    /* Messages */
    #_aicw_messages {
      flex:1; overflow-y:auto; padding:14px;
      display:flex; flex-direction:column; gap:10px; scroll-behavior:smooth;
    }
    #_aicw_messages::-webkit-scrollbar { width:4px; }
    #_aicw_messages::-webkit-scrollbar-thumb { background:#ddd; border-radius:99px; }

    ._aicw_msg { display:flex; flex-direction:column; max-width:84%; animation:_aicw_pop .2s ease; }
    @keyframes _aicw_pop { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    ._aicw_msg.bot  { align-self:flex-start; }
    ._aicw_msg.user { align-self:flex-end; }
    ._aicw_bubble_inner {
      padding:9px 13px; border-radius:16px; font-size:14px; line-height:1.55; word-break:break-word;
    }
    ._aicw_msg.bot  ._aicw_bubble_inner { background:#f2f2f7; color:#1c1c1e; border-bottom-left-radius:4px; }
    ._aicw_msg.user ._aicw_bubble_inner { background:${ACCENT}; color:#fff; border-bottom-right-radius:4px; }
    ._aicw_label { font-size:11px; color:#aaa; margin-bottom:3px; font-weight:500; }
    ._aicw_msg.user ._aicw_label { text-align:right; }

    ._aicw_typing { display:inline-flex; gap:4px; align-items:center; padding:4px 0; }
    ._aicw_typing span { width:7px; height:7px; border-radius:50%; background:#aaa; animation:_aicw_dot 1.2s infinite ease-in-out; }
    ._aicw_typing span:nth-child(2) { animation-delay:.2s; }
    ._aicw_typing span:nth-child(3) { animation-delay:.4s; }
    @keyframes _aicw_dot { 0%,80%,100%{transform:scale(.6);opacity:.5} 40%{transform:scale(1);opacity:1} }

    /* Input */
    #_aicw_input_area {
      display:flex; align-items:flex-end; gap:8px;
      padding:10px 12px; border-top:1px solid #f0f0f5; flex-shrink:0; background:#fff;
    }
    #_aicw_input {
      flex:1; border:1.5px solid #e8e8f0; border-radius:12px;
      padding:9px 12px; font-size:14px; outline:none; resize:none;
      line-height:1.45; max-height:96px; overflow-y:auto;
      transition:border-color .2s; font-family:inherit; color:#1c1c1e; background:#fafafd;
    }
    #_aicw_input:focus { border-color:${ACCENT}; background:#fff; }
    #_aicw_input::placeholder { color:#bbb; }
    #_aicw_input:disabled { opacity:.5; cursor:not-allowed; }
    #_aicw_send {
      width:38px; height:38px; border-radius:10px; background:${ACCENT}; border:none;
      cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;
      transition:opacity .2s, transform .15s;
    }
    #_aicw_send:hover:not(:disabled) { opacity:.9; transform:scale(1.06); }
    #_aicw_send:disabled { opacity:.4; cursor:not-allowed; }
    #_aicw_send svg { width:17px; height:17px; fill:none; stroke:#fff; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }

    #_aicw_footer { text-align:center; font-size:10px; color:#c0c0c8; padding:0 0 9px; flex-shrink:0; }

    @media (max-width:420px) {
      #_aicw_window { right:0; left:0; bottom:0; width:100%; height:78vh; border-radius:24px 24px 0 0; }
      #_aicw_bubble { bottom:16px; right:16px; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // ─── Inject HTML ─────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = '_aicw_root';
  root.innerHTML = `
    <button id="_aicw_bubble" aria-label="Open chat">
      <svg viewBox="0 0 24 24"><path d="M12 3C6.477 3 2 6.925 2 11.8c0 2.198.87 4.207 2.318 5.74L3 21l4.13-1.586A11.054 11.054 0 0012 20.6c5.523 0 10-3.925 10-8.8S17.523 3 12 3z"/></svg>
    </button>
    <div id="_aicw_window" role="dialog" aria-label="${BOT_NAME}">
      <div id="_aicw_header">
        <div id="_aicw_avatar">🤖</div>
        <div id="_aicw_header_info">
          <div id="_aicw_header_name">${BOT_NAME}</div>
          <div id="_aicw_header_status">
            <span id="_aicw_status_dot">Initialising…</span>
          </div>
        </div>
        <div id="_aicw_engine_badge" style="display:none"></div>
      </div>
      <div id="_aicw_status_bar">
        <span id="_aicw_status_text">Loading…</span>
        <div id="_aicw_progress_wrap"><div id="_aicw_progress_bar"></div></div>
        <span id="_aicw_pct_text">0%</span>
      </div>
      <div id="_aicw_messages"></div>
      <div id="_aicw_input_area">
        <textarea id="_aicw_input" placeholder="Message…" rows="1" disabled></textarea>
        <button id="_aicw_send" disabled>
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <div id="_aicw_footer">Powered by Transformers.js &amp; Groq · Zero-server AI</div>
    </div>
  `;
  document.body.appendChild(root);

  // ─── DOM refs ────────────────────────────────────────────────────────────
  const bubbleBtn    = document.getElementById('_aicw_bubble');
  const windowEl     = document.getElementById('_aicw_window');
  const statusBar    = document.getElementById('_aicw_status_bar');
  const statusText   = document.getElementById('_aicw_status_text');
  const progressBar  = document.getElementById('_aicw_progress_bar');
  const pctText      = document.getElementById('_aicw_pct_text');
  const messagesEl   = document.getElementById('_aicw_messages');
  const inputEl      = document.getElementById('_aicw_input');
  const sendBtn      = document.getElementById('_aicw_send');
  const statusDot    = document.getElementById('_aicw_status_dot');
  const engineBadge  = document.getElementById('_aicw_engine_badge');

  // ─── State ───────────────────────────────────────────────────────────────
  let worker          = null;
  let isOpen          = false;
  let isModelReady    = false;
  let isGenerating    = false;
  let chatHistory     = [{ role: 'system', content: SYSTEM }];
  let currentBotMsgEl = null;

  // ─── Toggle ───────────────────────────────────────────────────────────────
  bubbleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    windowEl.classList.toggle('open', isOpen);
    bubbleBtn.classList.toggle('open', isOpen);
    if (isOpen && !worker) initWorker();
    if (isOpen && isModelReady) inputEl.focus();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) bubbleBtn.click(); });

  // ─── Worker init ─────────────────────────────────────────────────────────
  function initWorker() {
    appendBotMessage(GREETING);
    statusDot.textContent = 'Detecting device…';

    try {
      // Browsers block `new Worker('https://other-domain.com/...')` (cross-origin).
      // Fix: create a tiny same-origin blob that does ONE absolute ES import
      // pointing at our CDN worker. Absolute imports always work from blob URLs.
      const bootstrap = `import '${WORKER_URL}';`;
      const blob      = new Blob([bootstrap], { type: 'application/javascript' });
      const blobUrl   = URL.createObjectURL(blob);
      worker          = new Worker(blobUrl, { type: 'module' });
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showError('Could not start AI engine: ' + err.message);
      return;
    }

    worker.addEventListener('message', onWorkerMessage);
    worker.postMessage({
      type: 'LOAD_MODEL',
      payload: { modelId: MODEL_ID, groqApiKey: GROQ_KEY, groqModel: GROQ_MODEL },
    });
  }

  // ─── Worker messages ─────────────────────────────────────────────────────
  function onWorkerMessage({ data }) {
    const { type, payload } = data;

    if (type === 'DEVICE_SCORE') {
      statusDot.textContent = `Device: ${payload.score} (${payload.cores} cores, ${payload.ram}GB RAM)`;
    }

    if (type === 'STATUS') {
      if (payload.status === 'loading') {
        statusBar.classList.add('visible');
        statusText.textContent = payload.message || 'Loading…';
        statusDot.textContent  = payload.message || 'Loading…';
      }
      if (payload.status === 'ready') {
        isModelReady = true;
        statusBar.classList.remove('visible');
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.focus();

        // Show engine badge
        const engine = payload.engine || 'wasm';
        const labels  = { webgpu: '⚡ WebGPU', wasm: '🧠 CPU', cloud: '☁ Cloud' };
        engineBadge.textContent  = labels[engine] || engine;
        engineBadge.style.display = '';
        statusDot.textContent    = engine === 'cloud'
          ? '☁ Cloud AI · Fast responses'
          : engine === 'webgpu'
          ? '⚡ GPU accelerated · In-browser'
          : '🧠 CPU · In-browser';
        statusDot.style.color = 'rgba(255,255,255,.8)';
      }
      if (payload.status === 'error') {
        statusBar.classList.remove('visible');
        showError(payload.message);
        statusDot.textContent = '⚠ Error';
      }
    }

    if (type === 'DOWNLOAD_PROGRESS') {
      if (payload.percent != null) {
        progressBar.style.width  = payload.percent + '%';
        pctText.textContent      = payload.percent + '%';
        statusText.textContent   = `Downloading model… ${payload.percent}%`;
        statusDot.textContent    = `Downloading… ${payload.percent}%`;
      }
    }

    if (type === 'TOKEN') {
      if (!currentBotMsgEl) currentBotMsgEl = appendBotMessage('');
      removeTypingIndicator();
      const inner = currentBotMsgEl.querySelector('._aicw_bubble_inner');
      inner.textContent += payload.token;
      scrollToBottom();
    }

    if (type === 'GENERATION_COMPLETE') {
      isGenerating = false;
      if (currentBotMsgEl) {
        const text = currentBotMsgEl.querySelector('._aicw_bubble_inner').textContent;
        chatHistory.push({ role: 'assistant', content: text });
        currentBotMsgEl = null;
      }
      removeTypingIndicator();
      sendBtn.disabled = false;
      inputEl.disabled = false;
      inputEl.focus();
    }

    if (type === 'ERROR') {
      isGenerating = false;
      showError(payload.message);
      removeTypingIndicator();
      sendBtn.disabled = false;
      inputEl.disabled = false;
    }
  }

  // ─── Send ─────────────────────────────────────────────────────────────────
  function handleSend() {
    const text = inputEl.value.trim();
    if (!text || !isModelReady || isGenerating) return;

    isGenerating = true;
    inputEl.value = '';
    autoResize();
    appendUserMessage(text);
    chatHistory.push({ role: 'user', content: text });
    showTypingIndicator();
    inputEl.disabled = true;
    sendBtn.disabled = true;

    worker.postMessage({
      type: 'GENERATE',
      payload: {
        messages: chatHistory,
        config: { max_new_tokens: 200, temperature: 0.7, do_sample: true, top_p: 0.9, repetition_penalty: 1.1 },
      },
    });
  }

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
  inputEl.addEventListener('input', autoResize);
  function autoResize() { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 96) + 'px'; }

  // ─── UI helpers ───────────────────────────────────────────────────────────
  function appendBotMessage(text) {
    removeTypingIndicator();
    const el = document.createElement('div');
    el.className = '_aicw_msg bot';
    el.innerHTML = `<span class="_aicw_label">${BOT_NAME}</span><div class="_aicw_bubble_inner">${esc(text)}</div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function appendUserMessage(text) {
    const el = document.createElement('div');
    el.className = '_aicw_msg user';
    el.innerHTML = `<span class="_aicw_label">You</span><div class="_aicw_bubble_inner">${esc(text)}</div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function showTypingIndicator() {
    if (document.getElementById('_aicw_typing')) return;
    const el = document.createElement('div');
    el.className = '_aicw_msg bot'; el.id = '_aicw_typing';
    el.innerHTML = `<span class="_aicw_label">${BOT_NAME}</span><div class="_aicw_bubble_inner"><div class="_aicw_typing"><span></span><span></span><span></span></div></div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function removeTypingIndicator() { document.getElementById('_aicw_typing')?.remove(); }

  function showError(msg) {
    const el = document.createElement('div');
    el.className = '_aicw_msg bot';
    el.innerHTML = `<div class="_aicw_bubble_inner" style="background:#fee2e2;color:#991b1b;">⚠ ${esc(msg)}</div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

})();
