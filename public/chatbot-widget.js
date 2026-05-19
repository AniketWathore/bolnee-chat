// /**
//  * chatbot-widget.js — self-contained embeddable AI chatbot
//  *
//  * EMBED ON ANY WEBSITE:
//  *   <script>
//  *     window.BotConfig = {
//  *       botName:      'Aria',
//  *       accentColor:  '#6366f1',
//  *       greeting:     'Hi! How can I help?',
//  *       systemPrompt: 'You are a helpful assistant.',
//  *       modelId:      'onnx-community/Qwen3-0.6B-ONNX',
//  *     };
//  *   </script>
//  *   <script src="https://bolneedemovercel.vercel.app/chatbot-widget.js" async></script>
//  */
// (function () {
//   'use strict';

//   const cfg = window.BotConfig || {};
//   const ACCENT = cfg.accentColor || '#6366f1';
//   const BOT_NAME = cfg.botName || 'AI Assistant';
//   const GREETING = cfg.greeting || "Hi! I'm running entirely in your browser. How can I help?";
//   const SYSTEM = cfg.systemPrompt || 'You are a helpful assistant. Answer concisely. If you do not have information to answer, say so — do not make things up.';
//   const MODEL_ID = cfg.modelId || 'onnx-community/Qwen3-0.6B-ONNX';
//   const TF_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';
//   const KNOWLEDGE_URL = cfg.knowledgeUrl || null;

//   /* ── Styles ── */
//   document.head.insertAdjacentHTML('beforeend', `<style>
//     #_cw*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,sans-serif}
//     #_cw_b{position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:${ACCENT};border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px ${ACCENT}55;z-index:2147483647;transition:transform .2s,box-shadow .2s}
//     #_cw_b:hover{transform:scale(1.08)}
//     #_cw_b svg{width:24px;height:24px;fill:#fff;transition:transform .25s}
//     #_cw_b.open svg{transform:rotate(45deg)}
//     #_cw_w{position:fixed;bottom:92px;right:24px;width:360px;height:500px;background:#fff;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,.18);z-index:2147483646;opacity:0;pointer-events:none;transform:translateY(12px) scale(.97);transition:opacity .22s,transform .22s cubic-bezier(.34,1.56,.64,1)}
//     #_cw_w.open{opacity:1;pointer-events:all;transform:none}
//     #_cw_h{background:${ACCENT};padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}
//     #_cw_av{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
//     #_cw_hn{color:#fff;font-weight:600;font-size:14px}
//     #_cw_hs{color:rgba(255,255,255,.7);font-size:11px;margin-top:1px}
//     #_cw_dl{background:#f5f5fa;border-bottom:1px solid #eee;padding:8px 14px;font-size:12px;color:#555;display:none;align-items:center;gap:8px;flex-shrink:0}
//     #_cw_dl.on{display:flex}
//     #_cw_db{flex:1;height:4px;background:#ddd;border-radius:99px;overflow:hidden}
//     #_cw_df{height:100%;background:${ACCENT};width:0%;transition:width .3s;border-radius:99px}
//     #_cw_ms{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}
//     #_cw_ms::-webkit-scrollbar{width:3px}
//     #_cw_ms::-webkit-scrollbar-thumb{background:#ddd;border-radius:99px}
//     ._m{display:flex;flex-direction:column;max-width:80%;animation:_pop .18s ease}
//     @keyframes _pop{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
//     ._m.b{align-self:flex-start}._m.u{align-self:flex-end}
//     ._mb{padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.55;word-break:break-word}
//     ._m.b ._mb{background:#f0f0f7;color:#111;border-bottom-left-radius:3px}
//     ._m.u ._mb{background:${ACCENT};color:#fff;border-bottom-right-radius:3px}
//     ._ml{font-size:10.5px;color:#aaa;margin-bottom:3px;font-weight:500}
//     ._m.u ._ml{text-align:right}
//     ._dots{display:inline-flex;gap:4px;padding:4px 0}
//     ._dots span{width:6px;height:6px;border-radius:50%;background:#bbb;animation:_dt 1.1s infinite ease-in-out}
//     ._dots span:nth-child(2){animation-delay:.18s}._dots span:nth-child(3){animation-delay:.36s}
//     @keyframes _dt{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}
//     #_cw_ia{display:flex;align-items:flex-end;gap:8px;padding:10px 12px;border-top:1px solid #f0f0f5;flex-shrink:0;background:#fff}
//     #_cw_i{flex:1;border:1.5px solid #e0e0ea;border-radius:10px;padding:8px 12px;font-size:13.5px;resize:none;outline:none;max-height:90px;overflow-y:auto;line-height:1.45;background:#fafafd;color:#111;transition:border-color .2s;font-family:inherit}
//     #_cw_i:focus{border-color:${ACCENT};background:#fff}
//     #_cw_i:disabled{opacity:.45}
//     #_cw_i::placeholder{color:#bbb}
//     #_cw_s{width:36px;height:36px;border-radius:9px;background:${ACCENT};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s}
//     #_cw_s:hover:not(:disabled){opacity:.85}
//     #_cw_s:disabled{opacity:.35;cursor:default}
//     #_cw_s svg{width:15px;height:15px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
//     #_cw_ft{text-align:center;font-size:10px;color:#ccc;padding:0 0 8px;flex-shrink:0}
//     @media(max-width:420px){#_cw_w{right:0;left:0;bottom:0;width:100%;height:72vh;border-radius:20px 20px 0 0}#_cw_b{bottom:16px;right:16px}}
//   </style>`);

