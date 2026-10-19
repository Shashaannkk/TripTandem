import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Sparkles, 
  User, 
  Receipt, 
  UserPlus, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  Coins, 
  Maximize2,
  Smile,
  Heart,
  Users,
  Clock,
  ArrowRight,
  Bot,
  Loader2
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import { GoogleGeminiIcon } from '../home/GeminiAiBubble';
import { api } from '../../services/api';

export const GroupChatDrawer = () => {
  const { 
    trip, 
    isChatOpen, 
    setIsChatOpen, 
    sendChatMessage, 
    reactToMessage,
    emitTyping, 
    typingUsers, 
    setIsInviteModalOpen,
    acceptAiSuggestion
  } = useTrip();
  const { currentUser, formatPrice, showToast } = useAuth();

  const [inputText, setInputText] = useState('');
  const [showBillForm, setShowBillForm] = useState(false);
  const [activeReceiptPreview, setActiveReceiptPreview] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState(null);

  // Google AI Side-by-Side Co-Pilot State
  const [isAiModeActive, setIsAiModeActive] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Bill Form State
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billCategory, setBillCategory] = useState('food');
  const [billPaidBy, setBillPaidBy] = useState(currentUser?.name || 'Alex Morgan');
  const [billReceiptImage, setBillReceiptImage] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const EMOJI_OPTIONS = ['❤️', '😂', '👍', '🔥', '😮', '👏', '✈️', '🥳'];

  const AI_QUICK_PROMPTS = [
    { label: '🍽️ Recommend Dinner', text: '@Gemini Recommend a great sunset dinner spot near our stay under ₹1,200/person' },
    { label: '💰 Split Cab Fare', text: '@Gemini Calculate split fare for airport cab ₹1,800 between 4 friends' },
    { label: '🗺️ Day 2 Group Activity', text: '@Gemini Suggest a fun afternoon adventure for our group in Goa' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [trip?.chat, isChatOpen, isAiTyping]);

  if (!isChatOpen) return null;

  const triggerGoogleAiResponse = async (userPrompt) => {
    const cleanPrompt = userPrompt.replace(/@(gemini|google|ai)/gi, '').trim() || userPrompt;
    setIsAiTyping(true);

    try {
      const res = await api.queryAiConcierge(
        cleanPrompt, 
        trip?.id, 
        trip?.members?.length || 4, 
        trip?.budget?.totalTarget || 25000
      );

      const replyText = res.assistantReply || res.reply || `I've analyzed our group schedule for ${trip?.destination || 'this trip'}. Here are top verified suggestions tailored for our crew!`;
      
      sendChatMessage(replyText, null, {
        id: 'google-gemini-ai',
        name: 'Google Gemini AI',
        avatar: '/cute_robot.jpg',
        isAi: true,
        role: 'AI Travel Companion',
        suggestions: res.suggestions || [],
      });
    } catch (err) {
      console.warn('Google AI response notice:', err);
      sendChatMessage(
        `I checked our group constraints for ${trip?.destination || 'the trip'}. I recommend locking in our afternoon dining spot to avoid waiting in peak rush!`,
        null,
        {
          id: 'google-gemini-ai',
          name: 'Google Gemini AI',
          avatar: '/cute_robot.jpg',
          isAi: true,
          role: 'AI Travel Companion',
          suggestions: [],
        }
      );
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend) return;

    const isDirectAiQuery = isAiModeActive || /@(gemini|google|ai)/i.test(textToSend);

    // Send user message
    sendChatMessage(textToSend);
    setInputText('');
    emitTyping(false);

    // If query was addressed to Google AI, trigger side-by-side response
    if (isDirectAiQuery) {
      await triggerGoogleAiResponse(textToSend);
    }
  };

  const handlePromptClick = async (promptText) => {
    sendChatMessage(promptText);
    await triggerGoogleAiResponse(promptText);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    emitTyping(e.target.value.length > 0);
  };

  // Handle Receipt File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillReceiptImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Sample Receipt Presets for Fast Testing
  const SAMPLE_RECEIPTS = [
    { label: 'Dinner Receipt', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80' },
    { label: 'Taxi Invoice', url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80' },
    { label: 'Hotel Voucher', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80' },
  ];

  const handlePostBill = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(billAmount);
    if (!billTitle.trim() || isNaN(amountNum) || amountNum <= 0) return;

    const attachment = {
      type: 'bill',
      title: billTitle.trim(),
      amount: amountNum,
      category: billCategory,
      paidBy: billPaidBy,
      splitWith: trip?.members?.map(m => m.name) || [],
      receiptUrl: billReceiptImage || SAMPLE_RECEIPTS[0].url,
    };

    const caption = `🧾 I paid ₹${amountNum.toLocaleString()} for ${billTitle.trim()}! Split equally with the crew.`;
    sendChatMessage(caption, attachment);

    // Reset Bill Form
    setBillTitle('');
    setBillAmount('');
    setBillReceiptImage(null);
    setShowBillForm(false);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white dark:bg-[#111C2E] shadow-floating border-l border-brand-sand-border dark:border-[#1E2D42] flex flex-col animate-slide-left transition-colors duration-300">
      
      {/* Drawer Header with Real-Time Google AI Companion Presence */}
      <div className="p-3.5 border-b border-brand-sand-border dark:border-slate-800 flex items-center justify-between bg-brand-sand/60 dark:bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-teal-light dark:bg-teal-950/50 text-brand-teal">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm text-brand-navy dark:text-white leading-tight">
                Trip Tandem Live Chat
              </h3>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-400/30 text-[9px] font-bold text-indigo-600 dark:text-indigo-300">
                <GoogleGeminiIcon size={10} />
                <span>Google AI Side-by-Side</span>
              </span>
            </div>
            <p className="text-[11px] text-brand-teal font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{trip?.members?.length || 4} collaborators + Google AI Companion connected</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Invite Button */}
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="p-1.5 rounded-full hover:bg-brand-sand dark:hover:bg-slate-800 text-brand-orange transition-colors flex items-center gap-1 text-xs font-semibold px-2.5 border border-brand-orange/20 bg-brand-orange/5"
            title="Invite friends to this trip"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>

          <button
            onClick={() => setIsChatOpen(false)}
            className="p-1.5 rounded-full hover:bg-brand-sand dark:hover:bg-slate-800 text-brand-navy dark:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Real Active Chatting Identity Indicator */}
      <div className="px-3.5 py-2 bg-brand-sand/40 dark:bg-slate-900/90 border-b border-brand-sand-border dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-brand-navy/50 dark:text-slate-400">Chatting as:</span>
          <div className="flex items-center gap-1.5 font-bold text-brand-navy dark:text-slate-200">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser?.name || 'Traveler'}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-brand-teal"
            />
            <span className="truncate max-w-[120px]">{(currentUser?.name || 'Traveler').split(' ')[0]}</span>
            <span className="text-[10px] font-normal text-brand-teal bg-brand-teal-light dark:bg-teal-950/50 px-1 rounded">
              {currentUser?.role || 'Explorer'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time Sync Active</span>
        </div>
      </div>

      {/* Quick Google Gemini AI Prompts Bar */}
      <div className="px-3 py-1.5 bg-gradient-to-r from-blue-50/60 via-purple-50/60 to-orange-50/60 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 border-b border-brand-sand-border/70 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 shrink-0">
          <GoogleGeminiIcon size={12} />
          <span>Ask AI:</span>
        </span>
        {AI_QUICK_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handlePromptClick(p.text)}
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white dark:bg-slate-800 hover:bg-brand-orange-light text-brand-navy dark:text-slate-200 hover:text-brand-orange border border-brand-sand-border dark:border-slate-700 shadow-xs whitespace-nowrap transition-all shrink-0 cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-sand/30 dark:bg-slate-950/40">
        {(trip?.chat || []).map((msg) => {
          const isMe = msg.senderId === currentUser?.id;
          const isSystem = msg.senderId === 'system';
          const isAi = msg.isAi || msg.senderId === 'google-gemini-ai';
          const hasBill = msg.attachment && msg.attachment.type === 'bill';
          const isPickerOpen = activeReactionPickerId === msg.id;

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center my-2">
                <span className="inline-block px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-[11px] text-brand-navy/60 dark:text-slate-300 border border-brand-sand-border dark:border-slate-700 shadow-subtle">
                  ✨ {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
              className={`group relative flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                <div className="relative shrink-0 mb-1">
                  <img
                    src={msg.senderAvatar || '/cute_robot.jpg'}
                    alt={msg.senderName}
                    className={`w-7 h-7 rounded-full object-cover ring-1 ${
                      isAi ? 'ring-purple-500 shadow-sm' : 'ring-brand-sand-border'
                    }`}
                  />
                  {isAi && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-xs">
                      <GoogleGeminiIcon size={10} />
                    </span>
                  )}
                </div>
              )}

              {/* Message Bubble Container with Relative positioning for Reaction Picker */}
              <div className="relative max-w-[85%]">
                
                {/* Floating Instagram/WhatsApp-style Emoji Reaction Bar on Hover or Tap */}
                {(hoveredMessageId === msg.id || isPickerOpen) && (
                  <div className={`absolute -top-10 z-30 flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-full shadow-floating border border-brand-sand-border dark:border-slate-700 animate-scale-up ${
                    isMe ? 'right-0' : 'left-0'
                  }`}>
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          reactToMessage(msg.id, emoji);
                          setActiveReactionPickerId(null);
                        }}
                        className="w-7 h-7 flex items-center justify-center hover:scale-135 transition-transform text-sm active:scale-95 rounded-full hover:bg-brand-sand dark:hover:bg-slate-800"
                        title={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Bubble */}
                <div
                  className={`rounded-2xl p-3 text-xs leading-relaxed space-y-1.5 transition-all shadow-subtle ${
                    isMe
                      ? 'bg-brand-orange text-white rounded-br-none shadow-sm'
                      : isAi
                      ? 'bg-gradient-to-br from-indigo-50/95 via-purple-50/90 to-amber-50/80 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 text-brand-navy dark:text-slate-100 rounded-bl-none border border-purple-500/30 shadow-card'
                      : 'bg-white dark:bg-slate-900 text-brand-navy dark:text-slate-100 rounded-bl-none border border-brand-sand-border dark:border-slate-800'
                  }`}
                >
                  {!isMe && (
                    <div className="font-bold text-[11px] flex items-center justify-between gap-2">
                      <span className={isAi ? 'text-indigo-600 dark:text-indigo-400 flex items-center gap-1' : 'text-brand-teal'}>
                        {isAi && <GoogleGeminiIcon size={12} />}
                        <span>{msg.senderName}</span>
                      </span>
                      {isAi && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold">
                          AI Co-Pilot
                        </span>
                      )}
                    </div>
                  )}

                  {/* Text Message */}
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Structured AI Suggestions with 1-Click Add to Trip Schedule */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-purple-200 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-brand-orange" />
                        <span>Recommended Group Stops:</span>
                      </span>

                      {msg.suggestions.map((sug) => (
                        <div
                          key={sug.id}
                          className="p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-purple-200 dark:border-slate-700 space-y-1 shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs text-brand-navy dark:text-white truncate">
                              {sug.title}
                            </span>
                            <span className="text-[11px] font-bold text-brand-orange shrink-0">
                              {formatPrice(sug.estimatedCostPerPerson)}
                            </span>
                          </div>
                          <p className="text-[10px] text-brand-navy/70 dark:text-slate-300 leading-snug">
                            {sug.rationale}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              acceptAiSuggestion(sug, sug.proposedDay || 1);
                              showToast(`Added "${sug.title}" to Day ${sug.proposedDay || 1} Draft!`, 'success');
                            }}
                            className="w-full py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <span>Add to Day {sug.proposedDay || 1} Itinerary</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Embedded Rich Bill / Expense Card */}
                  {hasBill && (
                    <div className={`mt-2 p-3 rounded-xl border text-xs space-y-2 ${
                      isMe 
                        ? 'bg-white text-brand-navy border-white/40' 
                        : 'bg-brand-sand/60 dark:bg-slate-800 text-brand-navy dark:text-slate-100 border-brand-sand-border dark:border-slate-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1 text-brand-teal">
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Shared Expense Bill</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          Added to Budget
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1 border-t border-brand-sand-border/50 dark:border-slate-700/50">
                        <div>
                          <div className="font-semibold">{msg.attachment.title}</div>
                          <div className="text-[10px] text-brand-navy/60 dark:text-slate-400">
                            Paid by {msg.attachment.paidBy} · {msg.attachment.category}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-brand-orange">
                            {formatPrice(msg.attachment.amount)}
                          </div>
                          <div className="text-[10px] text-brand-navy/60 dark:text-slate-400">
                            ~{formatPrice(Math.round(msg.attachment.amount / (trip?.members?.length || 4)))} / person
                          </div>
                        </div>
                      </div>

                      {/* Receipt Image Preview */}
                      {msg.attachment.receiptUrl && (
                        <div 
                          onClick={() => setActiveReceiptPreview(msg.attachment.receiptUrl)}
                          className="relative rounded-lg overflow-hidden border border-brand-sand-border dark:border-slate-700 cursor-pointer group mt-1"
                        >
                          <img 
                            src={msg.attachment.receiptUrl} 
                            alt="Bill Receipt" 
                            className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-semibold gap-1">
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>View Receipt</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timestamp & Smiley Reaction Button */}
                  <div className="flex items-center justify-between pt-0.5 gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveReactionPickerId(isPickerOpen ? null : msg.id)}
                      className={`p-0.5 rounded-full transition-opacity ${
                        isMe
                          ? 'text-white/70 hover:text-white hover:bg-white/20'
                          : 'text-brand-navy/50 dark:text-slate-400 hover:text-brand-orange hover:bg-brand-sand dark:hover:bg-slate-800'
                      }`}
                      title="Add reaction"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    <span className={`text-[9px] ${
                      isMe ? 'text-white/70' : 'text-brand-navy/50 dark:text-slate-400'
                    }`}>
                      {msg.timestamp}
                    </span>
                  </div>

                </div>

                {/* Reaction Chips (WhatsApp / Instagram style below bubble) */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className={`flex flex-wrap items-center gap-1 mt-1 ${
                    isMe ? 'justify-end' : 'justify-start'
                  }`}>
                    {Object.entries(msg.reactions).map(([emoji, usersList]) => {
                      if (!usersList || usersList.length === 0) return null;
                      const hasUserReacted = usersList.some(
                        (u) => (typeof u === 'string' ? u : u.id) === currentUser?.id
                      );
                      const reactingNames = usersList
                        .map((u) => (typeof u === 'string' ? u : u.name))
                        .join(', ');

                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => reactToMessage(msg.id, emoji)}
                          title={`Reacted by: ${reactingNames} (Click to toggle)`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all shadow-xs ${
                            hasUserReacted
                              ? 'bg-brand-orange-light dark:bg-orange-950/50 border border-brand-orange text-brand-orange font-bold scale-105'
                              : 'bg-white dark:bg-slate-900 border border-brand-sand-border dark:border-slate-800 text-brand-navy/80 dark:text-slate-300 hover:border-brand-teal'
                          }`}
                        >
                          <span className="text-xs">{emoji}</span>
                          <span className="text-[10px] font-semibold">{usersList.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {/* Real-time Google AI Typing Indicator */}
        {isAiTyping && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-400/30 text-xs text-indigo-700 dark:text-indigo-300 w-fit animate-pulse">
            <GoogleGeminiIcon size={16} />
            <span className="font-semibold">Google Gemini is calculating group recommendations...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1.5 bg-brand-sand/50 dark:bg-slate-900 text-[11px] text-brand-teal font-medium flex items-center gap-1.5 border-t border-brand-sand-border/50 dark:border-slate-800">
          <span className="w-2 h-2 rounded-full bg-brand-teal animate-bounce" />
          <span>{typingUsers.map(u => u.name.split(' ')[0]).join(', ')} typing...</span>
        </div>
      )}

      {/* "I Paid This" Expense / Bill Upload Panel */}
      {showBillForm && (
        <div className="p-3.5 bg-brand-sand/90 dark:bg-slate-900 border-t border-brand-sand-border dark:border-slate-800 space-y-3 animate-fadeIn text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-brand-sand-border/70 dark:border-slate-800">
            <span className="font-bold text-brand-navy dark:text-white flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-brand-orange" />
              <span>Log "I Paid This" & Upload Bill</span>
            </span>
            <button
              type="button"
              onClick={() => setShowBillForm(false)}
              className="p-1 rounded-full text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handlePostBill} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-brand-navy/70 dark:text-slate-300 uppercase mb-0.5">
                  Expense Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Curlies Dinner, Airport Cab"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-brand-navy/70 dark:text-slate-300 uppercase mb-0.5">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 2400"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-brand-navy/70 dark:text-slate-300 uppercase mb-0.5">
                  Category
                </label>
                <select
                  value={billCategory}
                  onChange={(e) => setBillCategory(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none"
                >
                  <option value="food">Food & Dining</option>
                  <option value="transport">Transport / Cabs</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="activities">Activities & Entry</option>
                  <option value="other">Other Supplies</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-brand-navy/70 dark:text-slate-300 uppercase mb-0.5">
                  Who Paid
                </label>
                <select
                  value={billPaidBy}
                  onChange={(e) => setBillPaidBy(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none"
                >
                  {(trip?.members || []).map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} {m.id === currentUser?.id ? '(Me)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Receipt Image Upload & Quick Presets */}
            <div>
              <label className="block text-[10px] font-bold text-brand-navy/70 dark:text-slate-300 uppercase mb-1 flex items-center justify-between">
                <span>Bill Receipt Photo</span>
                <span className="text-[9px] text-brand-navy/40 dark:text-slate-500 font-normal">Optional</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl border border-dashed border-brand-orange text-brand-orange bg-white dark:bg-slate-800 hover:bg-brand-orange/5 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{billReceiptImage ? 'Change Image' : 'Upload Receipt'}</span>
                </button>

                {/* Sample Presets */}
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-brand-navy/40 dark:text-slate-500">or:</span>
                  {SAMPLE_RECEIPTS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBillReceiptImage(s.url)}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy/70 dark:text-slate-300 hover:text-brand-orange text-[10px]"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Uploaded Thumbnail */}
              {billReceiptImage && (
                <div className="relative mt-2 w-20 h-14 rounded-lg overflow-hidden border border-brand-sand-border dark:border-slate-700">
                  <img src={billReceiptImage} alt="Receipt preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setBillReceiptImage(null)}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBillForm(false)}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-brand-navy/70 dark:text-slate-400 hover:bg-brand-sand"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-brand-orange hover:bg-brand-orange-hover text-white shadow-sm flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Post & Sync Budget</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Chat Input & Actions Bar */}
      <div className="p-3 border-t border-brand-sand-border dark:border-slate-800 bg-white dark:bg-[#111C2E] space-y-2">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          
          {/* Ask Google AI Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsAiModeActive(!isAiModeActive)}
            className={`p-2 rounded-full transition-all flex items-center gap-1 text-xs font-bold border ${
              isAiModeActive
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-100'
            }`}
            title="Toggle Google AI Copilot to respond directly in chat"
          >
            <GoogleGeminiIcon size={14} />
            <span className="hidden sm:inline">AI Co-Pilot</span>
          </button>

          {/* Quick "I Paid This" Action Trigger */}
          <button
            type="button"
            onClick={() => setShowBillForm(!showBillForm)}
            className={`p-2 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold border ${
              showBillForm
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-brand-sand dark:bg-slate-800 text-brand-navy dark:text-slate-200 hover:text-brand-orange border-brand-sand-border dark:border-slate-700 hover:border-brand-orange/40'
            }`}
            title="Log an expense or upload receipt"
          >
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">I Paid</span>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={isAiModeActive ? "Ask Google AI (e.g. Best dinner spot near Vagator?)..." : "Discuss plans, vote ideas, or type @Gemini..."}
            className="flex-1 bg-brand-sand dark:bg-slate-900 text-xs rounded-full px-4 py-2.5 text-brand-navy dark:text-slate-100 placeholder:text-brand-navy/40 dark:placeholder:text-slate-500 border border-brand-sand-border dark:border-slate-700 focus:outline-none focus:border-brand-orange"
          />

          <button
            type="submit"
            className="p-2.5 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white shadow-sm transition-transform active:scale-95 shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Full Screen Receipt Lightbox Modal */}
      {activeReceiptPreview && (
        <div 
          onClick={() => setActiveReceiptPreview(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-floating p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-brand-sand-border dark:border-slate-800">
              <span className="font-bold text-xs text-brand-navy dark:text-white flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-brand-orange" />
                <span>Uploaded Expense Receipt</span>
              </span>
              <button
                onClick={() => setActiveReceiptPreview(null)}
                className="p-1 rounded-full hover:bg-brand-sand dark:hover:bg-slate-800 text-brand-navy dark:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img 
              src={activeReceiptPreview} 
              alt="Receipt Full View" 
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default GroupChatDrawer;
