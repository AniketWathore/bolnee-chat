import React, { useEffect, useState } from 'react';
import {
  Upload, Copy, Check, X, FileText, Building2, ArrowRight, Globe, Loader2, AlertCircle
} from 'lucide-react';
import { KnowledgeData } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SourceStatus {
  id: string;
  type: string;
  locator: string;
  status: string;
  error?: string;
}

interface KnowledgeSectionProps {
  data: KnowledgeData;
  onSave?: (data: unknown) => Promise<void>;
  onUploadSources?: (files: File[]) => Promise<void>;
  onAddUrl?: (url: string) => Promise<void>;
  onSaveSettings?: (settings: { provider: string; model: string; apiKey: string; baseUrl?: string }) => Promise<void>;
  onDashboard?: () => void;
  onCancel?: () => void;
}

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; label: string; models: string[] }> = {
  openrouter: { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", models: ["inclusionai/ling-3.0-flash-fin:free","liquid/lfm-2.5-2.6b:free","qwen/qwen-2.5-7b-instruct:free","meta-llama/llama-3.3-70b-instruct:free","mistralai/mistral-7b-instruct:free","openai/gpt-4o-mini","openai/gpt-4o","anthropic/claude-3.5-sonnet"] },
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o-mini","gpt-4o","gpt-4-turbo","gpt-3.5-turbo"] },
  groq: { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", models: ["llama-3.3-70b-versatile","llama-3.1-8b-instant"] },
  together: { label: "Together AI", baseUrl: "https://api.together.xyz/v1", models: ["meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"] },
  anthropic: { label: "Anthropic", baseUrl: "https://api.anthropic.com/v1", models: ["claude-3-5-sonnet-20241022"] },
  ollama: { label: "Ollama (local)", baseUrl: "http://localhost:11434/v1", models: ["llama3.2","mistral"] },
  vllm: { label: "vLLM", baseUrl: "http://localhost:8000/v1", models: ["meta-llama/Meta-Llama-3-8B-Instruct"] },
  lmstudio: { label: "LM Studio", baseUrl: "http://localhost:1234/v1", models: ["local-model"] },
  custom: { label: "Custom", baseUrl: "", models: [] },
};

export default function KnowledgeSection({ data, onUploadSources, onAddUrl, onSaveSettings, onDashboard, onCancel }: KnowledgeSectionProps) {
  const [step, setStep] = useState(1);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [provider, setProvider] = useState('openrouter');
  const [model, setModel] = useState('inclusionai/ling-3.0-flash-fin:free');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(PROVIDER_DEFAULTS.openrouter.baseUrl);
  const [availableModels, setAvailableModels] = useState<string[]>(PROVIDER_DEFAULTS.openrouter.models);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [polling, setPolling] = useState(false);

  const DEPLOY_URL = window.location.origin;

  const getEmbedCode = () => `<script>
  window.BotConfig = {
    botName: "Customer Bot",
    avatar: "",
    chatUrl: "${DEPLOY_URL}/api/public/chat/${data.chatbotId}",
    accentColor: "#111111",
    greeting: "Hi! How can I help?"
  };
</script>
<script src="${DEPLOY_URL}/chatbot-widget.js" async></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const picked: File[] = Array.from(e.target.files as FileList);
      const allowedExt = [".pdf", ".txt", ".md", ".docx", ".doc", ".csv", ".faq"];
      for (const f of picked) {
        const ext = "." + (f.name.split(".").pop()?.toLowerCase() || "");
        if (!allowedExt.includes(ext) && !f.type.startsWith("text/") && f.type !== "application/pdf") {
          setUploadError(`Unsupported file: ${f.name}. Allowed: PDF, TXT, MD, DOCX, FAQ`);
          return;
        }
        if (f.size > 15 * 1024 * 1024) {
          setUploadError(`${f.name} exceeds 15 MB`);
          return;
        }
      }
      setFiles(prev => [...prev, ...picked]);
      setUploadError('');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadError('');
  };

  const fetchSources = async () => {
    try {
      const token = (() => {
        try { return JSON.parse(localStorage.getItem('bolnee_session') || '{}').token; } catch { return ''; }
      })();
      const res = await fetch(`/api/knowledge/sources?chatbotId=${encodeURIComponent(data.chatbotId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json() as SourceStatus[];
        setSources(list);
        return list;
      }
    } catch { /* ignore */ }
    return [];
  };

  const handleProviderChange = (next: string) => {
    setProvider(next);
    const def = PROVIDER_DEFAULTS[next];
    if (def) {
      setBaseUrl(def.baseUrl);
      setAvailableModels(def.models || []);
      if (def.models?.length) setModel(def.models[0]);
      else setModel('');
    } else {
      setAvailableModels([]);
      setModel('');
    }
    setModelsError('');
  };

  const fetchModels = async () => {
    if (!apiKey.trim()) { setModelsError('Enter API key first'); return; }
    if (!baseUrl.trim()) { setModelsError('Base URL is required'); return; }
    setFetchingModels(true);
    setModelsError('');
    try {
      const token = (() => { try { return JSON.parse(localStorage.getItem('bolnee_session') || '{}').token; } catch { return ''; } })();
      const res = await fetch('/api/providers/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider, baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }),
      });
      const body = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) throw new Error((body as { error?: string }).error || 'Failed to fetch models');
      const models = (body as { models?: string[] }).models || [];
      setAvailableModels(models);
      if (models.length && !model) setModel(models[0]);
      if (!models.length) setModelsError('No models returned — you can still type one manually');
    } catch (e: unknown) {
      setModelsError((e as Error).message || 'Failed to fetch models');
    } finally {
      setFetchingModels(false);
    }
  };

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const list = await fetchSources();
      const pending = list.some(s => ["queued","crawling","parsing","indexing"].includes(s.status));
      if (!pending && list.length > 0) {
        setPolling(false);
        setIsBuilding(false);
        setStep(4);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [polling, data.chatbotId]);

  const handleBuild = async () => {
    setIsBuilding(true);
    setStep(3);
    setPolling(true);
    setUploadError('');
    try {
      if (onSaveSettings) {
        await onSaveSettings({ provider, model: model.trim() || "gpt-4o-mini", apiKey: apiKey.trim(), baseUrl: baseUrl.trim() });
      }
      // Sources were already queued at Step 1 (immediate scrape). If for any reason they weren't, queue now as fallback.
      const existing = await fetchSources();
      if (existing.length === 0) {
        if (websiteUrl.trim() && onAddUrl) {
          try { await onAddUrl(websiteUrl.trim()); } catch (e: unknown) { setUploadError((e as Error).message || "Website crawl failed"); }
        }
        if (files.length > 0 && onUploadSources) {
          try { await onUploadSources(files); } catch (e: unknown) { setUploadError((e as Error).message || "Upload failed"); }
        }
        if (!websiteUrl.trim() && files.length === 0) {
          setUploadError('Add a website URL or upload at least one document');
          setIsBuilding(false);
          setPolling(false);
          setStep(1);
          return;
        }
      }
      // initial fetch
      setTimeout(fetchSources, 800);
      // safety timeout: if after 90s still polling, stop and show embed
      setTimeout(() => {
        setPolling(false);
        setIsBuilding(false);
        setStep(4);
      }, 90000);
    } catch (e: unknown) {
      setUploadError((e as Error).message || "Processing failed");
      setIsBuilding(false);
      setPolling(false);
    }
  };

  const [queueing, setQueueing] = useState(false);
  const handleNext = async () => {
    if (step === 1) {
      if (!websiteUrl.trim() && files.length === 0) {
        setUploadError('Add a website URL or upload at least one document');
        return;
      }
      if (websiteUrl.trim()) {
        try { new URL(websiteUrl.trim()); } catch { setUploadError('Invalid website URL'); return; }
        if (!/^https?:\/\//i.test(websiteUrl.trim())) { setUploadError('URL must use HTTP or HTTPS'); return; }
      }
      setUploadError('');
      // Immediately start scraping / uploading as soon as URL is entered (per UX requirement)
      setQueueing(true);
      try {
        if (websiteUrl.trim() && onAddUrl) {
          await onAddUrl(websiteUrl.trim());
        }
        if (files.length > 0 && onUploadSources) {
          await onUploadSources(files);
        }
        // initial poll to show queued status when user reaches processing
        setTimeout(fetchSources, 600);
      } catch (e: unknown) {
        setUploadError((e as Error).message || "Failed to queue sources");
        setQueueing(false);
        return;
      }
      setQueueing(false);
      setStep(2);
    } else if (step === 2) {
      if (!model.trim()) { setUploadError('Model is required'); return; }
      if (baseUrl.trim()) {
        try { new URL(baseUrl.trim()); } catch { setUploadError('Invalid base URL'); return; }
      }
      setUploadError('');
      await handleBuild();
    }
  };

  const statusColor = (s: string) => {
    if (s === "indexed") return "text-emerald-400 border-emerald-800 bg-emerald-950";
    if (s === "failed" || s === "empty") return "text-red-400 border-red-800 bg-red-950";
    if (["queued","crawling","parsing","indexing"].includes(s)) return "text-amber-400 border-amber-800 bg-amber-950";
    return "text-slate-400 border-slate-700 bg-slate-900";
  };

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 flex items-center justify-center brutal-border text-[10px] font-mono font-bold transition-all duration-300 ${
            step > s ? 'bg-green-500 text-white border-green-500' :
            step === s ? 'bg-ink text-bg scale-110' : 'bg-slate-800 text-slate-400 opacity-50'
          }`}>
            {step > s ? <Check className="w-4 h-4" /> : s}
          </div>
          {s < 4 && <div className={`w-6 h-px transition-all duration-300 ${step > s ? 'bg-green-500' : 'bg-line/30'}`} />}
        </div>
      ))}
      <span className="ml-2 font-mono text-[10px] uppercase tracking-widest opacity-50">{
        step === 1 ? "Knowledge" : step === 2 ? "Provider" : step === 3 ? "Processing" : "Embed"
      }</span>
    </div>
  );

  const renderStep1 = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h3 className="text-2xl font-black uppercase italic">Add your knowledge</h3>
        <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Enter a website URL or upload PDFs, TXT, Markdown, DOCX, FAQ — URL-only, files-only, or both</p>
      </div>
      <div className="space-y-2">
        <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-2"><Globe className="w-3 h-3"/> Website URL</label>
        <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://your-website.com" className="brutal-input" />
        <p className="font-mono text-[10px] opacity-40">We crawl same-origin pages, respect robots.txt and crawl limits.</p>
      </div>
      <div className="text-center font-mono text-[10px] uppercase opacity-40">or upload documents</div>
      <label className="flex flex-col items-center justify-center p-10 brutal-border border-dashed bg-slate-900 cursor-pointer hover:bg-slate-800 border-slate-700 transition-colors">
        <Upload className="w-8 h-8 mb-3 opacity-40" />
        <span className="font-mono text-xs uppercase tracking-wider opacity-60">PDF, DOCX, TXT, Markdown or FAQ file</span>
        <span className="font-mono text-[10px] opacity-40 mt-1">Max 15 MB per file</span>
        <input type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.csv,.faq" onChange={handleFileChange} className="hidden" />
      </label>
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">{files.length} document(s) selected</p>
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-3 brutal-border bg-slate-900">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 opacity-50" />
                <span className="font-mono text-xs">{file.name}</span>
                <span className="font-mono text-[10px] opacity-40">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
              <button onClick={() => removeFile(i)} className="hover:opacity-60"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
      {uploadError && <p className="font-mono text-[10px] text-red-500 uppercase tracking-wider text-center flex items-center justify-center gap-2"><AlertCircle className="w-3 h-3"/>{uploadError}</p>}
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h3 className="text-2xl font-black uppercase italic">Configure AI Provider</h3>
        <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Fully API-driven — pick provider, enter base URL + API key, then choose model</p>
        <p className="font-mono text-[10px] opacity-40">For testing, use <span className="font-bold">OpenRouter</span> with base URL <code className="bg-line/20 px-1">https://openrouter.ai/api/v1</code> and your OpenRouter API key, then fetch models (e.g. <code>openai/gpt-4o-mini</code> or any <code>:free</code> model).</p>
      </div>

      <div className="space-y-2">
        <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Provider</label>
        <select value={provider} onChange={(e) => handleProviderChange(e.target.value)} className="brutal-input">
          <option value="openrouter">OpenRouter (recommended — many models, free tier)</option>
          <option value="openai">OpenAI</option>
          <option value="groq">Groq</option>
          <option value="together">Together AI</option>
          <option value="anthropic">Anthropic</option>
          <option value="ollama">Ollama (local, keyless)</option>
          <option value="vllm">vLLM</option>
          <option value="lmstudio">LM Studio</option>
          <option value="custom">Custom OpenAI-compatible</option>
        </select>
        <p className="font-mono text-[10px] opacity-40">Choosing a provider auto-fills its base URL. You can override it below. What is JWT? It’s only for dashboard login (sign-up/in). Your chatbot’s provider API key/baseURL/model are stored separately and used server-side for chat — not JWT. JWT = dashboard auth, API key = model gateway.</p>
      </div>

      <div className="space-y-2">
        <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Base URL</label>
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://openrouter.ai/api/v1" className="brutal-input" />
        <p className="font-mono text-[10px] opacity-40">Auto-filled from provider. Edit to point to your gateway. For OpenRouter keep as above; for local Ollama use http://localhost:11434/v1.</p>
      </div>

      <div className="space-y-2">
        <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">API key</label>
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-or-v1-... (OpenRouter) or sk-... (OpenAI)" className="brutal-input" />
        <p className="font-mono text-[10px] opacity-40">Never exposed in embed code; stored encrypted (AES-256-GCM). For Ollama leave empty.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Model</label>
          <button type="button" onClick={fetchModels} disabled={fetchingModels || !apiKey.trim()} className="brutal-btn py-1 px-3 text-[10px] disabled:opacity-40">
            {fetchingModels ? <><Loader2 className="w-3 h-3 animate-spin inline mr-1"/>Fetching...</> : 'Fetch models from provider'}
          </button>
        </div>
        {availableModels.length > 0 ? (
          <select value={model} onChange={(e) => setModel(e.target.value)} className="brutal-input">
            <option value="">-- choose model --</option>
            {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={provider === 'openrouter' ? 'e.g. openai/gpt-4o-mini or qwen/qwen-2.5-7b-instruct:free' : 'e.g. gpt-4o-mini or llama3.2'} className="brutal-input" />
        )}
        <p className="font-mono text-[10px] opacity-40">For OpenRouter, models are like <code>openai/gpt-4o-mini</code>, <code>anthropic/claude-3.5-sonnet</code>, <code>qwen/qwen-2.5-7b-instruct:free</code>. Click Fetch after entering key to list your provider’s models.</p>
        {modelsError && <p className="font-mono text-[10px] text-amber-600">{modelsError}</p>}
      </div>

      {uploadError && <p className="font-mono text-[10px] text-red-500 uppercase text-center">{uploadError}</p>}
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      key="step3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-8 space-y-6"
    >
      <div className="relative">
        <div className="w-16 h-16 border-4 border-ink/20 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-ink rounded-full animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black uppercase italic">Processing your sources…</h3>
        <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Crawling, parsing and indexing — this runs in background</p>
      </div>
      {sources.length > 0 ? (
        <div className="w-full space-y-2 max-h-48 overflow-auto">
          {sources.map(s => (
            <div key={s.id} className={`flex items-center justify-between p-3 brutal-border text-xs font-mono ${statusColor(s.status)}`}>
              <span className="truncate pr-2">{s.locator}</span>
              <span className="flex items-center gap-2 shrink-0 uppercase text-[10px]">{["queued","crawling","parsing","indexing"].includes(s.status) && <Loader2 className="w-3 h-3 animate-spin"/>}{s.status}{s.error ? ` — ${s.error.slice(0,60)}` : ""}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-mono text-xs opacity-50">Queued {websiteUrl ? 1 : 0} URL + {files.length} file(s)</p>
      )}
      <div className="w-48 h-1 bg-line/20 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: polling ? '70%' : '100%' }}
          transition={{ duration: 2, repeat: polling ? Infinity : 0, repeatType: "reverse", ease: 'easeInOut' }}
          className="h-full bg-ink rounded-full"
        />
      </div>
      <button onClick={fetchSources} className="font-mono text-[10px] uppercase underline opacity-50">Refresh status</button>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-black uppercase italic">Deploy Your Bot</h3>
          <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Copy the embed snippet into your website</p>
        </div>
        <button
          onClick={copyToClipboard}
          className="brutal-btn bg-ink text-bg py-2 px-4 flex items-center gap-2 text-xs"
        >
          {copied ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy Code'}
        </button>
      </div>

      <pre className="bg-ink text-bg p-6 font-mono text-xs overflow-x-auto brutal-border block leading-relaxed whitespace-pre-wrap break-all">
        {getEmbedCode()}
      </pre>

      {sources.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Source status</p>
          {sources.map(s => (
            <div key={s.id} className={`flex items-center justify-between p-2 brutal-border text-xs font-mono ${statusColor(s.status)}`}>
              <span className="truncate">{s.locator}</span>
              <span className="uppercase text-[10px]">{s.status}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-950 border border-blue-800 p-6 flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center brutal-border shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h5 className="font-mono text-xs font-bold uppercase mb-1">Infrastructure Ready</h5>
          <p className="font-mono text-[10px] leading-relaxed opacity-60">
            Your chatbot is now live for bot ID: {data.chatbotId}. Paste the snippet into your website HTML to activate it. Keys are not exposed in embed code.
          </p>
        </div>
      </div>

      <button
        onClick={onDashboard}
        className="w-full brutal-btn bg-ink text-bg py-4 uppercase font-black flex items-center justify-center gap-2"
      >
        Done
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-[#0f172a] brutal-border shadow-[12px_12px_0_0_rgba(0,0,0,1)] overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">{renderStepIndicator()}</div>
            {step < 4 && onCancel && (
              <button
                onClick={onCancel}
                className="brutal-btn bg-slate-800 text-slate-200 border-slate-700 p-2 flex items-center justify-center ml-4"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </AnimatePresence>

          {step < 3 && (
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-line">
              <div className="font-mono text-[10px] opacity-40">Step {step} of 4 {queueing && "• Queueing crawl..."}</div>
              <button
                onClick={handleNext}
                disabled={isBuilding || queueing}
                className="brutal-btn bg-ink text-bg px-10 py-3 flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {queueing ? (<><Loader2 className="w-4 h-4 animate-spin"/> Queuing...</>) : (<>Continue <ArrowRight className="w-4 h-4" /></>)}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
