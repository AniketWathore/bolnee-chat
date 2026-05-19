(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  var cfg          = window.BotConfig || {};
  var ACCENT       = cfg.accentColor  || '#6366f1';
  var BOT_NAME     = cfg.botName      || 'AI Assistant';
  var GREETING      = cfg.greeting      || 'Hi! How can I help you today?';
  var KNOWLEDGE_URL = cfg.knowledgeUrl  || null;

  // ── CSS ─────────────────────────────────────────────────────────────────────
  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '#_cw,#_cw *{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,sans-serif}' +
    '#_cw_b{position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:' + ACCENT + ';border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px ' + ACCENT + '55;z-index:2147483647;transition:transform .2s}' +
    '#_cw_b:hover{transform:scale(1.08)}' +
    '#_cw_b svg{width:24px;height:24px;fill:#fff;transition:transform .25s}' +
    '#_cw_b.open svg{transform:rotate(45deg)}' +
    '#_cw_w{position:fixed;bottom:92px;right:24px;width:360px;height:520px;background:#fff;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,.18);z-index:2147483646;opacity:0;pointer-events:none;transform:translateY(12px) scale(.97);transition:opacity .22s,transform .22s cubic-bezier(.34,1.56,.64,1)}' +
    '#_cw_w.open{opacity:1;pointer-events:all;transform:none}' +
    '#_cw_h{background:' + ACCENT + ';padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}' +
    '#_cw_av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}' +
    '#_cw_hn{color:#fff;font-weight:600;font-size:14px;line-height:1.2}' +
    '#_cw_hs{color:rgba(255,255,255,.7);font-size:11px;margin-top:2px}' +
    '#_cw_dl{background:#f5f5fa;border-bottom:1px solid #eee;padding:8px 14px;font-size:12px;color:#666;display:none;align-items:center;gap:8px;flex-shrink:0}' +
    '#_cw_dl.on{display:flex}' +
    '#_cw_db{flex:1;height:4px;background:#ddd;border-radius:99px;overflow:hidden}' +
    '#_cw_df{height:100%;background:' + ACCENT + ';width:0%;transition:width .3s;border-radius:99px}' +
    '#_cw_ms{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}' +
    '#_cw_ms::-webkit-scrollbar{width:3px}' +
    '#_cw_ms::-webkit-scrollbar-thumb{background:#ddd;border-radius:99px}' +
    '._m{display:flex;flex-direction:column;max-width:82%;animation:_pop .18s ease}' +
    '@keyframes _pop{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}' +
    '._m.b{align-self:flex-start}._m.u{align-self:flex-end}' +
    '._mb{padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.6;word-break:break-word;white-space:pre-wrap}' +
    '._m.b ._mb{background:#f0f0f7;color:#111;border-bottom-left-radius:3px}' +
    '._m.u ._mb{background:' + ACCENT + ';color:#fff;border-bottom-right-radius:3px}' +
    '._ml{font-size:10.5px;color:#aaa;margin-bottom:3px;font-weight:500}' +
    '._m.u ._ml{text-align:right}' +
    '._dbg ._mb{background:#f0f4ff!important;color:#666!important;font-size:11px!important;font-family:monospace!important;border-radius:8px!important;padding:5px 10px!important}' +
    '._dots{display:inline-flex;gap:4px;padding:4px 0}' +
    '._dots span{width:6px;height:6px;border-radius:50%;background:#bbb;animation:_dt 1.1s infinite ease-in-out}' +
    '._dots span:nth-child(2){animation-delay:.18s}._dots span:nth-child(3){animation-delay:.36s}' +
    '@keyframes _dt{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}' +
    '#_cw_ia{display:flex;align-items:flex-end;gap:8px;padding:10px 12px;border-top:1px solid #f0f0f5;flex-shrink:0;background:#fff}' +
    '#_cw_i{flex:1;border:1.5px solid #e0e0ea;border-radius:10px;padding:8px 12px;font-size:13.5px;resize:none;outline:none;max-height:90px;overflow-y:auto;line-height:1.5;background:#fafafd;color:#111;transition:border-color .2s;font-family:inherit}' +
    '#_cw_i:focus{border-color:' + ACCENT + ';background:#fff}' +
    '#_cw_i:disabled{opacity:.45}' +
    '#_cw_i::placeholder{color:#bbb}' +
    '#_cw_s{width:36px;height:36px;border-radius:9px;background:' + ACCENT + ';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s}' +
    '#_cw_s:hover:not(:disabled){opacity:.85}' +
    '#_cw_s:disabled{opacity:.35;cursor:default}' +
    '#_cw_s svg{width:15px;height:15px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +
    '#_cw_ft{text-align:center;font-size:10px;color:#ccc;padding:0 0 8px;flex-shrink:0}' +
    '@media(max-width:420px){#_cw_w{right:0;left:0;bottom:0;width:100%;height:75vh;border-radius:20px 20px 0 0}#_cw_b{bottom:16px;right:16px}}' +
  '</style>');

  // ── HTML ─────────────────────────────────────────────────────────────────────
  document.body.insertAdjacentHTML('beforeend',
    '<div id="_cw">' +
      '<button id="_cw_b" aria-label="Open chat">' +
        '<svg viewBox="0 0 24 24"><path d="M12 3C6.48 3 2 6.92 2 11.8c0 2.2.87 4.2 2.32 5.74L3 21l4.13-1.59A10.97 10.97 0 0012 20.6c5.52 0 10-3.92 10-8.8C22 6.92 17.52 3 12 3z"/></svg>' +
      '</button>' +
      '<div id="_cw_w">' +
        '<div id="_cw_h">' +
          '<div id="_cw_av">\uD83E\uDD16</div>' +
          '<div><div id="_cw_hn">' + BOT_NAME + '</div><div id="_cw_hs">Loading AI\u2026</div></div>' +
        '</div>' +
        '<div id="_cw_dl">' +
          '<span id="_cw_dt">Downloading model\u2026</span>' +
          '<div id="_cw_db"><div id="_cw_df"></div></div>' +
          '<span id="_cw_dp">0%</span>' +
        '</div>' +
        '<div id="_cw_ms"></div>' +
        '<div id="_cw_ia">' +
          '<textarea id="_cw_i" placeholder="Type a message\u2026" rows="1" disabled></textarea>' +
          '<button id="_cw_s" disabled>' +
            '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
          '</button>' +
        '</div>' +
        '<div id="_cw_ft">Powered by Transformers.js \u00B7 100% in-browser</div>' +
      '</div>' +
    '</div>');

  // ── DOM refs ─────────────────────────────────────────────────────────────────
  var $ = function(id) { return document.getElementById(id); };
  var bubble  = $('_cw_b'),  win    = $('_cw_w');
  var dlBar   = $('_cw_dl'), dlText = $('_cw_dt'), dlFill = $('_cw_df'), dlPct = $('_cw_dp');
  var msgs    = $('_cw_ms'), inp    = $('_cw_i'),  sendBtn = $('_cw_s'), hstatus = $('_cw_hs');

  // ── State ─────────────────────────────────────────────────────────────────────
  var worker       = null;
  var isOpen       = false;
  var modelReady   = false;
  var genReady     = false;    // text generation model loaded
  var kbReady      = false;    // knowledge base loaded
  var waiting      = false;    // waiting for classification result
  var streaming    = false;    // streaming a generated response
  var streamEl     = null;     // current streaming message element
  var lastUserText = '';       // last user message text (for response handler)
  var knowledge    = null;
  var detector     = null;

  // ── Toggle ───────────────────────────────────────────────────────────────────
  bubble.addEventListener('click', function() {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    bubble.classList.toggle('open', isOpen);
    if (isOpen && !worker) boot();
    if (isOpen && modelReady) inp.focus();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) bubble.click();
  });

  // ── No inline worker source — using external module worker only ────────────

  // ── Helper to send messages to module worker ─────────────────────────────────
  // chat-worker.js expects: { type, payload }
  function sendToWorker(type, payload) {
    if (!worker) return;
    if (type === 'LOAD') {
      worker.postMessage({ type: 'LOAD_MODEL', payload: {} });
    } else {
      worker.postMessage({ type: type, payload: payload });
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────────
  function boot() {
    var workerUrl = cfg.workerUrl || '/chat-worker.js';

    function attachWorker(w) {
      worker = w;
      worker.onerror = function(e) {
        addErr('Worker error: ' + (e.message || 'see console'));
        console.error('[chatbot-widget]', e);
      };
      worker.onmessage = function(ev) { handleWorkerMsg(ev.data); };
      sendToWorker('LOAD', {});
    }

    function loadKnowledge() {
      if (KNOWLEDGE_URL) {
        fetch(KNOWLEDGE_URL)
          .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function(data) {
            knowledge = data;
            if (window.BolneeIntentDetector) {
              detector = new window.BolneeIntentDetector(knowledge);
              kbReady  = true;
              log('Knowledge loaded — ' + (data.products || []).length + ' products, '
                + (data.faqs || []).length + ' FAQs');
              updateStatus();
            } else {
              log('WARNING: BolneeIntentDetector not found on window. Load intent-detection.js first.');
            }
          })
          .catch(function(err) {
            log('Knowledge fetch failed: ' + err.message);
          });
      } else {
        log('No knowledgeUrl set — running without product/policy data.');
      }
      addMsg('bot', GREETING);
    }

    // Try direct module worker first
    try {
      attachWorker(new Worker(workerUrl, { type: 'module' }));
      loadKnowledge();
      return;
    } catch (e) {
      // Cross-origin: fetch script and create blob-based module worker
      log('Direct worker failed (' + e.message + '), trying blob fallback…');
    }

    fetch(workerUrl)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function(code) {
        var blob = new Blob([code], { type: 'application/javascript' });
        var url  = URL.createObjectURL(blob);
        try {
          attachWorker(new Worker(url, { type: 'module' }));
          URL.revokeObjectURL(url);
          loadKnowledge();
        } catch (e2) {
          addErr('Chat engine unavailable: ' + e2.message);
        }
      })
      .catch(function(err) {
        addErr('Failed to load chat engine: ' + err.message);
      });
  }

  // ── Handle messages from worker ───────────────────────────────────────────────
  function handleWorkerMsg(data) {
    var msgData = data.payload || data;

    if (data.type === 'STATUS') {
      dlText.textContent = msgData.message || msgData.text || '';
      dlBar.classList.add('on');
    }

    if (data.type === 'DOWNLOAD_PROGRESS') {
      if (msgData.total) {
        var pct = Math.round((msgData.loaded / msgData.total) * 100);
        dlFill.style.width = pct + '%';
        dlPct.textContent  = pct + '%';
        dlText.textContent = 'Downloading… ' + pct + '%';
      }
    }

    if (data.type === 'READY') {
      modelReady = true;
      dlBar.classList.remove('on');
      updateStatus();
      enableInput();
    }

    if (data.type === 'GEN_READY') {
      genReady = true;
      dlBar.classList.remove('on');
      updateStatus();
    }

    if (data.type === 'CLASSIFY_RESULT') {
      handleClassifyResult(msgData.intent, msgData.confidence);
    }

    if (data.type === 'TOKEN') {
      if (!streamEl) { rmTyping(); streamEl = addMsg('bot', ''); }
      streamEl.querySelector('._mb').textContent += msgData.token;
      msgs.scrollTop = msgs.scrollHeight;
    }

    if (data.type === 'DONE') {
      streamEl = null;
      streaming = false;
      rmTyping();
      enableInput();
    }

    if (data.type === 'ERROR' || data.type === 'ERR') {
      addErr(msgData.message || msgData.msg || 'Unknown error');
      waiting = false;
      streaming = false;
      enableInput();
    }
  }

  function updateStatus() {
    if (modelReady && genReady && kbReady) {
      hstatus.textContent = '\u25CF Online \u00B7 AI ready';
      hstatus.style.color = 'rgba(255,255,255,.95)';
    } else if (modelReady && genReady) {
      hstatus.textContent = '\u25CF Online \u00B7 General chat';
      hstatus.style.color = 'rgba(255,255,255,.9)';
    } else if (modelReady) {
      hstatus.textContent = '\u25CF Online \u00B7 Loading response model\u2026';
      hstatus.style.color = 'rgba(255,255,255,.85)';
    } else {
      hstatus.textContent = 'Loading AI\u2026';
      hstatus.style.color = 'rgba(255,255,255,.7)';
    }
  }

  function enableInput() {
    inp.disabled    = false;
    sendBtn.disabled = false;
    inp.focus();
  }

  // ── Send — classify user message via worker ─────────────────────────────────
  function doSend() {
    var text = inp.value.trim();
    if (!text || !modelReady || waiting || streaming) return;

    waiting = true;
    lastUserText = text;
    inp.value  = '';
    resize();
    inp.disabled     = true;
    sendBtn.disabled = true;

    addMsg('user', text);
    sendToWorker('CLASSIFY', { text: text });
  }

  sendBtn.addEventListener('click', doSend);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  inp.addEventListener('input', resize);

  // ── Handle classification result ───────────────────────────────────────────
  function handleClassifyResult(intent, confidence) {
    waiting = false;
    var text = lastUserText || '';

    log('[Intent] ' + intent + ' | Confidence: ' + confidence + '%');

    if (intent === 'GREETING') {
      addMsg('bot', 'Hi there! How can I help you today?');
      enableInput();
      return;
    }

    if (intent === 'THANKS') {
      addMsg('bot', "You're welcome! Let me know if there's anything else I can help with.");
      enableInput();
      return;
    }

    if (intent === 'GENERAL' || confidence < 25) {
      addMsg('bot', "I'm a shopping assistant for this store. I can help you find products, check prices, learn about policies, or get contact info. What would you like to know?");
      enableInput();
      return;
    }

    // Knowledge intents — query data
    if (!detector || !knowledge) {
      addMsg('bot', "I'm still loading product information. Please try again in a moment.");
      enableInput();
      return;
    }

    var detection = detector.queryByIntent(intent, text);

    // If generation model is ready AND data was found, generate NL response
    if (genReady && detection.queryResult && detection.queryResult.found) {
      var dataLines = buildDataLines(detection);
      var sysMsg = 'You are a friendly shopping assistant. Answer the customer using ONLY the data below. Be concise (1-3 sentences). Do not make up information.';
      var userMsg = 'Customer question: ' + text + '\n\nData:\n' + dataLines;

      streaming = true;
      addTyping();
      sendToWorker('GENERATE', {
        messages: [{ role: 'system', content: sysMsg }, { role: 'user', content: userMsg }],
        config: { max_new_tokens: 100, temperature: 0.3 }
      });
      return;
    }

    // Fallback: display formatted data directly
    var response = detector.formatResponse(detection);
    addMsg('bot', response || "I don't have that information available yet.");
    enableInput();
  }

  function buildDataLines(detection) {
    var qr = detection.queryResult;
    if (!qr || !qr.data) return 'None';
    if (Array.isArray(qr.data)) {
      return qr.data.map(function(p, i) {
        var line = (i + 1) + '. ' + p.name + ' - \u20B9' + p.price;
        if (p.inStock === false) line += ' (Out of Stock)';
        else line += ' (In Stock)';
        return line;
      }).join('\n');
    }
    if (qr.data.about) return qr.data.about;
    if (qr.data.policy) return qr.data.policy;
    if (qr.data.hours) return qr.data.hours;
    if (qr.data.contact) {
      var c = qr.data.contact;
      var parts = [];
      if (c.mobile) parts.push('Phone: ' + c.mobile);
      if (c.email) parts.push('Email: ' + c.email);
      if (c.address) parts.push('Address: ' + c.address);
      return parts.join('\n');
    }
    if (qr.data.answer) return qr.data.answer;
    return JSON.stringify(qr.data);
  }

  function resize() {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 90) + 'px';
  }

  // ── UI helpers ────────────────────────────────────────────────────────────────
  function addMsg(who, text) {
    var d = document.createElement('div');
    d.className = '_m ' + (who === 'bot' ? 'b' : 'u');
    // Use textContent so \n renders as real line breaks (white-space:pre-wrap in CSS)
    var label = document.createElement('div');
    label.className = '_ml';
    label.textContent = who === 'bot' ? BOT_NAME : 'You';
    var bubble2 = document.createElement('div');
    bubble2.className = '_mb';
    bubble2.textContent = text;
    d.appendChild(label);
    d.appendChild(bubble2);
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function addTyping() {
    if ($('_cwt')) return;
    var d = document.createElement('div');
    d.className = '_m b'; d.id = '_cwt';
    d.innerHTML = '<div class="_ml">' + BOT_NAME + '</div>'
                + '<div class="_mb"><div class="_dots"><span></span><span></span><span></span></div></div>';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function rmTyping() {
    var t = $('_cwt');
    if (t) t.remove();
  }

  function addErr(msg) {
    var d = document.createElement('div');
    d.className = '_m b';
    d.innerHTML = '<div class="_mb" style="background:#fee2e2;color:#991b1b;">\u26A0 ' + esc(msg) + '</div>';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function log(msg) {
    var d = document.createElement('div');
    d.className = '_m b _dbg';
    d.innerHTML = '<div class="_mb">\u2699 ' + esc(msg) + '</div>';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

})();