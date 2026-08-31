import { useEffect, useState } from 'react';
import { Plus, BookOpen, Compass } from 'lucide-react';
import ChatbotDashboard from './components/ChatbotDashboard';
import Overview from './components/Overview';
import AllBotsView from './components/AllBotsView';
import BotCreationWizard from './components/BotCreationWizard';
import KnowledgeSection from './components/KnowledgeSection';
import DocsPage from './components/DocsPage';
import GuidesPage from './components/GuidesPage';
import { Chatbot, KnowledgeData } from './types';

type ConsolePage = 'console' | 'docs' | 'guides';

export default function App() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Chatbot | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBotWizard, setShowBotWizard] = useState(false);
  const [forceWizardFor, setForceWizardFor] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState<ConsolePage>('console');
  // Dark mode only - forced
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('bolnee_theme', 'dark');
  }, []);

  const api = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!response.ok) throw new Error((await response.json().catch(()=>({error:'Request failed'}))).error || 'Request failed');
    return response.json();
  };

  const refreshChatbots = async () => {
    setLoading(true);
    try {
      const list = await api('/api/chatbots');
      setChatbots(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshChatbots();
  }, []);

  const createBot = async (name: string, avatar = '', widgetIcon = '') => {
    const bot = await api('/api/chatbots', {
      method: 'POST',
      body: JSON.stringify({ name, avatar, widgetIcon }),
    });
    setChatbots((current) => [...current, bot]);
    setShowBotWizard(false);
    const data = await api(`/api/knowledge?chatbotId=${encodeURIComponent(bot._id)}`);
    setSelectedBot(bot);
    setKnowledge(data);
    setForceWizardFor(bot._id);
  };

  const selectBot = async (id: string) => {
    const bot = chatbots.find((item) => item._id === id);
    if (!bot) return;
    const data = await api(`/api/knowledge?chatbotId=${encodeURIComponent(id)}`);
    setSelectedBot(bot);
    setKnowledge(data);
    setShowAll(false);
  };

  const saveKnowledge = async (data: KnowledgeData) => {
    const saved = await api('/api/knowledge', { method: 'POST', body: JSON.stringify(data) });
    setKnowledge(saved.data);
  };

  const uploadSources = async (files: File[]) => {
    if (!selectedBot) return;
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`/api/knowledge/sources/${encodeURIComponent(selectedBot._id)}`, {
        method: 'POST',
        body: form,
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Upload failed');
    }
  };

  const addUrlSource = async (url: string) => {
    if (!selectedBot) return;
    const response = await fetch(`/api/knowledge/sources/${encodeURIComponent(selectedBot._id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Website crawl failed');
  };

  const saveBotSettings = async (settings: { provider: string; model: string; apiKey: string; baseUrl?: string }) => {
    if (!selectedBot) return;
    await api(`/api/chatbots/${encodeURIComponent(selectedBot._id)}`, { method: 'PATCH', body: JSON.stringify(settings) });
  };

  const deleteBot = async (id: string) => {
    if (!window.confirm('Delete this chatbot and its knowledge?')) return;
    await api(`/api/chatbots/${encodeURIComponent(id)}`, { method: 'DELETE' });
    setChatbots((current) => current.filter((bot) => bot._id !== id));
    setSelectedBot(null);
    setKnowledge(null);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 transition-colors">
      <header className="sticky top-0 z-30 bg-[#0f172a] border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => { setSelectedBot(null); setShowAll(false); setPage('console'); }} className="flex items-center gap-3">
            <img src="/img/logo.webp" alt="Bolnee" className="w-9 h-9 rounded-lg object-contain bg-slate-900" />
            <span className="font-semibold tracking-tight text-white">Bolnee</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(page === 'docs' ? 'console' : 'docs')} className={`hidden sm:inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${page==='docs' ? 'bg-white text-black border-white' : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'}`}>
              <BookOpen className="w-3.5 h-3.5" /> Docs
            </button>
            <button onClick={() => setPage(page === 'guides' ? 'console' : 'guides')} className={`hidden sm:inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${page==='guides' ? 'bg-white text-black border-white' : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'}`}>
              <Compass className="w-3.5 h-3.5" /> Guides
            </button>
            {!selectedBot && !showAll && page==='console' && (
              <button onClick={() => setShowBotWizard(true)} className="inline-flex items-center gap-2 bg-white text-black text-sm px-4 py-2 rounded-lg hover:bg-slate-100 transition">
                <Plus className="w-4 h-4" /> New chatbot
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {page === 'docs' ? (
          <DocsPage onBack={() => setPage('console')} />
        ) : page === 'guides' ? (
          <GuidesPage onBack={() => setPage('console')} />
        ) : selectedBot && knowledge ? (
          <>
            <ChatbotDashboard chatbot={selectedBot} knowledgeData={knowledge} onSaveKnowledge={saveKnowledge} onUploadSources={uploadSources} onAddUrl={addUrlSource} onSaveSettings={saveBotSettings} onBack={() => { setForceWizardFor(null); setSelectedBot(null); }} onDeleteBot={deleteBot} />
            <div className="mt-10 border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div>Need help? <button onClick={()=>setPage('docs')} className="underline hover:text-white">Read docs</button> • <button onClick={()=>setPage('guides')} className="underline hover:text-white">Follow guides</button></div>
              <div className="flex items-center gap-1">Made with <span className="text-red-500">❤️</span> by <a href="https://github.com/AniketWathore" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">github/AniketWathore</a></div>
            </div>
          </>
        ) : showAll ? (
          <AllBotsView chatbots={chatbots} onSelectBot={selectBot} onBack={() => setShowAll(false)} onCreateRequest={() => setShowBotWizard(true)} />
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Your Chatbots</h1>
              <p className="text-sm text-slate-400 mt-1">Manage your chatbots and their knowledge.</p>
            </div>
            {loading ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : (
              <Overview chatbots={chatbots} onCreateRequest={() => setShowBotWizard(true)} onSelectBot={selectBot} onViewAll={() => setShowAll(true)} />
            )}
            <div className="mt-10 border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div>New here? <button onClick={()=>setPage('docs')} className="underline hover:text-white font-medium">Read docs</button> to create your first bot, or <button onClick={()=>setPage('guides')} className="underline hover:text-white font-medium">follow guides</button> for best practices.</div>
              <div className="flex items-center gap-1">Made with <span className="text-red-500">❤️</span> by <a href="https://github.com/AniketWathore" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">github/AniketWathore</a></div>
            </div>
          </>
        )}
      </main>

      {showBotWizard && <BotCreationWizard onCreate={createBot} onCancel={() => setShowBotWizard(false)} />}
      {forceWizardFor && selectedBot && knowledge && (
        <KnowledgeSection
          data={knowledge}
          onSave={saveKnowledge}
          onUploadSources={uploadSources}
          onAddUrl={addUrlSource}
          onSaveSettings={saveBotSettings}
          onDashboard={() => setForceWizardFor(null)}
          onCancel={() => setForceWizardFor(null)}
        />
      )}
    </div>
  );
}
