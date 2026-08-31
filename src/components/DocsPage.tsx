import React from 'react';
import { BookOpen, ArrowLeft, Copy, ExternalLink } from 'lucide-react';

interface Props { onBack: () => void; }

export default function DocsPage({ onBack }: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg px-3 py-1.5 bg-slate-900">
        <ArrowLeft className="w-4 h-4" /> Back to console
      </button>

      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-white border border-slate-700 flex items-center justify-center"><BookOpen className="w-5 h-5" /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Documentation</h1>
            <p className="text-sm text-slate-400">How Bolnee works — from creation to embed.</p>
          </div>
        </div>
      </div>

      <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-6 space-y-6">
        <section className="space-y-3">
          <h2 className="font-semibold text-white">1. Create a chatbot</h2>
          <p className="text-sm leading-relaxed text-white">Click <b>New chatbot</b>, enter a name and upload an avatar/logo (PNG/JPG/WEBP ≤2 MB). The avatar is stored as a file (<code className="bg-slate-800 px-1 rounded text-slate-200">/api/public/avatar/ID</code>) and shown in the widget header — not as a long string.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-white">2. Add knowledge</h2>
          <p className="text-sm leading-relaxed text-white">Enter your website URL (e.g., <code className="bg-slate-800 px-1 rounded text-slate-200">https://example.com</code>) and/or upload PDFs, TXT, Markdown, DOCX, FAQ. The server crawls same-origin pages via <code className="bg-slate-800 px-1 rounded text-slate-200">crawler/crawler.py</code> (sitemap + homepage), respects <code className="bg-slate-800 px-1 rounded text-slate-200">robots.txt</code>, and saves to <code className="bg-slate-800 px-1 rounded text-slate-200">data/{"{chatbotId}"}_website.json</code>. Chunks are indexed in SQLite for retrieval. Status is polled: queued → crawling → parsing → indexing → indexed.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-white">3. Configure provider</h2>
          <p className="text-sm leading-relaxed text-white">Choose provider (OpenRouter recommended), Base URL auto-fills (<code className="bg-slate-800 px-1 rounded text-slate-200">https://openrouter.ai/api/v1</code>), paste API key, click <b>Fetch models</b> to list models (free models like <code className="bg-slate-800 px-1 rounded text-slate-200">inclusionai/ling-3.0-flash-fin:free</code> appear first), pick one. Keys are stored encrypted (AES-256-GCM) and never in the embed snippet.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-white">4. Embed</h2>
          <p className="text-sm leading-relaxed text-white">Copy the snippet from <b>Overview → Embed code</b>:</p>
          <pre className="bg-slate-950 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
{`<script>
  window.BotConfig = {
    botName: "Your Bot",
    avatar: "https://your-domain/api/public/avatar/BOT_ID",
    widgetIcon: "https://your-domain/api/public/widget-icon/BOT_ID",
    chatUrl: "https://your-domain/api/public/chat/BOT_ID",
    accentColor: "#111111",
    greeting: "Hi! How can I help?"
  };
</script>
<script src="https://your-domain/chatbot-widget.js" async></script>`}
          </pre>
          <p className="text-sm leading-relaxed text-white">Paste before <code className="bg-slate-800 px-1 rounded text-slate-200">&lt;/body&gt;</code>. The widget stores history in <code className="bg-slate-800 px-1 rounded text-slate-200">localStorage</code> so greeting shows only once and chats persist when closing/opening.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-white">APIs</h2>
          <ul className="text-sm space-y-1 text-white list-disc pl-5">
            <li><code className="bg-slate-800 px-1 rounded text-slate-200">POST /api/chatbots</code> — create</li>
            <li><code className="bg-slate-800 px-1 rounded text-slate-200">PATCH /api/chatbots/:id</code> — appearance (name/avatar/accent/theme/greeting) + provider</li>
            <li><code className="bg-slate-800 px-1 rounded text-slate-200">GET /api/knowledge/sources?chatbotId=ID</code> — list knowledge</li>
            <li><code className="bg-slate-800 px-1 rounded text-slate-200">POST /api/public/chat/:id</code> — SSE chat (sends <code className="bg-slate-800 px-1 rounded text-slate-200">visitorId</code>)</li>
            <li><code className="bg-slate-800 px-1 rounded text-slate-200">GET /api/chatbots/:id/messages</code> — grouped chats</li>
          </ul>
        </section>
      </div>

      <div className="text-xs text-slate-500 border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>Need more? See <button onClick={onBack} className="underline">Guides</button> or open <a href="https://github.com" target="_blank" className="underline inline-flex items-center gap-1">GitHub <ExternalLink className="w-3 h-3" /></a>.</div>
        <div className="flex items-center gap-1">Made with <span className="text-red-500">❤️</span> by <a href="https://github.com/AniketWathore" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">github/AniketWathore</a></div>
      </div>
    </div>
  );
}
