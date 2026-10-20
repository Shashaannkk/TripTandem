import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Send, 
  MapPin, 
  Clock, 
  Coins, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Info, 
  Trash2, 
  Bot, 
  Calendar, 
  Users, 
  Wallet,
  Key
} from 'lucide-react';
import { useTrip } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { useAiChat } from '../services/aiChatService';
import { AiSettingsModal } from '../components/trip/AiSettingsModal';
import { HotelCardBox } from '../components/common/HotelCardBox';
import confetti from 'canvas-confetti';

const MatchedVenueCard = ({ venue, navigate }) => {
  return (
    <HotelCardBox
      venue={venue}
      onBookAction={(v) => navigate(`/explore?search=${encodeURIComponent(v.name)}`)}
    />
  );
};

export const AiConciergePage = () => {
  const navigate = useNavigate();
  const { trip, setTrip, acceptAiSuggestion } = useTrip();
  const { formatPrice, currentUser, showToast } = useAuth();
  const { messages, isLoading, sendMessage, clearHistory, aiKeys } = useAiChat(trip?.id);

  const [inputQuery, setInputQuery] = useState('');
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);

  const benchmarkPrompts = [
    { title: 'Budget Plan', text: 'Plan a three-day Goa trip for four friends under ₹20,000 total.' },
    { title: 'Vegetarian Dining', text: 'Find vegetarian restaurants near our afternoon activity.' },
    { title: 'Value Swap', text: 'Suggest a cheaper alternative for dinner.' },
    { title: 'Route Optimization', text: 'Rearrange tomorrow to reduce travel time.' },
    { title: 'Weather Resilience', text: 'Find indoor activities if it rains.' },
  ];

  const handleSend = async (queryText) => {
    const q = queryText || inputQuery;
    if (!q.trim() || isLoading) return;
    setInputQuery('');
    await sendMessage(q, trip?.destination);
  };

  const handleApplyToTrip = (suggestion) => {
    acceptAiSuggestion(suggestion, suggestion.proposedDay || 1);
    showToast(`Added "${suggestion.title}" to Day ${suggestion.proposedDay || 1}!`, 'success');
    navigate(`/workspace/${trip?.id || 'trip-goa-2026'}`);
  };

  const handleLaunchGroupTrip = (plan) => {
    if (!plan) return;
    const dest = plan.destination || trip?.destination || 'Goa';
    const planSchedule = plan.schedule || plan.itineraryPlan?.schedule || [];

    const tripDays = planSchedule.map((d, idx) => ({
      dayNumber: idx + 1,
      date: new Date(Date.now() + idx * 86400000).toISOString().split('T')[0],
      theme: d.theme || `Day ${idx + 1} Discovery`,
      slots: {
        morning: d.slots?.find(s => s.slot === 'morning') ? [{
          id: `act-${Date.now()}-${idx}-m`,
          time: '11:00 AM',
          title: d.slots.find(s => s.slot === 'morning').title,
          category: 'stay',
          venueId: d.slots.find(s => s.slot === 'morning').venue?.id || 'v-1',
          cost: d.slots.find(s => s.slot === 'morning').cost || 2000,
          votes: { [currentUser.id]: 'up' },
          locked: false,
        }] : [],
        afternoon: d.slots?.find(s => s.slot === 'afternoon') ? [{
          id: `act-${Date.now()}-${idx}-a`,
          time: '01:30 PM',
          title: d.slots.find(s => s.slot === 'afternoon').title,
          category: 'restaurant',
          venueId: d.slots.find(s => s.slot === 'afternoon').venue?.id || 'v-2',
          cost: d.slots.find(s => s.slot === 'afternoon').cost || 850,
          votes: { [currentUser.id]: 'up' },
          locked: false,
        }] : [],
        evening: d.slots?.find(s => s.slot === 'evening') ? [{
          id: `act-${Date.now()}-${idx}-e`,
          time: '06:00 PM',
          title: d.slots.find(s => s.slot === 'evening').title,
          category: 'experience',
          venueId: d.slots.find(s => s.slot === 'evening').venue?.id || 'v-3',
          cost: d.slots.find(s => s.slot === 'evening').cost || 600,
          votes: { [currentUser.id]: 'up' },
          locked: false,
        }] : [],
      }
    }));

    const newTrip = {
      id: `trip-ai-${dest.toLowerCase()}-${Date.now().toString(36)}`,
      title: plan.title || `${dest} Collaborative Crew Trip`,
      destination: `${dest}, India`,
      inviteCode: `TANDEM-${dest.toUpperCase().slice(0, 3)}-${Math.floor(10 + Math.random() * 90)}`,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      daysCount: tripDays.length || 3,
      members: [
        {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: 'Trip Host',
          avatar: currentUser.avatar,
          color: '#FF6B45',
          status: 'online',
        },
        {
          id: 'user-2',
          name: 'Priya Sharma',
          email: 'priya@triptandem.travel',
          role: 'Treasurer',
          avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
          color: '#2A9D8F',
          status: 'online',
        }
      ],
      budget: {
        totalTarget: (plan.estimatedCostPerPerson || 12000) * 4,
        spent: 0,
      },
      days: tripDays,
    };

    setTrip(newTrip);
    localStorage.setItem('tt_active_trip', JSON.stringify(newTrip));

    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (e) {}

    showToast(`🎉 Generated live group trip for ${dest}!`, 'success');
    navigate(`/workspace/${newTrip.id}`);
  };

  return (
    <div className="min-h-screen bg-brand-sand py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Page Title & Philosophy with Cute 3D Robot */}
        <div className="text-center space-y-3">
          <div className="relative w-16 h-16 mx-auto rounded-3xl overflow-hidden border-2 border-brand-orange shadow-card bg-amber-50">
            <img
              src="/cute_robot.jpg"
              alt="Cute 3D Travel Robot with Backpack"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-orange-light text-brand-orange text-xs font-semibold uppercase tracking-wider border border-brand-orange/20 shadow-subtle">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unified AI Brain · Shared with Floating Mascot</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-brand-navy dark:text-white">
            TripTandem AI Concierge
          </h1>
          <p className="text-sm text-brand-navy/70 dark:text-slate-300 max-w-xl mx-auto">
            Ask for itinerary ideas, cheaper alternatives, vegetarian spots, or route optimizations. All recommendations are grounded directly in our verified database.
          </p>

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setIsAiSettingsOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-xs transition-colors cursor-pointer ${
                (aiKeys?.geminiKey || aiKeys?.openAiKey || aiKeys?.openRouterKey)
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-brand-teal border-teal-500/30'
                  : 'text-brand-navy/70 dark:text-slate-200 hover:text-brand-orange bg-white dark:bg-slate-800 border-brand-sand-border dark:border-slate-700'
              }`}
              title="Configure Fast AI Models & Fallbacks (Gemini, OpenAI, OpenRouter)"
            >
              <Key className="w-3.5 h-3.5 text-brand-teal" />
              <span>
                {aiKeys?.geminiKey ? '⚡ Gemini 2.0 Flash' :
                 aiKeys?.openAiKey ? '⚡ GPT-4o Mini' :
                 aiKeys?.openRouterKey ? '⚡ OpenRouter' : 'Configure Fast AI Models'}
              </span>
            </button>

            <button
              onClick={clearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-brand-navy/60 hover:text-rose-600 bg-white dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Chat History</span>
            </button>
          </div>
        </div>

        {/* Benchmark Quick Prompts */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-brand-sand-border dark:border-slate-800 shadow-subtle space-y-2.5">
          <span className="text-xs font-semibold text-brand-navy dark:text-slate-300 uppercase tracking-wider block">
            Try Benchmark Inquiries:
          </span>
          <div className="flex flex-wrap gap-2">
            {benchmarkPrompts.map((bp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(bp.text)}
                className="px-3.5 py-2 rounded-full bg-brand-sand dark:bg-slate-800 hover:bg-brand-orange-light text-brand-navy dark:text-slate-200 hover:text-brand-orange border border-brand-sand-border dark:border-slate-700 text-xs font-medium transition-all text-left cursor-pointer"
              >
                <strong>{bp.title}:</strong> "{bp.text}"
              </button>
            ))}
          </div>
        </div>

        {/* Chat Stream & Structured Results */}
        <div className="space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-3xl p-5 text-sm leading-relaxed space-y-4 shadow-subtle ${
                  msg.sender === 'user'
                    ? 'bg-brand-orange text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-900 text-brand-navy dark:text-slate-100 rounded-bl-none border border-brand-sand-border dark:border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  {msg.sender === 'assistant' && (
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-brand-sand-border/60 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <img
                          src="/cute_robot.jpg"
                          alt="AI Robot"
                          className="w-5 h-5 rounded-full object-cover ring-1 ring-brand-orange shrink-0"
                        />
                        <span className="font-bold text-xs text-brand-orange">Tandem AI Travel Buddy</span>
                      </div>
                      {msg.providerUsed && (
                        <span className="text-[10px] font-semibold text-brand-teal dark:text-teal-400 bg-brand-teal-light dark:bg-teal-950/40 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                          ⚡ {msg.providerUsed}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Matched Real Venues & Properties on TripTandem with Direct Actions & Uber/Bus Transit */}
                {msg.matchedVenues && msg.matchedVenues.length > 0 && (
                  <div className="space-y-4 pt-3 border-t border-brand-sand-border dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-brand-teal dark:text-brand-teal uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-brand-orange" />
                        <span>Listed on TripTandem ({msg.matchedVenues.length}) · Direct Booking & Live Transit</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {msg.matchedVenues.map((venue) => (
                        <MatchedVenueCard
                          key={venue.id}
                          venue={venue}
                          navigate={navigate}
                          formatPrice={formatPrice}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Structured Suggestion Cards */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-brand-sand-border dark:border-slate-800">
                    <div className="text-xs font-semibold text-brand-navy dark:text-white uppercase tracking-wider">
                      Verified Suggestions ({msg.suggestions.length})
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {msg.suggestions.map((sug) => (
                        <div
                          key={sug.id}
                          className="bg-brand-sand/60 dark:bg-slate-800 rounded-2xl p-4 border border-brand-sand-border dark:border-slate-700 space-y-3 text-brand-navy dark:text-slate-100"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-sm">{sug.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-brand-teal font-medium mt-0.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Day {sug.proposedDay} · {sug.proposedTime}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="font-bold text-sm text-brand-orange">
                                {formatPrice(sug.estimatedCostPerPerson)}
                              </span>
                              <span className="text-[10px] text-brand-navy/60 dark:text-slate-400 block">/person</span>
                            </div>
                          </div>

                          <p className="text-xs text-brand-navy/80 dark:text-slate-300">
                            <strong>Rationale:</strong> {sug.rationale}
                          </p>

                          {sug.constraintsChecked && (
                            <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-brand-sand-border dark:border-slate-700 text-[11px] text-brand-teal space-y-0.5">
                              {sug.constraintsChecked.map((chk, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-brand-teal flex-shrink-0" />
                                  <span>{chk}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => handleApplyToTrip(sug)}
                            className="w-full py-2.5 px-4 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span>Add as Draft to Day {sug.proposedDay} Itinerary</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1-Click Launch Trip Button if AI generated a schedule */}
                {msg.itineraryPlan && (
                  <div className="pt-2">
                    <button
                      onClick={() => handleLaunchGroupTrip(msg.itineraryPlan)}
                      className="w-full py-3 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-card hover:shadow-card-hover transition-all transform active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-brand-yellow" />
                      <span>Launch as Collaborative Group Trip 🚀</span>
                    </button>
                  </div>
                )}

              </div>
              <span className="text-[10px] text-brand-navy/40 dark:text-slate-500 px-2 mt-1">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-brand-sand-border dark:border-slate-800 shadow-subtle flex items-center gap-3 text-xs text-brand-navy dark:text-white w-fit animate-pulse">
              <Sparkles className="w-4 h-4 text-brand-orange animate-spin" />
              <span>Analyzing constraints and checking verified venue records...</span>
            </div>
          )}
        </div>

        {/* Console Input Bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="bg-white dark:bg-slate-900 rounded-full p-2 pl-4 sm:pl-6 border border-brand-sand-border dark:border-slate-700 shadow-search flex items-center gap-2 sm:gap-3 sticky bottom-20 lg:bottom-6 z-20"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask AI Concierge (e.g. Plan a 3-day Goa trip under ₹20,000...)"
            className="flex-1 bg-transparent text-xs sm:text-sm text-brand-navy dark:text-white placeholder:text-brand-navy/40 dark:placeholder:text-slate-500 focus:outline-none font-medium"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="p-3.5 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white shadow-card transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Unified Fast Multi-Model AI Settings Modal */}
        <AiSettingsModal
          isOpen={isAiSettingsOpen}
          onClose={() => setIsAiSettingsOpen(false)}
          onSaveNotification={(msg) => showToast(msg, 'success')}
        />

      </div>
    </div>
  );
};

export default AiConciergePage;
