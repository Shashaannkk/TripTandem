// Unified TripTandem AI Chat & Concierge Service
// Implements an ultra-fast multi-model cascade with automatic fallbacks:
// 1. Google Gemini 2.0 Flash (Fastest, ~200ms latency)
// 2. OpenAI GPT-4o Mini (Ultra-fast, ~350ms latency)
// 3. OpenRouter Aggregator (Multi-model router)
// 4. TripTandem Grounded Local Travel Engine (Zero-key 100% guaranteed fallback)

import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { PLACES_CATALOG } from '../data/placesCatalog';
import { getVenueTransitDetails } from '../utils/transitHelper';

const STORAGE_KEY = 'tt_ai_messages';
const UPDATE_EVENT = 'tt_ai_chat_updated';

// Local storage keys for custom user-provided API keys
export const AI_STORAGE_KEYS = {
  GEMINI: 'tt_gemini_key',
  OPENAI: 'tt_openai_key',
  OPENROUTER: 'tt_openrouter_key',
  PREF_PROVIDER: 'tt_preferred_ai_provider', // 'auto' | 'gemini' | 'openai' | 'openrouter' | 'grounded'
};

const CALL_TIMEOUT_MS = 8500; // 8.5s timeout per cloud model before cascading

const SYSTEM_PROMPT = `You are TripTandem's AI Travel Concierge. You provide ultra-fast, dynamic, and engaging travel recommendations across India (Goa, Karnataka coasts including Udupi, Malpe, Kaup, Mangalore, Panambur, Tannirbhavi, Manali, Jaipur, Kerala, etc.) and worldwide.
When answering, prioritize:
1. Vibrant, concise guidance with estimated costs in INR (₹).
2. Recommend verified beachfront stays, heritage spots, cafes, and scenic vistas.
3. Always mention real-time estimated transit: Uber (Auto, Go, Premier) and local bus routes with expected fares in ₹ INR.
4. Keep replies snappy, friendly, and well-structured with clear bullet points or day-by-day plans when asked for itineraries.`;

const DEFAULT_MESSAGES = [
  {
    id: 'init-1',
    sender: 'assistant',
    text: `Hello! I am your 3D AI travel buddy. I can answer any travel questions, plan multi-day itineraries, book beachfront stays in Udupi & Mangalore, and calculate real-time Uber and bus transit fares! Tell me what's on your mind! 🌴🌊`,
    timestamp: 'Just now',
    suggestions: [],
    itineraryPlan: null,
    matchedVenues: [],
    providerUsed: 'TripTandem Grounded Engine',
  }
];

// Helper to fetch keys with fallback from env
export function getAiKeys() {
  const gemini =
    (typeof localStorage !== 'undefined' && localStorage.getItem(AI_STORAGE_KEYS.GEMINI)) ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    '';

  const openai =
    (typeof localStorage !== 'undefined' && localStorage.getItem(AI_STORAGE_KEYS.OPENAI)) ||
    import.meta.env.VITE_OPENAI_API_KEY ||
    '';

  const openrouter =
    (typeof localStorage !== 'undefined' && localStorage.getItem(AI_STORAGE_KEYS.OPENROUTER)) ||
    import.meta.env.VITE_OPENROUTER_API_KEY ||
    '';

  const preferred =
    (typeof localStorage !== 'undefined' && localStorage.getItem(AI_STORAGE_KEYS.PREF_PROVIDER)) ||
    'auto';

  return {
    geminiKey: gemini.trim(),
    openAiKey: openai.trim(),
    openRouterKey: openrouter.trim(),
    preferredProvider: preferred,
  };
}

export function saveAiKeys({ geminiKey, openAiKey, openRouterKey, preferredProvider }) {
  if (typeof localStorage === 'undefined') return;

  if (geminiKey !== undefined) {
    if (geminiKey.trim()) localStorage.setItem(AI_STORAGE_KEYS.GEMINI, geminiKey.trim());
    else localStorage.removeItem(AI_STORAGE_KEYS.GEMINI);
  }
  if (openAiKey !== undefined) {
    if (openAiKey.trim()) localStorage.setItem(AI_STORAGE_KEYS.OPENAI, openAiKey.trim());
    else localStorage.removeItem(AI_STORAGE_KEYS.OPENAI);
  }
  if (openRouterKey !== undefined) {
    if (openRouterKey.trim()) localStorage.setItem(AI_STORAGE_KEYS.OPENROUTER, openRouterKey.trim());
    else localStorage.removeItem(AI_STORAGE_KEYS.OPENROUTER);
  }
  if (preferredProvider !== undefined) {
    localStorage.setItem(AI_STORAGE_KEYS.PREF_PROVIDER, preferredProvider);
  }

  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: null }));
}

/**
 * Smart Universal Key Auto-Detector
 * Detects whether a key belongs to OpenAI, Gemini, or OpenRouter
 */
