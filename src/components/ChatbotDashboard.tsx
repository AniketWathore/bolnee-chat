import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Bot, MessageSquare, BookOpen, Settings,
  Zap, Clock, Trash2, ArrowUpRight, Copy, Check, Globe
} from 'lucide-react';
import { Chatbot, KnowledgeData } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import KnowledgeSection from './KnowledgeSection';

type ChatbotTab = 'overview' | 'chats' | 'knowledge' | 'settings';

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

export default function ChatbotDashboard({
  chatbot, knowledgeData, onSaveKnowledge, onUploadSources, onAddUrl, onSaveSettings, onBack, onDeleteBot, forceOpenWizard, onWizardClose
}: ChatbotDashboardProps) {
  const [activeTab, setActiveTab] = useState<ChatbotTab>('overview');
  const [showKnowledgeWizard, setShowKnowledgeWizard] = useState(false);
  const [copied, setCopied] = useState(false);

  const isKnowledgeConfigured = !!(knowledgeData.about);

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
  };

  const handleBack = () => {
    if (showKnowledgeWizard) return;
    onBack();
  };

  const DEPLOY_URL = window.location.origin;

  const embedCode = `<script>
  window.BotConfig = {
    botName: "${chatbot.name}",
    avatar: "",
    chatUrl: "${DEPLOY_URL}/api/public/chat/${chatbot._id}",
    accentColor: "#111111",
    greeting: "Hi! How can I help?"
  };
</script>
<script src="${DEPLOY_URL}/chatbot-widget.js" async></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Zap },
    { id: 'chats' as const, label: 'Chats', icon: MessageSquare },
    { id: 'knowledge' as const, label: 'Knowledge', icon: BookOpen },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const renderOverview = () => (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 border border-line">
        <div className="p-6 md:p-8 bg-white/50 space-y-4 border-b md:border-b-0 md:border-r border-line">
          <div className="flex items-center gap-2 opacity-50">
            <Bot className="w-3 h-3" />
            <span className="font-mono text-[10px] uppercase tracking-widest">Status</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black text-green-600">Live</span>
          </div>
        </div>
        <div className="p-6 md:p-8 bg-white/50 space-y-4 border-b md:border-b-0 md:border-r border-line">
          <div className="flex items-center gap-2 opacity-50">
            <MessageSquare className="w-3 h-3" />
            <span className="font-mono text-[10px] uppercase tracking-widest">Messages</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black">0</span>
          </div>
        </div>
        <div className="p-6 md:p-8 bg-white/50 space-y-4 border-b md:border-b-0 md:border-r border-line">
          <div className="flex items-center gap-2 opacity-50">
            <Clock className="w-3 h-3" />
            <span className="font-mono text-[10px] uppercase tracking-widest">Created</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-sm font-black">{new Date(chatbot.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="p-6 md:p-8 bg-white/50 space-y-4 border-line">
          <div className="flex items-center gap-2 opacity-50">
            <Globe className="w-3 h-3" />
            <span className="font-mono text-[10px] uppercase tracking-widest">Knowledge</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-lg font-black ${isKnowledgeConfigured ? 'text-green-600' : 'opacity-40'}`}>
              {isKnowledgeConfigured ? 'Ready' : 'Empty'}
            </span>
          </div>
        </div>
      </div>

      <div className="brutal-card p-8 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-mono text-xs font-black uppercase tracking-tight">Deployment</h3>
          <button onClick={copyToClipboard} className="brutal-btn bg-ink text-bg py-2 px-4 flex items-center gap-2 text-xs">
            {copied ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy Embed'}
          </button>
        </div>
        <pre className="bg-ink text-bg p-4 font-mono text-[10px] overflow-x-auto brutal-border leading-relaxed whitespace-pre-wrap break-all max-h-32">
          {embedCode}
        </pre>
      </div>
    </motion.div>
  );

  const renderChats = () => (
    <motion.div
      key="chats"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="brutal-card text-center py-32 flex flex-col items-center gap-4 border-dashed bg-transparent"
    >
      <MessageSquare className="w-12 h-12 opacity-10" />
      <div className="space-y-2">
        <h3 className="font-mono text-xl font-black uppercase italic">No Conversations Yet</h3>
        <p className="font-mono text-xs opacity-50 max-w-xs mx-auto">
          Chat history will appear here once users start interacting with your bot.
        </p>
      </div>
    </motion.div>
  );

  const renderKnowledge = () => (
    <motion.div
      key="knowledge"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {isKnowledgeConfigured ? (
        <div className="brutal-card p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500 text-white flex items-center justify-center brutal-border shrink-0">
              <Check className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-mono text-lg font-black uppercase">Knowledge Configured</h3>
              <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Your chatbot has indexed knowledge data</p>
            </div>
          </div>
          <button
            onClick={() => setShowKnowledgeWizard(true)}
            className="brutal-btn bg-white px-8"
          >
            Reconfigure Knowledge
          </button>
        </div>
      ) : (
        <div className="brutal-card text-center py-24 flex flex-col items-center gap-4 border-dashed bg-transparent">
          <BookOpen className="w-12 h-12 opacity-10" />
          <div className="space-y-2">
            <h3 className="font-mono text-xl font-black uppercase italic">No Knowledge Base</h3>
            <p className="font-mono text-xs opacity-50 max-w-sm mx-auto">
                Add your website URL and/or upload PDFs/docs to train your chatbot, then configure your AI provider.
              </p>
          </div>
          <button
            onClick={() => setShowKnowledgeWizard(true)}
            className="brutal-btn mt-4 bg-ink text-bg px-8 py-3 flex items-center gap-2"
          >
            Setup Knowledge Base
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );

  const renderSettings = () => (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-xl space-y-8"
    >
      <div className="brutal-card space-y-6">
        <div className="space-y-1">
          <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40">Bot Name</label>
          <div className="p-3 brutal-border bg-line/5 font-mono text-sm">{chatbot.name}</div>
        </div>
        <div className="space-y-1">
          <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40">Bot ID</label>
          <div className="p-3 brutal-border bg-line/5 font-mono text-[10px] opacity-60 break-all">{chatbot._id}</div>
        </div>
        <div className="space-y-1">
          <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-40">Created</label>
          <div className="p-3 brutal-border bg-line/5 font-mono text-xs">{new Date(chatbot.createdAt).toLocaleString()}</div>
        </div>
      </div>

      {onDeleteBot && (
        <button
          onClick={() => onDeleteBot(chatbot._id)}
          className="brutal-btn w-full border-red-200 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Chatbot
        </button>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b border-line pb-6">
        <button onClick={handleBack} className="brutal-btn bg-white flex items-center gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black uppercase italic">{chatbot.name}</h2>
          <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Bot Dashboard</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-line pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 py-2.5 px-5 font-mono text-[10px] uppercase tracking-widest border transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-ink text-bg border-ink'
                : 'bg-white border-line hover:bg-white/50 opacity-60'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && renderOverview()}
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
