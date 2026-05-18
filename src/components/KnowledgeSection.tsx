import React, { useState } from 'react';
import {
  Building2,
  ShoppingBag,
  ShieldCheck,
  Contact,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Tag,
  Save,
  Code,
  Copy,
  Check
} from 'lucide-react';
import { KnowledgeData, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface KnowledgeSectionProps {
  data: KnowledgeData;
  onSave: (data: any) => Promise<void>;
}

export default function KnowledgeSection({ data, onSave }: KnowledgeSectionProps) {
  const ensureDefaults = (data: KnowledgeData): KnowledgeData => ({
    ...data,
    about: data.about || "",
    policy: data.policy || "",
    contact: {
      mobile: data.contact?.mobile || "",
      email: data.contact?.email || "",
      address: data.contact?.address || "",
      website: data.contact?.website || "",
    },
    products: (data.products || []).map(p => ({
      ...p,
      id: p.id || Math.random().toString(36).substr(2, 9),
      name: p.name || "",
      description: p.description || "",
      price: p.price || "",
      tags: p.tags || []
    })),
    faqs: data.faqs || []
  });

  const [activeTab, setActiveTab] = useState<'about' | 'products' | 'policies' | 'contact'>('about');
  const [localData, setLocalData] = useState<KnowledgeData>(ensureDefaults(data));
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);
  const justSavedRef = React.useRef(false);

  const tabs = [
    { id: 'about', label: '01 Bout', icon: Building2 },
    { id: 'products', label: '02 Products', icon: ShoppingBag },
    { id: 'policies', label: '03 Policies', icon: ShieldCheck },
    { id: 'contact', label: '04 Contact', icon: Contact },
  ] as const;

  const getNextTab = () => {
    if (activeTab === 'about') return 'products';
    if (activeTab === 'products') return 'policies';
    if (activeTab === 'policies') return 'contact';
    return null;
  };

  const getPrevTab = () => {
    if (activeTab === 'products') return 'about';
    if (activeTab === 'policies') return 'products';
    if (activeTab === 'contact') return 'policies';
    return null;
  };

  // Sync with props when switching bots
  React.useEffect(() => {
    setLocalData(ensureDefaults(data));
  }, [data]);

  // Only hide embed code when switching to a DIFFERENT bot
  React.useEffect(() => {
    if (justSavedRef.current) return;
    setShowEmbed(false);
  }, [data.chatbotId]);

  const closeEmbed = React.useCallback(() => {
    setShowEmbed(false);
    justSavedRef.current = false;
  }, []);

  const handleUpdate = (field: keyof KnowledgeData, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactUpdate = (field: keyof KnowledgeData['contact'], value: string) => {
    setLocalData(prev => ({
      ...prev,
      contact: { ...prev.contact, [field]: value }
    }));
  };

  const addProduct = () => {
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      description: '',
      price: '',
      inStock: true,
      tags: []
    };
    setLocalData(prev => ({
      ...prev,
      products: [...prev.products, newProduct]
    }));
    setExpandedProduct(newProduct.id);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setLocalData(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const deleteProduct = (id: string) => {
    setLocalData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setShowEmbed(false);

    // Transform data to requested JSON format
    const transformedData = {
      chatbotId: localData.chatbotId,
      userId: localData.userId,
      about: localData.about,
      products: localData.products.map(p => ({
        productId: p.id,
        name: p.name,
        tags: p.tags.length > 0 ? p.tags : [p.name.toLowerCase()],
        price: p.price,
        inStock: p.inStock
      })),
      policy: localData.policy,
      contact: {
        mobile: localData.contact.mobile,
        email: localData.contact.email,
        address: localData.contact.address,
        website: localData.contact.website
      },
      faqs: localData.faqs || []
    };

    try {
      await onSave(transformedData);
      justSavedRef.current = true;
      setShowEmbed(true);
      setTimeout(() => {
        justSavedRef.current = false;
      }, 2000);
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Save failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  const DEPLOY_URL = window.location.origin;
  const embedCode = `<script>
  window.BotConfig = {
    modelId: 'onnx-community/SmolLM2-135M-Instruct-ONNX',
    botName: 'Bolnee',
    accentColor: '#6366f1',
    greeting: 'Hi! How can I help you today?',
    systemPrompt: 'You are a helpful assistant for our store.',
    workerUrl: '${DEPLOY_URL}/chat-worker.js',
    knowledgeUrl: '${DEPLOY_URL}/api/public/knowledge/${localData.chatbotId}',
  };
</script>
<script src="${DEPLOY_URL}/intent-detection.js"></script>
<script src="${DEPLOY_URL}/chatbot-widget.js" async></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nextTab = getNextTab();
  const prevTab = getPrevTab();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-line pb-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase italic">Knowledge Base</h2>
          <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">Train your bot node-by-node</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-4 gap-2 border-b border-line pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
              onClick={() => { setActiveTab(tab.id); closeEmbed(); }}
            className={`
              flex items-center justify-center gap-2 py-3 font-mono text-[10px] uppercase tracking-widest border transition-all duration-200
              ${activeTab === tab.id
                ? 'bg-ink text-bg border-ink'
                : 'bg-white border-line hover:bg-white/50 opacity-60'}
            `}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Company Description</label>
              <textarea
                value={localData.about}
                onChange={(e) => handleUpdate('about', e.target.value)}
                placeholder="Tell the chatbot about your platform or company..."
                className="brutal-input min-h-[200px] resize-none"
              />
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div
              key="products"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center bg-line/5 p-4 border border-line">
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-bold uppercase tracking-tight">Product Catalog</span>
                  <span className="font-mono text-[10px] opacity-50 uppercase tracking-widest">{localData.products.length} Items Listed</span>
                </div>
                <button onClick={addProduct} className="brutal-btn py-1 h-auto flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>

              <div className="space-y-2">
                {localData.products.map((product) => (
                  <div key={product.id} className="brutal-border overflow-hidden bg-white">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-line/5"
                      onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                    >
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="w-4 h-4 opacity-50" />
                        <span className="font-mono font-bold uppercase text-sm">
                          {product.name || 'Untitled Product'}
                        </span>
                        {product.price && (
                          <span className="font-mono text-xs bg-line/10 px-2 py-0.5 border border-line/30">
                            {product.price}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {expandedProduct === product.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedProduct === product.id && (
                        <motion.div
                          key={`product-details-${product.id}`}
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="px-4 pb-4 border-t border-line/30 space-y-4 pt-4"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Product Name</label>
                              <input
                                type="text"
                                value={product.name}
                                onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                                className="brutal-input"
                                placeholder="e.g. Nike Air Max"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Price</label>
                              <input
                                type="text"
                                value={product.price}
                                onChange={(e) => updateProduct(product.id, { price: e.target.value })}
                                className="brutal-input"
                                placeholder="e.g. $199"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Tags (Comma separated)</label>
                            <input
                              type="text"
                              value={product.tags.join(", ")}
                              onChange={(e) => updateProduct(product.id, { tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                              className="brutal-input"
                              placeholder="e.g. shoes, runner, nike"
                            />
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={product.inStock}
                                  onChange={(e) => updateProduct(product.id, { inStock: e.target.checked })}
                                  className="w-4 h-4 accent-ink"
                                />
                                <span className="font-mono text-[10px] uppercase tracking-widest">In Stock</span>
                              </label>
                            </div>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              className="flex items-center gap-1 text-[10px] uppercase font-mono tracking-widest text-red-500 hover:bg-red-50 p-2"
                            >
                              <Trash2 className="w-3 h-3" /> Remove Item
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {localData.products.length === 0 && (
                  <div className="brutal-border border-dashed p-12 text-center">
                    <span className="font-mono text-xs opacity-40 uppercase tracking-[0.2em]">Product list is empty</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'policies' && (
            <motion.div
              key="policies"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Terms & Policies</label>
              <textarea
                value={localData.policy}
                onChange={(e) => handleUpdate('policy', e.target.value)}
                placeholder="Refund policies, shipping terms, user agreements..."
                className="brutal-input min-h-[200px] resize-none"
              />
            </motion.div>
          )}

          {activeTab === 'contact' && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Mobile Number</label>
                  <input
                    type="text"
                    value={localData.contact.mobile}
                    onChange={(e) => handleContactUpdate('mobile', e.target.value)}
                    className="brutal-input"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Email Address</label>
                  <input
                    type="email"
                    value={localData.contact.email}
                    onChange={(e) => handleContactUpdate('email', e.target.value)}
                    className="brutal-input"
                    placeholder="support@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Website</label>
                  <input
                    type="text"
                    value={localData.contact.website}
                    onChange={(e) => handleContactUpdate('website', e.target.value)}
                    className="brutal-input"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50">Physical Address</label>
                <textarea
                  value={localData.contact.address}
                  onChange={(e) => handleContactUpdate('address', e.target.value)}
                  placeholder="Street, City, Country, Zip..."
                  className="brutal-input min-h-[100px]"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-8 border-t border-line">
        <div>
          {prevTab && (
            <button
              onClick={() => { setActiveTab(prevTab as any); closeEmbed(); }}
              className="brutal-btn bg-white px-8"
            >
              Back To {prevTab.toUpperCase()}
            </button>
          )}
        </div>
        <div>
          {nextTab ? (
            <button
              onClick={() => { setActiveTab(nextTab as any); closeEmbed(); }}
              className="brutal-btn bg-ink text-bg px-8"
            >
              Next Node: {nextTab.toUpperCase()} →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="brutal-btn bg-blue-600 text-white flex items-center gap-2 px-12 py-4 text-lg"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSaving ? 'Finalizing...' : 'Save & Deploy Chatbot'}
            </button>
          )}
        </div>
      </div>

      {/* Deployment Modal */}
      <AnimatePresence>
        {showEmbed && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink/40 backdrop-blur-md"
              onClick={closeEmbed}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white brutal-border shadow-[12px_12px_0_0_rgba(0,0,0,1)] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-blue-600 p-6 text-white border-b-4 border-ink flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Code className="w-6 h-6" />
                  <h4 className="text-xl font-black uppercase italic tracking-tight">Deploy Node: {localData.chatbotId.substr(0, 6)}</h4>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="brutal-btn bg-white text-ink py-2 px-4 flex items-center gap-2 text-xs hover:scale-105 transition-transform"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied to Clipboard' : 'Copy Snippet'}
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase font-bold tracking-widest opacity-50 block">Insert this into your website body</label>
                  <pre className="bg-ink text-bg p-6 font-mono text-xs overflow-x-auto brutal-border block leading-relaxed whitespace-pre-wrap break-all">
                    {embedCode}
                  </pre>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-6 flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center brutal-border shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-mono text-xs font-bold uppercase mb-1">Infrastructure Ready</h5>
                    <p className="font-mono text-[10px] leading-relaxed opacity-60">
                      BOLNEE has successfully indexed your data. Your chatbot is now live and will respond using the updated {localData.products.length} catalog items and support policies.
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeEmbed}
                  className="w-full brutal-btn bg-ink text-bg py-4 uppercase font-black"
                >
                  Done — Back to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="pt-8 opacity-40">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-ink rounded-full" />
          <span className="font-mono text-[10px] uppercase tracking-widest">All edits auto-save locally until deployment</span>
        </div>
      </div>
    </div>
  );
}
