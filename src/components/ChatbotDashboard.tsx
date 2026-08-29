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
    theme: (chatbot as unknown as { theme?: string }).theme || 'dark',
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
  const avatarForEmbed = appearance.avatar ? (appearance.avatar.startsWith('/') ? `${DEPLOY_URL}${appearance.avatar}` : appearance.avatar) : "";
  const embedCode = `<script>
  window.BotConfig = {
    botName: "${appearance.name || chatbot.name}",
    avatar: "${avatarForEmbed}",
    chatUrl: "${DEPLOY_URL}/api/public/chat/${chatbot._id}",
    accentColor: "${appearance.accentColor}",
    greeting: "${appearance.greeting}",
    theme: "${appearance.theme || 'light'}"
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
          theme: data.theme || 'dark',
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
          <div className="flex items-center gap-2 text-slate-400 text-xs"><Bot className="w-3 h-3" /> Status</div>
          <div className="mt-2 text-xl font-semibold text-emerald-400">Live</div>
        </div>
        <div className="brutal-card p-5">
          <div className="flex items-center gap-2 text-slate-400 text-xs"><MessageSquare className="w-3 h-3" /> Messages</div>
          <div className="mt-2 text-xl font-semibold">{stats?.total ?? '--'}</div>
          <div className="text-xs text-slate-500">{stats?.users ?? 0} users</div>
        </div>
        <div className="brutal-card p-5">
          <div className="flex items-center gap-2 text-slate-400 text-xs"><Clock className="w-3 h-3" /> Created</div>
          <div className="mt-2 text-sm font-medium">{new Date(chatbot.createdAt).toLocaleDateString()}</div>
        </div>
        <div className="brutal-card p-5">
          <div className="flex items-center gap-2 text-slate-400 text-xs"><Globe className="w-3 h-3" /> Sources</div>
          <div className="mt-2 text-xl font-semibold">{sources.length}</div>
          <div className="text-xs text-slate-500">{sources.filter(s=>s.status==='indexed').length} indexed</div>
        </div>
      </div>

      <div className="brutal-card p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold">Embed code</h3>
          <button onClick={copyToClipboard} className="inline-flex items-center gap-2 bg-white text-black text-xs px-3 py-1.5 rounded-lg">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="bg-slate-950 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-40">
          {embedCode}
        </pre>
        <p className="text-xs text-slate-400">Paste this before <code className="bg-slate-800 px-1 rounded">&lt;/body&gt;</code> on your site. Uses <code className="bg-slate-800 px-1 rounded">{DEPLOY_URL}/api/public/chat/{chatbot._id}</code>.</p>
      </div>
    </motion.div>
  );

  const renderAppearance = () => (
    <motion.div key="appearance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl space-y-6">
      <div className="brutal-card space-y-5">
        <h3 className="font-semibold">Appearance</h3>
        <div className="space-y-3">
          <label className="text-xs font-medium text-slate-400">Bot name</label>
          <input value={appearance.name} onChange={e=>setAppearance({...appearance, name:e.target.value})} className="brutal-input" placeholder="Customer Bot" />
        </div>
        <div className="space-y-3">
          <label className="text-xs font-medium text-slate-400">Avatar / Logo (data URL or leave empty)</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden">
              {appearance.avatar ? <img src={appearance.avatar} alt="avatar" className="w-full h-full object-cover" /> : <Bot className="w-6 h-6 text-slate-500" />}
            </div>
            <label className="inline-flex items-center gap-2 border border-slate-700 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-slate-800">
              <Upload className="w-4 h-4" /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={e=>{
                const f=e.target.files?.[0]; if(!f) return;
                if(f.size>2*1024*1024) { setAppearanceMsg('Avatar must be <2MB'); return; }
                const r=new FileReader(); r.onload=()=>setAppearance({...appearance, avatar: String(r.result)}); r.readAsDataURL(f);
              }} />
            </label>
            {appearance.avatar && <button onClick={()=>setAppearance({...appearance, avatar:''})} className="text-xs text-slate-400"><X className="w-3 h-3 inline" /> Clear</button>}
          </div>
          {appearance.avatar && appearance.avatar.startsWith('data:image') ? (
            <div className="text-xs text-slate-400 bg-amber-950 border border-amber-800 text-amber-400 rounded p-2">New image selected — preview above. Click <b>Save appearance</b> to store.</div>
          ) : appearance.avatar && appearance.avatar.startsWith('/api/public/avatar/') ? (
            <div className="text-xs text-slate-400 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded p-2">Avatar stored ✓ — preview above. Upload new image to replace.</div>
          ) : (
            <input value={appearance.avatar} onChange={e=>setAppearance({...appearance, avatar:e.target.value})} placeholder="https://... or leave empty for default icon" className="brutal-input text-xs" />
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Accent / Background colour</label>
            <div className="flex items-center gap-2">
              <input type="color" value={appearance.accentColor} onChange={e=>setAppearance({...appearance, accentColor:e.target.value})} className="w-10 h-10 rounded border border-slate-700" />
              <input value={appearance.accentColor} onChange={e=>setAppearance({...appearance, accentColor:e.target.value})} className="brutal-input" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400">Theme</label>
            <select value={appearance.theme} onChange={e=>setAppearance({...appearance, theme:e.target.value})} className="brutal-input">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400">Greeting (first message)</label>
          <input value={appearance.greeting} onChange={e=>setAppearance({...appearance, greeting:e.target.value})} className="brutal-input" placeholder="Hi! How can I help?" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleAppearanceSave} disabled={appearanceSaving} className="bg-white text-black px-5 py-2 rounded-lg text-sm disabled:opacity-50">{appearanceSaving ? 'Saving…' : 'Save appearance'}</button>
          {appearanceMsg && <span className="text-xs text-slate-400">{appearanceMsg}</span>}
        </div>
        <div className="rounded-lg border border-slate-700 p-4 bg-slate-800">
          <div className="text-xs text-slate-400 mb-2">Preview</div>
          <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 max-w-sm">
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: appearance.accentColor }}>
              <div className="w-8 h-8 rounded-full bg-slate-900/20 flex items-center justify-center overflow-hidden">{appearance.avatar ? <img src={appearance.avatar} alt="" className="w-full h-full object-cover" /> : '🤖'}</div>
              <div className="text-white text-sm font-medium">{appearance.name}</div>
            </div>
            <div className="p-4 text-sm text-slate-200">{appearance.greeting}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const grouped = (() => {
    const map = new Map<string, MessageRow[]>();
    for (const m of messages) {
      const key = (m.userIdentifier && m.userIdentifier !== 'anon' ? m.userIdentifier : m.ip) || m.ip || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    // sort each group by time asc for conversation order
    for (const arr of map.values()) arr.sort((a,b)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return Array.from(map.entries()).map(([user, msgs]) => {
      const last = msgs[msgs.length - 1];
      const first = msgs[0];
      return { user, msgs, count: msgs.length, lastAt: last.createdAt, firstAt: first.createdAt, lastIp: last.ip };
    }).sort((a,b)=> new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  })();
  const selectedGroup = selectedUser ? grouped.find(g=>g.user===selectedUser) : null;

  const renderChats = () => (
    <motion.div key="chats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Conversations {selectedUser ? `— ${selectedUser.slice(0,24)}` : `(${grouped.length} users, ${messages.length} msgs)`}</h3>
        <div className="flex items-center gap-2">
          {selectedUser && <button onClick={()=>setSelectedUser(null)} className="inline-flex items-center gap-1 border border-slate-700 rounded-lg px-3 py-1.5 text-xs hover:bg-slate-800"><ArrowLeft className="w-3 h-3" /> Back to users</button>}
          <button onClick={fetchMessages} className="inline-flex items-center gap-1 border border-slate-700 rounded-lg px-3 py-1.5 text-xs hover:bg-slate-800"><RefreshCw className="w-3 h-3" /> Refresh</button>
          <button onClick={()=>downloadChats('csv')} className="inline-flex items-center gap-1 bg-white text-black rounded-lg px-3 py-1.5 text-xs"><Download className="w-3 h-3" /> CSV (Excel)</button>
          <button onClick={()=>downloadChats('json')} className="inline-flex items-center gap-1 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">JSON</button>
          <button onClick={()=>{
            const rows=messages.map(m=>`<tr><td style="border:1px solid #e2e8f0;padding:6px;font-size:11px">${new Date(m.createdAt).toLocaleString()}</td><td style="border:1px solid #e2e8f0;padding:6px;font-size:11px">${m.ip||'-'}</td><td style="border:1px solid #e2e8f0;padding:6px;font-size:11px">${m.userIdentifier||'-'}</td><td style="border:1px solid #e2e8f0;padding:6px;font-size:11px">${m.role}</td><td style="border:1px solid #e2e8f0;padding:6px;max-width:400px;word-break:break-word;font-size:11px">${m.content.replace(/</g,'&lt;')}</td></tr>`).join('');
            const w=window.open('','_blank'); if(!w) return;
            w.document.write(`<html><head><title>Chats ${chatbot._id}</title></head><body><h2>Chats for ${chatbot.name}</h2><table style="border-collapse:collapse;width:100%"><tr><th style="border:1px solid #e2e8f0;padding:6px;background:#f8fafc;text-align:left">Time</th><th style="border:1px solid #e2e8f0;padding:6px;background:#f8fafc">IP</th><th style="border:1px solid #e2e8f0;padding:6px;background:#f8fafc">Visitor</th><th style="border:1px solid #e2e8f0;padding:6px;background:#f8fafc">Role</th><th style="border:1px solid #e2e8f0;padding:6px;background:#f8fafc">Message</th></tr>${rows}</table><script>window.print()<`+`/script></body></html>`);
            w.document.close();
          }} className="inline-flex items-center gap-1 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">PDF</button>
        </div>
      </div>

      {loadingChats ? <div className="text-sm text-slate-400">Loading…</div> : messages.length === 0 ? (
        <div className="brutal-card text-center py-16 border-dashed bg-transparent">
          <MessageSquare className="w-10 h-10 opacity-10 mx-auto" />
          <div className="mt-3 font-medium">No conversations yet</div>
          <div className="text-xs text-slate-400 max-w-sm mx-auto mt-1">When visitors chat via the embed, their IP, identifier, date/time and messages appear here — grouped by visitor.</div>
        </div>
      ) : selectedUser && selectedGroup ? (
        <div className="space-y-3">
          <div className="text-xs text-slate-400">Visitor <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">{selectedGroup.user}</span> • {selectedGroup.count} messages • IP {selectedGroup.lastIp || '-'} • from {new Date(selectedGroup.firstAt).toLocaleDateString()} to {new Date(selectedGroup.lastAt).toLocaleDateString()}</div>
          <div className="brutal-card p-0 overflow-hidden">
            <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-800">
              {(() => {
                // group by date
                const byDate = new Map<string, MessageRow[]>();
                for (const m of selectedGroup.msgs) {
                  const d = new Date(m.createdAt).toLocaleDateString();
                  if (!byDate.has(d)) byDate.set(d, []);
                  byDate.get(d)!.push(m);
                }
                return Array.from(byDate.entries()).map(([date, list]) => (
                  <div key={date}>
                    <div className="sticky top-0 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400 border-y border-slate-800">{date} — {list.length} msgs</div>
                    <div className="p-3 space-y-2">
                      {list.map(m=>(
                        <div key={m.id} className={`flex ${m.role==='user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role==='user' ? 'bg-white text-black rounded-br-sm' : 'bg-slate-800 text-white rounded-bl-sm'}`}>
                            <div className="break-words whitespace-pre-wrap">{m.content}</div>
                            <div className={`text-xs mt-1 ${m.role==='user' ? 'text-white/60' : 'text-slate-500'}`}>{new Date(m.createdAt).toLocaleTimeString()} • {m.ip}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className="brutal-card p-0 overflow-hidden">
          <div className="divide-y divide-slate-800">
            {grouped.map(g=>(
              <button key={g.user} onClick={()=>setSelectedUser(g.user)} className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-sm truncate">{g.user}</div>
                  <div className="text-xs text-slate-400 truncate">IP {g.lastIp || '-'} • {g.count} msgs • last {new Date(g.lastAt).toLocaleString()}</div>
                  <div className="text-xs text-slate-500 truncate max-w-md">{g.msgs[g.msgs.length-1]?.content.slice(0,80)}</div>
                </div>
                <div className="shrink-0 text-xs text-slate-500 flex items-center gap-2">
                  <span>{new Date(g.lastAt).toLocaleDateString()}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </button>
            ))}
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
          <button onClick={fetchSources} className="inline-flex items-center gap-1 border border-slate-700 rounded-lg px-3 py-1.5 text-xs"><RefreshCw className="w-3 h-3" /> Refresh</button>
          <button onClick={() => setShowKnowledgeWizard(true)} className="inline-flex items-center gap-1 bg-white text-black rounded-lg px-3 py-1.5 text-xs"><Upload className="w-3 h-3" /> Add knowledge</button>
        </div>
      </div>

      {loadingSources ? <div className="text-sm text-slate-400">Loading…</div> : sources.length === 0 ? (
        <div className="brutal-card text-center py-16 border-dashed bg-transparent">
          <BookOpen className="w-10 h-10 opacity-10 mx-auto" />
          <div className="mt-3 font-medium">No knowledge yet</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Add a website link or upload PDFs/docs. Already added sources will appear here with status <code className="bg-slate-800 px-1 rounded">queued→indexed</code>.</p>
          <button onClick={()=>setShowKnowledgeWizard(true)} className="mt-4 inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm">
            Add knowledge <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map(s=>(
            <div key={s.id} className="brutal-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${s.status==='indexed'?'bg-emerald-950 text-emerald-400 border-emerald-800': s.status==='failed'?'bg-red-950 text-red-400 border-red-800': s.status==='empty'?'bg-amber-950 text-amber-400 border-amber-800':'bg-slate-800 text-slate-400 border-slate-700'}`}>{s.status}</span>
                  <span className="text-xs text-slate-400">{s.type}</span>
                  <span className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleString()}</span>
                </div>
                <div className="font-medium text-sm truncate mt-1">{s.locator}</div>
                {s.error && <div className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {s.error}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 hidden sm:block">{s.id.slice(0,8)}</span>
                <button onClick={()=>handleDeleteSource(s.id)} className="inline-flex items-center gap-1 border border-red-800 text-red-600 rounded-lg px-3 py-1.5 text-xs hover:bg-red-950"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            </div>
          ))}
          <div className="text-xs text-slate-500">Sources are stored under <code className="bg-slate-800 px-1 rounded">/data/{chatbot._id}_website.json</code> and chunked in SQLite.</div>
        </div>
      )}
    </motion.div>
  );

  const renderSettings = () => (
    <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl space-y-6">
      <div className="brutal-card space-y-5">
        <h3 className="font-semibold">Bot identity</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div><div className="text-slate-400">Bot ID</div><div className="font-mono break-all bg-slate-800 border border-slate-700 rounded p-2 mt-1">{chatbot._id}</div></div>
          <div><div className="text-slate-400">Created</div><div className="bg-slate-800 border border-slate-700 rounded p-2 mt-1">{new Date(chatbot.createdAt).toLocaleString()}</div></div>
        </div>
      </div>

      <div className="brutal-card space-y-5">
        <h3 className="font-semibold">Provider & model</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Provider</label>
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
            <label className="text-xs font-medium text-slate-400">Model</label>
            <input value={settings.model} onChange={e=>setSettings({...settings, model:e.target.value})} className="brutal-input" placeholder="openai/gpt-4o-mini" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Base URL</label>
          <input value={settings.baseUrl} onChange={e=>setSettings({...settings, baseUrl:e.target.value})} className="brutal-input" placeholder="https://openrouter.ai/api/v1" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">API key</label>
          <input type="password" value={settings.apiKey} onChange={e=>setSettings({...settings, apiKey:e.target.value})} className="brutal-input" placeholder="sk-or-v1-..." />
          <div className="text-xs text-slate-500">Stored encrypted, never in embed code. For Ollama leave empty.</div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Default message (shown before first user message, optional)</label>
            <input value={settings.defaultMessage} onChange={e=>setSettings({...settings, defaultMessage:e.target.value})} className="brutal-input" placeholder="Hello! Ask me anything about our docs…" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Fallback message (when no sources matched)</label>
            <textarea value={settings.fallbackMessage} onChange={e=>setSettings({...settings, fallbackMessage:e.target.value})} className="brutal-input min-h-[80px]" placeholder="I could not find that in our knowledge base. Try rephrasing…" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSettingsSave} disabled={settingsSaving} className="bg-white text-black px-5 py-2 rounded-lg text-sm disabled:opacity-50">{settingsSaving ? 'Saving…' : 'Save settings'}</button>
          {settingsMsg && <span className="text-xs text-slate-400">{settingsMsg}</span>}
        </div>
      </div>

      <div className="brutal-card border-red-800">
        <h3 className="font-semibold text-red-600">Danger zone</h3>
        <p className="text-xs text-slate-400 mt-1">Delete bot and all its chats, sources, and chunks.</p>
        <button onClick={() => onDeleteBot?.(chatbot._id)} className="mt-4 inline-flex items-center gap-2 border border-red-800 text-red-600 rounded-lg px-4 py-2 text-sm hover:bg-red-950">
          <Trash2 className="w-4 h-4" /> Delete chatbot
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="inline-flex items-center gap-2 border border-slate-700 bg-slate-900 rounded-lg px-3 py-1.5 text-xs hover:bg-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{appearance.name || chatbot.name}</h2>
          <div className="text-xs text-slate-400">Bot dashboard • {chatbot._id.slice(0,8)}</div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-700 pb-3 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-black border-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
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
