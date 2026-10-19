import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  X, 
  Send, 
  Calendar, 
  MapPin, 
  Users, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  Loader2,
  Maximize2,
  Trash2,
  Bot,
  Key,
  ExternalLink,
  Car,
  Bus,
  Bed,
  Utensils
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import { useAiChat } from '../../services/aiChatService';
import confetti from 'canvas-confetti';

/**
 * Authentic Google Gemini Multi-Color Gradient Star Logo
 */
export const GoogleGeminiIcon = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={`shrink-0 ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="geminiGradMain" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4E82EE" />
        <stop offset="35%" stopColor="#9B72CB" />
        <stop offset="70%" stopColor="#D96570" />
        <stop offset="100%" stopColor="#F4B400" />
      </linearGradient>
    </defs>
    <path
      d="M12 0.5C12 6.85 6.85 12 0.5 12C6.85 12 12 17.15 12 23.5C12 17.15 17.15 12 23.5 12C17.15 12 12 6.85 12 0.5Z"
      fill="url(#geminiGradMain)"
    />
    <circle cx="12" cy="12" r="2.2" fill="#FFFFFF" fillOpacity="0.9" />
  </svg>
);

/**
 * Cute 3D Robot Floating AI Bubble with Backpack
 * - Positioned 50px further left: right-[66px] sm:right-[82px]
 * - Positioned 30px higher up: bottom-[94px] sm:bottom-[62px]
 * - Uses cute shiny 3D robot mascot with small backpack behind matching theme & colors
 * - Shares 100% unified conversation history with /ai-concierge page via useAiChat()
 * - Compact, sleek floating chat window with 1-click group trip launch
 */
export const GeminiAiBubble = ({ destination = '' }) => {
  const navigate = useNavigate();
  const { setTrip, trip, acceptAiSuggestion } = useTrip();
  const { currentUser, showToast, formatPrice } = useAuth();
  const { messages, isLoading, sendMessage, clearHistory, lastPlan, openRouterKey, setOpenRouterKey } = useAiChat(trip?.id);

  const [isOpen, setIsOpen] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [activeDayTab, setActiveDayTab] = useState(1);
  const [isOpenRouterModalOpen, setIsOpenRouterModalOpen] = useState(false);
  const [keyInput, setKeyInput] = useState(openRouterKey || '');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (openRouterKey) setKeyInput(openRouterKey);
  }, [openRouterKey]);

  const samplePrompts = [
    { label: '🏖️ 3-Day Goa Escape', text: 'Plan a 3-day balanced budget Goa trip under ₹20,000 with sunset dining' },
    { label: '🏔️ 4-Day Manali Trip', text: 'Plan a 4-day Manali retreat with boutique chalets and scenic walks' },
    { label: '🏰 Jaipur Royal Tour', text: 'Curate a 2-day heritage weekend in Jaipur with authentic Rajasthani food' },
    { label: '🥗 Pure Veg & Budget', text: 'Find vegetarian restaurants and budget stays for 4 friends' },
  ];

  // Auto scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() || isLoading) return;
    const text = promptInput;
    setPromptInput('');
    await sendMessage(text, destination);
  };

  const handlePromptClick = async (text) => {
    await sendMessage(text, destination);
  };

  // Convert AI plan to real Collaborative Group Workspace
  const handleLaunchGroupTrip = (plan) => {
    const active = plan || lastPlan?.itineraryPlan;
    if (!active) return;

    const dest = active.destination || destination || 'Goa';
    const planSchedule = active.schedule || active.itineraryPlan?.schedule || [];

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
      title: active.title || `${dest} Collaborative Crew Trip`,
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
        totalTarget: (active.estimatedCostPerPerson || 12000) * 4,
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
    setIsOpen(false);
    navigate(`/workspace/${newTrip.id}`);
  };

  return (
    /* Positioned 20px more to the left and 15px down, fixed firmly in place */
    <div className="fixed bottom-[79px] sm:bottom-[47px] right-[86px] sm:right-[102px] z-50 flex flex-col items-end pointer-events-auto">
      
      {/* Compact Interactive Floating Chat Window */}
      {isOpen && (
        <div className="mb-3 w-[92vw] sm:w-[400px] h-[520px] max-h-[75vh] flex flex-col bg-white/95 dark:bg-[#0E1A2E]/95 backdrop-blur-2xl rounded-3xl shadow-[0_24px_60px_rgba(11,37,69,0.35)] border border-brand-sand-border dark:border-indigo-500/30 text-left animate-fadeIn transition-all overflow-hidden">
          
          {/* Header featuring Cute 3D Robot Mascot with Backpack */}
          <div className="flex items-center justify-between p-3.5 border-b border-brand-sand-border dark:border-slate-800 bg-brand-sand/50 dark:bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative w-10 h-10 rounded-2xl overflow-hidden border-2 border-brand-orange/60 shadow-sm shrink-0 bg-amber-50">
                <img
                  src="/cute_robot.jpg"
                  alt="Cute 3D Travel Robot with Backpack"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-1 ring-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-brand-navy dark:text-white leading-tight">
                    Tandem AI Buddy
                  </h4>
                  <span className="text-[9px] font-bold text-brand-teal px-1.5 py-0.2 rounded-full bg-brand-teal-light dark:bg-teal-950/40 border border-teal-500/20">
                    Live Sync
                  </span>
                </div>
                <p className="text-[10px] text-brand-navy/60 dark:text-slate-400">
                  Shared history with AI Concierge
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1">
              {/* OpenRouter API Key Configuration */}
              <button
                onClick={() => setIsOpenRouterModalOpen(true)}
                className={`p-1.5 rounded-full transition-colors ${
                  openRouterKey
                    ? 'text-brand-teal bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60'
                    : 'text-brand-navy/50 hover:text-brand-orange hover:bg-brand-sand dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
                title={openRouterKey ? 'OpenRouter AI Active (Custom Key)' : 'Connect OpenRouter API Key'}
              >
                <Key className="w-3.5 h-3.5" />
              </button>

              {/* Clear Chat History */}
              <button
                onClick={clearHistory}
                className="p-1.5 rounded-full text-brand-navy/40 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                title="Reset conversation history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Expand to Full Page /ai-concierge */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/ai-concierge');
                }}
                className="p-1.5 rounded-full text-brand-navy/60 hover:text-brand-orange hover:bg-brand-sand dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                title="Open full page view"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Close Floating Window */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-brand-navy/50 hover:text-brand-navy hover:bg-brand-sand dark:text-slate-400 dark:hover:text-white transition-colors"
                aria-label="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Suggestions Pills */}
          <div className="px-3 py-1.5 bg-white/70 dark:bg-slate-900/40 border-b border-brand-sand-border/50 dark:border-slate-800/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptClick(p.text)}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-brand-sand dark:bg-slate-800 hover:bg-brand-orange-light text-brand-navy dark:text-slate-300 hover:text-brand-orange whitespace-nowrap border border-brand-sand-border dark:border-slate-700 transition-all shrink-0 cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Shared Chat Message Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-brand-sand/30 dark:bg-slate-950/30">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed space-y-2 shadow-subtle ${
                      isUser
                        ? 'bg-brand-orange text-white rounded-br-none'
                        : 'bg-white dark:bg-slate-900 text-brand-navy dark:text-slate-100 rounded-bl-none border border-brand-sand-border dark:border-slate-800'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 text-brand-orange font-bold text-[11px] pb-1 border-b border-brand-sand-border/60 dark:border-slate-800">
                        <img
                          src="/cute_robot.jpg"
                          alt="AI Robot"
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span>Tandem AI Travel Buddy</span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Matched Real Venues & Properties on TripTandem with Direct Actions & Uber/Bus Transit */}
                    {msg.matchedVenues && msg.matchedVenues.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-brand-sand-border/70 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal dark:text-brand-teal flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-brand-orange" />
                            <span>Listed on TripTandem ({msg.matchedVenues.length})</span>
                          </span>
                          <span className="text-[9px] text-brand-navy/50 dark:text-slate-400">Live Uber & Bus</span>
                        </div>

                        {msg.matchedVenues.map((venue) => {
                          const isStay = venue.category === 'stay';
                          const isFood = venue.category === 'dining' || venue.category === 'food';
                          const actionLabel = isStay ? 'Book Stay Directly' : (isFood ? 'Dine / Eat Here' : 'Visit Spot & View Guide');
                          const ActionIcon = isStay ? Bed : (isFood ? Utensils : MapPin);

                          return (
                            <div
                              key={venue.id}
                              className="rounded-2xl overflow-hidden bg-brand-sand/80 dark:bg-slate-800/90 border border-brand-sand-border dark:border-slate-700 shadow-sm text-brand-navy dark:text-slate-100"
                            >
                              {/* Venue Card Header with Real Photo */}
                              <div className="relative h-24 w-full overflow-hidden bg-slate-900">
                                <img
                                  src={venue.image}
                                  alt={venue.name}
                                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                                <div className="absolute top-2 left-2 flex items-center gap-1">
                                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-white/90 text-brand-navy uppercase tracking-wider">
                                    {venue.category}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-500/90 text-white flex items-center gap-0.5">
                                    ⭐ {venue.rating || 4.8}
                                  </span>
                                </div>

                                <div className="absolute bottom-1.5 left-2 right-2 flex items-end justify-between">
                                  <div className="min-w-0 pr-1">
                                    <h5 className="font-bold text-[11px] text-white leading-tight truncate">
                                      {venue.name}
                                    </h5>
                                    <p className="text-[9px] text-slate-200 truncate flex items-center gap-0.5">
                                      <MapPin className="w-2.5 h-2.5 text-brand-orange" />
                                      <span>{venue.region || venue.destination}</span>
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-bold text-emerald-300 shrink-0 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-xs">
                                    {formatPrice(venue.price)}
                                  </span>
                                </div>
                              </div>

                              <div className="p-2 space-y-1.5">
                                {/* Direct Action Button + Maps */}
                                <div className="grid grid-cols-2 gap-1.5">
                                  <button
                                    onClick={() => {
                                      setIsOpen(false);
                                      navigate(`/explore?search=${encodeURIComponent(venue.name)}`);
                                    }}
                                    className="py-1 px-2 rounded-lg bg-brand-orange hover:bg-brand-orange-hover text-white text-[9px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                                  >
                                    <ActionIcon className="w-3 h-3" />
                                    <span className="truncate">{actionLabel}</span>
                                  </button>

                                  <a
                                    href={venue.googleMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + ' ' + venue.destination)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-1 px-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-brand-sand dark:hover:bg-slate-600 text-brand-navy dark:text-white border border-brand-sand-border dark:border-slate-600 text-[9px] font-semibold flex items-center justify-center gap-1 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3 text-brand-teal" />
                                    <span>Google Maps</span>
                                  </a>
                                </div>

                                {/* Real-Time Uber & Bus Transit Estimate Grid */}
                                {venue.transit && (
                                  <div className="grid grid-cols-1 gap-1 text-[9px]">
                                    {/* Uber Box */}
                                    <div className="p-1.5 rounded-lg bg-slate-900 text-white space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold flex items-center gap-1 text-[9px] text-amber-400">
                                          <Car className="w-3 h-3" />
                                          <span>Uber Rates (~{venue.transit.distanceKm} km)</span>
                                        </span>
                                        <a
                                          href={venue.transit.uber.deepLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[8px] text-amber-300 hover:underline"
                                        >
                                          Open Uber ↗
                                        </a>
                                      </div>
                                      <div className="flex items-center justify-between text-[8px] text-slate-200">
                                        <span>Auto: <strong>₹{venue.transit.uber.autoFare}</strong></span>
                                        <span>Go: <strong>₹{venue.transit.uber.goFare}</strong></span>
                                        <span>Premier: <strong>₹{venue.transit.uber.premierFare}</strong></span>
                                      </div>
                                    </div>

                                    {/* Bus Transit Box */}
                                    <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-100 border border-emerald-500/20 space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold flex items-center gap-1 text-[9px] text-emerald-300">
                                          <Bus className="w-3 h-3" />
                                          <span>Bus Transit</span>
                                        </span>
                                        <span className="text-[8px] font-bold text-white bg-emerald-800/80 px-1 rounded">
                                          {venue.transit.bus.fare}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-[8px] text-emerald-200">
                                        <span className="truncate max-w-[170px]">{venue.transit.bus.line}</span>
                                        <a
                                          href={venue.transit.bus.directionsLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[8px] text-emerald-300 hover:underline shrink-0"
                                        >
                                          Routes ↗
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Structured Suggestion Cards */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-brand-sand-border/70 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-navy/60 dark:text-slate-400 block">
                          Verified Suggestions ({msg.suggestions.length})
                        </span>
                        {msg.suggestions.map((sug) => (
                          <div
                            key={sug.id}
                            className="p-2.5 rounded-xl bg-brand-sand/70 dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-bold text-xs text-brand-navy dark:text-white leading-tight">
                                {sug.title}
                              </h5>
                              <span className="text-[11px] font-bold text-brand-orange shrink-0">
                                {formatPrice(sug.estimatedCostPerPerson)}
                              </span>
                            </div>
                            <p className="text-[10px] text-brand-navy/70 dark:text-slate-300 leading-snug">
                              {sug.rationale}
                            </p>
                            <button
                              onClick={() => {
                                acceptAiSuggestion(sug, sug.proposedDay || 1);
                                showToast(`Added "${sug.title}" to itinerary!`, 'success');
                                setIsOpen(false);
                                navigate(`/workspace/${trip?.id || 'trip-goa-2026'}`);
                              }}
                              className="w-full py-1.5 rounded-lg bg-brand-navy dark:bg-white text-white dark:text-brand-navy text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-brand-orange dark:hover:bg-brand-orange dark:hover:text-white transition-colors"
                            >
                              <span>Add to Day {sug.proposedDay || 1} Draft</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 1-Click Launch Trip Button if AI generated a schedule */}
                    {msg.itineraryPlan && (
                      <div className="pt-2">
                        <button
                          onClick={() => handleLaunchGroupTrip(msg.itineraryPlan)}
                          className="w-full py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-brand-yellow" />
                          <span>Launch as Collaborative Group Trip 🚀</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] text-brand-navy/40 dark:text-slate-500 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {/* Thinking / Loading Animation */}
            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-brand-sand-border dark:border-slate-800 text-xs text-brand-navy dark:text-slate-200 w-fit animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-orange" />
                <span className="text-[11px] font-medium">Checking live rates and verified venues...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Chat Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-2.5 border-t border-brand-sand-border dark:border-slate-800 bg-white dark:bg-[#0E1A2E] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask anything (e.g. 3 days in Kerala under ₹15,000)..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-brand-sand dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white placeholder:text-brand-navy/40 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-orange"
            />
            <button
              type="submit"
              disabled={isLoading || !promptInput.trim()}
              className="p-2 rounded-xl bg-brand-orange text-white hover:bg-brand-orange-hover disabled:opacity-40 transition-all cursor-pointer shrink-0"
              title="Send to AI Buddy"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}

      {/* Main Floating Bubble Button: Cute 3D Shiny Robot with Backpack */}
      <div className="relative group animate-gemini-float">
        
        {/* Animated Glow Aura */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-brand-orange via-amber-400 to-brand-teal opacity-70 blur-md group-hover:opacity-100 transition-opacity duration-300 animate-gemini-glow pointer-events-none" />

        {/* Hover Speech Bubble Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#111C2E] border border-brand-sand-border dark:border-slate-700 shadow-card text-xs font-bold text-brand-navy dark:text-white whitespace-nowrap animate-fadeIn pointer-events-none">
          <span>AI Travel Buddy! 🎒</span>
        </div>

        {/* Compact, Cute Circular 3D Robot Floating Button (NO text on button) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open AI Trip Assistant"
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 bg-white dark:bg-[#0E1A2E] border-2 border-white dark:border-slate-700 shadow-[0_12px_32px_rgba(255,107,69,0.35)] hover:shadow-[0_16px_40px_rgba(42,157,143,0.45)] transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center overflow-visible select-none"
        >
          {/* Cute 3D Robot Mascot with Backpack Image */}
          <div className="w-full h-full rounded-full overflow-hidden bg-brand-orange-light dark:bg-slate-800">
            <img
              src="/cute_robot.jpg"
              alt="Cute 3D Travel Robot with Backpack"
              className="w-full h-full object-cover select-none pointer-events-none transform group-hover:scale-105 transition-transform"
            />
          </div>

          {/* Active Pulsing Indicator Badge */}
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center shadow-sm">
            <Sparkles className="w-2.5 h-2.5 text-white animate-pulse" />
          </span>
        </button>
      </div>

      {/* OpenRouter API Key Settings Modal */}
      {isOpenRouterModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
  );
};

export default GeminiAiBubble;
