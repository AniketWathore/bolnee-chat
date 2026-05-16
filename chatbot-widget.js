/**
 * chatbot-widget.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Self-contained, zero-dependency embeddable AI chatbot widget.
 * Uses Transformers.js (WASM) + a Web Worker so model inference
 * never blocks the host page's UI thread.
 *
 * USAGE — paste in any website's <body>:
 * ─────────────────────────────────────────────────────────────────────────────
 *   <script>
 *     window.BotConfig = {
 *       modelId:    'onnx-community/SmolLM2-135M-Instruct-ONNX', // optional
 *       accentColor: '#6366f1',                                   // optional
 *       botName:    'Aria',                                       // optional
 *       greeting:   'Hey! How can I help you today?',            // optional
 *       systemPrompt: 'You are a helpful assistant.',            // optional
 *       workerUrl:  'https://cdn.yourdomain.com/chat-worker.js', // required in prod
 *     };
 *   </script>
 *   <script src="https://cdn.yourdomain.com/chatbot-widget.js" async></script>
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ─── Read Config ─────────────────────────────────────────────────────────
  const cfg = window.BotConfig || {
      workerUrl: 'https://bolneedemovercel.vercel.app/chat-worker.js'
  };
  const ACCENT      = cfg.accentColor  || '#6366f1';
  const BOT_NAME    = cfg.botName      || 'AI Assistant';
  const GREETING    = cfg.greeting     || 'Hello! I\'m running entirely in your browser — no server needed. How can I help?';
  const SYSTEM      = cfg.systemPrompt || 'You are a friendly, concise AI assistant. Keep answers brief and helpful.';
  const WORKER_URL  = cfg.workerUrl    || 'chat-worker.js'; // Change to absolute CDN URL in production
  const MODEL_ID    = cfg.modelId      || 'onnx-community/SmolLM2-135M-Instruct-ONNX';

  // ─── Inject Styles ───────────────────────────────────────────────────────
  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

    #_aicw_root * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', system-ui, sans-serif; }

    /* ── Bubble ── */
    #_aicw_bubble {
      position: fixed; bottom: 24px; right: 24px;
      width: 58px; height: 58px;
      background: ${ACCENT};
      border-radius: 50%;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px ${ACCENT}66;
      z-index: 2147483647;
      transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
      border: none; outline: none;
    }
    #_aicw_bubble:hover { transform: scale(1.1); box-shadow: 0 6px 28px ${ACCENT}88; }
    #_aicw_bubble svg { width: 26px; height: 26px; fill: #fff; transition: transform .3s; }
    #_aicw_bubble.open svg { transform: rotate(45deg); }

    /* ── Window ── */
    #_aicw_window {
      position: fixed; bottom: 96px; right: 24px;
      width: 360px; height: 520px;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08);
      display: flex; flex-direction: column;
      z-index: 2147483646;
      overflow: hidden;
      opacity: 0; pointer-events: none;
      transform: translateY(16px) scale(.97);
      transition: opacity .25s ease, transform .25s cubic-bezier(.34,1.56,.64,1);
    }
    #_aicw_window.open {
      opacity: 1; pointer-events: all;
      transform: translateY(0) scale(1);
    }

    /* ── Header ── */
    #_aicw_header {
      background: ${ACCENT};
      padding: 16px 18px;
      display: flex; align-items: center; gap: 10px;
      flex-shrink: 0;
    }
    #_aicw_avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    #_aicw_header_info { flex: 1; }
    #_aicw_header_name { color: #fff; font-weight: 600; font-size: 15px; line-height: 1.2; }
    #_aicw_header_status { color: rgba(255,255,255,.75); font-size: 12px; margin-top: 1px; }

    /* ── Status bar (download progress) ── */
    #_aicw_status_bar {
      background: #f8f8fc;
      padding: 10px 16px;
      font-size: 12px; color: #666;
      display: none;
      align-items: center; gap: 10px;
      border-bottom: 1px solid #eee;
      flex-shrink: 0;
    }
    #_aicw_status_bar.visible { display: flex; }
    #_aicw_progress_wrap {
      flex: 1; height: 4px; background: #e5e5ef; border-radius: 99px; overflow: hidden;
    }
    #_aicw_progress_bar {
      height: 100%; background: ${ACCENT}; border-radius: 99px;
      width: 0%; transition: width .3s;
    }

    /* ── Messages ── */
    #_aicw_messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
    }
    #_aicw_messages::-webkit-scrollbar { width: 4px; }
    #_aicw_messages::-webkit-scrollbar-track { background: transparent; }
    #_aicw_messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 99px; }

    /* ── Message bubbles ── */
    ._aicw_msg { display: flex; flex-direction: column; max-width: 82%; animation: _aicw_pop .2s ease; }
    @keyframes _aicw_pop { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: none; } }
    ._aicw_msg.bot { align-self: flex-start; }
    ._aicw_msg.user { align-self: flex-end; }
    ._aicw_bubble_inner {
      padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.55; word-break: break-word;
    }
    ._aicw_msg.bot  ._aicw_bubble_inner { background: #f2f2f7; color: #1c1c1e; border-bottom-left-radius: 4px; }
    ._aicw_msg.user ._aicw_bubble_inner { background: ${ACCENT}; color: #fff; border-bottom-right-radius: 4px; }
    ._aicw_label { font-size: 11px; color: #aaa; margin-bottom: 4px; font-weight: 500; }
    ._aicw_msg.user ._aicw_label { text-align: right; }

    /* typing dots */
    ._aicw_typing { display: inline-flex; gap: 4px; align-items: center; padding: 6px 0; }
    ._aicw_typing span {
      width: 7px; height: 7px; border-radius: 50%; background: #aaa;
      animation: _aicw_dot 1.2s infinite ease-in-out;
    }
    ._aicw_typing span:nth-child(2) { animation-delay: .2s; }
    ._aicw_typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes _aicw_dot { 0%,80%,100% { transform: scale(.6); opacity:.5; } 40% { transform: scale(1); opacity:1; } }

    /* ── Input area ── */
    #_aicw_input_area {
      display: flex; align-items: flex-end; gap: 8px;
      padding: 12px 14px;
      border-top: 1px solid #f0f0f5;
      flex-shrink: 0;
      background: #fff;
    }
    #_aicw_input {
      flex: 1; border: 1.5px solid #e8e8f0; border-radius: 12px;
      padding: 9px 13px; font-size: 14px; outline: none; resize: none;
      line-height: 1.45; max-height: 100px; overflow-y: auto;
      transition: border-color .2s;
      font-family: inherit; color: #1c1c1e; background: #fafafd;
    }
    #_aicw_input:focus { border-color: ${ACCENT}; background: #fff; }
    #_aicw_input::placeholder { color: #bbb; }
    #_aicw_input:disabled { opacity: .5; cursor: not-allowed; }
    #_aicw_send {
      width: 38px; height: 38px; border-radius: 10px;
      background: ${ACCENT}; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: opacity .2s, transform .15s;
    }
    #_aicw_send:hover:not(:disabled) { opacity: .9; transform: scale(1.06); }
    #_aicw_send:disabled { opacity: .4; cursor: not-allowed; }
    #_aicw_send svg { width: 17px; height: 17px; fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

    /* ── Powered-by ── */
    #_aicw_footer {
      text-align: center; font-size: 10.5px; color: #c0c0c8;
      padding: 0 0 10px; flex-shrink: 0;
    }

    /* ── Mobile ── */
    @media (max-width: 420px) {
      #_aicw_window { right: 0; left: 0; bottom: 0; width: 100%; height: 75vh; border-radius: 24px 24px 0 0; }
      #_aicw_bubble { bottom: 16px; right: 16px; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // ─── Inject HTML ─────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = '_aicw_root';
  root.innerHTML = `
    <!-- Floating bubble -->
    <button id="_aicw_bubble" aria-label="Open chat" title="Open AI Chat">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3C6.477 3 2 6.925 2 11.8c0 2.198.87 4.207 2.318 5.74L3 21l4.13-1.586A11.054 11.054 0 0012 20.6c5.523 0 10-3.925 10-8.8S17.523 3 12 3z"/>
      </svg>
    </button>

    <!-- Chat window -->
    <div id="_aicw_window" role="dialog" aria-label="AI Chatbot" aria-modal="true">

      <!-- Header -->
      <div id="_aicw_header">
        <div id="_aicw_avatar">🤖</div>
        <div id="_aicw_header_info">
          <div id="_aicw_header_name">${BOT_NAME}</div>
          <div id="_aicw_header_status">Runs fully in your browser</div>
        </div>
      </div>

      <!-- Download progress bar -->
      <div id="_aicw_status_bar">
        <span id="_aicw_status_text">Loading model…</span>
        <div id="_aicw_progress_wrap">
          <div id="_aicw_progress_bar"></div>
        </div>
        <span id="_aicw_pct_text">0%</span>
      </div>

      <!-- Messages -->
      <div id="_aicw_messages"></div>

      <!-- Input -->
      <div id="_aicw_input_area">
        <textarea
          id="_aicw_input"
          placeholder="Message…"
          rows="1"
          disabled
          aria-label="Type your message"
        ></textarea>
        <button id="_aicw_send" disabled aria-label="Send">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>

      <div id="_aicw_footer">Powered by Transformers.js · Runs 100% in-browser</div>
    </div>
  `;
  document.body.appendChild(root);

  // ─── DOM refs ────────────────────────────────────────────────────────────
  const bubbleBtn     = document.getElementById('_aicw_bubble');
  const windowEl      = document.getElementById('_aicw_window');
  const statusBar     = document.getElementById('_aicw_status_bar');
  const statusText    = document.getElementById('_aicw_status_text');
  const progressBar   = document.getElementById('_aicw_progress_bar');
  const pctText       = document.getElementById('_aicw_pct_text');
  const messagesEl    = document.getElementById('_aicw_messages');
  const inputEl       = document.getElementById('_aicw_input');
  const sendBtn       = document.getElementById('_aicw_send');
  const headerStatus  = document.getElementById('_aicw_header_status');

  // ─── State ───────────────────────────────────────────────────────────────
  let worker          = null;
  let isOpen          = false;
  let isModelReady    = false;
  let isGenerating    = false;
  let chatHistory     = [{ role: 'system', content: SYSTEM }];
  let currentBotMsgEl = null;   // The bot bubble currently being streamed into

  // ─── Toggle window ───────────────────────────────────────────────────────
  bubbleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    windowEl.classList.toggle('open', isOpen);
    bubbleBtn.classList.toggle('open', isOpen);
    bubbleBtn.setAttribute('aria-expanded', String(isOpen));

    if (isOpen && !worker) {
      initWorker();
    }
    if (isOpen && isModelReady) inputEl.focus();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) bubbleBtn.click();
  });

  // ─── Web Worker setup ────────────────────────────────────────────────────
  function initWorker() {
    // Show greeting while model loads
    appendBotMessage(GREETING);
    setStatus('Initialising AI engine…');

    try {
      // Workers need the script to be served over HTTP(S).
      // In dev you can open demo.html via a local server (e.g. `npx serve .`)
      worker = new Worker(WORKER_URL, { type: 'module' });
    } catch (e) {
      setStatus('');
      showError('Could not start Web Worker. Make sure the page is served over HTTP (not file://).');
      return;
    }

    worker.addEventListener('message', onWorkerMessage);
    worker.postMessage({ type: 'LOAD_MODEL', payload: { modelId: MODEL_ID } });
  }

  // ─── Handle Worker messages ───────────────────────────────────────────────
  function onWorkerMessage({ data }) {
    const { type, payload } = data;

    if (type === 'STATUS') {
      if (payload.status === 'loading') {
        setStatus('Downloading model… (first visit only)');
        statusBar.classList.add('visible');
      } else if (payload.status === 'ready') {
        isModelReady = true;
        setStatus('');
        statusBar.classList.remove('visible');
        headerStatus.textContent = '● Online · In-browser';
        headerStatus.style.color = '#a7f3d0';
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.focus();
      } else if (payload.status === 'error') {
        showError('Model failed to load: ' + payload.message);
        setStatus('');
        statusBar.classList.remove('visible');
      }
    }

    if (type === 'DOWNLOAD_PROGRESS') {
      if (payload.percent !== null) {
        progressBar.style.width = payload.percent + '%';
        pctText.textContent     = payload.percent + '%';
        statusText.textContent  = `Downloading model… ${payload.percent}%`;
      }
    }

    if (type === 'TOKEN') {
      // Stream tokens into the current bot bubble
      if (!currentBotMsgEl) {
        currentBotMsgEl = appendBotMessage('');
      }
      const inner = currentBotMsgEl.querySelector('._aicw_bubble_inner');
      inner.textContent += payload.token;
      scrollToBottom();
    }

    if (type === 'GENERATION_COMPLETE') {
      isGenerating = false;
      // Save final assistant reply to history
      if (currentBotMsgEl) {
        const text = currentBotMsgEl.querySelector('._aicw_bubble_inner').textContent;
        chatHistory.push({ role: 'assistant', content: text });
        currentBotMsgEl = null;
      }
      sendBtn.disabled = false;
      inputEl.disabled = false;
      inputEl.focus();
      removeTypingIndicator();
    }

    if (type === 'ERROR') {
      showError(payload.message);
      isGenerating = false;
      sendBtn.disabled = false;
      inputEl.disabled = false;
      removeTypingIndicator();
    }
  }

  // ─── Send message ─────────────────────────────────────────────────────────
  function handleSend() {
    const text = inputEl.value.trim();
    if (!text || !isModelReady || isGenerating) return;

    isGenerating = true;
    inputEl.value = '';
    autoResize();

    // Add user bubble
    appendUserMessage(text);
    chatHistory.push({ role: 'user', content: text });

    // Show typing indicator while waiting for first token
    showTypingIndicator();

    inputEl.disabled = true;
    sendBtn.disabled = true;

    worker.postMessage({
      type: 'GENERATE',
      payload: {
        messages: chatHistory,
        config: {
          max_new_tokens: 200,
          temperature:    0.7,
          do_sample:      true,
          top_p:          0.9,
          repetition_penalty: 1.1,
        },
      },
    });
  }

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  inputEl.addEventListener('input', autoResize);

  function autoResize() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
  }

  // ─── UI Helpers ───────────────────────────────────────────────────────────
  function appendBotMessage(text) {
    removeTypingIndicator();
    const el = document.createElement('div');
    el.className = '_aicw_msg bot';
    el.innerHTML = `
      <span class="_aicw_label">${BOT_NAME}</span>
      <div class="_aicw_bubble_inner">${escapeHtml(text)}</div>
    `;
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function appendUserMessage(text) {
    const el = document.createElement('div');
    el.className = '_aicw_msg user';
    el.innerHTML = `
      <span class="_aicw_label">You</span>
      <div class="_aicw_bubble_inner">${escapeHtml(text)}</div>
    `;
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function showTypingIndicator() {
    if (document.getElementById('_aicw_typing')) return;
    const el = document.createElement('div');
    el.className = '_aicw_msg bot';
    el.id = '_aicw_typing';
    el.innerHTML = `
      <span class="_aicw_label">${BOT_NAME}</span>
      <div class="_aicw_bubble_inner">
        <div class="_aicw_typing"><span></span><span></span><span></span></div>
      </div>
    `;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById('_aicw_typing');
    if (el) el.remove();
  }

  function showError(msg) {
    const el = document.createElement('div');
    el.className = '_aicw_msg bot';
    el.innerHTML = `<div class="_aicw_bubble_inner" style="background:#fee2e2;color:#991b1b;">⚠ ${escapeHtml(msg)}</div>`;
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function setStatus(msg) {
    statusText.textContent = msg;
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

})();
