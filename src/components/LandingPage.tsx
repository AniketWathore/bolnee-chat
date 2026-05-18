import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Bot, Zap, Shield, Globe, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
   onGetStarted: () => void;
   onLogin: () => void;
}

export default function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
   return (
      <div className="min-h-screen bg-bg selection:bg-ink selection:text-bg">
         {/* Navigation */}
         <nav className="h-20 border-b border-line px-8 flex items-center justify-between sticky top-0 bg-bg/80 backdrop-blur-xl z-50">
            <div className="font-mono font-black text-2xl tracking-tighter">BOLNEE</div>
            <div className="hidden md:flex items-center gap-8 font-mono text-[10px] uppercase font-bold tracking-widest">
               <a href="#features" className="hover:opacity-50 transition-opacity">Features</a>
               <a href="#how-it-works" className="hover:opacity-50 transition-opacity">How it works</a>
               <a href="#pricing" className="hover:opacity-50 transition-opacity">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={onLogin} className="font-mono text-[10px] uppercase font-bold tracking-widest hover:opacity-50">Log In</button>
               <button onClick={onGetStarted} className="brutal-btn bg-ink text-bg">Start Free ↗</button>
            </div>
         </nav>

         {/* Hero */}
         <section className="px-8 pt-24 pb-32 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
               initial={{ opacity: 0, x: -20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="space-y-8"
            >
               <div className="inline-block px-3 py-1 brutal-border font-mono text-[10px] uppercase font-bold tracking-widest bg-white">
                  [NODE_UNLTD] // Bolnee Infrastructure
               </div>
               <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] uppercase italic">
                  Automate your site with <span className="text-blue-600">ZERO LIMITS.</span>
               </h1>
               <p className="text-lg font-mono opacity-60 max-w-lg leading-relaxed">
                  Deploy high-performance AI chatbots. No rate limits, no message quotas, unlimited users.
                  Scale your support without scaling costs.
               </p>
               <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button onClick={onGetStarted} className="brutal-btn bg-ink text-bg text-lg px-8 py-4 flex items-center gap-3">
                     Get Started — It's Free <ArrowRight className="w-5 h-5" />
                  </button>
                  <button onClick={onLogin} className="brutal-btn bg-white text-ink text-lg px-8 py-4">
                     Sign In
                  </button>
               </div>
               <div className="flex items-center gap-8 font-mono text-[10px] uppercase opacity-40">
                  <span>Unlimited Users</span>
                  <span>•</span>
                  <span>No Rate Limits</span>
                  <span>•</span>
                  <span>1-line install</span>
               </div>
            </motion.div>

            <motion.div
               initial={{ opacity: 0, scale: 0.95 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               className="relative aspect-square"
            >
               <div className="absolute inset-0 brutal-border bg-white mt-4 ml-4" />
               <div className="relative h-full w-full brutal-border bg-ink overflow-hidden group">
                  <img
                     src="https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1000"
                     alt="AI Hub"
                     className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute bottom-8 left-8 bg-white brutal-border p-4">
                     <div className="font-mono text-[10px] uppercase opacity-50 mb-1">// systems.status</div>
                     <div className="font-mono text-2xl font-black">STABLE_LIVE</div>
                  </div>
               </div>
            </motion.div>
         </section>

         {/* Stats */}
         <section className="bg-ink text-bg py-20 px-8">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
               {[
                  { label: 'Messages/Mo', value: '∞' },
                  { label: 'Rate Limit', value: 'None' },
                  { label: 'Users', value: 'Unlimited' },
                  { label: 'P95 Latency', value: '< 200ms' },
               ].map((stat) => (
                  <div key={stat.label} className="space-y-2">
                     <div className="text-4xl font-black font-mono">{stat.value}</div>
                     <div className="font-mono text-[10px] uppercase tracking-widest opacity-50">{stat.label}</div>
                  </div>
               ))}
            </div>
         </section>

         {/* How it Works */}
         <section id="how-it-works" className="py-32 px-8 bg-white/30">
            <div className="max-w-7xl mx-auto space-y-20">
               <div className="text-center space-y-4">
                  <h2 className="text-4xl font-black uppercase italic">Setup in 4 Nodes</h2>
                  <p className="font-mono text-xs opacity-50 uppercase tracking-widest">The journey to full automation</p>
               </div>
               <div className="grid md:grid-cols-4 gap-px bg-line brutal-border">
                  {[
                     { step: '01', title: 'Account', desc: 'Create your Bolnee account.' },
                     { step: '02', title: 'Deploy Bot', desc: 'Launch a new chatbot instance with a single click.' },
                     { step: '03', title: 'Knowledge', desc: 'Sync your products, policies, and contact details.' },
                     { step: '04', title: 'Embed Snippet', desc: 'Paste the generated JS code into your website body.' },
                  ].map((item) => (
                     <div key={item.step} className="bg-bg p-10 space-y-6">
                        <div className="flex justify-between items-start">
                           <span className="font-mono text-4xl font-black opacity-10">{item.step}</span>
                           <CheckCircle2 className="w-5 h-5 opacity-20" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight">{item.title}</h3>
                        <p className="font-mono text-xs opacity-60 leading-relaxed">{item.desc}</p>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* Pricing */}
         <section id="pricing" className="py-32 px-8 max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-20">
               <h2 className="text-4xl font-black uppercase italic">Pricing Infrastructure</h2>
               <p className="font-mono text-xs opacity-50 uppercase tracking-widest">Scale your automation as you grow</p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
               {/* Free */}
               <div className="brutal-card p-10 space-y-8 bg-white">
                  <div className="space-y-2">
                     <span className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Tier_01 // Starter</span>
                     <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black uppercase italic">Free</h3>
                     </div>
                  </div>
                  <ul className="space-y-4 font-mono text-xs opacity-70">
                     <li className="flex items-center gap-2">/ 1 Active Chatbot</li>
                     <li className="flex items-center gap-2">/ Limited Messages</li>
                     <li className="flex items-center gap-2">/ Limited Users per Mo</li>
                     <li className="flex items-center gap-2">/ Standard Processing</li>
                  </ul>
                  <button onClick={onGetStarted} className="w-full brutal-btn">Deploy Starter ↗</button>
               </div>

               {/* Pro */}
               <div className="brutal-card p-10 space-y-8 bg-ink text-bg">
                  <div className="space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Tier_02 // Industrial</span>
                        <span className="bg-blue-600 text-[10px] px-2 py-0.5 font-bold uppercase tracking-widest">Recommended</span>
                     </div>
                     <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black uppercase italic">$10</h3>
                        <span className="font-mono text-sm opacity-50 uppercase">/ Month</span>
                     </div>
                  </div>
                  <ul className="space-y-4 font-mono text-xs opacity-70">
                     <li className="flex items-center gap-2">/ Unlimited Chatbots</li>
                     <li className="flex items-center gap-2">/ Unlimited Messages [No Cap]</li>
                     <li className="flex items-center gap-2">/ Unlimited Users [Global]</li>
                     <li className="flex items-center gap-2">/ Priority Node Support</li>
                  </ul>
                  <button onClick={onGetStarted} className="w-full brutal-btn bg-white text-ink">Scale to Pro ↗</button>
               </div>
            </div>
         </section>

         {/* Features */}
         <section id="features" className="py-32 px-8 max-w-7xl mx-auto space-y-20">
            <div className="text-center space-y-4">
               <h2 className="text-4xl font-black uppercase italic">Core Features</h2>
               <p className="font-mono text-xs opacity-50 uppercase tracking-widest">Built for high-volume automation</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
               {[
                  { icon: Zap, title: 'No Rate Limits', desc: 'Engineered for high-throughput. We never cap your message volume, even on heavy traffic days.' },
                  { icon: Shield, title: 'Message Freedom', desc: 'Communicate as much as you need. Our infrastructure scales dynamically to your demand.' },
                  { icon: Globe, title: 'Unlimited Reach', desc: 'No limits on user sessions. Onboard a million users effortlessly across all regions.' },
               ].map((feat) => (
                  <div key={feat.title} className="brutal-card space-y-6">
                     <div className="w-12 h-12 bg-ink text-bg flex items-center justify-center brutal-border">
                        <feat.icon className="w-6 h-6" />
                     </div>
                     <h3 className="text-2xl font-black uppercase">{feat.title}</h3>
                     <p className="font-mono text-xs leading-relaxed opacity-60">{feat.desc}</p>
                  </div>
               ))}
            </div>
         </section>

         {/* Footer */}
         <footer className="border-t border-line py-12 px-8">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
               <div className="font-mono font-black text-xl tracking-tighter">BOLNEE</div>
               <div className="flex gap-8 font-mono text-[10px] uppercase font-bold opacity-50">
                  <a href="#" className="hover:opacity-100 transition-opacity">Privacy Policy</a>
                  <a href="#" className="hover:opacity-100 transition-opacity">Terms of Service</a>
                  <a href="#" className="hover:opacity-100 transition-opacity">Support</a>
                  <a href="#" className="hover:opacity-100 transition-opacity">Node Status</a>
               </div>
               <div className="flex items-center gap-2 bg-ink text-bg px-4 py-2 mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="font-mono text-[10px] uppercase font-bold tracking-widest leading-none">All Systems Stable</span>
               </div>
            </div>
         </footer>
      </div>
   );
}
