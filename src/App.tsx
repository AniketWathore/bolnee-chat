import { useEffect, useState } from 'react';
import { Bot, LogOut, Plus, Settings } from 'lucide-react';
import Auth from './components/Auth';
import ChatbotDashboard from './components/ChatbotDashboard';
import LandingPage from './components/LandingPage';
import Overview from './components/Overview';
import BotCreationWizard from './components/BotCreationWizard';
import KnowledgeSection from './components/KnowledgeSection';
import { Chatbot, KnowledgeData } from './types';

interface Session {
  user: { id: string; email: string; name: string };
  token: string;
}

const EMPTY_KNOWLEDGE: Omit<KnowledgeData, 'chatbotId' | 'userId'> = {
  about: '',
  products: [],
  policy: '',
  contact: { mobile: '', email: '', address: '', website: '' },
  faqs: [],
};

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const stored = localStorage.getItem('bolnee_session');
    return stored ? JSON.parse(stored) : null;
  });
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedBot, setSelectedBot] = useState<Chatbot | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBotWizard, setShowBotWizard] = useState(false);

  const api = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (response.status === 401) {
      handleLogout();
      throw new Error('Session expired');
    }
    if (!response.ok) throw new Error((await response.json()).error || 'Request failed');
    return response.json();
  };

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    api('/api/chatbots')
      .then(setChatbots)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.token]);

  const handleAuthSuccess = (user: Session['user'], token: string) => {
    const nextSession = { user, token };
    localStorage.setItem('bolnee_session', JSON.stringify(nextSession));
    setSession(nextSession);
    setShowAuth(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('bolnee_session');
    setSession(null);
    setSelectedBot(null);
    setKnowledge(null);
  };

  const [forceWizardFor, setForceWizardFor] = useState<string | null>(null);
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
  };

  const saveKnowledge = async (data: KnowledgeData) => {
    const saved = await api('/api/knowledge', { method: 'POST', body: JSON.stringify(data) });
    setKnowledge(saved.data);
  };

  const uploadSources = async (files: File[]) => {
    if (!selectedBot || !session) return;
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`/api/knowledge/sources/${encodeURIComponent(selectedBot._id)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: form,
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Upload failed');
    }
  };

  const addUrlSource = async (url: string) => {
    if (!selectedBot || !session) return;
    const response = await fetch(`/api/knowledge/sources/${encodeURIComponent(selectedBot._id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
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

  if (!session) {
    return (
      <>
        <LandingPage
          onGetStarted={() => { setAuthMode('signup'); setShowAuth(true); }}
          onLogin={() => { setAuthMode('login'); setShowAuth(true); }}
        />
        {showAuth && <Auth initialMode={authMode} onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-bg/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          <button onClick={() => setSelectedBot(null)} className="font-mono font-black text-2xl tracking-tighter">BOLNEE</button>
          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest">
            <span className="hidden sm:block opacity-50">{session.user.email}</span>
            <button onClick={handleLogout} className="brutal-btn py-2 flex items-center gap-2"><LogOut className="w-3 h-3" /> Exit</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50 mb-3">Control Plane / {session.user.name}</p>
            <h1 className="text-5xl font-black uppercase italic tracking-tight">{selectedBot ? 'Bot Console' : 'Your Infrastructure'}</h1>
          </div>
          {!selectedBot && <button onClick={() => setShowBotWizard(true)} className="brutal-btn bg-ink text-bg py-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Deploy Chatbot</button>}
        </div>
        {loading ? <div className="font-mono text-xs uppercase opacity-50">Loading infrastructure...</div> : selectedBot && knowledge ? (
          <ChatbotDashboard chatbot={selectedBot} knowledgeData={knowledge} onSaveKnowledge={saveKnowledge} onUploadSources={uploadSources} onAddUrl={addUrlSource} onSaveSettings={saveBotSettings} onBack={() => { setForceWizardFor(null); setSelectedBot(null); }} onDeleteBot={deleteBot} />
        ) : (
          <Overview chatbots={chatbots} onCreateRequest={() => setShowBotWizard(true)} onSelectBot={selectBot} onViewAll={() => undefined} />
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