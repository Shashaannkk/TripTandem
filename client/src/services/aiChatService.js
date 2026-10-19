// Unified TripTandem AI Chat & Concierge Service
// Synchronizes conversation history across both the Floating 3D AI Bubble and the dedicated /ai-concierge page.
// Integrates OpenRouter API for open-ended queries + site catalog matching with Uber & Bus transit.
import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { PLACES_CATALOG } from '../data/placesCatalog';
import { getVenueTransitDetails } from '../utils/transitHelper';

const STORAGE_KEY = 'tt_ai_messages';
const UPDATE_EVENT = 'tt_ai_chat_updated';
const OPENROUTER_KEY_STORAGE = 'tt_openrouter_key';

const DEFAULT_MESSAGES = [
  {
    id: 'init-1',
    sender: 'assistant',
    text: `Hello! I am your 3D AI travel buddy. I can answer any travel questions, plan multi-day itineraries, book beachfront stays in Udupi & Mangalore, and calculate real-time Uber and bus transit fares! Tell me what's on your mind! 🌴🌊`,
    timestamp: 'Just now',
    suggestions: [],
    itineraryPlan: null,
    matchedVenues: [],
  }
];

export function getStoredAiMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MESSAGES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MESSAGES;
  } catch (e) {
    console.warn('Failed to parse AI chat history:', e);
    return DEFAULT_MESSAGES;
  }
}

export function saveAiMessages(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: messages }));
  } catch (e) {
    console.warn('Failed to save AI chat history:', e);
  }
}

export function clearAiChatHistory() {
  saveAiMessages(DEFAULT_MESSAGES);
}

/**
 * Scan text to match any venues from TripTandem's curated database.
 * Computes Uber real-time fares and accurate bus transit details for each match.
 */
export function matchVenuesFromText(text, maxCount = 3) {
  if (!text || typeof text !== 'string') return [];
  const lower = text.toLowerCase();

  const matched = [];

  for (const venue of PLACES_CATALOG) {
    const vNameLower = (venue.name || '').toLowerCase();
    const vRegionLower = (venue.region || '').toLowerCase();

    // Check key phrases
    const keyPhrases = [
      vNameLower,
      vRegionLower,
      ...vNameLower.split(' ').filter(w => w.length > 5 && !['beach', 'resort', 'villa', 'hotel', 'sanctuary', 'coastal'].includes(w)),
    ];

    const isMatch = keyPhrases.some(kp => kp && lower.includes(kp));
    if (isMatch && !matched.some(m => m.id === venue.id)) {
      matched.push({
        ...venue,
        transit: getVenueTransitDetails(venue),
      });
      if (matched.length >= maxCount) break;
    }
  }

  // Broad destination matching if no specific hotel was matched
  if (matched.length === 0) {
    if (lower.includes('udupi') || lower.includes('malpe') || lower.includes('kaup') || lower.includes('bengre') || lower.includes('maravanthe') || lower.includes('padubidri')) {
      const udupiVenues = PLACES_CATALOG.filter(v => v.destination === 'Udupi').slice(0, 2);
      udupiVenues.forEach(v => matched.push({ ...v, transit: getVenueTransitDetails(v) }));
    } else if (lower.includes('mangalore') || lower.includes('panambur') || lower.includes('tannirbhavi') || lower.includes('someshwara') || lower.includes('surathkal') || lower.includes('sasihithlu')) {
      const mlrVenues = PLACES_CATALOG.filter(v => v.destination === 'Mangalore').slice(0, 2);
      mlrVenues.forEach(v => matched.push({ ...v, transit: getVenueTransitDetails(v) }));
    } else if (lower.includes('goa') || lower.includes('curlies') || lower.includes('solitude')) {
      const goaVenues = PLACES_CATALOG.filter(v => v.destination === 'Goa').slice(0, 2);
      goaVenues.forEach(v => matched.push({ ...v, transit: getVenueTransitDetails(v) }));
    } else if (lower.includes('manali')) {
      const manaliVenues = PLACES_CATALOG.filter(v => v.destination === 'Manali').slice(0, 2);
      manaliVenues.forEach(v => matched.push({ ...v, transit: getVenueTransitDetails(v) }));
    } else if (lower.includes('jaipur')) {
      const jaipurVenues = PLACES_CATALOG.filter(v => v.destination === 'Jaipur').slice(0, 2);
      jaipurVenues.forEach(v => matched.push({ ...v, transit: getVenueTransitDetails(v) }));
    }
  }

  return matched;
}

/**
 * Call OpenRouter API with grounding for TripTandem's catalog
 */
