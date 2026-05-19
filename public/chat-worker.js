/**
 * chat-worker.js — Qwen3-0.6B Local Inference
 * Loads and runs the model entirely in the browser via WASM
 */

import { pipeline, env, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

// ─── Runtime state ─────────────────────────────────────────────────────────
let generator = null;
let modelId = 'onnx-community/Qwen3-0.6B';

// ─── Message router ────────────────────────────────────────────────────────
self.addEventListener('message', async ({ data }) => {
  const { type, payload } = data;
  if (type === 'LOAD_MODEL') await init(payload);
  if (type === 'GENERATE') await generate(payload.messages, payload.config);
});

// ─── Initialize model ──────────────────────────────────────────────────────
async function init(payload = {}) {
  if (payload.modelId) modelId = payload.modelId;

  send('STATUS', { message: `Loading ${modelId}…` });

  try {
    // Configure Transformers.js for reliable WASM inference
    env.allowRemoteModels = true;
    env.useBrowserCache = true;
    env.allowLocalModels = true;
    env.cacheDir = 'models/';
    env.remoteURL = typeof location !== 'undefined' ? location.origin + '/models/' : null;
    
    // Configure ONNX runtime
    env.onnx = {
      numThreads: navigator.hardwareConcurrency ?? 2,
    };

    // Load model for text generation
    generator = await pipeline('text-generation', modelId, {
      device: 'wasm',
      progress_callback: (progress) => {
        if (progress.status === 'progress' && progress.total) {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          send('DOWNLOAD_PROGRESS', { loaded: progress.loaded, total: progress.total });
        }
      },
    });

    send('STATUS', { message: 'Model ready' });
  } catch (error) {
    send('ERROR', { message: `Model loading failed: ${error.message}` });
  }
}

// ─── Generate response ──────────────────────────────────────────────────────
async function generate(messages, config) {
  if (!generator) {
    send('ERROR', { message: 'Model not initialized' });
    return;
  }

  try {
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (token) => {
        send('TOKEN', { token });
      },
    });

    await generator(messages, {
      max_new_tokens: config.max || 150,
      temperature: config.temp || 0.7,
      do_sample: true,
      repetition_penalty: 1.15,
      streamer,
    });

    send('GENERATION_COMPLETE');
  } catch (error) {
    send('ERROR', { message: error.message });
  }
}

// ─── Utility ───────────────────────────────────────────────────────────────
function send(type, payload) {
  self.postMessage({ type, payload });
}
