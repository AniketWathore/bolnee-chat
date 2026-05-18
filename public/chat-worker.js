/**
 * chat-worker.js  (v2 — Hybrid Engine)
 * ─────────────────────────────────────────────────────────────────────────────
 * Strategy:
 *   1. Score the device (CPU cores + RAM + WebGPU support)
 *   2. STRONG  → try WebGPU first (fast, low heat), fallback to WASM
 *   3. WEAK    → skip local model entirely, stream via Groq API (free tier)
 *
 * Host alongside chatbot-widget.js on your CDN.
 * Set groqApiKey in your BotConfig — passed in via the LOAD_MODEL message.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { pipeline, env, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

// ─── Runtime state ─────────────────────────────────────────────────────────
let generator  = null;        // Transformers.js pipeline (local only)
let engineMode = null;        // 'webgpu' | 'wasm' | 'cloud'
let groqApiKey = null;
let groqModel  = 'llama-3.1-8b-instant';   // Fast Groq model, free tier
let modelId    = 'onnx-community/Qwen3-0.6B-ONNX';


// ─── Message router ────────────────────────────────────────────────────────
// Signal to the main thread that this module finished loading.
// The main thread waits for WORKER_READY before sending LOAD_MODEL,
// preventing the race condition where messages arrive before the listener is set up.
self.postMessage({ type: 'WORKER_READY' });

self.addEventListener('message', async ({ data }) => {
  const { type, payload } = data;
  if (type === 'LOAD_MODEL') await init(payload);
  if (type === 'GENERATE')   await generate(payload.messages, payload.config);
});

// ─── Initialise engine ─────────────────────────────────────────────────────
async function init(payload = {}) {
  if (payload.modelId)    modelId    = payload.modelId;
  if (payload.groqApiKey) groqApiKey = payload.groqApiKey;
  if (payload.groqModel)  groqModel  = payload.groqModel;

  const score = deviceScore();
  send('DEVICE_SCORE', {
    score,
    cores: navigator.hardwareConcurrency ?? '?',
    ram:   navigator.deviceMemory        ?? '?',
  });

  // ── Weak device → route to cloud ──────────────────────────────────────
  if (score === 'weak') {
    if (!groqApiKey) {
      send('STATUS', {
        status: 'error',
        message: 'Device is low-end and no Groq API key is set. Add window.BotConfig.groqApiKey.',
      });
      return;
    }
    engineMode = 'cloud';
    send('STATUS', { status: 'ready', engine: 'cloud', message: 'Using cloud AI (saves battery and keeps your device cool).' });
    return;
  }

  // ── Mid/strong device → attempt local model ───────────────────────────
  env.allowRemoteModels = true;
  env.useBrowserCache   = true;

  const hasWebGPU = await checkWebGPU();
  await loadLocalModel(hasWebGPU ? 'webgpu' : 'wasm');
}

// ─── Device capability scorer ──────────────────────────────────────────────
// navigator.hardwareConcurrency = logical CPU cores
// navigator.deviceMemory        = approximate RAM in GB (capped at 8 by spec)
function deviceScore() {
  const cores = navigator.hardwareConcurrency ?? 2;
  const ram   = navigator.deviceMemory        ?? 2;

  if (cores <= 4 && ram <= 2) return 'weak';    // budget phones, old tablets
  if (cores >= 8 && ram >= 4) return 'strong';  // modern desktop/flagship phone
  return 'mid';
}

// ─── WebGPU probe ──────────────────────────────────────────────────────────
async function checkWebGPU() {
  try {
    if (!navigator.gpu) return false;
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

// ─── Local model loader ────────────────────────────────────────────────────
async function loadLocalModel(device) {
  send('STATUS', { status: 'loading', engine: device, message: `Loading model on ${device.toUpperCase()}…` });

  try {
    // Let Transformers.js auto-select the best available quantization
    generator = await pipeline('text-generation', modelId, {
      device,
      progress_callback: (p) => {
        if (p.status === 'progress' && p.total) {
          const pct = Math.round((p.loaded / p.total) * 100);
          send('DOWNLOAD_PROGRESS', { file: p.file, loaded: p.loaded, total: p.total, percent: pct });
        }
      },
    });
    engineMode = device;
    send('STATUS', { status: 'ready', engine: device });
  } catch (err) {
    if (device === 'webgpu') {
      send('STATUS', { status: 'loading', engine: 'wasm', message: 'WebGPU unavailable, falling back to CPU\u2026' });
      await loadLocalModel('wasm');
    } else {
      send('STATUS', { status: 'error', message: 'Model failed to load: ' + err.message });
    }
  }
}

// ─── Generation router ─────────────────────────────────────────────────────
async function generate(messages, config = {}) {
  if (engineMode === 'cloud') {
    await generateCloud(messages, config);
  } else {
    await generateLocal(messages, config);
  }
}

// ─── Local inference (WebGPU / WASM) ──────────────────────────────────────
async function generateLocal(messages, config) {
  if (!generator) { send('ERROR', { message: 'Model not loaded yet.' }); return; }

  // Cap token budget on CPU to avoid long blocking runs and overheating
  const maxTokens = engineMode === 'wasm'
    ? Math.min(config.max_new_tokens ?? 80, 80)
    : (config.max_new_tokens ?? 200);

  try {
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt:         true,
      skip_special_tokens: true,
      callback_function:   (token) => send('TOKEN', { token }),
    });

    await generator(messages, {
      max_new_tokens:     maxTokens,
      temperature:        config.temperature        ?? 0.7,
      do_sample:          config.do_sample          ?? true,
      top_p:              config.top_p              ?? 0.9,
      repetition_penalty: config.repetition_penalty ?? 1.1,
      streamer,
    });

    send('GENERATION_COMPLETE', {});
  } catch (err) {
    send('ERROR', { message: err.message });
  }
}

// ─── Cloud inference via Groq (SSE streaming) ─────────────────────────────
async function generateCloud(messages, config) {
  try {
    const filteredMessages = messages.filter(m =>
      ['system', 'user', 'assistant'].includes(m.role)
    );

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model:       groqModel,
        messages:    filteredMessages,
        max_tokens:  config.max_new_tokens ?? 200,
        temperature: config.temperature    ?? 0.7,
        stream:      true,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message ?? `Groq API error ${response.status}`);
    }

    // Parse SSE stream and forward tokens
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();   // preserve any incomplete trailing line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: '))          continue;

        try {
          const json  = JSON.parse(trimmed.slice(6));
          const token = json.choices?.[0]?.delta?.content;
          if (token) send('TOKEN', { token });
        } catch { /* skip malformed SSE chunks */ }
      }
    }

    send('GENERATION_COMPLETE', {});
  } catch (err) {
    send('ERROR', { message: 'Cloud generation failed: ' + err.message });
  }
}

// ─── Utility ───────────────────────────────────────────────────────────────
function send(type, payload) {
  self.postMessage({ type, payload });
}
