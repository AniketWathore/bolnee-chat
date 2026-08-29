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
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 text-gray-500">
              <stat.icon className="w-4 h-4" />
              <span className="text-xs">{stat.label}</span>
            </div>
            <div className="mt-3 text-2xl font-semibold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-900">Your Chatbots</h2>
          {chatbots.length > 4 && (
            <button onClick={onViewAll} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
          {chatbots.length > 0 && chatbots.length <= 4 && (
            <button onClick={onViewAll} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {chatbots.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {chatbots.slice(0, 4).map((bot) => (
              <div key={bot._id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition cursor-pointer" onClick={() => onSelectBot(bot._id)}>
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                    {bot.avatar ? <img src={bot.avatar} alt="" className="w-full h-full object-cover" /> : <Bot className="w-5 h-5 text-gray-400" />}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">Live</span>
                </div>
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900">{bot.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">Created {new Date(bot.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="mt-4 text-xs text-gray-500 flex items-center gap-1">
                  Open <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
            ))}
            <button onClick={onCreateRequest} className="rounded-xl border-2 border-dashed border-gray-200 bg-transparent flex flex-col items-center justify-center gap-3 py-10 hover:border-gray-300 hover:bg-white transition">
              <Plus className="w-7 h-7 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">New chatbot</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 text-center py-16 flex flex-col items-center gap-3">
            <Bot className="w-10 h-10 text-gray-300" />
            <h3 className="font-medium text-gray-900">No chatbots yet</h3>
            <p className="text-sm text-gray-500 max-w-xs">Create your first chatbot to start helping your visitors.</p>
            <button onClick={onCreateRequest} className="mt-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-black">
              Create chatbot
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