//   /* ── HTML ── */
//   document.body.insertAdjacentHTML('beforeend', `
//     <div id="_cw">
//       <button id="_cw_b" aria-label="Open chat">
//         <svg viewBox="0 0 24 24"><path d="M12 3C6.48 3 2 6.92 2 11.8c0 2.2.87 4.2 2.32 5.74L3 21l4.13-1.59A10.97 10.97 0 0012 20.6c5.52 0 10-3.92 10-8.8C22 6.92 17.52 3 12 3z"/></svg>
//       </button>
//       <div id="_cw_w">
//         <div id="_cw_h">
//           <div id="_cw_av">🤖</div>
//           <div><div id="_cw_hn">${BOT_NAME}</div><div id="_cw_hs">Runs in your browser · No server</div></div>
//         </div>
//         <div id="_cw_dl">
//           <span id="_cw_dt">Downloading model…</span>
//           <div id="_cw_db"><div id="_cw_df"></div></div>
//           <span id="_cw_dp">0%</span>
//         </div>
//         <div id="_cw_ms"></div>
//         <div id="_cw_ia">
//           <textarea id="_cw_i" placeholder="Message…" rows="1" disabled></textarea>
//           <button id="_cw_s" disabled>
//             <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
//           </button>
//         </div>
//         <div id="_cw_ft">Powered by Transformers.js · 100% in-browser</div>
//       </div>
//     </div>`);

//   /* ── Refs ── */
//   const B = id => document.getElementById(id);
//   const bubble = B('_cw_b'), win = B('_cw_w');
//   const dlBar = B('_cw_dl'), dlText = B('_cw_dt'), dlFill = B('_cw_df'), dlPct = B('_cw_dp');
//   const msgs = B('_cw_ms'), inp = B('_cw_i'), send = B('_cw_s'), hstatus = B('_cw_hs');

//   /* ── State ── */
//   let worker = null, isOpen = false, ready = false, generating = false;
//   let history = [{ role: 'system', content: SYSTEM }];
//   let streamEl = null;
//   let knowledgeData = null;
//   let intentDetector = null;

//   /* ── Toggle ── */
//   bubble.addEventListener('click', () => {
//     isOpen = !isOpen;
//     win.classList.toggle('open', isOpen);
//     bubble.classList.toggle('open', isOpen);
//     if (isOpen && !worker) boot();
//     if (isOpen && ready) inp.focus();
//   });
//   document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) bubble.click(); });

