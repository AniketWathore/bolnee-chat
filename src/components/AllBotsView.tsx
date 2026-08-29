import React from 'react';
import { Bot, ArrowLeft } from 'lucide-react';
import { Chatbot } from '../types';

interface Props {
  chatbots: Chatbot[];
  onSelectBot: (id: string) => void;
  onBack: () => void;
  onCreateRequest: () => void;
}

export default function AllBotsView({ chatbots, onSelectBot, onBack, onCreateRequest }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 border border-slate-700 bg-slate-900 rounded-lg px-3 py-1.5 text-xs hover:bg-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div>
          <h2 className="text-lg font-semibold text-white">All chatbots</h2>
          <p className="text-xs text-slate-400">{chatbots.length} total</p>
        </div>
      </div>

      {chatbots.length === 0 ? (
        <div className="bg-[#0f172a] rounded-xl border-2 border-dashed border-slate-700 text-center py-16">
          <Bot className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="mt-3 text-sm text-slate-400">No chatbots yet</div>
          <button onClick={onCreateRequest} className="mt-4 bg-white text-black px-4 py-2 rounded-lg text-sm">Create chatbot</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chatbots.map((bot) => (
            <div key={bot._id} onClick={() => onSelectBot(bot._id)} className="bg-[#0f172a] rounded-xl border border-slate-800 p-5 hover:border-slate-700 hover:shadow-sm cursor-pointer transition">
              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                {bot.avatar ? <img src={bot.avatar} alt="" className="w-full h-full object-cover" /> : <Bot className="w-5 h-5 text-slate-500" />}
              </div>
              <div className="mt-3">
                <div className="font-medium text-white truncate">{bot.name}</div>
                <div className="text-xs text-slate-400 mt-1">Created {new Date(bot.createdAt).toLocaleDateString()}</div>
                <div className="text-xs text-slate-500 font-mono mt-1 truncate">{bot._id}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
