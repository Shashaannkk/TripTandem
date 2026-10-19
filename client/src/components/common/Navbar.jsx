import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../../assets/Logo';
import { useAuth } from '../../context/AuthContext';
import { useTrip } from '../../context/TripContext';
import { 
  Compass, 
  Bed, 
  MapPin, 
  Calendar, 
  Sparkles, 
  Plus, 
  Menu, 
  X, 
  ChevronDown, 
  UserCheck,
  Coins,
  ArrowRight,
  Flame,
  User,
  Luggage,
  ShieldCheck,
  LogOut,
  Users,
  LogIn
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { GoogleGeminiIcon } from '../home/GeminiAiBubble';
import { JoinTripModal } from '../trip/JoinTripModal';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, currency, setCurrency, isAuthenticated, logout } = useAuth();
  const { setIsAiConciergeOpen, setIsJoinModalOpen } = useTrip();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Null-safe user details to prevent runtime exceptions post-login
  const userName = currentUser?.name || 'Traveler';
  const userFirstName = (userName.split(' ')[0]) || 'Traveler';
  const userRole = currentUser?.role || 'Explorer';
  const userAvatar = currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const userEmail = currentUser?.email || 'traveler@triptandem.travel';

  // Precise active state matching for route and type query params
  const isNavActive = (key) => {
    const path = location.pathname;
    const search = location.search;

    if (key === 'explore') {
      return path === '/explore' && (!search || search.includes('type=all') || (!search.includes('type=stay') && !search.includes('type=experience')));
    }
    if (key === 'stay') {
      return path === '/explore' && search.includes('type=stay');
    }
    if (key === 'experience') {
      return path === '/explore' && search.includes('type=experience');
    }
    if (key === 'trips') {
      return path.startsWith('/trips') || path.startsWith('/workspace');
    }
    if (key === 'ai') {
      return path === '/ai-concierge';
    }
    return false;
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-nav bg-brand-sand/90 dark:bg-[#0A111E]/90 backdrop-blur-md border-b border-brand-sand-border/80 dark:border-[#1E2D42] transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2 xl:gap-4 w-full">
          
          {/* 1. Brand Logo */}
          <Link to="/" className="flex items-center group shrink-0 focus:outline-none">
            <Logo size={36} dark={false} showTagline={false} />
          </Link>

          {/* 2. Desktop Navigation Bar: Explore, Stays, Experiences, My Trips, AI Concierge */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 bg-white/80 dark:bg-[#111C2E]/80 py-1.5 px-2 xl:px-3 rounded-full border border-brand-sand-border/70 dark:border-[#1E2D42] shadow-subtle shrink-0">
            {/* Explore */}
            <Link
              to="/explore"
              className={`px-2.5 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-semibold transition-all whitespace-nowrap ${
                isNavActive('explore')
                  ? 'bg-brand-navy dark:bg-white text-white dark:text-brand-navy shadow-sm'
                  : 'text-brand-navy/80 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-brand-sand/70 dark:hover:bg-slate-800'
              }`}
            >
              Explore
            </Link>

            {/* Stays */}
            <Link
              to="/explore?type=stay"
              className={`px-2.5 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-semibold transition-all whitespace-nowrap ${
                isNavActive('stay')
                  ? 'bg-brand-navy dark:bg-white text-white dark:text-brand-navy shadow-sm'
                  : 'text-brand-navy/80 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-brand-sand/70 dark:hover:bg-slate-800'
              }`}
            >
              Stays
            </Link>

            {/* Experiences / My Experiences */}
            <Link
              to="/explore?type=experience"
              className={`px-2.5 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-semibold transition-all whitespace-nowrap ${
                isNavActive('experience')
                  ? 'bg-brand-navy dark:bg-white text-white dark:text-brand-navy shadow-sm'
                  : 'text-brand-navy/80 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-brand-sand/70 dark:hover:bg-slate-800'
              }`}
            >
              Experiences
            </Link>

            {/* My Trips */}
            <Link
              to="/trips"
              className={`px-2.5 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isNavActive('trips')
                  ? 'bg-brand-navy dark:bg-white text-white dark:text-brand-navy shadow-sm'
                  : 'text-brand-navy/80 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white hover:bg-brand-sand/70 dark:hover:bg-slate-800'
              }`}
            >
              <span>My Trips</span>
              <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
            </Link>

            {/* AI Concierge with Gemini Icon */}
            <Link
              to="/ai-concierge"
              className={`px-2.5 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isNavActive('ai')
                  ? 'bg-brand-navy dark:bg-white text-white dark:text-brand-navy shadow-sm'
                  : 'text-brand-navy/90 dark:text-slate-200 hover:text-brand-orange hover:bg-brand-orange-light/50 dark:hover:bg-slate-800'
              }`}
            >
              <GoogleGeminiIcon size={16} />
              <span>AI Concierge</span>
            </Link>
          </nav>

          {/* 3. Desktop Single-Line Right Actions */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
            
            {/* Celestial Theme Toggle: Sun / Moon */}
            <ThemeToggle compact={true} />

            {/* Currency Selector */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCurrencyMenuOpen(!isCurrencyMenuOpen);
                  setIsPersonaMenuOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#111C2E] border border-brand-sand-border dark:border-[#1E2D42] text-brand-navy dark:text-slate-200 hover:border-brand-navy/40 transition-colors flex items-center gap-1 shadow-subtle shrink-0"
              >
                <Coins className="w-3.5 h-3.5 text-brand-teal" />
                <span>{currency}</span>
                <ChevronDown className="w-3 h-3 text-brand-navy/60 dark:text-slate-400" />
              </button>

              {isCurrencyMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-[#111C2E] rounded-2xl shadow-card border border-brand-sand-border dark:border-[#1E2D42] py-1.5 z-50">
                  {['INR', 'USD', 'EUR'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCurrency(c);
                        setIsCurrencyMenuOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-brand-sand dark:hover:bg-slate-800 ${
                        currency === c ? 'text-brand-orange font-semibold bg-brand-orange-light/30 dark:bg-orange-950/30' : 'text-brand-navy dark:text-slate-200'
                      }`}
                    >
                      <span>{c === 'INR' ? '₹ INR (India)' : c === 'USD' ? '$ USD (USA)' : '€ EUR (Europe)'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* If Logged In: Show Profile Menu & Details. If Logged Out: Show Single Log In Button (No demo ID Alex!) */}
            {isAuthenticated && currentUser ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(!isProfileMenuOpen);
                    setIsCurrencyMenuOpen(false);
                  }}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-white dark:bg-[#111C2E] border border-brand-sand-border dark:border-[#1E2D42] hover:border-brand-teal/50 transition-all shadow-subtle group shrink-0"
                  title={`Account: ${userName}`}
                >
                  <div className="relative">
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="w-6 h-6 rounded-full object-cover ring-2 ring-brand-teal"
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-brand-navy dark:text-slate-200 leading-tight flex items-center gap-1">
                      <span>{userFirstName}</span>
                      <span className="hidden xl:inline text-[9px] text-brand-teal font-medium bg-brand-teal-light dark:bg-teal-950/50 px-1 rounded">
                        {userRole}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-brand-navy/50 dark:text-slate-400 group-hover:text-brand-navy transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#111C2E] rounded-3xl shadow-floating border border-brand-sand-border dark:border-[#1E2D42] p-3 z-50 animate-fadeIn">
                    {/* Account Header */}
                    <div className="p-3 rounded-2xl bg-brand-sand/60 dark:bg-slate-800/60 border border-brand-sand-border/80 dark:border-slate-700/60 mb-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={userAvatar}
                          alt={userName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-teal shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-brand-navy dark:text-white truncate">
                            {userName}
                          </div>
                          <div className="text-[10px] text-brand-navy/60 dark:text-slate-400 truncate">
                            {userEmail}
                          </div>
                          <span className="inline-block mt-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full">
                            Verified Traveler
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="space-y-1 py-1">
                      <Link
                        to="/trips"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-brand-navy dark:text-slate-200 hover:bg-brand-sand dark:hover:bg-slate-800 transition-colors"
                      >
                        <Luggage className="w-4 h-4 text-brand-orange" />
                        <span>My Collaborative Trips</span>
                      </Link>

                      <Link
                        to="/explore"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-brand-navy dark:text-slate-200 hover:bg-brand-sand dark:hover:bg-slate-800 transition-colors"
                      >
                        <Compass className="w-4 h-4 text-brand-teal" />
                        <span>Explore 100+ Stays & Places</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsJoinModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-brand-navy dark:text-slate-200 hover:bg-brand-sand dark:hover:bg-slate-800 transition-colors text-left"
                      >
                        <Users className="w-4 h-4 text-brand-yellow" />
                        <span>Join Trip with Invite Code</span>
                      </button>
                    </div>

                    {/* Sign Out */}
                    <div className="pt-2 mt-1 border-t border-brand-sand-border dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out of Account</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* When Logged Out: Show Single Clean Log In Button (No demo ID Alex!) */
              <Link
                to="/login"
                className="px-4 py-2 text-xs xl:text-sm font-bold text-brand-navy dark:text-slate-100 bg-white dark:bg-[#111C2E] border border-brand-sand-border dark:border-[#1E2D42] hover:border-brand-teal hover:text-brand-teal rounded-full shadow-subtle transition-all shrink-0 whitespace-nowrap flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-brand-teal" />
                <span>Log In</span>
              </Link>
            )}

            {/* Desktop Plan Itinerary Primary CTA - Crisp, Unclashed Single-Line Pill */}
            <Link
              to="/workspace/trip-goa-2026"
              className="inline-flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white px-3.5 xl:px-4 py-2 rounded-full text-xs xl:text-sm font-semibold shadow-card hover:shadow-card-hover transition-all transform active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Plan Itinerary ✨</span>
            </Link>
          </div>

          {/* 4. Phone / Mobile Header Top Bar */}
          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle compact={true} />
            <Link
              to="/workspace/trip-goa-2026"
              className="bg-brand-orange hover:bg-brand-orange-hover text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Plan</span>
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-white dark:bg-[#111C2E] border border-brand-sand-border dark:border-[#1E2D42] text-brand-navy dark:text-white shadow-subtle"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* 5. Phone / Mobile Drawer Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white/95 dark:bg-[#0E1A2E]/95 backdrop-blur-xl border-b border-brand-sand-border dark:border-[#1E2D42] px-4 py-5 space-y-4 animate-fadeIn shadow-floating">
            
            {/* Navigation Links Group */}
            <div className="space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-navy/50 dark:text-slate-400 px-3 pb-1">
                Discover & Plan
              </span>
              
              {/* Explore */}
              <Link
                to="/explore"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                  isNavActive('explore')
                    ? 'bg-brand-navy dark:bg-white text-white dark:text-brand-navy'
                    : 'text-brand-navy dark:text-slate-200 hover:bg-brand-sand dark:hover:bg-slate-800'
                }`}
              >
                <Compass className="w-4 h-4 text-brand-teal" />
                <span>Explore Stays & Places</span>
              </Link>

              {/* Stays */}
              <Link
                to="/explore?type=stay"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                  isNavActive('stay')
                    ? 'bg-brand-navy dark:bg-white text-white dark:text-brand-navy'
                    : 'text-brand-navy dark:text-slate-200 hover:bg-brand-sand dark:hover:bg-slate-800'
                }`}
              >
                <Bed className="w-4 h-4 text-brand-orange" />
                <span>Stays & Accommodations</span>
              </Link>

              {/* Experiences / My Experiences */}
              <Link
                to="/explore?type=experience"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                  isNavActive('experience')
                    ? 'bg-brand-navy dark:bg-white text-white dark:text-brand-navy'
                    : 'text-brand-navy dark:text-slate-200 hover:bg-brand-sand dark:hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-brand-yellow" />
                <span>My Experiences & Activities</span>
              </Link>

              {/* My Trips */}
              <Link
                to="/trips"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                  isNavActive('trips')
                    ? 'bg-brand-navy dark:bg-white text-white dark:text-brand-navy'
                    : 'text-brand-navy dark:text-slate-200 hover:bg-brand-sand dark:hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4 text-brand-teal" />
                <span>My Collaborative Trips</span>
                <span className="ml-auto w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
              </Link>

              {/* AI Concierge Banner with Gemini */}
              <Link
                to="/ai-concierge"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-orange-500/10 border border-purple-500/25 transition-all text-left"
              >
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-500/30">
                  <GoogleGeminiIcon size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#4E82EE] via-[#9B72CB] to-[#FF6B45]">
                    Google Gemini AI Concierge
                  </div>
                  <div className="text-[11px] text-brand-navy/70 dark:text-slate-400">
                    Smart group itineraries & budget split
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-orange ml-auto" />
              </Link>
            </div>

            {/* Mobile Plan Itinerary Action */}
            <div className="pt-2">
              <Link
                to="/workspace/trip-goa-2026"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold flex items-center justify-center gap-2 shadow-card"
              >
                <Plus className="w-4 h-4" />
                <span>Plan New Itinerary ✨</span>
              </Link>
            </div>

            {/* Currency Switcher Row for Mobile */}
            <div className="pt-3 border-t border-brand-sand-border dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-navy/70 dark:text-slate-400">Currency:</span>
              <div className="flex items-center gap-1.5">
                {['INR', 'USD', 'EUR'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                      currency === c
                        ? 'bg-brand-orange text-white'
                        : 'bg-brand-sand dark:bg-slate-800 text-brand-navy dark:text-slate-300'
                    }`}
                  >
                    {c === 'INR' ? '₹ INR' : c === 'USD' ? '$ USD' : '€ EUR'}
                  </button>
                ))}
              </div>
            </div>

            {/* If Authenticated: show User Profile Summary and Sign Out */}
            {isAuthenticated && currentUser ? (
              <div className="pt-3 border-t border-brand-sand-border dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-brand-sand/50 dark:bg-slate-800/50 border border-brand-sand-border dark:border-slate-700">
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-teal"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-brand-navy dark:text-white truncate">
                      {userName}
                    </div>
                    <div className="text-[11px] text-brand-navy/60 dark:text-slate-400 truncate">
                      {userEmail}
                    </div>
                    <div className="text-[10px] font-medium text-brand-teal mt-0.5">
                      {userRole}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-2 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-xl hover:bg-rose-100 flex items-center gap-1"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              /* If Logged Out: Clean prominent Log In & Sign Up buttons */
              <div className="pt-3 border-t border-brand-sand-border dark:border-slate-800 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-orange hover:bg-brand-orange-hover transition-colors shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log In to Account</span>
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-brand-navy dark:text-slate-200 bg-brand-sand dark:bg-slate-800 hover:bg-brand-sand/80 transition-colors"
                >
                  <span>Create Free Account</span>
                </Link>
              </div>
            )}

            {/* Join Group Trip Shortcut for Mobile */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsJoinModalOpen(true);
                }}
                className="w-full py-2 px-3 rounded-2xl bg-white dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white text-xs font-bold flex items-center justify-center gap-2 shadow-subtle hover:border-brand-teal transition-colors"
              >
                <Users className="w-4 h-4 text-brand-teal" />
                <span>Join Group Trip with Invite Code 🎟️</span>
              </button>
            </div>
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>

          </div>
        )}
      </header>

      {/* 6. Mobile Bottom Navigation Dock for Phones - Quick One-Thumb Tap */}
      <nav aria-label="Mobile Navigation Dock" className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 dark:bg-[#0B1528]/95 backdrop-blur-xl border-t border-brand-sand-border dark:border-[#1E2D42] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] py-1.5 px-3 flex items-center justify-around">
        
        {/* Explore */}
        <Link
          to="/explore"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
            isNavActive('explore')
              ? 'text-brand-orange font-bold scale-105'
              : 'text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Explore</span>
        </Link>

        {/* Stays */}
        <Link
          to="/explore?type=stay"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
            isNavActive('stay')
              ? 'text-brand-orange font-bold scale-105'
              : 'text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy'
          }`}
        >
          <Bed className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Stays</span>
        </Link>

        {/* Experiences */}
        <Link
          to="/explore?type=experience"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
            isNavActive('experience')
              ? 'text-brand-orange font-bold scale-105'
              : 'text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy'
          }`}
        >
          <Flame className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Experiences</span>
        </Link>

        {/* My Trips */}
        <Link
          to="/trips"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
            isNavActive('trips')
              ? 'text-brand-orange font-bold scale-105'
              : 'text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy'
          }`}
        >
          <div className="relative">
            <Calendar className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
          </div>
          <span className="text-[10px] tracking-tight">My Trips</span>
        </Link>

        {/* Gemini AI */}
        <Link
          to="/ai-concierge"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
            isNavActive('ai')
              ? 'text-purple-600 font-bold scale-105'
              : 'text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy'
          }`}
        >
          <GoogleGeminiIcon size={20} />
          <span className="text-[10px] tracking-tight font-semibold">Gemini AI</span>
        </Link>

      </nav>

      {/* Global Join Trip with Invite Code Modal */}
      <JoinTripModal />
    </>
  );
};

export default Navbar;
