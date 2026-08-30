import React from 'react';
import { Compass, ArrowLeft, Lightbulb, Rocket, Palette, MessageSquare } from 'lucide-react';

interface Props { onBack: () => void; }

export default function GuidesPage({ onBack }: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg px-3 py-1.5 bg-slate-900">
        <ArrowLeft className="w-4 h-4" /> Back to console
      </button>

      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center"><Compass className="w-5 h-5" /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Guides</h1>
            <p className="text-sm text-slate-400">Best practices to get the most from Bolnee.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-2 font-medium text-white"><Lightbulb className="w-4 h-4 text-amber-500" /> Writing a good greeting</div>
          <p className="text-sm text-white mt-2 leading-relaxed">Keep it short and specific. Example: <em>“Hi! I’m StackCost AI — ask me about pricing, tech stacks, or docs.”</em> Set it in <b>Appearance → Greeting</b>. It shows only once (persisted in widget), not on every open.</p>
        </div>

        <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-2 font-medium text-white"><Rocket className="w-4 h-4 text-green-600" /> Knowledge quality</div>
          <p className="text-sm text-white mt-2 leading-relaxed">Add <b>detailed</b> pages: pricing, FAQs, policies, product listings. The crawler extracts <code className="bg-slate-800 px-1 rounded text-slate-200">h1/h2/p/li</code> and dedups. More detail → fewer fallback answers. Use <b>Knowledge → Add knowledge</b> to append more later.</p>
        </div>

        <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-2 font-medium text-white"><Palette className="w-4 h-4 text-purple-600" /> Theming</div>
          <p className="text-sm text-white mt-2 leading-relaxed">In <b>Appearance</b> set <b>Accent</b> (header/button), <b>Theme</b> (light/dark/auto), <b>Avatar</b> (uploaded as file, not long string), and <b>Name</b>. Preview updates live. Light mode now uses pure black text and stronger borders for clarity.</p>
        </div>

        <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-2 font-medium text-white"><MessageSquare className="w-4 h-4 text-blue-600" /> Chat history</div>
          <p className="text-sm text-white mt-2 leading-relaxed">Chats are grouped by visitor IP/anonymous ID, then by date. Open a user to see their full conversation in chronological order. Use <b>Chats → CSV/JSON/PDF</b> to export. Active sessions = distinct visitors in last 5 minutes (polls every 5s).</p>
        </div>

        <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-5">
          <h3 className="font-medium text-white">Self-host checklist</h3>
          <ul className="text-sm text-white list-disc pl-5 mt-2 space-y-1">
            <li>Set <code className="bg-slate-800 px-1 rounded text-slate-200">DISABLE_AUTH=true</code> for no-login console</li>
            <li>Deploy to Vercel/Cloudflare — `vercel.json`/`wrangler.toml` already rewrites `/api/*`</li>
            <li>Use public `https://` chatUrl in embed (not `localhost` on external site)</li>
            <li>After deploy, regenerate embed code from <b>Overview</b></li>
          </ul>
        </div>
      </div>

      <div className="text-xs text-slate-500 border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>Tip: The widget remembers chats via <code className="bg-slate-800 px-1 rounded text-slate-200">localStorage</code> — close/open keeps history, only first open shows greeting.</div>
        <div className="flex items-center gap-1 shrink-0">Made with <span className="text-red-500">❤️</span> by <a href="https://github.com/AniketWathore" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">github/AniketWathore</a></div>
      </div>
    </div>
  );
}