//   /* ────────────────────────────────────────────────────────────────────────
//      WORKER CODE — classic worker using dynamic import()
//      • Classic worker (no type:'module') = works in ALL browsers
//      • Dynamic import() inside classic worker = supported since Chrome80/FF89
//      • numThreads:1 = disables WASM sub-worker spawning (the root cause of
//        the SecurityError when running inside a blob worker context)
//   ──────────────────────────────────────────────────────────────────────── */
//   const WORKER_SRC = `
// let tf = null;
// let pipe = null;

// // Load Transformers.js via dynamic import (works in classic workers)
// const tfReady = import('${TF_URL}').then(m => { tf = m; });

// self.onmessage = async ({ data }) => {
//   await tfReady; // wait for transformers.js before doing anything
//   if (data.type === 'LOAD') await load(data.modelId);
//   if (data.type === 'GEN')  await gen(data.messages, data.config);
// };

// async function load(modelId) {
//   self.postMessage({ type: 'STATUS', text: 'Loading ' + modelId.split('/').pop() + ' ...' });
//   try {
//     tf.env.allowRemoteModels = true;
//     tf.env.useBrowserCache   = true;

//     // CRITICAL: disable multi-threading so Transformers.js does NOT try to
//     // spawn sub-workers (which fail from a blob worker context)
//     tf.env.backends.onnx.wasm.numThreads = 1;

//     // Let Transformers.js auto-select the best available quantization
//     pipe = await tf.pipeline('text-generation', modelId, {
//       device: 'wasm',
//       progress_callback(p) {
//         if (p.status === 'progress' && p.total) {
//           self.postMessage({ type: 'DL', pct: Math.round(p.loaded / p.total * 100) });
//         }
//       },
//     });
//     self.postMessage({ type: 'READY' });
//   } catch(e) {
//     self.postMessage({ type: 'ERR', msg: 'Model load failed: ' + e.message });
//   }
// }

// async function gen(messages, config) {
//   if (!pipe) return self.postMessage({ type: 'ERR', msg: 'Model not loaded.' });
//   try {
//     const streamer = new tf.TextStreamer(pipe.tokenizer, {
//       skip_prompt: true,
//       skip_special_tokens: true,
//       callback_function(tok) { self.postMessage({ type: 'TOKEN', token: tok }); },
//     });
//     await pipe(messages, {
//       max_new_tokens:     config.max_new_tokens || 200,
//       temperature:        config.temperature    || 0.7,
//       do_sample:          true,
//       repetition_penalty: 1.1,
//       streamer,
//     });
//     self.postMessage({ type: 'DONE' });
//   } catch(e) {
//     self.postMessage({ type: 'ERR', msg: e.message });
//   }
// }
// `;

//   /* ── Boot ── */
//   function boot() {
//     addMsg('bot', GREETING);
//     const blob = new Blob([WORKER_SRC], { type: 'application/javascript' });
//     const url = URL.createObjectURL(blob);
//     // Classic worker — NO { type:'module' }
//     worker = new Worker(url);
//     URL.revokeObjectURL(url);

//     worker.onerror = e => {
//       addErr('Engine error: ' + (e.message || 'check browser console for details'));
//       console.error('[chatbot-widget] worker error:', e);
//     };

//     worker.onmessage = ({ data }) => {
//       if (data.type === 'STATUS') {
//         dlText.textContent = data.text;
//         dlBar.classList.add('on');
//       }
//       if (data.type === 'DL') {
//         dlFill.style.width = data.pct + '%';
//         dlPct.textContent = data.pct + '%';
//         dlText.textContent = 'Downloading... ' + data.pct + '%';
//       }
//       if (data.type === 'READY') {
//         ready = true;
//         dlBar.classList.remove('on');
//         hstatus.textContent = '● Online · In-browser AI';
//         inp.disabled = false;
//         send.disabled = false;
//         inp.focus();
//       }
//       if (data.type === 'TOKEN') {
//         if (!streamEl) { rmTyping(); streamEl = addMsg('bot', ''); }
//         streamEl.querySelector('._mb').textContent += data.token;
//         msgs.scrollTop = msgs.scrollHeight;
//       }
//       if (data.type === 'DONE') {
//         generating = false;
//         if (streamEl) {
//           history.push({ role: 'assistant', content: streamEl.querySelector('._mb').textContent });
//           streamEl = null;
//         }
//         rmTyping();
//         inp.disabled = false; send.disabled = false; inp.focus();
//       }
//       if (data.type === 'ERR') {
//         addErr(data.msg); generating = false; streamEl = null;
//         rmTyping(); inp.disabled = false; send.disabled = false;
//       }
//     };

