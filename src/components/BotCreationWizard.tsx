import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowRight, Bot, ImagePlus, X } from 'lucide-react';

interface BotCreationWizardProps {
  onCreate: (name: string, avatar: string) => Promise<void>;
  onCancel: () => void;
}

export default function BotCreationWizard({ onCreate, onCancel }: BotCreationWizardProps) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  const [avatarError, setAvatarError] = useState('');
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onCreate(name.trim(), avatar);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onCancel} />
      <form onSubmit={submit} className="relative w-full max-w-lg bg-[#0f172a] brutal-border border-slate-700 shadow-[12px_12px_0_0_rgba(0,0,0,1)] p-8 space-y-8">
        <button type="button" onClick={onCancel} className="absolute top-5 right-5 brutal-btn p-2"><X className="w-4 h-4" /></button>
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">Step 01 / Identity</p>
          <h2 className="text-3xl font-black uppercase italic">Create your chatbot</h2>
          <p className="font-mono text-xs opacity-60">Give your assistant a name and a recognizable avatar.</p>
        </div>
        <div className="flex items-center gap-5">
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
        <div className="space-y-2">
          <label htmlFor="bot-name" className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Chatbot name</label>
          <input id="bot-name" autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Support Assistant" className="brutal-input" />
        </div>
        <button disabled={saving || !name.trim()} className="brutal-btn bg-ink text-bg w-full py-4 flex items-center justify-center gap-3 disabled:opacity-40">{saving ? 'Creating...' : 'Continue'} <ArrowRight className="w-4 h-4" /></button>
      </form>
    </div>
  );
}
