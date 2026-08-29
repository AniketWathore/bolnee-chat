import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import ChatbotDashboard from './components/ChatbotDashboard';
import Overview from './components/Overview';
import AllBotsView from './components/AllBotsView';
import BotCreationWizard from './components/BotCreationWizard';
import KnowledgeSection from './components/KnowledgeSection';
import { Chatbot, KnowledgeData } from './types';

export default function App() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Chatbot | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBotWizard, setShowBotWizard] = useState(false);
  const [forceWizardFor, setForceWizardFor] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

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

  const createBot = async (name: string, avatar = '') => {
    const bot = await api('/api/chatbots', {
      method: 'POST',
      body: JSON.stringify({ name, avatar }),
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
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => { setSelectedBot(null); setShowAll(false); }} className="flex items-center gap-3">
            <img src="/img/logo.webp" alt="Bolnee" className="w-9 h-9 rounded-lg object-contain" />
            <span className="font-semibold tracking-tight text-gray-900">Bolnee</span>
          </button>
          <div className="flex items-center gap-3">
            {!selectedBot && !showAll && (
              <button onClick={() => setShowBotWizard(true)} className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-black transition">
                <Plus className="w-4 h-4" /> New chatbot
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {selectedBot && knowledge ? (
          <ChatbotDashboard chatbot={selectedBot} knowledgeData={knowledge} onSaveKnowledge={saveKnowledge} onUploadSources={uploadSources} onAddUrl={addUrlSource} onSaveSettings={saveBotSettings} onBack={() => { setForceWizardFor(null); setSelectedBot(null); }} onDeleteBot={deleteBot} />
        ) : showAll ? (
          <AllBotsView chatbots={chatbots} onSelectBot={selectBot} onBack={() => setShowAll(false)} onCreateRequest={() => setShowBotWizard(true)} />
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Your Chatbots</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your chatbots and their knowledge.</p>
            </div>
            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : (
              <Overview chatbots={chatbots} onCreateRequest={() => setShowBotWizard(true)} onSelectBot={selectBot} onViewAll={() => setShowAll(true)} />
            )}
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