//     worker.postMessage({ type: 'LOAD', modelId: MODEL_ID });

//     // Fetch knowledge data for intent detection
//     if (KNOWLEDGE_URL) {
//       fetch(KNOWLEDGE_URL)
//         .then(function (r) {
//           if (!r.ok) throw new Error('Knowledge fetch failed: ' + r.status);
//           return r.json();
//         })
//         .then(function (data) {
//           knowledgeData = data;
//           if (window.BolneeIntentDetector) {
//             intentDetector = new window.BolneeIntentDetector(knowledgeData);
//             hstatus.textContent = '\u2713 Knowledge loaded \u00B7 In-browser AI';
//             addDebug('[Boot] Knowledge loaded: ' + ((data.products || []).length + (data.faqs || []).length) + ' items, IntentDetector ready');
//           } else {
//             addDebug('[Boot] Knowledge fetched but IntentDetector class not found on window');
//           }
//         })
//         .catch(function (err) {
//           addDebug('[Boot] Knowledge fetch FAILED: ' + err.message);
//         });
//     }
//   }

//   /* ── Debug helper ── */
//   function addDebug(msg) {
//     const d = document.createElement('div');
//     d.className = '_m b';
//     d.style.opacity = '0.7';
//     d.innerHTML = '<div class="_mb" style="background:#e8e8f0;color:#555;font-size:11px;padding:6px 10px;border-radius:8px;font-family:monospace">\u2699 ' + esc(msg) + '</div>';
//     msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
//   }

//   /* ── Knowledge intents: route through model with data block ── */
//   var KNOWLEDGE_INTENTS = {
//     BUDGET_FILTER: 1, PRICE: 1, STOCK: 1, PRODUCT_SEARCH: 1,
//     ABOUT: 1, RETURN_POLICY: 1, SHIPPING: 1, WARRANTY: 1,
//     CONTACT: 1, HOURS: 1, FAQ: 1
//   };

//   /* ── Format messages as Qwen3 chat template ── */
//   function buildQwenPrompt(messages) {
//     var lines = [];
//     for (var i = 0; i < messages.length; i++) {
//       var role = messages[i].role;
//       var content = messages[i].content;
//       var isLast = i === messages.length - 1;
//       if (isLast && role === 'assistant') {
//         lines.push('<|im_start|>' + role + '\n' + content);
//       } else {
//         lines.push('<|im_start|>' + role + '\n' + content + '<|im_end|>');
//       }
//     }
//     var last = messages[messages.length - 1];
//     if (last.role !== 'assistant') {
//       lines.push('<|im_start|>assistant\n');
//     }
//     return lines.join('\n');
//   }

//   /* ── Send ── */
//   function doSend() {
//     const text = inp.value.trim();
//     if (!text || !ready || generating) return;
//     generating = true; inp.value = ''; resize();
//     addMsg('user', text);
//     history.push({ role: 'user', content: text });

//     var handled = false;

//     if (intentDetector && knowledgeData) {
//       try {
//         var detection = intentDetector.detect(text);

//         var dbg = '[Intent] ' + detection.intent + ' | Confidence: ' + detection.confidence + '%';
//         if (detection.queryResult && detection.queryResult.found) {
//           var items = detection.queryResult.data;
//           var count = Array.isArray(items) ? items.length : 1;
//           dbg += ' | Matched: ' + count + ' item(s)';
//         }
//         addDebug(dbg);

