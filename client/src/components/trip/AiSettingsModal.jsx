import React, { useState, useEffect } from 'react';
import { 
  Key, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  Cpu, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { detectKeyType, getAiKeys, saveAiKeys } from '../../services/aiChatService';

export const AiSettingsModal = ({ isOpen, onClose, onSaveNotification }) => {
  const [keys, setKeys] = useState(getAiKeys);
  const [smartPaste, setSmartPaste] = useState('');
  const [detectedType, setDetectedType] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setKeys(getAiKeys());
      setSmartPaste('');
      setDetectedType(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSmartPasteChange = (val) => {
    const trimmed = (val || '').trim();
    setSmartPaste(trimmed);
    const type = detectKeyType(trimmed);
    setDetectedType(type);

    if (type === 'gemini') {
      setKeys(prev => ({ ...prev, geminiKey: trimmed }));
    } else if (type === 'openai') {
      setKeys(prev => ({ ...prev, openAiKey: trimmed }));
    } else if (type === 'openrouter') {
      setKeys(prev => ({ ...prev, openRouterKey: trimmed }));
    }
  };

  const handleSave = () => {
    saveAiKeys(keys);
    if (onSaveNotification) {
      onSaveNotification('AI Multi-Model cascade settings saved successfully!');
    }
    onClose();
  };

  const handleClearAll = () => {
    saveAiKeys({ geminiKey: '', openAiKey: '', openRouterKey: '', preferredProvider: 'auto' });
    setKeys({ geminiKey: '', openAiKey: '', openRouterKey: '', preferredProvider: 'auto' });
    setSmartPaste('');
    setDetectedType(null);
    if (onSaveNotification) {
      onSaveNotification('Cleared custom keys. Switched to TripTandem Grounded Engine.');
    }
  };

  const hasAnyKey = Boolean(keys.geminiKey || keys.openAiKey || keys.openRouterKey);

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-[#0E1A2E] rounded-3xl p-6 sm:p-7 border border-brand-sand-border dark:border-slate-800 shadow-2xl space-y-5 animate-fadeIn text-left max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-brand-orange to-amber-500 text-white shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-brand-navy dark:text-white leading-tight">
                  Fast AI Models & Cascading Fallbacks
                </h3>
              </div>
              <p className="text-xs text-brand-navy/60 dark:text-slate-400 mt-0.5">
                Automatically routes each question to the fastest available model
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-brand-navy/40 hover:text-brand-navy dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Speed Hierarchy Overview */}
        <div className="p-3.5 rounded-2xl bg-brand-sand/60 dark:bg-slate-900/80 border border-brand-sand-border dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-brand-navy dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-orange" />
              <span>Multi-Model Cascade Order (Fastest Reply First)</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-brand-teal px-2 py-0.5 rounded-full bg-brand-teal-light dark:bg-teal-950/40">
              Auto-Failover
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className={`p-2 rounded-xl border text-center transition-all ${
              keys.geminiKey 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300' 
                : 'bg-white dark:bg-slate-800 border-brand-sand-border dark:border-slate-700 text-brand-navy/70 dark:text-slate-400'
            }`}>
              <div className="font-bold text-[11px]">1. Gemini 2.0 Flash</div>
              <div className="text-[9px] opacity-80 mt-0.5 font-mono">⚡ ~200ms latency</div>
              <div className="text-[9px] font-semibold mt-1">
                {keys.geminiKey ? '● Connected' : '○ Standby'}
              </div>
            </div>

            <div className={`p-2 rounded-xl border text-center transition-all ${
              keys.openAiKey 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300' 
                : 'bg-white dark:bg-slate-800 border-brand-sand-border dark:border-slate-700 text-brand-navy/70 dark:text-slate-400'
            }`}>
              <div className="font-bold text-[11px]">2. GPT-4o Mini</div>
              <div className="text-[9px] opacity-80 mt-0.5 font-mono">⚡ ~350ms latency</div>
              <div className="text-[9px] font-semibold mt-1">
                {keys.openAiKey ? '● Connected' : '○ Standby'}
              </div>
            </div>

            <div className={`p-2 rounded-xl border text-center transition-all ${
              keys.openRouterKey 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300' 
                : 'bg-white dark:bg-slate-800 border-brand-sand-border dark:border-slate-700 text-brand-navy/70 dark:text-slate-400'
            }`}>
              <div className="font-bold text-[11px]">3. OpenRouter</div>
              <div className="text-[9px] opacity-80 mt-0.5 font-mono">⚡ Multi-Router</div>
              <div className="text-[9px] font-semibold mt-1">
                {keys.openRouterKey ? '● Connected' : '○ Standby'}
              </div>
            </div>

            <div className="p-2 rounded-xl border border-brand-orange/40 bg-orange-50/50 dark:bg-orange-950/20 text-orange-900 dark:text-orange-200 text-center">
              <div className="font-bold text-[11px]">4. Grounded Engine</div>
              <div className="text-[9px] opacity-80 mt-0.5 font-mono">🛡️ 0ms catalog</div>
              <div className="text-[9px] font-semibold mt-1 text-brand-orange">
                ● 100% Always Active
              </div>
            </div>
          </div>
        </div>

        {/* Smart Auto-Detect Paste Box */}
        <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
          <label className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-brand-orange" />
            <span>Smart Auto-Detect Paste</span>
          </label>
          <input
            type="password"
            value={smartPaste}
            onChange={(e) => handleSmartPasteChange(e.target.value)}
            placeholder="Paste any key here (starts with AIza..., sk-..., or sk-or-...)"
            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 text-xs font-mono text-brand-navy dark:text-white focus:outline-none focus:border-brand-orange"
          />
          {detectedType && (
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                Detected <strong>{
                  detectedType === 'gemini' ? 'Google Gemini API Key' :
                  detectedType === 'openai' ? 'OpenAI API Key' :
                  detectedType === 'openrouter' ? 'OpenRouter API Key' : 'Custom Key'
                }</strong> and auto-filled below!
              </span>
            </p>
          )}
        </div>

        {/* Individual Key Fields */}
        <div className="space-y-4">
          
          {/* 1. Google Gemini 2.0 Flash */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-brand-sand-border dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-brand-navy dark:text-white">
                  1. Google Gemini API Key
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Recommended · Fastest (~200ms)
                </span>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-brand-teal hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get Free Gemini Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={keys.geminiKey}
              onChange={(e) => setKeys(prev => ({ ...prev, geminiKey: e.target.value }))}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2 rounded-xl bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-xs font-mono text-brand-navy dark:text-white focus:outline-none focus:border-brand-teal"
            />
            <p className="text-[10px] text-brand-navy/60 dark:text-slate-400">
              Powers Gemini 2.0 Flash for blazing instant travel itineraries and answers.
            </p>
          </div>

          {/* 2. OpenAI GPT-4o Mini */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-brand-sand-border dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-brand-navy dark:text-white">
                  2. OpenAI API Key
                </span>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  GPT-4o Mini (~350ms)
                </span>
              </div>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-brand-teal hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get OpenAI Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={keys.openAiKey}
              onChange={(e) => setKeys(prev => ({ ...prev, openAiKey: e.target.value }))}
              placeholder="sk-proj-..."
              className="w-full px-3.5 py-2 rounded-xl bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-xs font-mono text-brand-navy dark:text-white focus:outline-none focus:border-brand-teal"
            />
            <p className="text-[10px] text-brand-navy/60 dark:text-slate-400">
              Direct connection to OpenAI GPT-4o Mini for snappy, high-precision recommendations.
            </p>
          </div>

          {/* 3. OpenRouter Aggregator */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-brand-sand-border dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-brand-navy dark:text-white">
                  3. OpenRouter API Key
                </span>
                <span className="text-[10px] font-bold text-brand-orange bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded-full border border-orange-500/20">
                  Aggregator Router
                </span>
              </div>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-brand-teal hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Get OpenRouter Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={keys.openRouterKey}
              onChange={(e) => setKeys(prev => ({ ...prev, openRouterKey: e.target.value }))}
              placeholder="sk-or-v1-..."
              className="w-full px-3.5 py-2 rounded-xl bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-xs font-mono text-brand-navy dark:text-white focus:outline-none focus:border-brand-teal"
            />
            <p className="text-[10px] text-brand-navy/60 dark:text-slate-400">
              Access hundreds of open models with built-in multi-model retry.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-brand-sand-border dark:border-slate-800">
          <div>
            {hasAnyKey && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Keys</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-navy/70 dark:text-slate-300 hover:bg-brand-sand dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-orange hover:bg-brand-orange-hover text-white shadow-sm transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Save & Activate Cascade</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AiSettingsModal;
