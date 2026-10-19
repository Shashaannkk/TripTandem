import React from 'react';
import { CheckCircle2, Sparkles, Vote, Lock, AlertCircle, Info } from 'lucide-react';

export const Badge = ({ type = 'verified', text, size = 'sm', className = '' }) => {
  const styles = {
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    indicative: 'bg-amber-50 text-amber-700 border-amber-200',
    drafting: 'bg-slate-100 text-slate-700 border-slate-200',
    voting: 'bg-brand-orange-light text-brand-orange border-brand-orange/30 animate-pulse',
    locked: 'bg-brand-teal-light text-brand-teal border-brand-teal/30 font-medium',
    ai: 'bg-purple-50 text-purple-700 border-purple-200',
    warning: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const icons = {
    verified: <CheckCircle2 className="w-3.5 h-3.5" />,
    indicative: <Info className="w-3.5 h-3.5" />,
    drafting: <Sparkles className="w-3.5 h-3.5" />,
    voting: <Vote className="w-3.5 h-3.5" />,
    locked: <Lock className="w-3.5 h-3.5" />,
    ai: <Sparkles className="w-3.5 h-3.5" />,
    warning: <AlertCircle className="w-3.5 h-3.5" />,
  };

  const defaultText = {
    verified: 'Verified Venue',
    indicative: 'Indicative Price',
    drafting: 'Drafting',
    voting: 'Active Voting',
    locked: 'Locked in Itinerary',
    ai: 'AI Suggestion',
    warning: 'Conflict',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border font-medium transition-all ${
        styles[type] || styles.drafting
      } ${className}`}
    >
      {icons[type]}
      <span>{text || defaultText[type]}</span>
    </span>
  );
};

export default Badge;