//         // Knowledge intent with sufficient confidence → show data + generate response
//         if (detection.confidence >= 50 && KNOWLEDGE_INTENTS[detection.intent] && detection.promptData && detection.promptData.dataBlock) {
//           var pd = detection.promptData;

//           // First, display the retrieved data to user
//           var dataDisplay = '';
//           if (detection.intent === 'BUDGET_FILTER' || detection.intent === 'PRICE' || detection.intent === 'STOCK' || detection.intent === 'PRODUCT_SEARCH') {
//             var items = detection.queryResult.data;
//             if (Array.isArray(items) && items.length > 0) {
//               dataDisplay = 'Found ' + items.length + ' product(s):\n';
//               items.slice(0, 5).forEach(function (p, idx) {
//                 dataDisplay += (idx + 1) + '. ' + p.name + ' - ₹' + p.price;
//                 if (p.inStock) dataDisplay += ' (In Stock)';
//                 else dataDisplay += ' (Out of Stock)';
//                 dataDisplay += '\n';
//               });
//               if (items.length > 5) dataDisplay += '\n... and ' + (items.length - 5) + ' more';
//             }
//           } else if (detection.intent === 'ABOUT') {
//             dataDisplay = 'About: ' + (queryResult.data.about || 'N/A');
//           } else if (detection.intent === 'RETURN_POLICY' || detection.intent === 'SHIPPING' || detection.intent === 'WARRANTY') {
//             dataDisplay = 'Policy: ' + (queryResult.data.policy || 'N/A');
//           } else if (detection.intent === 'CONTACT') {
//             var c = queryResult.data.contact || {};
//             dataDisplay = 'Contact: ' + (c.mobile || 'N/A') + ' | ' + (c.email || 'N/A');
//           }

//           if (dataDisplay) {
//             addMsg('bot', dataDisplay);
//           }

//           // Then generate concise response via model
//           var modelMessages = [
//             { role: 'system', content: 'You are a helpful shopping assistant. Answer in 1-2 sentences using ONLY the provided product data. Be concise and friendly.' },
//             { role: 'user', content: 'User query: ' + text + '\n\nProduct Data:\n' + pd.dataBlock },
//             { role: 'assistant', content: '' }
//           ];
//           streamEl = null;
//           rmTyping();
//           streamEl = addMsg('bot', '');
//           inp.disabled = true; send.disabled = true;
//           worker.postMessage({ type: 'GEN', messages: buildQwenPrompt(modelMessages), config: { max_new_tokens: 60, temperature: 0.6 } });
//           handled = true;
//         }
//       } catch (e) {
//         addDebug('[Error] Intent detection: ' + e.message);
//         console.error(e);
//       }
//     } else {
//       var reason = !intentDetector ? 'IntentDetector not initialized' : 'Knowledge data not loaded';
//       addDebug('[Debug] ' + reason);
//     }

//     // Fallback to model for general chat
//     if (!handled) {
//       addDebug('[Model] Sending to AI model…');
//       addTyping();
//       inp.disabled = true; send.disabled = true;
//       worker.postMessage({ type: 'GEN', messages: buildQwenPrompt(history), config: { max_new_tokens: 120, temperature: 0.7 } });
//     }
//   }
//   send.addEventListener('click', doSend);
//   inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } });
//   inp.addEventListener('input', resize);
//   function resize() { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 90) + 'px'; }

//   /* ── UI helpers ── */
//   function addMsg(who, text) {
//     const d = document.createElement('div');
//     d.className = '_m ' + (who === 'bot' ? 'b' : 'u');
//     const content = who === 'bot' ? esc(text) : esc(text);
//     d.innerHTML = `<div class="_ml">${who === 'bot' ? BOT_NAME : 'You'}</div><div class="_mb">${content}</div>`;
//     msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
//   }
//   function addTyping() {
//     if (document.getElementById('_cwt')) return;
//     const d = document.createElement('div');
//     d.className = '_m b'; d.id = '_cwt';
//     d.innerHTML = `<div class="_ml">${BOT_NAME}</div><div class="_mb"><div class="_dots"><span></span><span></span><span></span></div></div>`;
//     msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
//   }
//   function rmTyping() { const t = document.getElementById('_cwt'); if (t) t.remove(); }
//   function addErr(msg) {
//     const d = document.createElement('div'); d.className = '_m b';
//     d.innerHTML = `<div class="_mb" style="background:#fee2e2;color:#991b1b;">⚠ ${esc(msg)}</div>`;
//     msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
//   }
//   function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
// })();