export async function callOpenRouterApi(prompt, conversationHistory = []) {
  const apiKey =
    localStorage.getItem(OPENROUTER_KEY_STORAGE) ||
    import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return null; // Signals fallback to local intelligent engine
  }

  const systemPrompt = `You are TripTandem's AI Travel Concierge. You can answer ANY question asked about trips, itineraries, beaches, dining, hotels, culture, and transit across India (Goa, Karnataka coasts including Udupi, Malpe, Kaup, Mangalore, Panambur, Tannirbhavi, Jaipur, Manali, Kerala, etc.).
Whenever appropriate, recommend properties from TripTandem's catalog (e.g. Paradise Isle Beach Resort Malpe, Blue Lagoon Villa, Kaup Lighthouse Sands, Delta Beach Kodi Bengre, Maravanthe Beach, Padubidri Blue Flag Beach, Panambur Ocean Pearl, Tannirbhavi Pine Cottages, Someshwara Rudra Cliff Villa, Surathkal Lighthouse Retreat, Sasihithlu Surfing Glamping, Villa Solitude Goa, etc.).
Always mention real-time estimated transit options: Uber (Auto, Go, Premier) and local bus routes with exact fares in ₹ INR. Be friendly, energetic, concise, and helpful.`;

  const messagesPayload = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-4).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: prompt }
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://triptandem.vercel.app',
      'X-Title': 'TripTandem Travel AI',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: messagesPayload,
      temperature: 0.7,
      max_tokens: 750,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `OpenRouter returned HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

/**
 * Custom React Hook to share state, streaming status, and execution
 * between GeminiAiBubble (floating window) and AiConciergePage (full page).
 */
export function useAiChat(activeTripId = null) {
  const [messages, setMessages] = useState(getStoredAiMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPlan, setLastPlan] = useState(null);
  const [openRouterKey, setOpenRouterKeyState] = useState(() => {
    return localStorage.getItem(OPENROUTER_KEY_STORAGE) || '';
  });

  const setOpenRouterKey = (key) => {
    const trimmed = (key || '').trim();
    if (trimmed) {
      localStorage.setItem(OPENROUTER_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(OPENROUTER_KEY_STORAGE);
    }
    setOpenRouterKeyState(trimmed);
  };

  // Sync with localStorage & custom events from other component
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail) {
        setMessages(e.detail);
      } else {
        setMessages(getStoredAiMessages());
      }
    };

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setMessages(getStoredAiMessages());
      }
      if (e.key === OPENROUTER_KEY_STORAGE) {
        setOpenRouterKeyState(localStorage.getItem(OPENROUTER_KEY_STORAGE) || '');
      }
    };

    window.addEventListener(UPDATE_EVENT, handleUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(UPDATE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const sendMessage = useCallback(async (text, destinationHint = '') => {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const current = getStoredAiMessages();
    const updatedWithUser = [...current, userMsg];
    saveAiMessages(updatedWithUser);
    setIsLoading(true);

    let replyText = '';
    let suggestions = [];
    let itineraryPlan = null;
    let isFromOpenRouter = false;

    // 1. Try OpenRouter API first if configured
    try {
      const openRouterReply = await callOpenRouterApi(trimmed, current);
      if (openRouterReply) {
        replyText = openRouterReply;
        isFromOpenRouter = true;
      }
    } catch (openRouterErr) {
      console.warn('OpenRouter call error, falling back to local travel AI:', openRouterErr);
    }

    // 2. If OpenRouter was not used or failed, use grounded concierge
    if (!replyText) {
      try {
        const destTarget = destinationHint || (
          trimmed.includes('Udupi') || trimmed.includes('Malpe') || trimmed.includes('Kaup') ? 'Udupi' :
          trimmed.includes('Mangalore') || trimmed.includes('Panambur') ? 'Mangalore' :
          trimmed.includes('Goa') ? 'Goa' :
          trimmed.includes('Manali') ? 'Manali' :
          trimmed.includes('Jaipur') ? 'Jaipur' :
          trimmed.includes('Kerala') ? 'Kerala' : 'Udupi'
        );

        const result = await api.queryAiConcierge(trimmed, activeTripId, 4, 25000);
        replyText = result.assistantReply || result.reply || `Here is custom travel guidance for ${destTarget}!`;
        suggestions = result.suggestions || [];
        itineraryPlan = result.itineraryPlan || null;
      } catch (err) {
        console.warn('AI Concierge fallback error:', err);
        replyText = `I've analyzed your travel inquiry for ${destinationHint || 'your destination'}. I recommend locking in verified beachfront properties with confirmed direct beach gates and scheduling travel during cooler morning and golden hours to beat coastal humidity.`;
      }
    }

    // 3. Match recognized venues from our catalog to show Direct Action Buttons + Uber & Bus Transit
    const matchedVenues = matchVenuesFromText(trimmed + ' ' + replyText, 3);

    const assistantMsg = {
      id: `asst-${Date.now()}`,
      sender: 'assistant',
      text: replyText,
      suggestions: suggestions || [],
      itineraryPlan: itineraryPlan || null,
      matchedVenues: matchedVenues || [],
      isOpenRouter: isFromOpenRouter,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const finalMessages = [...updatedWithUser, assistantMsg];
    saveAiMessages(finalMessages);

    if (itineraryPlan) {
      setLastPlan({ itineraryPlan });
    }

    setIsLoading(false);
    return assistantMsg;
  }, [activeTripId]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearHistory: clearAiChatHistory,
    lastPlan,
    openRouterKey,
    setOpenRouterKey,
  };
}
