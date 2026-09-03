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
          <p className="text-sm text-slate-400">Step 1 of 1 — Identity</p>
          <h2 className="text-2xl font-semibold">Create your chatbot</h2>
          <p className="text-sm text-slate-400">Give your assistant a name and a recognizable avatar.</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          {/* Avatar column */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-200">Chatbot Avatar</label>
            <p className="text-xs text-slate-400">Header logo • Square image</p>
            <label className="w-24 h-24 brutal-border bg-slate-800 flex items-center justify-center cursor-pointer overflow-hidden" title="Upload chatbot avatar">
              {avatar ? <img src={avatar} alt="Chatbot avatar preview" className="w-full h-full object-cover" /> : <ImagePlus className="w-7 h-7 opacity-40" />}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseAvatar} className="hidden" />
            </label>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-slate-400"><Bot className="w-4 h-4" /> PNG, JPG, or WEBP up to 2 MB</div>
              {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
              {avatar && <p className="text-xs text-green-600">Preview ready</p>}
              {avatar && <button onClick={() => setAvatar('')} className="text-xs text-slate-400"><X className="w-3 h-3 inline" /> Clear</button>}
            </div>
          </div>
          {/* Widget Icon column */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-200">Widget Icon</label>
            <p className="text-xs text-slate-400">Floating button • Leave empty for default</p>
            <label className="w-24 h-24 brutal-border bg-slate-800 flex items-center justify-center cursor-pointer overflow-hidden" title="Upload widget icon">
              {widgetIcon ? <img src={widgetIcon} alt="Widget icon preview" className="w-full h-full object-cover" /> : <ImagePlus className="w-7 h-7 opacity-40" />}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={chooseWidgetIcon} />
            </label>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-slate-400"><Bot className="w-4 h-4" /> PNG, JPG, WEBP, GIF up to 1 MB</div>
              {widgetIconError && <p className="text-xs text-red-500">{widgetIconError}</p>}
              {widgetIcon && <p className="text-xs text-green-600">Preview ready</p>}
              {widgetIcon && <button onClick={() => setWidgetIcon('')} className="text-xs text-slate-400"><X className="w-3 h-3 inline" /> Clear</button>}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="bot-name" className="text-sm font-medium text-slate-200">Chatbot name</label>
          <input id="bot-name" autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Support Assistant" className="brutal-input" />
        </div>
        {submitError && <p className="text-sm text-red-400 bg-red-950/30 border border-red-800 p-3">{submitError}</p>}
        <button disabled={saving || !name.trim()} className="brutal-btn bg-slate-800 text-slate-100 border-slate-700 w-full py-4 flex items-center justify-center gap-3 disabled:opacity-40 cursor-pointer">{saving ? 'Creating...' : 'Continue'} <ArrowRight className="w-4 h-4 pointer-events-none" /></button>
      </form>
    </div>
  );
}