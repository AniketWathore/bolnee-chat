import React from 'react';
import { 
  Bot, 
  MessageSquare, 
  Zap, 
  Clock, 
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { Chatbot } from '../types';

interface OverviewProps {
  chatbots: Chatbot[];
  onCreateRequest: () => void;
  onSelectBot: (id: string) => void;
  onViewAll: () => void;
}

export default function Overview({ chatbots, onCreateRequest, onSelectBot, onViewAll }: OverviewProps) {
  const stats = [
    { label: 'Chatbots', value: chatbots.length.toString(), icon: Bot },
    { label: 'Total Messages', value: '0', icon: Zap },
    { label: 'Uptime', value: '99.9%', icon: Clock },
    { label: 'Active Sessions', value: '0', icon: MessageSquare },
  ];

  return (
    <div className="space-y-12">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-line">
        {stats.map((stat, i) => (
          <div 
            key={stat.label} 
            className={`p-6 md:p-8 bg-white/50 space-y-4 border-b md:border-b-0 ${i < stats.length - 1 ? 'md:border-r' : ''} border-line`}
          >
            <div className="flex items-center gap-2 opacity-50">
              <stat.icon className="w-3 h-3" />
              <span className="font-mono text-[10px] uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-black">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-line pb-4">
          <h2 className="font-mono text-xs font-black uppercase tracking-tight">Your Infrastructure</h2>
          <button 
             onClick={onViewAll}
             className="font-mono text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 flex items-center gap-1"
          >
            View All <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {chatbots.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {chatbots.slice(0, 4).map((bot) => (
              <div key={bot._id} className="brutal-card p-8 group hover:bg-ink hover:text-bg transition-colors cursor-pointer" onClick={() => onSelectBot(bot._id)}>
                 <div className="flex justify-between items-start mb-6">
                    <div className="w-10 h-10 brutal-border flex items-center justify-center bg-white group-hover:bg-line/20 group-hover:text-white">
                       <Bot className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-widest border border-line px-2 py-0.5 opacity-50">Operational</span>
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase italic tracking-tight">{bot.name}</h3>
                    <p className="font-mono text-[10px] uppercase opacity-50 tracking-widest">
                       Created {new Date(bot.createdAt).toLocaleDateString()}
                    </p>
                 </div>
                 <div className="mt-8 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="font-mono text-[10px] uppercase font-bold">Configure Knowledge Base</span>
                    <ArrowUpRight className="w-4 h-4" />
                 </div>
              </div>
            ))}
               <button 
                  onClick={onCreateRequest}
                  className="brutal-card border-dashed bg-transparent flex flex-col items-center justify-center gap-4 opacity-40 hover:opacity-100 hover:bg-white transition-all group"
               >
                  <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform" />
                  <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Deploy New Node</span>
               </button>
          </div>
        ) : (
          <div className="brutal-card text-center py-32 flex flex-col items-center gap-4 border-dashed bg-transparent">
            <Bot className="w-12 h-12 opacity-10" />
            <div className="space-y-2">
              <h3 className="font-mono text-xl font-black uppercase italic">Zero Active Nodes</h3>
              <p className="font-mono text-xs opacity-50 max-w-xs mx-auto">
                No chatbots detected in your infrastructure. Deploy your first instance to start automating.
              </p>
            </div>
            <button onClick={onCreateRequest} className="brutal-btn mt-6 font-bold bg-ink text-bg">
              + Deploy Chatbot Instance
            </button>
          </div>
        )}
      </div>

      {/* System Status Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="brutal-card bg-ink text-bg p-8 space-y-6">
           <div className="space-y-1">
             <span className="font-mono text-[10px] uppercase opacity-50 tracking-widest">Platform Status</span>
             <h3 className="font-mono text-lg font-black uppercase">Infrastructure</h3>
           </div>
           <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono opacity-80">
                <span>Latency</span>
                <span>24ms</span>
              </div>
              <div className="w-full h-1 bg-white/20">
                <div className="w-[80%] h-full bg-green-400" />
              </div>
           </div>
           <p className="font-mono text-[9px] uppercase tracking-tighter opacity-70">
             All systems operational. Deploying bots across 12 global regions.
           </p>
        </div>

        <div className="md:col-span-2 brutal-card p-8 flex flex-col justify-between">
           <div className="flex justify-between items-start">
             <div className="space-y-1">
               <span className="font-mono text-[10px] uppercase opacity-50 tracking-widest">Pro Tip</span>
               <h3 className="font-mono text-lg font-black uppercase italic">Contextual Depth</h3>
             </div>
             <div className="p-3 border border-line rounded-full">
               <Zap className="w-4 h-4 fill-current" />
             </div>
           </div>
           <p className="font-mono text-xs opacity-60 leading-relaxed max-w-lg">
             The better your knowledge base, the smarter your bot. Add detailed product listings and 
             company policies to reduce human support tickets by up to 80%.
           </p>
           <button className="font-mono text-[10px] uppercase font-bold underline underline-offset-4 w-fit hover:opacity-70 transition-opacity">
             Optimization Guide
           </button>
        </div>
      </div>
    </div>
  );
}
