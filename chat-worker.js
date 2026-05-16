/**
 * chat-worker.js
 * Runs in a Web Worker — all heavy model inference happens here,
 * keeping the main UI thread completely smooth.
 *
 * Host this file alongside chatbot-widget.js on your CDN.
 */

import { pipeline, env, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.0';

// ─── Configuration ────────────────────────────────────────────────────────────
env.allowRemoteModels = true;
env.useBrowserCache   = true;   // Permanent cache — model downloads only once

let generator  = null;
let modelId    = 'onnx-community/SmolLM2-135M-Instruct-ONNX';
let isLoading  = false;

// ─── Message Router ───────────────────────────────────────────────────────────
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'LOAD_MODEL':
      await loadModel(payload?.modelId);
      break;

    case 'GENERATE':
      await generate(payload.messages, payload.config);
      break;

    default:
      console.warn('[Worker] Unknown message type:', type);
  }
});

// ─── Model Loader ─────────────────────────────────────────────────────────────
async function loadModel(customModelId) {
  if (generator || isLoading) return;

  isLoading = true;
  if (customModelId) modelId = customModelId;

  self.postMessage({ type: 'STATUS', payload: { status: 'loading', message: 'Downloading AI model…' } });

  try {
    generator = await pipeline('text-generation', modelId, {
      device:    'wasm',  // WebAssembly CPU fallback — works in every browser
      dtype:     'q4',    // 4-bit quantized — ~90–140 MB download
      progress_callback: (progress) => {
        // Forward download progress to the UI thread
        if (progress.status === 'progress') {
          const pct = progress.total
            ? Math.round((progress.loaded / progress.total) * 100)
            : null;
          self.postMessage({
            type: 'DOWNLOAD_PROGRESS',
            payload: {
              file:    progress.file,
              loaded:  progress.loaded,
              total:   progress.total,
              percent: pct,
            },
          });
        }
      },
    });

    self.postMessage({ type: 'STATUS', payload: { status: 'ready', message: 'Model ready!' } });
  } catch (err) {
    self.postMessage({ type: 'STATUS', payload: { status: 'error', message: err.message } });
    console.error('[Worker] Model load failed:', err);
  }

  isLoading = false;
}

// ─── Text Generation ──────────────────────────────────────────────────────────
async function generate(messages, config = {}) {
  if (!generator) {
    self.postMessage({ type: 'ERROR', payload: { message: 'Model not loaded yet.' } });
    return;
  }

  try {
    // Stream tokens back to the UI thread one-by-one
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt:         true,
      skip_special_tokens: true,
      callback_function: (token) => {
        self.postMessage({ type: 'TOKEN', payload: { token } });
      },
    });

    const result = await generator(messages, {
      max_new_tokens: config.max_new_tokens ?? 200,
      temperature:    config.temperature    ?? 0.7,
      do_sample:      config.do_sample      ?? true,
      top_p:          config.top_p          ?? 0.9,
      repetition_penalty: config.repetition_penalty ?? 1.1,
      streamer,
    });

    self.postMessage({ type: 'GENERATION_COMPLETE', payload: {} });
  } catch (err) {
    self.postMessage({ type: 'ERROR', payload: { message: err.message } });
    console.error('[Worker] Generation failed:', err);
  }
}
