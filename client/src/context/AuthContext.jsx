import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { USERS } from '../data/mockData';
import { api } from '../services/api';

const AuthContext = createContext();

export const DEFAULT_GOOGLE_CLIENT_ID = '959503524738-v2jhe3897fq2q7f5q7ilf3t7rp3ho1jq.apps.googleusercontent.com';

export const AuthProvider = ({ children }) => {
  // Session persistence: check localStorage (remembered) or sessionStorage
  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('tt_token') || sessionStorage.getItem('tt_token') || null;
  });

  const sanitizeUser = (user) => {
    if (!user) return null;
    return {
      ...user,
      id: user.id || `user-${Date.now()}`,
      name: user.name || 'Traveler',
      email: user.email || 'traveler@triptandem.travel',
      role: user.role || 'Explorer',
      avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      color: user.color || '#FF6B45',
      upiId: user.upiId || 'traveler@upi',
      upiQrCode: user.upiQrCode || null,
      phone: user.phone || '+91 98000 00000',
    };
  };

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tt_current_user') || sessionStorage.getItem('tt_current_user');
      return saved ? sanitizeUser(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(
      (localStorage.getItem('tt_token') || sessionStorage.getItem('tt_token')) &&
      (localStorage.getItem('tt_current_user') || sessionStorage.getItem('tt_current_user'))
    );
  });

  const [availableUsers, setAvailableUsers] = useState(USERS);
  const [currency, setCurrency] = useState('INR'); // 'INR' | 'USD' | 'EUR'
  const [savedFavorites, setSavedFavorites] = useState(() => {
    const saved = localStorage.getItem('tt_favorites');
    return saved ? JSON.parse(saved) : ['v-goa-1', 'v-manali-1'];
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Google OAuth configuration status - pre-configured so pushed production builds never display "Config Pending"
  const [googleConfig, setGoogleConfig] = useState({
    configured: true,
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
  });

  // Check backend Google OAuth config on mount
  useEffect(() => {
    api.getGoogleConfig()
      .then((cfg) => {
        const resolvedId = cfg?.clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
        setGoogleConfig({
          configured: true,
          clientId: resolvedId,
        });
      })
      .catch(() => {
        setGoogleConfig({
          configured: true,
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
        });
      });
  }, []);

  useEffect(() => {
    localStorage.setItem('tt_favorites', JSON.stringify(savedFavorites));
  }, [savedFavorites]);

  // Synchronize authentication changes (e.g., login/logout) across browser tabs
  useEffect(() => {
    const handleAuthStorageChange = (e) => {
      if (e.key === 'tt_current_user') {
        if (!e.newValue) {
          setCurrentUser(null);
          setAuthToken(null);
          setIsAuthenticated(false);
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            setCurrentUser(sanitizeUser(parsed));
            setIsAuthenticated(true);
          } catch {}
        }
      }
    };

    window.addEventListener('storage', handleAuthStorageChange);
    return () => window.removeEventListener('storage', handleAuthStorageChange);
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    setToastMessage({ message, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Save user session
  const saveSession = (user, token, rememberMe = true) => {
    const safeUser = sanitizeUser(user);
    setCurrentUser(safeUser);
    setAuthToken(token);
    setIsAuthenticated(true);

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('tt_current_user', JSON.stringify(safeUser));
    if (token) storage.setItem('tt_token', token);

    // Clean up alternative storage to prevent stale sessions
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    otherStorage.removeItem('tt_current_user');
    otherStorage.removeItem('tt_token');
  };

  // 1. Standard Email/Password Login
  const login = async ({ email, password, rememberMe = true }) => {
    try {
      const res = await api.login({ email, password });
      saveSession(res.data, res.token, rememberMe);
      showToast(`Welcome back, ${res.data.name}!`, 'success');
      return res.data;
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
      throw err;
    }
  };

  // 2. Account Registration with full safety & UPI settlement details
  const signup = async (signupData) => {
    const { rememberMe = true, ...rest } = signupData;
    try {
      const res = await api.signup(rest);
      saveSession(res.data, res.token, rememberMe);
      // Also add newly created user to availableUsers so they can be switched to immediately!
      setAvailableUsers(prev => {
        const exists = prev.some(u => u.id === res.data.id || u.email === res.data.email);
        return exists ? prev : [res.data, ...prev];
      });
      showToast(`Welcome to TripTandem, ${res.data.name}!`, 'success');
      return res.data;
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
      throw err;
    }
  };

  // 2b. Update User Profile (Safety, Emergency, UPI QR)
  const updateProfile = async (updates) => {
    try {
      const res = await api.updateProfile({ userId: currentUser?.id, ...updates });
      const updatedUser = sanitizeUser({ ...currentUser, ...res.data });
      setCurrentUser(updatedUser);
      localStorage.setItem('tt_current_user', JSON.stringify(updatedUser));
      showToast('Profile & safety details updated', 'success');
      return updatedUser;
    } catch (err) {
      // Local optimistic update
      const updatedUser = sanitizeUser({ ...currentUser, ...updates });
      setCurrentUser(updatedUser);
      localStorage.setItem('tt_current_user', JSON.stringify(updatedUser));
      showToast('Profile updated locally', 'success');
      return updatedUser;
    }
  };

  // 3. Google OAuth Login
  const loginWithGoogle = async ({ credential, rememberMe = true }) => {
    try {
      const res = await api.loginWithGoogle({ credential });
      saveSession(res.data, res.token, rememberMe);
      showToast(`Signed in with Google as ${res.data.name}!`, 'success');
      return res.data;
    } catch (err) {
      showToast(err.message || 'Google sign-in failed', 'error');
      throw err;
    }
  };

  // 4. Logout
  const logout = () => {
    localStorage.removeItem('tt_token');
    localStorage.removeItem('tt_current_user');
    sessionStorage.removeItem('tt_token');
    sessionStorage.removeItem('tt_current_user');

    setAuthToken(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
    showToast('You have been signed out.', 'info');
  };

  // 4b. 1-Click Demo Traveler Login
  const loginAsDemo = (userIndex = 0) => {
    const demoUser = USERS[userIndex] || USERS[0];
    saveSession(demoUser, `demo-token-${demoUser.id}`, true);
    showToast(`Signed in as demo traveler ${demoUser.name}!`, 'success');
    return demoUser;
  };

  // 5. Switch Persona (Interactive Demo feature)
  const switchPersona = async (userId) => {
    const user = availableUsers.find((u) => u.id === userId);
    if (user) {
      try {
        const res = await api.switchPersona(userId);
        saveSession(res.data || user, res.token || `demo-token-${user.id}`, true);
      } catch (e) {
        saveSession(user, `demo-token-${user.id}`, true);
      }
      showToast(`Switched persona to ${user.name} (${user.role})`, 'success');
    }
  };

  // 6. Wishlist toggle
  const toggleFavorite = (venueId) => {
    setSavedFavorites((prev) => {
      const exists = prev.includes(venueId);
      const next = exists ? prev.filter((id) => id !== venueId) : [...prev, venueId];
      showToast(exists ? 'Removed from saved wishlist' : 'Saved to wishlist ❤️', 'info');
      return next;
    });
  };

  // 7. Currency formatter (Resilient against null, undefined, or NaN)
  const formatPrice = (amount) => {
    if (amount === null || amount === undefined || isNaN(Number(amount))) {
      return 'Indicative';
    }
    const num = Number(amount);
    if (currency === 'USD') {
      return `$${Math.round(num / 83).toLocaleString('en-US')}`;
    } else if (currency === 'EUR') {
      return `€${Math.round(num / 90).toLocaleString('de-DE')}`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authToken,
        isAuthenticated,
        availableUsers,
        login,
        signup,
        updateProfile,
        loginWithGoogle,
        logout,
        loginAsDemo,
        googleConfig,
        switchPersona,
        currency,
        setCurrency,
        formatPrice,
        savedFavorites,
        toggleFavorite,
        isAuthModalOpen,
        setIsAuthModalOpen,
        showToast,
        toastMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
