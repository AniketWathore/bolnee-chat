import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowRight, Bot, ImagePlus, Upload, X } from 'lucide-react';

interface BotCreationWizardProps {
  onCreate: (name: string, avatar: string, widgetIcon: string) => Promise<void>;
  onCancel: () => void;
}

export default function BotCreationWizard({ onCreate, onCancel }: BotCreationWizardProps) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [widgetIcon, setWidgetIcon] = useState(''); // data URL or ''
  const [saving, setSaving] = useState(false);

  const [avatarError, setAvatarError] = useState('');
  const [widgetIconError, setWidgetIconError] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Default widget icon (single)
  const DEFAULT_WIDGET_ICONS = [
    { label: 'Default', fill: '#6366f1' },
  ] as const;

  // Precompute data URLs for default icons
  const defaultIconDataUrls = DEFAULT_WIDGET_ICONS.map(({ fill }) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"><path fill="${fill}" d="M12 3C6.48 3 2 6.92 2 11.8c0 2.2.87 4.2 2.32 5.74L3 21l4.13-1.59A10.97 10.97 0 0012 20.6c5.52 0 10-3.92 10-8.8C22 6.92 17.52 3 12 3z"/></svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  });

  const chooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setAvatarError("Only PNG, JPG, or WEBP allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be under 2 MB");
      return;
    }
    setAvatarError('');
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  };

  const chooseWidgetIcon = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setWidgetIconError("Only PNG, JPG, WEBP, or GIF allowed");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setWidgetIconError("Image must be under 1 MB");
      return;
    }
    setWidgetIconError('');
    const reader = new FileReader();
    reader.onload = () => {
      setWidgetIcon(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const selectDefaultIcon = (index: number) => {
    setWidgetIcon(defaultIconDataUrls[index]);
    setWidgetIconError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSubmitError('');
    try {
      await onCreate(name.trim(), avatar, widgetIcon);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create chatbot');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" onClick={onCancel} />
      <form onSubmit={submit} className="relative w-full max-w-lg bg-[#0f172a] brutal-border border-slate-700 shadow-[12px_12px_0_0_rgba(0,0,0,1)] p-8 space-y-8">
        <button type="button" onClick={onCancel} aria-label="Close" className="absolute top-5 right-5 brutal-btn bg-slate-800 border-slate-700 w-10 h-10 p-0 flex items-center justify-center shrink-0 cursor-pointer z-10"><X className="w-4 h-4 pointer-events-none" /></button>
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">Step 01 / Identity</p>
          <h2 className="text-3xl font-black uppercase italic">Create your chatbot</h2>
          <p className="font-mono text-xs opacity-60">Give your assistant a name and a recognizable avatar.</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          {/* Avatar column */}
          <div className="space-y-3">
            <label className="w-24 h-24 brutal-border bg-slate-800 flex items-center justify-center cursor-pointer overflow-hidden" title="Upload chatbot avatar">
              {avatar ? <img src={avatar} alt="Chatbot avatar preview" className="w-full h-full object-cover" /> : <ImagePlus className="w-7 h-7 opacity-40" />}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseAvatar} className="hidden" />
            </label>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase opacity-50"><Bot className="w-4 h-4" /> PNG, JPG, or WEBP up to 2 MB</div>
              {avatarError && <p className="font-mono text-[10px] text-red-500">{avatarError}</p>}
              {avatar && <p className="font-mono text-[10px] text-green-600">Preview ready</p>}
            </div>
          </div>
          {/* Widget Icon column */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Widget Icon (floating button)</label>
              <div className="flex flex-wrap gap-3">
                {DEFAULT_WIDGET_ICONS.map(({ label, fill }, idx) => (
                  <label key={idx} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="widgetIconDefault"
                      checked={widgetIcon === defaultIconDataUrls[idx]}
                      onChange={() => selectDefaultIcon(idx)}
                      className="h-4 w-4 text-slate-600"
                    />
                    <div className="w-8 h-8 flex items-center justify-center">
                      <img src={defaultIconDataUrls[idx]} alt={label} className="w-full h-full object-contain" />
                    </div>
                    <span className="font-mono text-[10px]">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 border border-slate-700 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-slate-800">
                <Upload className="w-4 h-4" /> Upload
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={chooseWidgetIcon} />
              </label>
              {widgetIcon && <button onClick={() => { setWidgetIcon(''); }} className="text-xs text-slate-400"><X className="w-3 h-3 inline" /> Clear</button>}
              {widgetIconError && <p className="font-mono text-[10px] text-red-500">{widgetIconError}</p>}
              {widgetIcon && <p className="font-mono text-[10px] text-green-600">Preview ready</p>}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="bot-name" className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Chatbot name</label>
          <input id="bot-name" autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Support Assistant" className="brutal-input" />
        </div>
        {submitError && <p className="font-mono text-xs text-red-400 bg-red-950/30 border border-red-800 p-3">{submitError}</p>}
        <button disabled={saving || !name.trim()} className="brutal-btn bg-slate-800 text-slate-100 border-slate-700 w-full py-4 flex items-center justify-center gap-3 disabled:opacity-40 cursor-pointer">{saving ? 'Creating...' : 'Continue'} <ArrowRight className="w-4 h-4 pointer-events-none" /></button>
      </form>
    </div>
  );
}