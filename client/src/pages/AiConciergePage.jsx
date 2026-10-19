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
  Key,
  ExternalLink,
  Car,
  Bus,
  Bed,
  Utensils,
  CheckCircle2,
  X
} from 'lucide-react';
import { useTrip } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { useAiChat } from '../services/aiChatService';
import confetti from 'canvas-confetti';

export const AiConciergePage = () => {
  const navigate = useNavigate();
  const { trip, setTrip, acceptAiSuggestion } = useTrip();
  const { formatPrice, currentUser, showToast } = useAuth();
  const { messages, isLoading, sendMessage, clearHistory, openRouterKey, setOpenRouterKey } = useAiChat(trip?.id);

  const [inputQuery, setInputQuery] = useState('');
  const [isOpenRouterModalOpen, setIsOpenRouterModalOpen] = useState(false);
  const [keyInput, setKeyInput] = useState(openRouterKey || '');

  useEffect(() => {
    if (openRouterKey) setKeyInput(openRouterKey);
  }, [openRouterKey]);

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
              onClick={() => setIsOpenRouterModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-xs transition-colors cursor-pointer ${
                openRouterKey
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-brand-teal border-teal-500/30'
                  : 'text-brand-navy/70 dark:text-slate-200 hover:text-brand-orange bg-white dark:bg-slate-800 border-brand-sand-border dark:border-slate-700'
              }`}
              title={openRouterKey ? 'OpenRouter Active (Custom Model)' : 'Connect OpenRouter API Key'}
            >
              <Key className="w-3.5 h-3.5 text-brand-teal" />
              <span>{openRouterKey ? 'OpenRouter Active' : 'Connect OpenRouter AI'}</span>
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
                <div className="flex items-start gap-2.5">
                  {msg.sender === 'assistant' && (
                    <img
                      src="/cute_robot.jpg"
                      alt="AI Robot"
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-brand-orange shrink-0 mt-0.5"
                    />
                  )}
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
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
                      {msg.matchedVenues.map((venue) => {
                        const isStay = venue.category === 'stay';
                        const isFood = venue.category === 'dining' || venue.category === 'food';
                        const actionLabel = isStay ? 'Book Stay Directly' : (isFood ? 'Dine / Eat Here' : 'Visit Spot & View Guide');
                        const ActionIcon = isStay ? Bed : (isFood ? Utensils : MapPin);

                        return (
                          <div
                            key={venue.id}
                            className="rounded-3xl overflow-hidden bg-brand-sand/70 dark:bg-slate-800/90 border border-brand-sand-border dark:border-slate-700 shadow-sm text-brand-navy dark:text-slate-100 flex flex-col justify-between"
                          >
                            <div>
                              {/* Venue Card Header with Real Photo */}
                              <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                                <img
                                  src={venue.image}
                                  alt={venue.name}
                                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-brand-navy uppercase tracking-wider shadow-sm">
                                    {venue.category}
                                  </span>
                                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm flex items-center gap-1">
                                    ⭐ {venue.rating || 4.8} ({venue.reviewCount || 120})
                                  </span>
                                </div>

                                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                                  <div className="min-w-0 pr-2">
                                    <h4 className="font-bold text-sm sm:text-base text-white leading-tight drop-shadow-sm">
                                      {venue.name}
                                    </h4>
                                    <p className="text-xs text-slate-200 truncate flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3 text-brand-orange" />
                                      <span>{venue.region || venue.destination}</span>
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-sm font-bold text-emerald-300 bg-black/60 px-2 py-1 rounded-lg backdrop-blur-xs block">
                                      {formatPrice(venue.price)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="p-3.5 space-y-3">
                                <p className="text-xs text-brand-navy/70 dark:text-slate-300 line-clamp-2">
                                  {venue.description}
                                </p>

                                {/* Direct Action Button + Google Maps Link */}
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => navigate(`/explore?search=${encodeURIComponent(venue.name)}`)}
                                    className="py-2 px-3 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                  >
                                    <ActionIcon className="w-3.5 h-3.5" />
                                    <span>{actionLabel}</span>
                                  </button>

                                  <a
                                    href={venue.googleMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ' ' + venue.destination)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-2 px-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-brand-sand dark:hover:bg-slate-600 text-brand-navy dark:text-white border border-brand-sand-border dark:border-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-brand-teal" />
                                    <span>Google Maps</span>
                                  </a>
                                </div>

                                {/* Real-Time Transit & Live Fare Breakdown */}
                                {venue.transit && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                                    {/* Uber Live Estimates */}
                                    <div className="p-2.5 rounded-2xl bg-slate-900 text-white space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold flex items-center gap-1.5 text-xs text-amber-400">
                                          <Car className="w-3.5 h-3.5" />
                                          <span>Uber Live Rates</span>
                                        </span>
                                        <span className="text-[10px] text-slate-300">~{venue.transit.distanceKm} km</span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-1 text-[10px] bg-slate-800/80 p-1.5 rounded-lg text-center">
                                        <div>
                                          <span className="text-slate-400 block text-[9px]">Auto</span>
                                          <strong className="text-amber-300">₹{venue.transit.uber.autoFare}</strong>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 block text-[9px]">Go</span>
                                          <strong className="text-white">₹{venue.transit.uber.goFare}</strong>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 block text-[9px]">Premier</span>
                                          <strong className="text-white">₹{venue.transit.uber.premierFare}</strong>
                                        </div>
                                      </div>
                                      <a
                                        href={venue.transit.uber.deepLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-center py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] transition-colors"
                                      >
                                        Open in Uber App ↗
                                      </a>
                                    </div>

                                    {/* Bus Transit Breakdown */}
                                    <div className="p-2.5 rounded-2xl bg-emerald-950/80 text-emerald-100 border border-emerald-500/20 space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold flex items-center gap-1.5 text-xs text-emerald-300">
                                          <Bus className="w-3.5 h-3.5" />
                                          <span>Bus & Public Transit</span>
                                        </span>
                                        <span className="text-[10px] font-bold text-white bg-emerald-800 px-1.5 py-0.5 rounded">
                                          {venue.transit.bus.fare}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-emerald-200">
                                        <p className="font-semibold truncate">{venue.transit.bus.line}</p>
                                        <p className="text-[10px] text-emerald-300/80">{venue.transit.bus.frequency} · from {venue.transit.bus.departurePoint}</p>
                                      </div>
                                      <a
                                        href={venue.transit.bus.directionsLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-center py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors"
                                      >
                                        Bus Routes & Timings ↗
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
          className="bg-white dark:bg-slate-900 rounded-full p-2 pl-6 border border-brand-sand-border dark:border-slate-700 shadow-search flex items-center gap-3 sticky bottom-6 z-20"
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

        {/* OpenRouter API Key Settings Modal */}
        {isOpenRouterModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#0E1A2E] rounded-3xl p-6 border border-brand-sand-border dark:border-slate-800 shadow-2xl space-y-4 animate-fadeIn text-left">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-brand-teal-light dark:bg-teal-950/60 text-brand-teal">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-brand-navy dark:text-white">
                      OpenRouter AI Integration
                    </h3>
                    <p className="text-xs text-brand-navy/60 dark:text-slate-400">
                      Connect Gemini 2.0 Flash, Llama 3.3, or Claude
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpenRouterModalOpen(false)}
                  className="p-1 rounded-full text-brand-navy/40 hover:text-brand-navy dark:text-slate-400 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-brand-navy/70 dark:text-slate-300">
                <p>
                  Enter your <strong>OpenRouter API Key</strong> to ask completely open-ended travel questions, general knowledge, custom itineraries, and budget calculations.
                </p>
                <p className="text-[11px] text-brand-navy/50 dark:text-slate-400">
                  TripTandem automatically grounds all responses with direct booking links, live Uber pricing, and bus transit schedules.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-navy dark:text-slate-200">
                  OpenRouter API Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-brand-sand dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-xs font-mono text-brand-navy dark:text-white focus:outline-none focus:border-brand-teal"
                />
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-teal hover:underline flex items-center gap-1"
                  >
                    <span>Get an OpenRouter Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {openRouterKey && (
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Key connected
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-sand-border dark:border-slate-800">
                {openRouterKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenRouterKey('');
                      setKeyInput('');
                      showToast('OpenRouter API key cleared. Using built-in travel engine.', 'info');
                      setIsOpenRouterModalOpen(false);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    Remove Key
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpenRouterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-navy/70 dark:text-slate-300 hover:bg-brand-sand dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenRouterKey(keyInput.trim());
                    showToast(keyInput.trim() ? 'OpenRouter API key saved!' : 'Switched to built-in travel engine', 'success');
                    setIsOpenRouterModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-teal hover:bg-teal-700 text-white shadow-sm transition-colors cursor-pointer"
                >
                  Save & Activate
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AiConciergePage;
