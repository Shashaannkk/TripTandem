// Unified TripTandem AI Chat & Concierge Service
// Synchronizes conversation history across both the Floating 3D AI Bubble and the dedicated /ai-concierge page.
import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

const STORAGE_KEY = 'tt_ai_messages';
const UPDATE_EVENT = 'tt_ai_chat_updated';

const DEFAULT_MESSAGES = [
  {
    id: 'init-1',
    sender: 'assistant',
    text: `Hello! I am your 3D AI travel buddy. I design harmonious group itineraries that connect verified hotels, dining, and scenic activities while strictly respecting your budget ceiling. Tell me what trip you have in mind! 👋`,
    timestamp: 'Just now',
    suggestions: [],
    itineraryPlan: null,
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
 * Custom React Hook to share state, streaming status, and execution
 * between GeminiAiBubble (floating window) and AiConciergePage (full page).
 */
export function useAiChat(activeTripId = null) {
  const [messages, setMessages] = useState(getStoredAiMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPlan, setLastPlan] = useState(null);

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

    try {
      const destTarget = destinationHint || (
        trimmed.includes('Goa') ? 'Goa' :
        trimmed.includes('Manali') ? 'Manali' :
        trimmed.includes('Jaipur') ? 'Jaipur' :
        trimmed.includes('Kerala') ? 'Kerala' :
        trimmed.includes('Udaipur') ? 'Udaipur' :
        trimmed.includes('Varanasi') ? 'Varanasi' : 'Goa'
      );

      const result = await api.queryAiConcierge(trimmed, activeTripId, 4, 25000);

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: result.assistantReply || result.reply || `Here is a custom plan tailored for ${destTarget}!`,
        suggestions: result.suggestions || [],
        itineraryPlan: result.itineraryPlan || null,
        destination: result.destination || destTarget,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...updatedWithUser, assistantMsg];
      saveAiMessages(finalMessages);

      if (result.itineraryPlan) {
        setLastPlan(result);
      }

      return assistantMsg;
    } catch (err) {
      console.warn('AI Concierge error, providing resilient fallback:', err);
      const fallbackMsg = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: `I've analyzed your request for ${destinationHint || 'your trip'}. I recommend locking in verified properties with breakfast included and scheduling your evening activities around the sunset hours to avoid peak transit congestion.`,
        suggestions: [],
        itineraryPlan: null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const finalMessages = [...updatedWithUser, fallbackMsg];
      saveAiMessages(finalMessages);
      return fallbackMsg;
    } finally {
      setIsLoading(false);
    }
  }, [activeTripId]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearHistory: clearAiChatHistory,
    lastPlan,
  };
}
