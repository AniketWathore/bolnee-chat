(function () {
  'use strict';

  var engineScripts = [
    'intent-detection.js',
    'intent-detector.js',
    'data-extractor.js',
    'response-generator.js'
  ];

  var baseUrl = (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && src.includes('chatbot-widget.js')) {
        return src.substring(0, src.lastIndexOf('/') + 1);
      }
    }
    return '/public/';
  })();

  engineScripts.forEach(function(script) {
    var s = document.createElement('script');
    s.src = baseUrl + script;
    s.async = false;
    document.head.appendChild(s);
  });

  var cfg          = window.BotConfig || {};
  var ACCENT       = cfg.accentColor  || '#6366f1';
  var BOT_NAME     = cfg.botName      || 'AI Assistant';
  var GREETING      = cfg.greeting      || 'Hi! How can I help you today?';
  var KNOWLEDGE_URL = cfg.knowledgeUrl  || null;

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

  document.body.insertAdjacentHTML('beforeend',
    '<div id="_cw">' +
      '<button id="_cw_b" aria-label="Open chat">' +
        '<svg viewBox="0 0 24 24"><path d="M12 3C6.48 3 2 6.92 2 11.8c0 2.2.87 4.2 2.32 5.74L3 21l4.13-1.59A10.97 10.97 0 0012 20.6c5.52 0 10-3.92 10-8.8C22 6.92 17.52 3 12 3z"/></svg>' +
      '</button>' +
      '<div id="_cw_w">' +
        '<div id="_cw_h">' +
          '<div id="_cw_av">\uD83E\uDD16</div>' +
          '<div><div id="_cw_hn">' + BOT_NAME + '</div><div id="_cw_hs">\u25CF Online</div></div>' +
        '</div>' +
        '<div id="_cw_ms"></div>' +
        '<div id="_cw_ia">' +
          '<textarea id="_cw_i" placeholder="Type a message\u2026" rows="1" disabled></textarea>' +
          '<button id="_cw_s" disabled>' +
            '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>');

  var $ = function(id) { return document.getElementById(id); };
  var bubble  = $('_cw_b'),  win    = $('_cw_w');
  var msgs    = $('_cw_ms'), inp    = $('_cw_i'),  sendBtn = $('_cw_s'), hstatus = $('_cw_hs');

  var isOpen       = false;
  var ready        = false;
  var waiting      = false;
  var lastUserText = '';
  var knowledge    = null;
  var responsesDetector = null;
  var intentCounters = {}; // tracks how many times each intent was asked

  bubble.addEventListener('click', function() {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    bubble.classList.toggle('open', isOpen);
    if (isOpen && !knowledge) boot();
    if (isOpen && ready) inp.focus();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) bubble.click();
  });

  function boot() {
    if (KNOWLEDGE_URL) {
      fetch(KNOWLEDGE_URL)
        .then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function(data) {
          knowledge = data;
          if (window.BolneeIntentDetector) {
            try {
              responsesDetector = new window.BolneeIntentDetector(knowledge);
              ready = true;
              enableInput();
            } catch (e) {
              console.error('[chatbot-widget]', e);
            }
          }
        })
        .catch(function(err) {
          console.error('[chatbot-widget] Knowledge fetch failed:', err);
        });
    }
    addMsg('bot', GREETING);
  }

  function streamText(text, onDone) {
    var el = addMsg('bot', '');
    var i = 0;
    var speed = 20;
    function tick() {
      if (i < text.length) {
        var chunk = text.charAt(i);
        el.querySelector('._mb').textContent += chunk;
        i++;
        msgs.scrollTop = msgs.scrollHeight;
        setTimeout(tick, speed);
      } else if (onDone) {
        onDone();
      }
    }
    tick();
    return el;
  }

  function doSend() {
    var text = inp.value.trim();
    if (!text || !ready || waiting) return;

    waiting = true;
    lastUserText = text;
    inp.value  = '';
    inp.style.height = 'auto';
    inp.disabled     = true;
    sendBtn.disabled = true;

    addMsg('user', text);

    if (responsesDetector) {
      try {
        var rDetection = responsesDetector.detect(text);
        var intent = rDetection.intent;
        intentCounters[intent] = (intentCounters[intent] || 0) + 1;
        rDetection.variationIndex = intentCounters[intent] - 1;
        var rResponse = responsesDetector.formatResponse(rDetection);
        if (rResponse) {
          addTyping();
          setTimeout(function() {
            rmTyping();
            streamText(rResponse, function() {
              waiting = false;
              enableInput();
            });
          }, 2000);
        } else {
          addMsg('bot', "I don't have that information available yet.");
          enableInput();
        }
      } catch (e) {
        console.error('[chatbot-widget]', e);
        addMsg('bot', "I don't have that information available yet.");
        enableInput();
      }
      return;
    }

    waiting = false;
    enableInput();
  }

  sendBtn.addEventListener('click', doSend);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  inp.addEventListener('input', function() {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 90) + 'px';
  });

  function addTyping() {
    if ($('_cwt')) return;
    var d = document.createElement('div');
    d.className = '_m b'; d.id = '_cwt';
    d.innerHTML = '<div class="_ml">' + BOT_NAME + '</div><div class="_mb"><div class="_dots"><span></span><span></span><span></span></div></div>';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function rmTyping() {
    var t = $('_cwt');
    if (t) t.remove();
  }

  function enableInput() {
    inp.disabled    = false;
    sendBtn.disabled = false;
    inp.focus();
  }

  function addMsg(who, text) {
    var d = document.createElement('div');
    d.className = '_m ' + (who === 'bot' ? 'b' : 'u');
    var label = document.createElement('div');
    label.className = '_ml';
    label.textContent = who === 'bot' ? BOT_NAME : 'You';
    var bubble2 = document.createElement('div');
    bubble2.className = '_mb';
    if (text) bubble2.textContent = text;
    d.appendChild(label);
    d.appendChild(bubble2);
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

})();
