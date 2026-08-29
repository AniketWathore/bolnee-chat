import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Bot, MessageSquare, BookOpen, Settings,
  Zap, Clock, Trash2, ArrowUpRight, Copy, Check, Globe,
  Palette, Download, RefreshCw, X, Upload, AlertCircle
} from 'lucide-react';
import { Chatbot, KnowledgeData } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import KnowledgeSection from './KnowledgeSection';

type ChatbotTab = 'overview' | 'appearance' | 'chats' | 'knowledge' | 'settings';

interface ChatbotDashboardProps {
  chatbot: Chatbot;
  knowledgeData: KnowledgeData;
  onSaveKnowledge: (data: unknown) => Promise<void>;
  onUploadSources?: (files: File[]) => Promise<void>;
  onAddUrl?: (url: string) => Promise<void>;
  onSaveSettings?: (settings: { provider: string; model: string; apiKey: string; baseUrl?: string }) => Promise<void>;
  onBack: () => void;
  onDeleteBot?: (id: string) => void;
  forceOpenWizard?: boolean;
  onWizardClose?: () => void;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
  ip: string;
  userIdentifier: string;
  model: string;
  createdAt: string;
}

interface SourceRow {
  id: string;
  type: string;
  locator: string;
  status: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ChatbotDashboard({
  chatbot, knowledgeData, onSaveKnowledge, onUploadSources, onAddUrl, onSaveSettings, onBack, onDeleteBot, forceOpenWizard, onWizardClose
}: ChatbotDashboardProps) {
  const [activeTab, setActiveTab] = useState<ChatbotTab>('overview');
  const [showKnowledgeWizard, setShowKnowledgeWizard] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [stats, setStats] = useState<{ total: number; users: number } | null>(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);

  // Appearance state
  const [appearance, setAppearance] = useState({
    name: chatbot.name,
    avatar: chatbot.avatar || '',
    accentColor: (chatbot as unknown as { accentColor?: string }).accentColor || '#111111',
    theme: (chatbot as unknown as { theme?: string }).theme || 'light',
    greeting: (chatbot as unknown as { greeting?: string }).greeting || 'Hi! How can I help?',
  });
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [appearanceMsg, setAppearanceMsg] = useState('');

  // Settings state
  const [settings, setSettings] = useState({
    provider: 'openrouter',
    model: 'inclusionai/ling-3.0-flash-fin:free',
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultMessage: (chatbot as unknown as { defaultMessage?: string }).defaultMessage || '',
    fallbackMessage: (chatbot as unknown as { fallbackMessage?: string }).fallbackMessage || '',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  const isKnowledgeConfigured = sources.length > 0 || !!(knowledgeData.about);

  useEffect(() => {
    if (forceOpenWizard) setShowKnowledgeWizard(true);
  }, [forceOpenWizard]);

  const handleWizardClose = () => {
    setShowKnowledgeWizard(false);
    onWizardClose?.();
  };
  const handleWizardDone = () => {
    setShowKnowledgeWizard(false);
    onWizardClose?.();
    setActiveTab('overview');
    fetchSources();
  };

  const handleBack = () => {
    if (showKnowledgeWizard) return;
    onBack();
  };

  const DEPLOY_URL = window.location.origin;
  const embedCode = `<script>
  window.BotConfig = {
    botName: "${appearance.name || chatbot.name}",
    avatar: "${appearance.avatar}",
    chatUrl: "${DEPLOY_URL}/api/public/chat/${chatbot._id}",
    accentColor: "${appearance.accentColor}",
    greeting: "${appearance.greeting}"
  };
</script>
<script src="${DEPLOY_URL}/chatbot-widget.js" async></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchSources = async () => {
    setLoadingSources(true);
    try {
      const res = await fetch(`/api/knowledge/sources?chatbotId=${encodeURIComponent(chatbot._id)}`);
      if (res.ok) setSources(await res.json());
    } catch { /* ignore */ }
    setLoadingSources(false);
  };

  const fetchMessages = async () => {
    setLoadingChats(true);
    try {
      const res = await fetch(`/api/chatbots/${encodeURIComponent(chatbot._id)}/messages`);
      if (res.ok) setMessages(await res.json());
      const sres = await fetch(`/api/chatbots/${encodeURIComponent(chatbot._id)}/stats`);
      if (sres.ok) setStats(await sres.json());
    } catch { /* ignore */ }
    setLoadingChats(false);
  };

  const fetchAppearance = async () => {
    try {
      const res = await fetch(`/api/chatbots/${encodeURIComponent(chatbot._id)}/appearance`);
      if (res.ok) {
        const data = await res.json();
        setAppearance({
          name: data.name || chatbot.name,
          avatar: data.avatar || '',
          accentColor: data.accentColor || '#111111',
          theme: data.theme || 'light',
          greeting: data.greeting || 'Hi! How can I help?',
        });
        setSettings(prev => ({
          ...prev,
          defaultMessage: data.defaultMessage || '',
          fallbackMessage: data.fallbackMessage || '',
        }));
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchSources();
    fetchAppearance();
  }, [chatbot._id]);

  useEffect(() => {
    if (activeTab === 'chats') fetchMessages();
    if (activeTab === 'knowledge') fetchSources();
    if (activeTab === 'appearance') fetchAppearance();
  }, [activeTab]);

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Delete this source and its chunks?')) return;
    await fetch(`/api/knowledge/sources/${encodeURIComponent(id)}?chatbotId=${encodeURIComponent(chatbot._id)}`, { method: 'DELETE' });
    fetchSources();
  };

  const handleAppearanceSave = async () => {
    setAppearanceSaving(true);
    setAppearanceMsg('');
    try {
      const res = await fetch(`/api/chatbots/${encodeURIComponent(chatbot._id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: appearance.name,
          avatar: appearance.avatar,
          accentColor: appearance.accentColor,
          theme: appearance.theme,
          greeting: appearance.greeting,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setAppearanceMsg('Saved');
      setTimeout(() => setAppearanceMsg(''), 2000);
    } catch (e: unknown) {
      setAppearanceMsg((e as Error).message);
    }
    setAppearanceSaving(false);
  };

  const handleSettingsSave = async () => {
    setSettingsSaving(true);
    setSettingsMsg('');
    try {
      // Save provider/model via onSaveSettings (keeps encryption logic)
      if (onSaveSettings) {
        await onSaveSettings({ provider: settings.provider, model: settings.model, apiKey: settings.apiKey, baseUrl: settings.baseUrl });
      } else {
        await fetch(`/api/chatbots/${encodeURIComponent(chatbot._id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: settings.provider, model: settings.model, apiKey: settings.apiKey, baseUrl: settings.baseUrl }),
        });
      }
      // Save default/fallback separately
      await fetch(`/api/chatbots/${encodeURIComponent(chatbot._id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultMessage: settings.defaultMessage, fallbackMessage: settings.fallbackMessage }),
      });
      setSettingsMsg('Saved');
      setTimeout(() => setSettingsMsg(''), 2000);
    } catch (e: unknown) {
      setSettingsMsg((e as Error).message);
    }
    setSettingsSaving(false);
  };

  const downloadChats = (format: 'csv' | 'json') => {
    window.open(`/api/chatbots/${encodeURIComponent(chatbot._id)}/messages/export?format=${format}`, '_blank');
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Zap },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'chats' as const, label: 'Chats', icon: MessageSquare },
    { id: 'knowledge' as const, label: 'Knowledge', icon: BookOpen },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const renderOverview = () => (
    <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="brutal-card p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs"><Bot className="w-3 h-3" /> Status</div>
          <div className="mt-2 text-xl font-semibold text-green-600">Live</div>
        </div>
        <div className="brutal-card p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs"><MessageSquare className="w-3 h-3" /> Messages</div>
          <div className="mt-2 text-xl font-semibold">{stats?.total ?? '--'}</div>
          <div className="text-xs text-gray-400">{stats?.users ?? 0} users</div>
        </div>
        <div className="brutal-card p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs"><Clock className="w-3 h-3" /> Created</div>
          <div className="mt-2 text-sm font-medium">{new Date(chatbot.createdAt).toLocaleDateString()}</div>
        </div>
        <div className="brutal-card p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs"><Globe className="w-3 h-3" /> Sources</div>
          <div className="mt-2 text-xl font-semibold">{sources.length}</div>
          <div className="text-xs text-gray-400">{sources.filter(s=>s.status==='indexed').length} indexed</div>
        </div>
      </div>

      <div className="brutal-card p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold">Embed code</h3>
          <button onClick={copyToClipboard} className="inline-flex items-center gap-2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-40">
          {embedCode}
        </pre>
        <p className="text-xs text-gray-500">Paste this before <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> on your site. Uses <code className="bg-gray-100 px-1 rounded">{DEPLOY_URL}/api/public/chat/{chatbot._id}</code>.</p>
      </div>
    </motion.div>
  );

  const renderAppearance = () => (
    <motion.div key="appearance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl space-y-6">
      <div className="brutal-card space-y-5">
        <h3 className="font-semibold">Appearance</h3>
        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-600">Bot name</label>
          <input value={appearance.name} onChange={e=>setAppearance({...appearance, name:e.target.value})} className="brutal-input" placeholder="Customer Bot" />
        </div>
        <div className="space-y-3">
          <label className="text-xs font-medium text-gray-600">Avatar / Logo (data URL or leave empty)</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
              {appearance.avatar ? <img src={appearance.avatar} alt="avatar" className="w-full h-full object-cover" /> : <Bot className="w-6 h-6 text-gray-400" />}
            </div>
            <label className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
              <Upload className="w-4 h-4" /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={e=>{
                const f=e.target.files?.[0]; if(!f) return;
                if(f.size>2*1024*1024) { setAppearanceMsg('Avatar must be <2MB'); return; }
                const r=new FileReader(); r.onload=()=>setAppearance({...appearance, avatar: String(r.result)}); r.readAsDataURL(f);
              }} />
            </label>
            {appearance.avatar && <button onClick={()=>setAppearance({...appearance, avatar:''})} className="text-xs text-gray-500"><X className="w-3 h-3 inline" /> Clear</button>}
          </div>
          <input value={appearance.avatar} onChange={e=>setAppearance({...appearance, avatar:e.target.value})} placeholder="https://... or data:image/..." className="brutal-input text-xs" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Accent / Background colour</label>
            <div className="flex items-center gap-2">
              <input type="color" value={appearance.accentColor} onChange={e=>setAppearance({...appearance, accentColor:e.target.value})} className="w-10 h-10 rounded border border-gray-200" />
              <input value={appearance.accentColor} onChange={e=>setAppearance({...appearance, accentColor:e.target.value})} className="brutal-input" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Theme</label>
            <select value={appearance.theme} onChange={e=>setAppearance({...appearance, theme:e.target.value})} className="brutal-input">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">Greeting (first message)</label>
          <input value={appearance.greeting} onChange={e=>setAppearance({...appearance, greeting:e.target.value})} className="brutal-input" placeholder="Hi! How can I help?" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAppearanceSave} disabled={appearanceSaving} className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm disabled:opacity-50">{appearanceSaving ? 'Saving…' : 'Save appearance'}</button>
          {appearanceMsg && <span className="text-xs text-gray-500">{appearanceMsg}</span>}
        </div>
        <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
          <div className="text-xs text-gray-500 mb-2">Preview</div>
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-white max-w-sm">
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: appearance.accentColor }}>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">{appearance.avatar ? <img src={appearance.avatar} alt="" className="w-full h-full object-cover" /> : '🤖'}</div>
              <div className="text-white text-sm font-medium">{appearance.name}</div>
            </div>
            <div className="p-4 text-sm text-gray-700">{appearance.greeting}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderChats = () => (
    <motion.div key="chats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Conversations</h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchMessages} className="inline-flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs hover:bg-gray-50"><RefreshCw className="w-3 h-3" /> Refresh</button>
          <button onClick={()=>downloadChats('csv')} className="inline-flex items-center gap-1 bg-gray-900 text-white rounded-lg px-3 py-1.5 text-xs"><Download className="w-3 h-3" /> CSV (Excel)</button>
          <button onClick={()=>downloadChats('json')} className="inline-flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs">JSON</button>
          <button onClick={()=>{
            // simple PDF via window.print of table
            const w=window.open('','_blank'); if(!w) return;
            const rows=messages.map(m=>`<tr><td style="border:1px solid #e2e8f0;padding:6px;font-size:11px">${new Date(m.createdAt).toLocaleString()}</td><td style="border:1px solid #e2e8f0;padding:6px;font-size:11px">${m.ip||'-'}</td><td style="border:1px solid #e2e8f0;padding:6px;font-size:11px">${m.userIdentifier||'-'}</td><td style="border:1px solid #e2e8f0;padding:6px;font-size:11px">${m.role}</td><td style="border:1px solid #e2e8f0;padding:6px;max-width:400px;word-break:break-word;font-size:11px">${m.content.replace(/</g,'&lt;')}</td></tr>`).join('');
            w.document.write(`<html><head><title>Chats ${chatbot._id}</title></head><body><h2>Chats for ${chatbot.name}</h2><table style="border-collapse:collapse;width:100%"><tr><th style="border:1px solid #e2e8f0;padding:6px;background:#f8fafc;text-align:left">Time</th><th style="border:1px solid #e2e8f0;padding:6px;background:#f8fafc">IP</th><th style="border:1px solid #e2e8f0;padding:6px;background:#f8fafc">Visitor</th><th style="border:1px solid #e2e8f0;padding:6px;background:#f8fafc">Role</th><th style="border:1px solid #e2e8f0;padding:6px;background:#f8fafc">Message</th></tr>${rows}</table><script>window.print()<`+`/script></body></html>`);
            w.document.close();
          }} className="inline-flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs">PDF</button>
        </div>
      </div>

      {loadingChats ? <div className="text-sm text-gray-500">Loading…</div> : messages.length === 0 ? (
        <div className="brutal-card text-center py-16 border-dashed bg-transparent">
          <MessageSquare className="w-10 h-10 opacity-10 mx-auto" />
          <div className="mt-3 font-medium">No conversations yet</div>
          <div className="text-xs text-gray-500 max-w-sm mx-auto mt-1">When visitors chat via the embed, their IP, identifier, date/time and messages appear here.</div>
        </div>
      ) : (
        <div className="brutal-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Time</th>
                  <th className="text-left px-3 py-2 font-medium">IP / Visitor</th>
                  <th className="text-left px-3 py-2 font-medium">Role</th>
                  <th className="text-left px-3 py-2 font-medium">Message</th>
                  <th className="text-left px-3 py-2 font-medium">Model</th>
                </tr>
              </thead>
              <tbody>
                {messages.map(m=>(
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-xs whitespace-nowrap text-gray-500">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs"><div className="font-mono text-xs">{m.ip || '-'}</div><div className="text-xs text-gray-400 truncate max-w-[140px]">{m.userIdentifier}</div></td>
                    <td className="px-3 py-2 text-xs"><span className={`px-2 py-0.5 rounded-full text-xs ${m.role==='user'?'bg-gray-900 text-white':'bg-gray-100'}`}>{m.role}</span></td>
                    <td className="px-3 py-2 text-sm max-w-lg break-words">{m.content}</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{m.model}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderKnowledge = () => (
    <motion.div key="knowledge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Knowledge base</h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchSources} className="inline-flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs"><RefreshCw className="w-3 h-3" /> Refresh</button>
          <button onClick={() => setShowKnowledgeWizard(true)} className="inline-flex items-center gap-1 bg-gray-900 text-white rounded-lg px-3 py-1.5 text-xs"><Upload className="w-3 h-3" /> Add knowledge</button>
        </div>
      </div>

      {loadingSources ? <div className="text-sm text-gray-500">Loading…</div> : sources.length === 0 ? (
        <div className="brutal-card text-center py-16 border-dashed bg-transparent">
          <BookOpen className="w-10 h-10 opacity-10 mx-auto" />
          <div className="mt-3 font-medium">No knowledge yet</div>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">Add a website link or upload PDFs/docs. Already added sources will appear here with status <code className="bg-gray-100 px-1 rounded">queued→indexed</code>.</p>
          <button onClick={()=>setShowKnowledgeWizard(true)} className="mt-4 inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">
            Add knowledge <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map(s=>(
            <div key={s.id} className="brutal-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${s.status==='indexed'?'bg-green-50 text-green-700 border-green-200': s.status==='failed'?'bg-red-50 text-red-700 border-red-200': s.status==='empty'?'bg-amber-50 text-amber-700 border-amber-200':'bg-gray-50 text-gray-600 border-gray-200'}`}>{s.status}</span>
                  <span className="text-xs text-gray-500">{s.type}</span>
                  <span className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleString()}</span>
                </div>
                <div className="font-medium text-sm truncate mt-1">{s.locator}</div>
                {s.error && <div className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {s.error}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400 hidden sm:block">{s.id.slice(0,8)}</span>
                <button onClick={()=>handleDeleteSource(s.id)} className="inline-flex items-center gap-1 border border-red-200 text-red-600 rounded-lg px-3 py-1.5 text-xs hover:bg-red-50"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            </div>
          ))}
          <div className="text-xs text-gray-400">Sources are stored under <code className="bg-gray-100 px-1 rounded">/data/{chatbot._id}_website.json</code> and chunked in SQLite.</div>
        </div>
      )}
    </motion.div>
  );

  const renderSettings = () => (
    <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl space-y-6">
      <div className="brutal-card space-y-5">
        <h3 className="font-semibold">Bot identity</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div><div className="text-gray-500">Bot ID</div><div className="font-mono break-all bg-gray-50 border border-gray-200 rounded p-2 mt-1">{chatbot._id}</div></div>
          <div><div className="text-gray-500">Created</div><div className="bg-gray-50 border border-gray-200 rounded p-2 mt-1">{new Date(chatbot.createdAt).toLocaleString()}</div></div>
        </div>
      </div>

      <div className="brutal-card space-y-5">
        <h3 className="font-semibold">Provider & model</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Provider</label>
            <select value={settings.provider} onChange={e=>setSettings({...settings, provider:e.target.value})} className="brutal-input">
              <option value="openrouter">OpenRouter</option>
              <option value="openai">OpenAI</option>
              <option value="groq">Groq</option>
              <option value="together">Together</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama</option>
              <option value="vllm">vLLM</option>
              <option value="lmstudio">LM Studio</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Model</label>
            <input value={settings.model} onChange={e=>setSettings({...settings, model:e.target.value})} className="brutal-input" placeholder="openai/gpt-4o-mini" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Base URL</label>
          <input value={settings.baseUrl} onChange={e=>setSettings({...settings, baseUrl:e.target.value})} className="brutal-input" placeholder="https://openrouter.ai/api/v1" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">API key</label>
          <input type="password" value={settings.apiKey} onChange={e=>setSettings({...settings, apiKey:e.target.value})} className="brutal-input" placeholder="sk-or-v1-..." />
          <div className="text-xs text-gray-400">Stored encrypted, never in embed code. For Ollama leave empty.</div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Default message (shown before first user message, optional)</label>
            <input value={settings.defaultMessage} onChange={e=>setSettings({...settings, defaultMessage:e.target.value})} className="brutal-input" placeholder="Hello! Ask me anything about our docs…" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Fallback message (when no sources matched)</label>
            <textarea value={settings.fallbackMessage} onChange={e=>setSettings({...settings, fallbackMessage:e.target.value})} className="brutal-input min-h-[80px]" placeholder="I could not find that in our knowledge base. Try rephrasing…" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSettingsSave} disabled={settingsSaving} className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm disabled:opacity-50">{settingsSaving ? 'Saving…' : 'Save settings'}</button>
          {settingsMsg && <span className="text-xs text-gray-500">{settingsMsg}</span>}
        </div>
      </div>

      <div className="brutal-card border-red-200">
        <h3 className="font-semibold text-red-600">Danger zone</h3>
        <p className="text-xs text-gray-500 mt-1">Delete bot and all its chats, sources, and chunks.</p>
        <button onClick={() => onDeleteBot?.(chatbot._id)} className="mt-4 inline-flex items-center gap-2 border border-red-200 text-red-600 rounded-lg px-4 py-2 text-sm hover:bg-red-50">
          <Trash2 className="w-4 h-4" /> Delete chatbot
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="inline-flex items-center gap-2 border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-xs hover:bg-gray-50">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{appearance.name || chatbot.name}</h2>
          <div className="text-xs text-gray-500">Bot dashboard • {chatbot._id.slice(0,8)}</div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border whitespace-nowrap ${activeTab === tab.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'appearance' && renderAppearance()}
        {activeTab === 'chats' && renderChats()}
        {activeTab === 'knowledge' && renderKnowledge()}
        {activeTab === 'settings' && renderSettings()}
      </AnimatePresence>

      {showKnowledgeWizard && (
        <KnowledgeSection
          data={knowledgeData}
          onSave={onSaveKnowledge}
          onUploadSources={onUploadSources}
          onAddUrl={onAddUrl}
          onSaveSettings={onSaveSettings}
          onDashboard={handleWizardDone}
          onCancel={handleWizardClose}
        />
      )}
    </div>
  );
}
