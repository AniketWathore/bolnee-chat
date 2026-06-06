import React, { useState } from 'react';
import {
  Upload, Copy, Check, X, FileText, Building2, ArrowRight
} from 'lucide-react';
import { KnowledgeData } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const INDUSTRIES = [
  'E-commerce / Retail',
  'SaaS / Technology',
  'Healthcare',
  'Finance / Banking',
  'Education',
  'Real Estate',
  'Travel / Hospitality',
  'Food & Beverage',
  'Legal',
  'Other',
];

interface KnowledgeSectionProps {
  data: KnowledgeData;
  onSave: (data: any) => Promise<void>;
  onDashboard?: () => void;
  onCancel?: () => void;
}

export default function KnowledgeSection({ data, onSave, onDashboard, onCancel }: KnowledgeSectionProps) {
  const [step, setStep] = useState(1);
  const [industry, setIndustry] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const DEPLOY_URL = window.location.origin;

  const getEmbedCode = () => `<script>
  window.BotConfig = {
    modelId: 'onnx-community/Qwen2.5-0.5B-Instruct',
    botName: 'Bolnee',
    accentColor: '#6366f1',
    greeting: 'Hi! How can I help you today?',
    systemPrompt: 'You are a helpful assistant for our store.',
    workerUrl: '${DEPLOY_URL}/chat-worker.js',
    knowledgeUrl: '${DEPLOY_URL}/api/public/knowledge/${data.chatbotId}',
  };
</script>
<script src="${DEPLOY_URL}/intent-detection.js"></script>
<script src="${DEPLOY_URL}/chatbot-widget.js" async></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      setUploadError('');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadError('');
  };

  const handleBuild = () => {
    setStep(4);
    setIsBuilding(true);

    onSave({
      chatbotId: data.chatbotId,
      userId: data.userId,
      about: `Industry: ${industry}\nWebsite: ${websiteUrl}`,
      products: [],
      policy: '',
      contact: { mobile: '', email: '', address: '', website: websiteUrl },
      faqs: [],
    });

    setTimeout(() => {
      setIsBuilding(false);
      setStep(5);
    }, 3000);
  };

  const handleNext = () => {
    if (step === 3) {
      if (files.length === 0) {
        setUploadError('Please upload at least 1 document');
        return;
      }
      handleBuild();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    setUploadError('');
    handleBuild();
  };

  const canProceed = () => {
    if (step === 1) return industry.trim() !== '';
    if (step === 2) return websiteUrl.trim() !== '';
    return true;
  };

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 flex items-center justify-center brutal-border text-[10px] font-mono font-bold transition-all duration-300 ${
            step > s ? 'bg-green-500 text-white border-green-500' :
            step === s ? 'bg-ink text-bg scale-110' : 'bg-white text-ink opacity-30'
          }`}>
            {step > s ? <Check className="w-4 h-4" /> : s}
          </div>
          {s < 5 && <div className={`w-6 h-px transition-all duration-300 ${step > s ? 'bg-green-500' : 'bg-line/30'}`} />}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h3 className="text-2xl font-black uppercase italic">Select Your Industry</h3>
        <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Choose the industry that best describes your business</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {INDUSTRIES.map((ind) => (
          <button
            key={ind}
            onClick={() => setIndustry(ind)}
            className={`p-4 brutal-border font-mono text-xs uppercase tracking-wider text-left transition-all duration-200 ${
              industry === ind
                ? 'bg-ink text-bg border-ink scale-[1.02]'
                : 'bg-white hover:bg-line/10'
            }`}
          >
            {ind}
          </button>
        ))}
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h3 className="text-2xl font-black uppercase italic">Enter Website URL</h3>
        <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Provide your business website so we can gather context</p>
      </div>
      <div className="space-y-1">
        <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Website</label>
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://example.com"
          className="brutal-input text-sm"
          autoFocus
        />
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h3 className="text-2xl font-black uppercase italic">Upload Documents</h3>
        <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">FAQs, Product Lists, Policies, Terms — PDF, DOC, JPEG, PNG accepted</p>
      </div>

      <label className="flex flex-col items-center justify-center p-10 brutal-border border-dashed bg-white cursor-pointer hover:bg-line/5 transition-colors">
        <Upload className="w-8 h-8 mb-3 opacity-40" />
        <span className="font-mono text-xs uppercase tracking-wider opacity-60">Click to upload or drag & drop</span>
        <span className="font-mono text-[10px] opacity-40 mt-1">PDF, DOC, DOCX, JPEG, PNG, GIF, TXT</span>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpeg,.jpg,.png,.gif,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-3 brutal-border bg-white">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 opacity-50" />
                <span className="font-mono text-xs">{file.name}</span>
                <span className="font-mono text-[10px] opacity-40">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
              <button onClick={() => removeFile(i)} className="hover:opacity-60">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadError && (
        <p className="font-mono text-[10px] text-red-500 uppercase tracking-wider text-center">{uploadError}</p>
      )}
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div
      key="step4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 space-y-6"
    >
      <div className="relative">
        <div className="w-16 h-16 border-4 border-ink/20 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-ink rounded-full animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black uppercase italic">Building your chatbot..</h3>
        <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Indexing knowledge and configuring your bot</p>
      </div>
      <div className="w-48 h-1 bg-line/20 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 3, ease: 'easeInOut' }}
          className="h-full bg-ink rounded-full"
        />
      </div>
    </motion.div>
  );

  const renderStep5 = () => (
    <motion.div
      key="step5"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-black uppercase italic">Deploy Your Bot</h3>
          <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Copy the embed snippet into your website</p>
        </div>
        <button
          onClick={copyToClipboard}
          className="brutal-btn bg-ink text-bg py-2 px-4 flex items-center gap-2 text-xs"
        >
          {copied ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy Code'}
        </button>
      </div>

      <pre className="bg-ink text-bg p-6 font-mono text-xs overflow-x-auto brutal-border block leading-relaxed whitespace-pre-wrap break-all">
        {getEmbedCode()}
      </pre>

      <div className="bg-blue-50 border border-blue-200 p-6 flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center brutal-border shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h5 className="font-mono text-xs font-bold uppercase mb-1">Infrastructure Ready</h5>
          <p className="font-mono text-[10px] leading-relaxed opacity-60">
            Your chatbot is now live for bot ID: {data.chatbotId}. Paste the snippet into your website HTML to activate it.
          </p>
        </div>
      </div>

      <button
        onClick={onDashboard}
        className="w-full brutal-btn bg-ink text-bg py-4 uppercase font-black flex items-center justify-center gap-2"
      >
        Done
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-white brutal-border shadow-[12px_12px_0_0_rgba(0,0,0,1)] overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">{renderStepIndicator()}</div>
            {step < 5 && onCancel && (
              <button
                onClick={onCancel}
                className="brutal-btn bg-white p-2 flex items-center justify-center ml-4"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
          </AnimatePresence>

          {step < 4 && (
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-line">
              {step === 3 ? (
                <button
                  onClick={handleSkip}
                  className="brutal-btn bg-white px-8"
                >
                  Skip Step
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={handleNext}
                disabled={!canProceed() || isBuilding}
                className="brutal-btn bg-ink text-bg px-10 py-3 flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {(step === 3 && files.length > 0) ? 'Continue with Uploads' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
