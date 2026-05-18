import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquareCode, 
  BookOpen, 
  Settings, 
  LogOut,
  Plus,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { NavSection, NavItem, KnowledgeData, Chatbot } from './types';
import KnowledgeSection from './components/KnowledgeSection';
import Overview from './components/Overview';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'chatbots', label: 'Chatbots', icon: MessageSquareCode },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [knowledge, setKnowledge] = useState<KnowledgeData | null>(null);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [newBotName, setNewBotName] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchChatbots();
    }
  }, [token]);

  useEffect(() => {
    if (token && activeBotId) {
      fetchKnowledge(activeBotId);
    }
  }, [token, activeBotId]);

  const fetchChatbots = async () => {
    try {
      const response = await fetch('/api/chatbots', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setChatbots(data);
        if (data.length > 0 && !activeBotId) {
          setActiveBotId(data[0]._id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch chatbots", error);
    }
  };

  const fetchKnowledge = async (botId: string) => {
    try {
      const response = await fetch(`/api/knowledge?chatbotId=${botId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setKnowledge(data);
    } catch (error) {
      console.error("Failed to fetch knowledge", error);
    }
  };

  const handleSaveKnowledge = async (updatedKnowledge: KnowledgeData) => {
    try {
      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedKnowledge),
      });
      const result = await response.json();
      if (result.success) {
        setKnowledge(result.data);
      }
    } catch (error) {
      console.error("Failed to save knowledge", error);
    }
  };

  const createChatbot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName.trim()) return;

    try {
      const response = await fetch('/api/chatbots', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newBotName }),
      });
      const data = await response.json();
      if (response.ok) {
        setChatbots([...chatbots, data]);
        setActiveBotId(data._id);
        setShowCreateBot(false);
        setNewBotName('');
        setActiveSection('knowledge');
      }
    } catch (error) {
      console.error("Failed to create chatbot", error);
    }
  };

  const handleLoginSuccess = (userData: any, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setShowAuth(false);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setActiveSection('overview');
  };

  if (!token) {
    return (
      <>
        <LandingPage 
          onGetStarted={() => { setAuthMode('signup'); setShowAuth(true); }}
          onLogin={() => { setAuthMode('login'); setShowAuth(true); }}
        />
        {showAuth && (
          <Auth 
            initialMode={authMode}
            onSuccess={handleLoginSuccess}
            onClose={() => setShowAuth(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-line bg-white/30 backdrop-blur-sm flex flex-col">
        <div className="p-6 h-16 flex items-center gap-2">
          <span className="font-mono font-black text-xl tracking-tighter">BOLNEE</span>
        </div>

        <nav className="flex-1 mt-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "w-full sidebar-link",
                activeSection === item.id && "active"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-line bg-white/50">
          <div className="flex flex-col gap-2 mb-4">
            <span className="font-mono text-[10px] uppercase opacity-50 tracking-widest">Signed in as</span>
            <div className="flex flex-col">
              <span className="font-bold text-xs">{user?.name}</span>
              <span className="text-[10px] opacity-70">{user?.email}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full brutal-btn flex items-center justify-center gap-2 text-xs">
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="h-16 border-b border-line px-8 flex items-center justify-between sticky top-0 bg-bg/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-mono text-xs uppercase tracking-[0.2em] font-bold border-r border-line pr-4">
              {activeSection}
            </h1>
            {chatbots.length > 1 && (
              <select 
                value={activeBotId || ''} 
                onChange={(e) => setActiveBotId(e.target.value)}
                className="bg-transparent font-mono text-[10px] uppercase font-bold outline-none border border-line px-2 py-1"
              >
                {chatbots.map(bot => (
                  <option key={bot._id} value={bot._id}>{bot.name}</option>
                ))}
              </select>
            )}
          </div>
          
          <button onClick={() => setShowCreateBot(true)} className="brutal-btn flex items-center gap-2 py-1.5 h-auto">
            <Plus className="w-4 h-4" />
            New Chatbot
          </button>
        </header>

        <div className="p-10 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'overview' && (
                <Overview 
                  chatbots={chatbots} 
                  onCreateRequest={() => setShowCreateBot(true)} 
                  onSelectBot={(id) => { setActiveBotId(id); setActiveSection('knowledge'); }}
                />
              )}
              {activeSection === 'knowledge' && (
                knowledge ? (
                  <KnowledgeSection 
                    data={knowledge} 
                    onSave={handleSaveKnowledge} 
                  />
                ) : (
                  <div className="brutal-card text-center py-20">
                     <span className="font-mono text-xs opacity-50 uppercase tracking-widest">Select or create a chatbot first</span>
                  </div>
                )
              )}
              {activeSection === 'chatbots' && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {chatbots.map(bot => (
                     <div key={bot._id} className="brutal-card p-8 flex flex-col justify-between group h-64">
                       <div className="space-y-4">
                          <div className="w-10 h-10 brutal-border flex items-center justify-center bg-ink text-bg">
                            <Bot className="w-5 h-5" />
                          </div>
                          <div>
                             <h3 className="font-mono text-lg font-black uppercase">{bot.name}</h3>
                             <p className="font-mono text-[10px] opacity-50 uppercase mt-1">ID: {bot._id.substr(-8)}</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => { setActiveBotId(bot._id); setActiveSection('knowledge'); }}
                         className="w-full brutal-btn group-hover:bg-ink group-hover:text-bg mt-6"
                       >
                         Manage Bot
                       </button>
                     </div>
                   ))}
                   <button 
                     onClick={() => setShowCreateBot(true)}
                     className="brutal-card border-dashed bg-transparent p-8 flex flex-col items-center justify-center gap-4 hover:bg-white opacity-60 hover:opacity-100 transition-all group"
                   >
                     <div className="w-12 h-12 brutal-border border-dashed flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6" />
                     </div>
                     <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Add New Chatbot</span>
                   </button>
                </div>
              )}
              {activeSection === 'settings' && (
                <div className="max-w-xl mx-auto space-y-8">
                  <div className="space-y-1">
                     <h2 className="text-3xl font-black uppercase italic">Account Settings</h2>
                     <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Manage your profile and platform preferences</p>
                  </div>
                  <div className="brutal-card space-y-6">
                     <div className="space-y-1">
                        <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40">User Name</label>
                        <div className="p-3 brutal-border bg-line/5 font-mono text-sm">{user?.name}</div>
                     </div>
                     <div className="space-y-1">
                        <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40">Email Address</label>
                        <div className="p-3 brutal-border bg-line/5 font-mono text-sm">{user?.email}</div>
                     </div>
                     <div className="space-y-1">
                        <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40">User ID</label>
                        <div className="p-3 brutal-border bg-line/5 font-mono text-[10px] opacity-60">{user?.id}</div>
                     </div>
                  </div>
                  <button onClick={handleLogout} className="brutal-btn w-full border-red-200 text-red-500 hover:bg-red-500 hover:text-white">Delete Account [Dangerous Zone]</button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Create Chatbot Dialog */}
        <AnimatePresence>
          {showCreateBot && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCreateBot(false)}
                className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-md bg-bg brutal-border p-10"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40">Step 01 / Basic Setup</span>
                    <h3 className="text-3xl font-black uppercase italic">Create New Bot</h3>
                  </div>
                  <form onSubmit={createChatbot} className="space-y-6">
                    <div className="space-y-1">
                       <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Chatbot Name</label>
                       <input 
                         autoFocus
                         required
                         type="text" 
                         value={newBotName}
                         onChange={(e) => setNewBotName(e.target.value)}
                         className="brutal-input"
                         placeholder="e.g. Website Assistant"
                       />
                    </div>
                    <div className="flex gap-4">
                       <button type="button" onClick={() => setShowCreateBot(false)} className="flex-1 font-mono text-[10px] uppercase font-bold hover:underline">Cancel</button>
                       <button type="submit" className="flex-[2] brutal-btn bg-ink text-bg">Create & Continue ↗</button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer Accent */}
        <div className="fixed bottom-6 right-6">
          <div className="flex items-center gap-3 bg-ink text-bg px-4 py-2 rounded-full shadow-xl">
             <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
             <span className="font-mono text-[10px] uppercase font-bold tracking-widest leading-none">System Live</span>
          </div>
        </div>
      </main>
    </div>
  );
}
