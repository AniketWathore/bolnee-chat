/**
 * chat-worker.js — Intent classification + text generation
 * 1. Loads all-MiniLM-L6-v2 for embedding-based intent classification
 * 2. Loads Qwen2.5-0.5B-Instruct for natural language response generation
 */

import { pipeline, env, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

const INTENTS = {
  PRODUCT_SEARCH: 'user wants to find or search for specific products',
  BUDGET_FILTER: 'user wants products within a budget or under a price',
  PRICE: 'user asks about the price or cost of products',
  STOCK: 'user asks if a product is available or in stock',
  RETURN_POLICY: 'user asks about return or refund policy',
  SHIPPING: 'user asks about shipping or delivery',
  WARRANTY: 'user asks about warranty or guarantee',
  ABOUT: 'user asks about the company or what the store is about',
  CONTACT: 'user asks for contact information or phone number',
  HOURS: 'user asks about store hours or opening time',
  FAQ: 'user asks a common frequently asked question',
  GREETING: 'user says hello hi or greets',
  THANKS: 'user says thank you or expresses gratitude',
  GENERAL: 'any other general question'
};

let extractor = null;
let intentEmbeddings = null;
let textGen = null;
let genReady = false;

self.addEventListener('message', async ({ data }) => {
  const { type, payload } = data;
  if (type === 'LOAD_MODEL') await init();
  if (type === 'CLASSIFY') await classify(payload.text);
  if (type === 'GENERATE') await generate(payload.messages, payload.config);
});

async function init() {
  env.allowRemoteModels = true;
  env.useBrowserCache = true;
  env.allowLocalModels = true;
  env.cacheDir = 'models/';
  env.remoteURL = typeof location !== 'undefined' ? location.origin + '/models/' : null;
  env.onnx = { numThreads: navigator.hardwareConcurrency ?? 2 };

  // ── Step 1: Load classification model ──────────────────────────────────
  send('STATUS', { message: 'Loading classifier…' });

  try {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
      progress_callback: (progress) => {
        if (progress.status === 'progress' && progress.total) {
          send('DOWNLOAD_PROGRESS', { loaded: progress.loaded, total: progress.total });
        }
      },
    });
  } catch (error) {
    send('ERROR', { message: `Classifier failed: ${error.message}` });
    return;
  }

  // Compute embeddings for each intent description
  intentEmbeddings = {};
  for (const [intent, desc] of Object.entries(INTENTS)) {
    const emb = await extractor(desc, { pooling: 'mean', normalize: true });
    intentEmbeddings[intent] = emb.data;
  }

  send('STATUS', { message: 'Classifier ready' });
  send('READY', {});

  // ── Step 2: Load text generation model (independent, failure is non-fatal) ──
  send('STATUS', { message: 'Loading response model…' });

  loadGenModel();
}

async function loadGenModel() {
  try {
    textGen = await pipeline('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct', {
      dtype: 'int8',
      progress_callback: (progress) => {
        if (progress.status === 'progress' && progress.total) {
          send('DOWNLOAD_PROGRESS', { loaded: progress.loaded, total: progress.total });
        }
      },
    });
    genReady = true;
    send('GEN_READY', {});
    send('STATUS', { message: 'All models ready' });
  } catch (genError) {
    send('STATUS', { message: `Generation model unavailable: ${genError.message}. Using template responses.` });
  }
}

async function classify(text) {
  if (!extractor) {
    send('CLASSIFY_RESULT', { intent: 'GENERAL', confidence: 0 });
    return;
  }

  try {
    const emb = await extractor(text, { pooling: 'mean', normalize: true });
    let bestIntent = 'GENERAL';
    let bestScore = 0;

    for (const [intent, targetEmb] of Object.entries(intentEmbeddings)) {
      const score = cosineSimilarity(emb.data, targetEmb);
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    send('CLASSIFY_RESULT', {
      intent: bestIntent,
      confidence: Math.round(bestScore * 100)
    });
  } catch (error) {
    send('ERROR', { message: `Classification failed: ${error.message}` });
  }
}

async function generate(messages, config) {
  if (!textGen) {
    send('ERROR', { message: 'Generation model is still loading. Please wait.' });
    return;
  }
  try {
    const streamer = new TextStreamer(textGen.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function(tok) {
        send('TOKEN', { token: tok });
      },
    });
    await textGen(messages, {
      max_new_tokens: config?.max_new_tokens || 150,
      temperature: config?.temperature ?? 0.3,
      do_sample: true,
      repetition_penalty: 1.05,
      streamer,
    });
    send('DONE', {});
  } catch (error) {
    send('ERROR', { message: `Generation failed: ${error.message}` });
  }
}

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function send(type, payload) {
  self.postMessage({ type, payload });
}