export function detectKeyType(rawKey) {
  const key = (rawKey || '').trim();
  if (!key) return null;
  if (key.startsWith('AIzaSy') || key.startsWith('AIza')) return 'gemini';
  if (key.startsWith('sk-or-')) return 'openrouter';
  if (key.startsWith('sk-proj-') || key.startsWith('sk-')) return 'openai';
  return 'unknown';
}

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

    const keyPhrases = [
      vNameLower,
      vRegionLower,
      ...vNameLower.split(' ').filter(w => w.length > 5 && !['beach', 'resort', 'villa', 'hotel', 'sanctuary', 'coastal'].includes(w)),
    ];

    const isMatch = keyPhrases.some(kp => kp && lower.includes(kp));
    if (isMatch && !matched.some(m => m.id === venue.id)) {
      const validImage = venue.coverImage || venue.image || (venue.images && venue.images[0]) || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80';
      matched.push({
        ...venue,
        image: validImage,
        coverImage: validImage,
        transit: getVenueTransitDetails(venue),
      });
      if (matched.length >= maxCount) break;
    }
  }

  const formatVenue = (v) => {
    const validImage = v.coverImage || v.image || (v.images && v.images[0]) || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80';
    return {
      ...v,
      image: validImage,
      coverImage: validImage,
      transit: getVenueTransitDetails(v),
    };
  };

  // Broad destination matching if no specific hotel was matched
  if (matched.length === 0) {
    if (lower.includes('udupi') || lower.includes('malpe') || lower.includes('kaup') || lower.includes('bengre') || lower.includes('maravanthe') || lower.includes('padubidri')) {
      const udupiVenues = PLACES_CATALOG.filter(v => v.destination === 'Udupi').slice(0, 2);
      udupiVenues.forEach(v => matched.push(formatVenue(v)));
    } else if (lower.includes('mangalore') || lower.includes('panambur') || lower.includes('tannirbhavi') || lower.includes('someshwara') || lower.includes('surathkal') || lower.includes('sasihithlu')) {
      const mlrVenues = PLACES_CATALOG.filter(v => v.destination === 'Mangalore').slice(0, 2);
      mlrVenues.forEach(v => matched.push(formatVenue(v)));
    } else if (lower.includes('goa') || lower.includes('curlies') || lower.includes('solitude')) {
      const goaVenues = PLACES_CATALOG.filter(v => v.destination === 'Goa').slice(0, 2);
      goaVenues.forEach(v => matched.push(formatVenue(v)));
    } else if (lower.includes('manali')) {
      const manaliVenues = PLACES_CATALOG.filter(v => v.destination === 'Manali').slice(0, 2);
      manaliVenues.forEach(v => matched.push(formatVenue(v)));
    } else if (lower.includes('jaipur')) {
      const jaipurVenues = PLACES_CATALOG.filter(v => v.destination === 'Jaipur').slice(0, 2);
      jaipurVenues.forEach(v => matched.push(formatVenue(v)));
    }
  }

  return matched;
}

// -----------------------------------------------------------------------------
// 1. Google Gemini 2.0 Flash Direct Caller (Ultra-Fast ~200ms)
// -----------------------------------------------------------------------------
async function callGeminiDirectApi(prompt, conversationHistory = [], key) {
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  try {
    const contents = [
      ...conversationHistory.slice(-4).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      })),
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    // Try Gemini 2.0 Flash first, fallback to gemini-1.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        }
      })
    });

    clearTimeout(timer);

    if (!response.ok) {
      // If 2.0-flash is unavailable for this key, attempt 1.5-flash
      if (response.status === 404) {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`;
        const fbRes = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 800 } })
        });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          return fbData.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
      }
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    clearTimeout(timer);
    console.warn('Gemini Flash call failed, falling back:', err.message);
    return null;
  }
}

// -----------------------------------------------------------------------------
// 2. OpenAI GPT-4o Mini Direct Caller (~350ms)
// -----------------------------------------------------------------------------
async function callOpenAiDirectApi(prompt, conversationHistory = [], key) {
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  try {
    const messagesPayload = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-4).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      })),
      { role: 'user', content: prompt }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messagesPayload,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `OpenAI HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    clearTimeout(timer);
    console.warn('OpenAI GPT-4o-mini call failed, falling back:', err.message);
    return null;
  }
}

