import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  MapPin, 
  Clock, 
  Coins, 
  ShieldCheck, 
  Check, 
  Plus, 
  ArrowRight,
  Info
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const AiConciergeDrawer = () => {
  const { isAiConciergeOpen, setIsAiConciergeOpen, trip, acceptAiSuggestion } = useTrip();
  const { formatPrice } = useAuth();

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseHistory, setResponseHistory] = useState([
    {
      query: 'Initial Grounding',
      assistantReply: `Welcome! I'm your TripTandem AI Concierge. Every recommendation I provide is verified against real backend records, strict budget limits, and group dietary needs. Ask me anything or select a prompt below.`,
      suggestions: [],
    }
  ]);
  const [addedIds, setAddedIds] = useState([]);

  if (!isAiConciergeOpen) return null;

  const quickPrompts = [
    'Find vegetarian restaurants near our afternoon activity',
    'Plan a three-day Goa trip for four friends under ₹25,000',
    'Suggest a cheaper alternative for dinner',
    'Rearrange Day 2 to reduce travel time',
    'Find indoor activities if it rains',
  ];

  const handleQuery = async (queryText) => {
    const q = queryText || inputQuery;
    if (!q.trim()) return;

    setIsLoading(true);
    setInputQuery('');

    try {
      const data = await api.queryAiConcierge(q, trip?.id, trip?.members?.length || 4, trip?.budget?.totalTarget);
      if (data) {
        setResponseHistory(prev => [...prev, data]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuggestion = (sug) => {
    acceptAiSuggestion(sug, sug.proposedDay || 1);
    setAddedIds(prev => [...prev, sug.id]);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-floating border-l border-brand-sand-border flex flex-col animate-slide-left">
      
      {/* Drawer Header */}
      <div className="p-5 border-b border-brand-sand-border flex items-center justify-between bg-brand-navy text-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/10 text-brand-yellow">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">TripTandem AI Concierge</h3>
              <span className="text-[10px] bg-brand-teal text-white px-2 py-0.2 rounded-full font-bold uppercase tracking-wider">
                Grounded
              </span>
            </div>
            <p className="text-[11px] text-brand-sand-muted">
              Strictly vetted venues · Verified constraints
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAiConciergeOpen(false)}
          className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Prompts Chips Bar */}
      <div className="p-3 bg-brand-sand border-b border-brand-sand-border overflow-x-auto no-scrollbar flex items-center gap-2">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleQuery(prompt)}
            className="px-3 py-1.5 rounded-full bg-white text-brand-navy hover:text-brand-orange border border-brand-sand-border text-xs font-medium whitespace-nowrap shadow-subtle hover:border-brand-orange/40 transition-all flex-shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Conversation & Structured Results Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-brand-sand/30">
        {responseHistory.map((res, index) => (
          <div key={index} className="space-y-3">
            
            {/* User query if any */}
            {res.query && res.query !== 'Initial Grounding' && (
              <div className="flex justify-end">
                <div className="bg-brand-navy text-white text-xs px-4 py-2.5 rounded-2xl rounded-br-none max-w-[85%] font-medium">
                  {res.query}
                </div>
              </div>
            )}

            {/* Assistant friendly message */}
            <div className="bg-white p-4 rounded-2xl border border-brand-sand-border shadow-subtle space-y-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-brand-orange flex-shrink-0 mt-0.5" />
                <p className="text-xs text-brand-navy leading-relaxed">
                  {res.assistantReply}
                </p>
              </div>

              {/* Suggestions list */}
              {res.suggestions && res.suggestions.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-brand-sand-border">
                  <div className="text-[11px] font-semibold text-brand-navy uppercase tracking-wider">
                    Structured Recommendations ({res.suggestions.length})
                  </div>

                  {res.suggestions.map((sug) => {
                    const isAdded = addedIds.includes(sug.id);

                    return (
                      <div
                        key={sug.id}
                        className="bg-brand-sand/60 rounded-2xl p-3.5 border border-brand-sand-border space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <h5 className="font-semibold text-xs text-brand-navy">
                              {sug.title}
                            </h5>
                            <div className="flex items-center gap-2 text-[11px] text-brand-teal font-medium">
                              <span>Day {sug.proposedDay} · {sug.proposedTime}</span>
                              <span>·</span>
                              <span className="capitalize">{sug.proposedTimeSlot}</span>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="font-bold text-xs text-brand-navy">
                              {formatPrice(sug.estimatedCostPerPerson)}
                            </span>
                            <div className="text-[10px] text-brand-navy/60">/person</div>
                          </div>
                        </div>

                        {/* Rationale */}
                        <p className="text-[11px] text-brand-navy/70 leading-normal">
                          💡 <strong>Why:</strong> {sug.rationale}
                        </p>

                        {/* Verified constraints checklist */}
                        {sug.constraintsChecked && (
                          <div className="space-y-1 bg-white p-2 rounded-xl border border-brand-sand-border text-[10px] text-brand-teal">
                            {sug.constraintsChecked.map((chk, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-brand-teal flex-shrink-0" />
                                <span>{chk}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Missing data warning if any */}
                        {sug.missingDataWarning && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded-lg">
                            <Info className="w-3 h-3 flex-shrink-0" />
                            <span>{sug.missingDataWarning}</span>
                          </div>
                        )}

                        {/* Add to Draft Itinerary Button */}
                        <button
                          onClick={() => handleAddSuggestion(sug)}
                          disabled={isAdded}
                          className={`w-full py-2 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            isAdded
                              ? 'bg-emerald-100 text-emerald-800 cursor-default'
                              : 'bg-brand-orange hover:bg-brand-orange-hover text-white active:scale-95 shadow-sm'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added to Day {sug.proposedDay} as Draft</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Day {sug.proposedDay} as Draft for Group Voting</span>
                            </>
                          )}
                        </button>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        ))}

        {isLoading && (
          <div className="bg-white p-4 rounded-2xl border border-brand-sand-border flex items-center gap-3 text-xs text-brand-navy">
            <Sparkles className="w-4 h-4 text-brand-orange animate-spin" />
            <span>Validating constraints against backend records & real budgets...</span>
          </div>
        )}
      </div>

      {/* Input Console */}
      <form onSubmit={(e) => { e.preventDefault(); handleQuery(); }} className="p-3 border-t border-brand-sand-border bg-white flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="e.g. Find vegetarian lunch near afternoon activity..."
          className="flex-1 bg-brand-sand text-xs rounded-full px-4 py-2.5 text-brand-navy placeholder:text-brand-navy/40 border border-brand-sand-border focus:outline-none focus:border-brand-orange"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="p-2.5 rounded-full bg-brand-navy hover:bg-brand-navy-light text-white shadow-sm transition-transform active:scale-95 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};

export default AiConciergeDrawer;
