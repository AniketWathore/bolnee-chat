(function () {
  'use strict';

  var cfg          = window.BotConfig || {};
  var ACCENT       = cfg.accentColor  || '#6366f1';
  var BOT_NAME     = cfg.botName      || 'AI Assistant';
  var AVATAR       = cfg.avatar     || '';
  var WIDGET_ICON  = cfg.widgetIcon || '';
  var GREETING      = cfg.greeting      || 'Hi! How can I help you today?';
  var THEME        = (cfg.theme || 'dark').toString().trim().toLowerCase();
  var KNOWLEDGE_URL = cfg.knowledgeUrl  || null;
  var CHAT_URL      = cfg.chatUrl      || null;
  var _isDark = THEME === 'dark' || (THEME === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  function getColors(isDark){
    return isDark ? {
      winBg: '#0f172a', winBorder: '#334155', winShadow: '0 16px 48px rgba(0,0,0,.45)',
      botBg: '#1e293b', botText: '#f1f5f9',
      label: '#94a3b8', dotsBg: '#475569', scrollThumb: '#475569',
      iaBg: '#0f172a', iaBorder: '#334155',
      inputBg: '#1e293b', inputText: '#f1f5f9', inputBorder: '#334155', placeholder: '#64748b'
    } : {
      winBg: '#ffffff', winBorder: '#f0f0f5', winShadow: '0 16px 48px rgba(0,0,0,.18)',
      botBg: '#f0f0f7', botText: '#111111',
      label: '#aaaaaa', dotsBg: '#bbbbbb', scrollThumb: '#dddddd',
      iaBg: '#ffffff', iaBorder: '#f0f0f5',
      inputBg: '#fafafd', inputText: '#111111', inputBorder: '#e0e0ea', placeholder: '#bbbbbb'
    };
  }
  var C = getColors(_isDark);
  function buildCss(colors, accent){
    return '#_cw,#_cw *{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,sans-serif}' +
    '#_cw_b{position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:' + accent + ';border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px ' + accent + '55;z-index:2147483647;transition:transform .2s}' +
    '#_cw_b:hover{transform:scale(1.08)}' +
    '#_cw_b svg{width:24px;height:24px;fill:#fff;transition:transform .25s}' +
    '#_cw_b.open svg{transform:rotate(45deg)}' +
    '#_cw_w{position:fixed;bottom:92px;right:24px;width:360px;height:520px;background:' + colors.winBg + ';border:1px solid ' + colors.winBorder + ';border-radius:18px;overflow:hidden;display:flex;flex-direction:column;box-shadow:' + colors.winShadow + ';z-index:2147483646;opacity:0;pointer-events:none;transform:translateY(12px) scale(.97);transition:opacity .22s,transform .22s cubic-bezier(.34,1.56,.64,1)}' +
    '#_cw_w.open{opacity:1;pointer-events:all;transform:none}' +
    '#_cw_h{background:' + accent + ';padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}' +
    '#_cw_av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}' +
    '#_cw_hn{color:#fff;font-weight:600;font-size:14px;line-height:1.2}' +
    '#_cw_hs{color:rgba(255,255,255,.7);font-size:11px;margin-top:2px}' +
    '#_cw_ms{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;background:' + colors.winBg + '}' +
    '#_cw_ms::-webkit-scrollbar{width:3px}' +
    '#_cw_ms::-webkit-scrollbar-thumb{background:' + colors.scrollThumb + ';border-radius:99px}' +
    '._m{display:flex;flex-direction:column;max-width:82%;animation:_pop .18s ease}' +
    '@keyframes _pop{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}' +
    '._m.b{align-self:flex-start}._m.u{align-self:flex-end}' +
    '._mb{padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.6;word-break:break-word;white-space:pre-wrap}' +
    '._m.b ._mb{background:' + colors.botBg + ';color:' + colors.botText + ';border-bottom-left-radius:3px}' +
    '._m.u ._mb{background:' + accent + ';color:#fff;border-bottom-right-radius:3px}' +
    '._ml{font-size:10.5px;color:' + colors.label + ';margin-bottom:3px;font-weight:500}' +
    '._m.u ._ml{text-align:right}' +
    '._dots{display:inline-flex;gap:4px;padding:4px 0}' +
    '._dots span{width:6px;height:6px;border-radius:50%;background:' + colors.dotsBg + ';animation:_dt 1.1s infinite ease-in-out}' +
    '@keyframes _dt{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}' +
    '#_cw_ia{display:flex;align-items:flex-end;gap:8px;padding:10px 12px;border-top:1px solid ' + colors.iaBorder + ';flex-shrink:0;background:' + colors.iaBg + '}' +
    '#_cw_i{flex:1;border:1.5px solid ' + colors.inputBorder + ';border-radius:10px;padding:8px 12px;font-size:13.5px;resize:none;outline:none;max-height:90px;overflow-y:auto;line-height:1.5;background:' + colors.inputBg + ';color:' + colors.inputText + ';transition:border-color .2s;font-family:inherit}' +
    '#_cw_i:focus{border-color:' + accent + ';background:' + colors.inputBg + '}' +
    '#_cw_i:disabled{opacity:.45}' +
    '#_cw_i::placeholder{color:' + colors.placeholder + '}' +
    '#_cw_s{width:36px;height:36px;border-radius:9px;background:' + accent + ';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s}' +
    '#_cw_s:hover:not(:disabled){opacity:.85}' +
    '#_cw_s:disabled{opacity:.35;cursor:default}' +
    '#_cw_s svg{width:15px;height:15px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +
    '#_cw_ft{text-align:center;font-size:10px;color:#ccc;padding:0 0 8px;flex-shrink:0}' +
    '@media(max-width:420px){#_cw_w{right:0;left:0;bottom:0;width:100%;height:75vh;border-radius:20px 20px 0 0}#_cw_b{bottom:16px;right:16px}}';
  }
  function injectStyle(colors, accent){
    var css = buildCss(colors, accent);
    var el = document.getElementById('_cw_style');
    if (el) el.textContent = css;
    else { el = document.createElement('style'); el.id = '_cw_style'; el.textContent = css; document.head.appendChild(el); }
  }
  injectStyle(C, ACCENT);
  var VISITOR_ID = (function(){
    try {
      var k='bolnee_vid';
      var v=localStorage.getItem(k);
      if(!v){ v='vid_'+Math.random().toString(36).slice(2,9)+'_'+Date.now().toString(36); localStorage.setItem(k,v); }
      return v;
    } catch(e){ return 'vid_'+Math.random().toString(36).slice(2,9); }
  })();
  var BOT_ID = (function(){ try { var m = (CHAT_URL||'').match(/\/chat\/([^\/\?#]+)/); return m ? m[1] : null; } catch(e){ return null; } })();
  var HISTORY_KEY = BOT_ID ? 'bolnee_msgs_' + BOT_ID : null;
  var GREETED_KEY = BOT_ID ? 'bolnee_greeted_' + BOT_ID : null;

  // Live theme/accent sync - fetch actual dashboard settings so old embeds respect dark mode without re-copy
   function fetchLiveAppearance(){
     try {
       if (!BOT_ID) return;
       var baseUrl = '';
       if (CHAT_URL) {
         try { baseUrl = new URL(CHAT_URL).origin + '/'; } catch(e) { baseUrl = ''; }
       }
       if (!baseUrl) {
         var scripts = document.getElementsByTagName('script');
         for (var i = 0; i < scripts.length; i++) {
           var src = scripts[i].src;
           if (src && src.includes('chatbot-widget.js')) {
             baseUrl = src.substring(0, src.lastIndexOf('/') + 1);
             break;
           }
         }
       }
       if (!baseUrl) baseUrl = '/';
       var url = baseUrl.replace(/\/$/, '') + '/api/public/appearance/' + encodeURIComponent(BOT_ID);
       fetch(url, { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : null; }).then(function(data){
         if (!data) return;
        var liveTheme = (data.theme || '').toString().trim().toLowerCase();
        var liveAccent = data.accentColor || ACCENT;
        var shouldBeDark = liveTheme === 'dark' ? true : liveTheme === 'light' ? false : liveTheme === 'auto' ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) : _isDark;
        // Make avatar/widgetIcon absolute if they are relative paths; handle both name/botName from API
        var liveAvatar = data.avatar;
        if (liveAvatar && liveAvatar.indexOf('/') === 0) liveAvatar = baseUrl.replace(/\/$/, '') + liveAvatar;
        var liveWidgetIcon = data.widgetIcon;
        if (liveWidgetIcon && liveWidgetIcon.indexOf('/') === 0) liveWidgetIcon = baseUrl.replace(/\/$/, '') + liveWidgetIcon;
        var liveName = data.botName || data.name;
        var needsUpdate = false;
        if (liveTheme && shouldBeDark !== _isDark) needsUpdate = true;
        if (liveAccent && liveAccent !== ACCENT) needsUpdate = true;
        if (liveWidgetIcon !== undefined && liveWidgetIcon !== WIDGET_ICON) needsUpdate = true;
        if (liveAvatar !== undefined && liveAvatar !== AVATAR) needsUpdate = true;
        if (liveName && liveName !== BOT_NAME) needsUpdate = true;
        if (!needsUpdate) return;
        _isDark = shouldBeDark;
        if (liveAccent) ACCENT = liveAccent;
        if (liveName) BOT_NAME = liveName;
        if (data.greeting) GREETING = data.greeting;
        if (liveAvatar) AVATAR = liveAvatar;
        if (liveWidgetIcon) WIDGET_ICON = liveWidgetIcon;
         C = getColors(_isDark);
         injectStyle(C, ACCENT);
         // update already-rendered header/button/window colors if DOM exists
         try {
           var hdr = document.getElementById('_cw_h'); if (hdr) hdr.style.background = ACCENT;
           var btn = document.getElementById('_cw_b'); if (btn) btn.style.background = ACCENT;
           var win = document.getElementById('_cw_w'); if (win) { win.style.background = C.winBg; win.style.borderColor = C.winBorder; }
           var ms = document.getElementById('_cw_ms'); if (ms) ms.style.background = C.winBg;
           var ia = document.getElementById('_cw_ia'); if (ia) { ia.style.background = C.iaBg; ia.style.borderTopColor = C.iaBorder; }
           var hn = document.getElementById('_cw_hn'); if (hn && liveName) hn.textContent = liveName;
          var avEl2 = document.getElementById('_cw_av'); if (avEl2 && liveAvatar) {
              var src2 = liveAvatar + (liveAvatar.indexOf('/api/public/avatar/') !== -1 && liveAvatar.indexOf('?') === -1 ? '?v=' + Date.now() : '');
              avEl2.innerHTML = '';
              var img2 = document.createElement('img');
              img2.src = src2;
              img2.alt = '';
              img2.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
              img2.onerror = function(){ this.style.display='none'; this.parentNode.textContent='\uD83E\uDD16'; };
              avEl2.appendChild(img2);
              avEl2.style.background = 'transparent'; avEl2.style.overflow = 'hidden'; avEl2.style.padding = '0';
            }
            var btnEl2 = document.getElementById('_cw_b'); if (btnEl2) {
              if (WIDGET_ICON) {
                var src2 = WIDGET_ICON + (WIDGET_ICON.indexOf('/api/public/widget-icon/') !== -1 && WIDGET_ICON.indexOf('?') === -1 ? '?v=' + Date.now() : '');
                btnEl2.innerHTML = '';
                var img3 = document.createElement('img');
                img3.src = src2;
                img3.alt = '';
                img3.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
                img3.onerror = function(){ this.style.display='none'; this.parentNode.innerHTML='\uD83E\uDD16'; };
                btnEl2.appendChild(img3);
              } else {
                btnEl2.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3C6.48 3 2 6.92 2 11.8c0 2.2.87 4.2 2.32 5.74L3 21l4.13-1.59A10.97 10.97 0 0012 20.6c5.52 0 10-3.92 10-8.8C22 6.92 17.52 3 12 3z"/></svg>';
              }
            }
         } catch(e){}
       }).catch(function(){});
     } catch(e){}
   }
   // Initial fetch and periodic updates every 15 seconds
   fetchLiveAppearance();
   setInterval(fetchLiveAppearance, 15000);

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
  var engine       = null;

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

  // Show avatar image if provided (data URL or http URL)
  try {
    var avEl = document.getElementById('_cw_av');
    if (avEl && AVATAR) {
      var avSrc = AVATAR + (AVATAR.indexOf('/api/public/avatar/') !== -1 && AVATAR.indexOf('?') === -1 ? '?v=' + Date.now() : '');
      avEl.innerHTML = '';
      var avImg = document.createElement('img');
      avImg.src = avSrc;
      avImg.alt = '';
      avImg.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
      avImg.onerror = function(){ this.style.display='none'; this.parentNode.textContent='\uD83E\uDD16'; };
      avEl.appendChild(avImg);
      avEl.style.background = 'transparent';
      avEl.style.overflow = 'hidden';
      avEl.style.padding = '0';
    }
    var btnEl = document.getElementById('_cw_b');
    if (btnEl) {
      if (WIDGET_ICON) {
        var src = WIDGET_ICON + (WIDGET_ICON.indexOf('/api/public/widget-icon/') !== -1 && WIDGET_ICON.indexOf('?') === -1 ? '?v=' + Date.now() : '');
        btnEl.innerHTML = '';
        var btnImg = document.createElement('img');
        btnImg.src = src;
        btnImg.alt = '';
        btnImg.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
        btnImg.onerror = function(){ this.style.display='none'; this.parentNode.innerHTML='\uD83E\uDD16'; };
        btnEl.appendChild(btnImg);
      } else {
        btnEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3C6.48 3 2 6.92 2 11.8c0 2.2.87 4.2 2.32 5.74L3 21l4.13-1.59A10.97 10.97 0 0012 20.6c5.52 0 10-3.92 10-8.8C22 6.92 17.52 3 12 3z"/></svg>';
      }
    }
  } catch(e){}

  // --- persistence helpers: store history so greeting shows only once and chat survives open/close ---
  function saveHistory() {
    if (!HISTORY_KEY) return;
    try {
      var nodes = msgs.querySelectorAll('._m');
      var arr = [];
      for (var i=0;i<nodes.length;i++) {
        var n = nodes[i];
        var who = n.classList.contains('u') ? 'user' : 'bot';
        var txt = n.querySelector('._mb'); txt = txt ? txt.textContent : '';
        // skip typing indicator
        if (n.id === '_cwt') continue;
        arr.push({ who: who, text: txt });
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
      if (arr.length) localStorage.setItem(GREETED_KEY, '1');
    } catch(e){}
  }
  function loadHistory() {
    if (!HISTORY_KEY) return false;
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return false;
      var arr = JSON.parse(raw);
      if (!arr || !arr.length) return false;
      for (var i=0;i<arr.length;i++) {
        var item = arr[i];
        // render without saving again
        var d = document.createElement('div');
        d.className = '_m ' + (item.who === 'user' ? 'u' : 'b');
        var label = document.createElement('div');
        label.className = '_ml';
        label.textContent = item.who === 'user' ? 'You' : BOT_NAME;
        var bubble2 = document.createElement('div');
        bubble2.className = '_mb';
        bubble2.textContent = item.text || '';
        d.appendChild(label);
        d.appendChild(bubble2);
        msgs.appendChild(d);
      }
      msgs.scrollTop = msgs.scrollHeight;
      return true;
    } catch(e){ return false; }
  }

  bubble.addEventListener('click', function() {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    bubble.classList.toggle('open', isOpen);
    if (isOpen && !engine) boot();
    if (isOpen && ready) inp.focus();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) bubble.click();
  });

  function boot() {
    engine = true;
    ready = true;
    enableInput();
    // Restore previous conversation if any - prevents greeting duplication on open/close
    var hadHistory = loadHistory();
    if (hadHistory) return;
    // Also guard against stale GREETED flag without history (edge case)
    try { if (GREETED_KEY && localStorage.getItem(GREETED_KEY)) return; } catch(e){}
    // If container already has a greeting (should not happen due to history check), skip
    if (msgs.querySelector('._m')) return;
    if (CHAT_URL) {
      addMsg('bot', GREETING);
      return;
    }
    addMsg('bot', 'This chatbot is not configured with a server chat URL yet.');
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
    inp.value  = '';
    inp.style.height = 'auto';
    inp.disabled     = true;
    sendBtn.disabled = true;

    addMsg('user', text);

    if (CHAT_URL) {
      addTyping();
      var BOT_ID_EXTRACT = (function(u){ try { var m = u.match(/\/chat\/([^\/\?#]+)/); return m ? m[1] : null; } catch(e){ return null; } })(CHAT_URL);
      var FALLBACK_URL = BOT_ID_EXTRACT ? baseUrl + 'api/public/chat/' + BOT_ID_EXTRACT : null;
      function doFetch(url) {
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
      }
      function handleSSEText(text, answerEl) {
        var saw = false;
        text.split('\n').forEach(function(line){
          if (!line.startsWith('data: ') || line === 'data: [DONE]') return;
          try {
            var p = JSON.parse(line.slice(6));
            if (p.token) { saw = true; answerEl.querySelector('._mb').textContent += p.token; msgs.scrollTop = msgs.scrollHeight; }
            else if (p.error) { saw = true; answerEl.querySelector('._mb').textContent += p.error; msgs.scrollTop = msgs.scrollHeight; }
            else if (p.sources && p.sources.length) {
              var src = p.sources.slice(0,3).map(function(s){ return s.title || s.url; }).filter(Boolean).join(', ');
              if (src) answerEl.querySelector('._mb').textContent += '\n\nSources: ' + src;
            }
          } catch(e){ console.warn('[chatbot-widget] Invalid SSE', e); }
        });
        return saw;
      }
      function handleStream(response) {
        if (!response.ok) throw new Error('Chat HTTP ' + response.status);
        if (!response.body) throw new Error('No response body');
        // If body is already locked (old SW v2 bug), retry bypassing SW
        if (response.body.locked) throw new Error('ReadableStream locked - old service worker');
        var answer = addMsg('bot', '');
        var reader;
        try {
          reader = response.body.getReader();
        } catch (e) {
          // Fallback to text() for locked streams (old SW)
          console.warn('[chatbot-widget] getReader failed, falling back to text()', e);
          return response.text().then(function(t){
            var saw = handleSSEText(t, answer);
            if (!saw) answer.querySelector('._mb').textContent = 'No response from server.';
            try{saveHistory();}catch(e){}
          }).catch(function(err2){
            // If text() also fails due to locked, re-fetch bypassing SW
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
              return navigator.serviceWorker.getRegistrations().then(function(rs){
                rs.forEach(function(r){ try { r.unregister(); } catch(_){} });
                return doFetch(CHAT_URL + (CHAT_URL.indexOf('?')===-1 ? '?' : '&') + 'bypass_sw=' + Date.now()).then(handleStream);
              });
            }
          });
        }
        var decoder = new TextDecoder();
        var buffer = '';
        var sawToken = false;

        function read() {
          return reader.read().then(function(result) {
            if (result.done) return;
            buffer += decoder.decode(result.value, { stream: true });
            var events = buffer.split('\n');
            buffer = events.pop() || '';
            events.forEach(function(event) {
              if (!event.startsWith('data: ') || event === 'data: [DONE]') return;
              try {
                var payload = JSON.parse(event.slice(6));
                if (payload.token) {
                  sawToken = true;
                  answer.querySelector('._mb').textContent += payload.token;
                  msgs.scrollTop = msgs.scrollHeight;
                } else if (payload.error) {
                  sawToken = true;
                  answer.querySelector('._mb').textContent += payload.error;
                  msgs.scrollTop = msgs.scrollHeight;
                } else if (payload.sources && payload.sources.length) {
                  var src = payload.sources.slice(0,3).map(function(s){ return s.title || s.url; }).filter(Boolean).join(', ');
                  if (src) answer.querySelector('._mb').textContent += '\n\nSources: ' + src;
                }
              } catch (error) {
                console.warn('[chatbot-widget] Invalid chat event', error);
              }
            });
            return read();
          }).catch(function(err){
            // Stream read error - fallback to showing what we have
            console.warn('[chatbot-widget] Stream read error', err);
            if (!sawToken) throw err;
          });
        }
        return read().then(function(){ if (!sawToken) answer.querySelector('._mb').textContent = 'No response from server.'; try{saveHistory();}catch(e){} });
      }
      function doFetchWithBypass(url) {
        // Bypass service worker cache for SSE, include visitorId for grouping
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'X-Visitor-Id': VISITOR_ID },
          body: JSON.stringify({ message: text, visitorId: VISITOR_ID }),
          cache: 'no-store'
        });
      }
      // Override doFetch to use bypass
      doFetch = doFetchWithBypass;
      doFetch(CHAT_URL).then(handleStream).catch(function(err){
        var isLocked = err && err.message && (err.message.indexOf('locked') !== -1 || err.message.indexOf('getReader') !== -1);
        if (isLocked && navigator.serviceWorker && navigator.serviceWorker.controller) {
          console.warn('[chatbot-widget] Stream locked by old SW, unregistering and retrying');
          return navigator.serviceWorker.getRegistrations().then(function(rs){
            var ps = rs.map(function(r){ try { r.unregister(); } catch(_){ return Promise.resolve(); } });
            return Promise.all(ps).then(function(){
              // After unregister, retry with cache-busted URL
              return doFetch(CHAT_URL + (CHAT_URL.indexOf('?')===-1 ? '?' : '&') + 'sw_bypass=' + Date.now()).then(handleStream);
            });
          });
        }
        // Port fallback: if CHAT_URL was on stale localhost:3001 but server moved to 3000, try baseUrl fallback
        if (FALLBACK_URL && FALLBACK_URL !== CHAT_URL) {
          console.warn('[chatbot-widget] Primary chatUrl failed, trying fallback', FALLBACK_URL, err);
          return doFetch(FALLBACK_URL).then(handleStream);
        }
        throw err;
      }).catch(function(error) {
        console.error('[chatbot-widget] Server chat failed:', error);
        var msg = error && error.message && error.message.indexOf('Failed to fetch') !== -1
          ? 'Cannot reach chat server (' + CHAT_URL + '). If you copied the embed from localhost, the server must be running and reachable from this page. For external sites, deploy Bolnee and use the public URL.'
          : 'Sorry, I could not process that question right now. (' + (error.message || 'unknown') + ')';
        // If we already created an answer bubble but it is empty, reuse it, else create new
        var last = msgs.querySelector('._m.b:last-child ._mb');
        if (last && !last.textContent.trim()) { last.textContent = msg; try{saveHistory();}catch(e){} }
        else addMsg('bot', msg);
      })
        .finally(function() {
          rmTyping();
          waiting = false;
          enableInput();
          try{saveHistory();}catch(e){}
        });
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
    try { saveHistory(); } catch(e){}
    return d;
  }

})();