// -----------------------------------------------------------------------------
// 3. OpenRouter Aggregator Caller (Multi-Model Router)
// -----------------------------------------------------------------------------
async function callOpenRouterApi(prompt, conversationHistory = [], key) {
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  try {
    const messagesPayload = [
      { role: 'system', content: SYSTEM_PROMPT },
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
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://triptandem.vercel.app',
        'X-Title': 'TripTandem Travel AI',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        models: [
          'google/gemini-2.0-flash-001',
          'openai/gpt-4o-mini',
          'meta-llama/llama-3.3-70b-instruct'
        ],
        messages: messagesPayload,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `OpenRouter HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    clearTimeout(timer);
    console.warn('OpenRouter call failed, falling back:', err.message);
    return null;
  }
}

/**
 * Multi-Model Fast Cascade Runner:
 * 1. Executes preferred provider if explicitly locked.
 * 2. In 'auto' mode: cascades in order of fastest response speed:
 *    Gemini 2.0 Flash (~200ms) ➔ OpenAI GPT-4o Mini (~350ms) ➔ OpenRouter Multi-Model ➔ Grounded Engine.
 */
export async function callFastestAiCascade(prompt, conversationHistory = []) {
  const { geminiKey, openAiKey, openRouterKey, preferredProvider } = getAiKeys();

  // If user explicitly pinned a specific provider, try that first
  if (preferredProvider === 'gemini' && geminiKey) {
    const res = await callGeminiDirectApi(prompt, conversationHistory, geminiKey);
    if (res) return { text: res, provider: 'Google Gemini 2.0 Flash' };
  } else if (preferredProvider === 'openai' && openAiKey) {
    const res = await callOpenAiDirectApi(prompt, conversationHistory, openAiKey);
    if (res) return { text: res, provider: 'OpenAI GPT-4o Mini' };
  } else if (preferredProvider === 'openrouter' && openRouterKey) {
    const res = await callOpenRouterApi(prompt, conversationHistory, openRouterKey);
    if (res) return { text: res, provider: 'OpenRouter Multi-Model' };
  }

  // --- Automatic Cascade Hierarchy (Fastest to Lowest Latency) ---

  // Tier 1: Google Gemini 2.0 Flash (Fastest reply)
  if (geminiKey) {
    const res = await callGeminiDirectApi(prompt, conversationHistory, geminiKey);
    if (res) return { text: res, provider: 'Google Gemini 2.0 Flash' };
  }

  // Tier 2: OpenAI GPT-4o Mini (Ultra-fast, reliable)
  if (openAiKey) {
    const res = await callOpenAiDirectApi(prompt, conversationHistory, openAiKey);
    if (res) return { text: res, provider: 'OpenAI GPT-4o Mini' };
  }

  // Tier 3: OpenRouter (Aggregated router with fallback models)
  if (openRouterKey) {
    const res = await callOpenRouterApi(prompt, conversationHistory, openRouterKey);
    if (res) return { text: res, provider: 'OpenRouter Multi-Model' };
  }

  // Tier 4: Secure Backend AI Proxy (Uses server-side keys without exposing secrets to client browser)
  try {
    const serverResult = await api.chatWithAi(prompt, conversationHistory);
    if (serverResult && serverResult.text) {
      return { text: serverResult.text, provider: serverResult.provider || 'Secure Server AI' };
    }
  } catch (e) {
    // Continue to Local Grounded Engine
  }

  // Tier 5: Signals fallback to Local Grounded Engine
  return null;
}

/**
 * Custom React Hook to share state, streaming status, and multi-model execution
 * across GeminiAiBubble, AiConciergePage, and AiConciergeDrawer.
 */
export function useAiChat(activeTripId = null) {
  const [messages, setMessages] = useState(getStoredAiMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPlan, setLastPlan] = useState(null);
  const [aiKeys, setAiKeysState] = useState(getAiKeys);

  const updateAiKeys = (newKeys) => {
    saveAiKeys(newKeys);
    setAiKeysState(getAiKeys());
  };

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail) {
        setMessages(e.detail);
      } else {
        setMessages(getStoredAiMessages());
        setAiKeysState(getAiKeys());
      }
    };

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) setMessages(getStoredAiMessages());
      if (Object.values(AI_STORAGE_KEYS).includes(e.key)) setAiKeysState(getAiKeys());
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
    let providerUsed = 'TripTandem Grounded Engine';

    // 1. Run through the multi-model fastest fallback cascade
    try {
      const cascadeResult = await callFastestAiCascade(trimmed, current);
      if (cascadeResult && cascadeResult.text) {
        replyText = cascadeResult.text;
        providerUsed = cascadeResult.provider;
      }
    } catch (cascadeErr) {
      console.warn('AI Cascade encountered error, activating local grounded engine:', cascadeErr);
    }

    // 2. If no cloud model responded, execute the Local Grounded Engine
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
        providerUsed = 'TripTandem Grounded Engine';
      } catch (err) {
        console.warn('AI Concierge fallback error:', err);
        replyText = `I've analyzed your travel inquiry for ${destinationHint || 'your destination'}. I recommend locking in verified beachfront properties with confirmed direct beach access and scheduling travel during cooler morning and golden hours to beat coastal humidity.`;
        providerUsed = 'TripTandem Grounded Engine';
      }
    }

    // 3. Ground against catalog to show Direct Action Buttons + Uber & Bus Transit
    const matchedVenues = matchVenuesFromText(trimmed + ' ' + replyText, 3);

    const assistantMsg = {
      id: `asst-${Date.now()}`,
      sender: 'assistant',
      text: replyText,
      suggestions: suggestions || [],
      itineraryPlan: itineraryPlan || null,
      matchedVenues: matchedVenues || [],
      providerUsed,
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
    aiKeys,
    setAiKeys: updateAiKeys,
    // Backwards compatibility for existing components
    openRouterKey: aiKeys.openRouterKey,
    setOpenRouterKey: (key) => updateAiKeys({ openRouterKey: key }),
  };
}
