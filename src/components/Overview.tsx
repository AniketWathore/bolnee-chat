import React, { useEffect, useState } from 'react';
import { Bot, MessageSquare, Users, Plus, ArrowUpRight } from 'lucide-react';
import { Chatbot } from '../types';

interface OverviewProps {
  chatbots: Chatbot[];
  onCreateRequest: () => void;
  onSelectBot: (id: string) => void;
  onViewAll: () => void;
}

export default function Overview({ chatbots, onCreateRequest, onSelectBot, onViewAll }: OverviewProps) {
  const [totalMessages, setTotalMessages] = useState<number | null>(null);
  const [activeSessions, setActiveSessions] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (!res.ok) return;
        const data = await res.json() as { totalMessages: number; activeSessions: number };
        if (!cancelled) {
          setTotalMessages(data.totalMessages);
          setActiveSessions(data.activeSessions);
        }
      } catch { /* ignore */ }
    };
    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const stats = [
    { label: 'Chatbots', value: chatbots.length.toString(), icon: Bot },
    { label: 'Total messages', value: totalMessages === null ? '—' : totalMessages.toString(), icon: MessageSquare },
    { label: 'Active sessions', value: activeSessions === null ? '—' : activeSessions.toString(), icon: Users },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#0f172a] rounded-xl border border-slate-800 p-5">
            <div className="flex items-center gap-2 text-slate-400">
              <stat.icon className="w-4 h-4" />
              <span className="text-xs">{stat.label}</span>
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-white">Your Chatbots</h2>
          {chatbots.length > 4 && (
            <button onClick={onViewAll} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
          {chatbots.length > 0 && chatbots.length <= 4 && (
            <button onClick={onViewAll} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {chatbots.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {chatbots.slice(0, 4).map((bot) => (
              <div key={bot._id} className="bg-[#0f172a] rounded-xl border border-slate-800 p-6 hover:border-slate-700 hover:shadow-sm transition cursor-pointer" onClick={() => onSelectBot(bot._id)}>
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                    {bot.avatar ? <img src={bot.avatar} alt="" className="w-full h-full object-cover" /> : <Bot className="w-5 h-5 text-slate-400" />}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">Live</span>
                </div>
                <div className="mt-4">
                  <h3 className="font-medium text-white">{bot.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">Created {new Date(bot.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="mt-4 text-xs text-slate-400 flex items-center gap-1">
                  Open <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
            ))}
            <button onClick={onCreateRequest} className="rounded-xl border-2 border-dashed border-slate-700 bg-transparent flex flex-col items-center justify-center gap-3 py-10 hover:border-slate-600 hover:bg-slate-900 transition">
              <Plus className="w-7 h-7 text-slate-500" />
              <span className="text-sm font-medium text-slate-400">New chatbot</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#0f172a] rounded-xl border-2 border-dashed border-slate-700 text-center py-16 flex flex-col items-center gap-3">
            <Bot className="w-10 h-10 text-slate-600" />
            <h3 className="font-medium text-white">No chatbots yet</h3>
            <p className="text-sm text-slate-400 max-w-xs">Create your first chatbot to start helping your visitors.</p>
            <button onClick={onCreateRequest} className="mt-2 bg-white text-black px-4 py-2 rounded-lg text-sm hover:bg-slate-100">
              Create chatbot
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