/**
 * chatbot-widget.js — self-contained embeddable AI chatbot
 *
 * EMBED ON ANY WEBSITE (paste before </body>):
 * ─────────────────────────────────────────────────────
 *   <script src="https://yourcdn.com/bolnee-intent-detector.js"></script>
 *   <script>
 *     window.BotConfig = {
 *       chatbotId:    'bot_xxxx',          // required
 *       knowledgeUrl: 'https://yourbackend.com/api/public/knowledge/bot_xxxx',
 *       botName:      'Aria',              // optional
 *       accentColor:  '#6366f1',           // optional
 *       greeting:     'Hi! How can I help?', // optional
 *       modelId:      'onnx-community/Qwen3-0.6B-ONNX', // optional
 *     };
 *   </script>
 *   <script src="https://yourcdn.com/chatbot-widget.js" async></script>
 */
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  var cfg          = window.BotConfig || {};
  var ACCENT       = cfg.accentColor  || '#6366f1';
  var BOT_NAME     = cfg.botName      || 'AI Assistant';
  var GREETING     = cfg.greeting     || 'Hi! How can I help you today?';
  var MODEL_ID     = cfg.modelId      || 'onnx-community/Qwen3-0.6B';
  var KNOWLEDGE_URL = cfg.knowledgeUrl || null;
  var TF_URL       = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.0';

  // System prompt for the model — STRICT data-only instructions
  var SYSTEM = cfg.systemPrompt
    || 'You are a shopping assistant. Use ONLY the data provided. Never make up products, prices, or features. Answer from data only.'

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
  var workerType   = null;  // 'external' or 'inline'
  var isOpen       = false;
  var modelReady   = false;
  var kbReady      = false;    // knowledge base loaded
  var generating   = false;
  var history      = [{ role: 'system', content: SYSTEM }];
  var streamEl     = null;
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

  // ── Worker source (inlined — avoids cross-origin restrictions) ───────────────
  var WORKER_SRC = '\n' +
    'let tf = null, pipe = null;\n' +
    'const ready = import("' + TF_URL + '").then(m => { tf = m; });\n' +
    'self.onmessage = async ({ data }) => {\n' +
    '  await ready;\n' +
    '  if (data.type === "LOAD") await load(data.modelId);\n' +
    '  if (data.type === "GEN")  await gen(data.messages, data.config);\n' +
    '};\n' +
    'async function load(modelId) {\n' +
    '  self.postMessage({ type: "STATUS", text: "Loading model…" });\n' +
    '  try {\n' +
    '    tf.env.allowRemoteModels = true;\n' +
    '    tf.env.useBrowserCache = true;\n' +
    '    tf.env.remoteURL = location.origin + "/models/";\n' +
    '    tf.env.backends.onnx.wasm.numThreads = 1;\n' +
    '    pipe = await tf.pipeline("text-generation", modelId, {\n' +
    '      device: "wasm",\n' +
    '      progress_callback(p) {\n' +
    '        if (p.status === "progress" && p.total)\n' +
    '          self.postMessage({ type: "DL", pct: Math.round(p.loaded / p.total * 100) });\n' +
    '      },\n' +
    '    });\n' +
    '    self.postMessage({ type: "READY" });\n' +
    '  } catch(e) {\n' +
    '    self.postMessage({ type: "ERR", msg: "Load failed: " + e.message });\n' +
    '  }\n' +
    '}\n' +
    'async function gen(messages, cfg) {\n' +
    '  if (!pipe) return self.postMessage({ type: "ERR", msg: "Model not loaded." });\n' +
    '  try {\n' +
    '    const streamer = new tf.TextStreamer(pipe.tokenizer, {\n' +
    '      skip_prompt: true, skip_special_tokens: true,\n' +
    '      callback_function(tok) { self.postMessage({ type: "TOKEN", token: tok }); },\n' +
    '    });\n' +
    '    await pipe(messages, {\n' +
    '      max_new_tokens: cfg.max || 150, temperature: cfg.temp || 0.7,\n' +
    '      do_sample: true, repetition_penalty: 1.15, streamer,\n' +
    '    });\n' +
    '    self.postMessage({ type: "DONE" });\n' +
    '  } catch(e) { self.postMessage({ type: "ERR", msg: e.message }); }\n' +
    '}\n';

  // ── Helper to send messages to worker ──────────────────────────────────────────
  function sendToWorker(type, payload) {
    if (!worker) return;
    
    if (workerType === 'external') {
      // External worker expects structured format
      if (type === 'GEN') {
        worker.postMessage({ type: 'GENERATE', payload: payload });
      } else if (type === 'LOAD') {
        worker.postMessage({ type: 'LOAD_MODEL', payload: { modelId: payload.modelId } });
      } else {
        worker.postMessage({ type: type, payload: payload });
      }
    } else {
      // Inline worker expects inline format
      if (type === 'GEN') {
        worker.postMessage({ type: type, ...payload });
      } else {
        worker.postMessage({ type: type, ...payload });
      }
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────────
  function boot() {
    // Use external worker if configured, otherwise use inline worker
    var workerUrl = cfg.workerUrl || null;
    if (workerUrl) {
      try {
        // Try to load as module worker (supports ES6 imports)
        worker = new Worker(workerUrl, { type: 'module' });
        workerType = 'external';
      } catch (e) {
        // Fallback to inline worker if module worker fails
        console.warn('[widget] Module worker failed, using inline worker:', e.message);
        var blob   = new Blob([WORKER_SRC], { type: 'application/javascript' });
        var blobUrl = URL.createObjectURL(blob);
        worker = new Worker(blobUrl);
        URL.revokeObjectURL(blobUrl);
        workerType = 'inline';
      }
    } else {
      // Fallback to inline worker
      var blob   = new Blob([WORKER_SRC], { type: 'application/javascript' });
      var blobUrl = URL.createObjectURL(blob);
      worker = new Worker(blobUrl);
      URL.revokeObjectURL(blobUrl);
      workerType = 'inline';
    }

    worker.onerror = function(e) {
      addErr('Worker error: ' + (e.message || 'see browser console'));
      console.error('[widget]', e);
    };

    worker.onmessage = function(ev) { handleWorkerMsg(ev.data); };
    
    // Initialize the worker with model ID
    if (workerType === 'external') {
      sendToWorker('LOAD', { modelId: MODEL_ID });
    } else {
      sendToWorker('LOAD', { modelId: MODEL_ID });
    }

    // Load knowledge base in parallel
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
            log('WARNING: BolneeIntentDetector not found. Load bolnee-intent-detector.js before this script.');
          }
        })
        .catch(function(err) {
          log('Knowledge fetch failed: ' + err.message);
        });
    } else {
      log('No knowledgeUrl set — running in general chat mode only.');
    }

    addMsg('bot', GREETING);
  }

  // ── Handle messages from worker ───────────────────────────────────────────────
  function handleWorkerMsg(data) {
    // For external worker, unwrap the payload
    var msgData = data.payload || data;
    
    // Handle messages from external chat-worker.js
    if (data.type === 'STATUS') {
      dlText.textContent = msgData.message || msgData.text || msgData.status;
      if (msgData.status !== 'ready') dlBar.classList.add('on');
    }

    if (data.type === 'DOWNLOAD_PROGRESS') {
      if (msgData.total) {
        var pct = Math.round((msgData.loaded / msgData.total) * 100);
        dlFill.style.width = pct + '%';
        dlPct.textContent  = pct + '%';
        dlText.textContent = 'Downloading… ' + pct + '%';
      }
    }

    // Handle legacy inline worker messages
    if (data.type === 'DL') {
      dlFill.style.width = data.pct + '%';
      dlPct.textContent  = data.pct + '%';
      var msg = data.pct >= 100 ? 'Caching model...' : 'Downloading… ' + data.pct + '%';
      dlText.textContent = msg;
    }

    if (data.type === 'READY') {
      modelReady = true;
      dlBar.classList.remove('on');
      updateStatus();
      enableInput();
    }

    if (data.type === 'TOKEN') {
      if (!streamEl) { rmTyping(); streamEl = addMsg('bot', ''); }
      streamEl.querySelector('._mb').textContent += msgData.token;
      msgs.scrollTop = msgs.scrollHeight;
    }

    if (data.type === 'GENERATION_COMPLETE' || data.type === 'DONE') {
      generating = false;
      if (streamEl) {
        history.push({ role: 'assistant', content: streamEl.querySelector('._mb').textContent });
        streamEl = null;
      }
      rmTyping();
      enableInput();
    }

    if (data.type === 'ERROR' || data.type === 'ERR') {
      addErr(msgData.message || msgData.msg);
      generating = false;
      streamEl   = null;
      rmTyping();
      enableInput();
    }
  }

  function updateStatus() {
    if (modelReady && kbReady) {
      hstatus.textContent = '\u25CF Online \u00B7 Knowledge ready';
      hstatus.style.color = 'rgba(255,255,255,.95)';
    } else if (modelReady) {
      hstatus.textContent = '\u25CF Online \u00B7 General chat';
      hstatus.style.color = 'rgba(255,255,255,.9)';
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

  // ── Send ──────────────────────────────────────────────────────────────────────
  function doSend() {
    var text = inp.value.trim();
    if (!text || !modelReady || generating) return;

    generating = true;
    inp.value  = '';
    resize();
    inp.disabled     = true;
    sendBtn.disabled = true;

    addMsg('user', text);
    history.push({ role: 'user', content: text });

    // ── Path A: Intent detected + knowledge available ─────────────────────────
    if (detector && knowledge) {
      var det = detector.detect(text);

      log('[Intent] ' + det.intent + ' | Confidence: ' + det.confidence + '%'
        + (det.queryResult && det.queryResult.found
            ? ' | ' + (Array.isArray(det.queryResult.data) ? det.queryResult.data.length : 1) + ' result(s)'
            : ''));

      // Try to build model prompt with knowledge-base context
      if (det.confidence >= 25) {
        var promptData = detector.buildModelPrompt(det);
        
        if (promptData) {
          log('[Data] ' + promptData.intent + ' → ' + (det.queryResult && Array.isArray(det.queryResult.data) ? det.queryResult.data.length + ' item(s)' : 'info fetched'));
          log('[Prompt] ' + promptData.contextInstruction);
          
          // Create clean structured messages
          var modelMessages = [];
          for (var i = 0; i < history.length; i++) {
            modelMessages.push(history[i]);
          }
          
          // Ultra-simple format for small model: TASK → DATA → RESPONSE
          modelMessages.push({ 
            role: 'user', 
            content: 'TASK: ' + promptData.contextInstruction + '\n\nPRODUCTS:\n' + promptData.dataBlock + '\n\nRESPONSE:'
          });
          
          // Show typing indicator, then replace with streamed response
          addTyping();
          rmTyping();
          streamEl = addMsg('bot', '');
          sendToWorker('GEN', { messages: modelMessages, config: { max: 150, temp: 0.5 } });
          return;
        }
      }

      log('[Model] No knowledge match — falling back to general chat');
    }

    // ── Path B: General chat → model ─────────────────────────────────────────
    addTyping();
    sendToWorker('GEN', { messages: history, config: { max: 150, temp: 0.7 } });
  }

  sendBtn.addEventListener('click', doSend);
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  inp.addEventListener('input', resize);

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