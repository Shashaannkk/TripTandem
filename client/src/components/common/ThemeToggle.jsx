import React, { useState, useEffect } from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';

export const ThemeToggle = ({ compact = false, className = '' }) => {
  // Direct 2-state toggle: 'light' | 'dark'
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('tt_theme');
    if (saved) {
      return saved === 'dark' || saved === 'sunset';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('tt_theme', 'dark');
    } else {
      root.classList.remove('dark', 'theme-sunset');
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('tt_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        title={isDark ? 'Dark Mode Active · Click for Light Mode ☀️' : 'Light Mode Active · Click for Dark Mode 🌙'}
        className={`group relative flex items-center justify-between rounded-full border transition-all duration-300 shadow-subtle hover:shadow-card active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 ${
          compact
            ? 'w-14 h-7 p-0.5'
            : 'w-16 h-8 p-1'
        } ${
          isDark
            ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/40'
            : 'bg-gradient-to-r from-amber-100/90 via-orange-50 to-amber-100/90 border-amber-300/70'
        }`}
      >
        {/* Background icon hints */}
        <div className="absolute inset-x-1.5 flex items-center justify-between pointer-events-none px-0.5 text-xs">
          <Sun className={`w-3.5 h-3.5 transition-opacity duration-300 ${isDark ? 'opacity-30 text-amber-300' : 'opacity-0'}`} />
          <Moon className={`w-3.5 h-3.5 transition-opacity duration-300 ${!isDark ? 'opacity-30 text-indigo-400' : 'opacity-0'}`} />
        </div>

        {/* Sliding Thumb Knob with Animated Icon */}
        <span
          className={`flex items-center justify-center rounded-full shadow-md transition-all duration-300 transform ${
            compact ? 'w-6 h-6' : 'w-6 h-6'
          } ${
            isDark
              ? 'translate-x-7 sm:translate-x-8 bg-indigo-900 text-yellow-300 border border-indigo-400/50'
              : 'translate-x-0 bg-white text-amber-500 border border-amber-200'
          }`}
        >
          {isDark ? (
            <div className="relative flex items-center justify-center">
              <Moon className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300 transition-transform group-hover:-rotate-12" />
              <Sparkles className="w-2 h-2 text-yellow-200 absolute -top-1 -right-1 animate-pulse" />
            </div>
          ) : (
            <Sun className="w-3.5 h-3.5 fill-amber-400 text-amber-500 transition-transform group-hover:rotate-45" />
          )}
        </span>
      </button>

      {/* Optional mode text for accessibility */}
      {!compact && (
        <span className="sr-only">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </div>
  );
};

export default ThemeToggle;
