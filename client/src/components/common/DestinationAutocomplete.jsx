import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Sparkles, Building, Compass, X, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export const DestinationAutocomplete = ({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Goa, Manali, Jaipur...',
  className = '',
  inputClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch suggestions with debounce
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await api.getAutocomplete(value);
        if (!isCancelled) {
          setSuggestions(results || []);
        }
      } catch (err) {
        if (!isCancelled) setSuggestions([]);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }, 180);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    const selectedName = item.name;
    if (onChange) onChange(selectedName);
    if (onSelect) onSelect(item);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      } else if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'venue':
        return <Building className="w-4 h-4 text-brand-teal" />;
      case 'popular_destination':
      case 'destination':
        return <Sparkles className="w-4 h-4 text-brand-orange" />;
      case 'geo_location':
        return <MapPin className="w-4 h-4 text-brand-orange" />;
      default:
        return <Compass className="w-4 h-4 text-brand-orange" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input Field with Clear & Status */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            if (onChange) onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full text-sm font-semibold text-brand-navy placeholder:text-brand-navy/40 focus:outline-none bg-transparent pr-7 ${inputClassName}`}
        />

        {/* Clear or Loading Icon */}
        <div className="absolute right-0 flex items-center pr-1 pointer-events-auto">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-brand-orange animate-spin" />
          ) : value ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onChange) onChange('');
                inputRef.current?.focus();
              }}
              className="text-brand-navy/40 hover:text-brand-navy transition-colors p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Floating Suggestions Dropdown (Positioned on the Upper Side) */}
      {isOpen && (
        <div className="absolute left-0 right-0 bottom-full mb-2.5 z-50 bg-white/98 backdrop-blur-xl rounded-2xl shadow-floating border border-brand-sand-border overflow-hidden animate-fadeIn text-left">
          {/* Header pill */}
          <div className="px-4 py-2 border-b border-brand-sand-border/60 bg-brand-sand/50 flex items-center justify-between text-[11px] font-semibold text-brand-navy/60">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <Sparkles className="w-3 h-3 text-brand-orange" />
              {value ? 'Suggested Places' : 'Popular in India'}
            </span>
            <span className="text-[10px] text-brand-navy/40">Use ↑↓ & Enter</span>
          </div>

          {/* List items */}
          <div className="max-h-64 overflow-y-auto divide-y divide-brand-sand-border/40 py-1">
            {suggestions.length === 0 ? (
              <div className="px-4 py-5 text-center text-xs text-brand-navy/60">
                <p className="font-semibold text-brand-navy">No matching places found</p>
                <p className="text-[11px] text-brand-navy/50 mt-1">
                  Try searching for Goa, Manali, Jaipur, Kerala, or any Indian city.
                </p>
              </div>
            ) : (
              suggestions.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={item.id || idx}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handleSelect(item)}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors text-left ${
                      isActive
                        ? 'bg-brand-sand text-brand-navy'
                        : 'hover:bg-brand-sand/60 text-brand-navy'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white border border-brand-sand-border shadow-subtle shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-brand-navy truncate">
                          {item.name}
                        </span>
                        {item.type === 'venue' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-brand-teal/10 text-brand-teal uppercase">
                            Stay
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-brand-navy/60 truncate mt-0.5">
                        {item.subtext || (item.state ? `${item.state}, India` : 'India')}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
