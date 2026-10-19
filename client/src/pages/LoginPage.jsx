import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../assets/Logo';
import { useAuth } from '../context/AuthContext';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Compass, 
  Users, 
  Check, 
  MapPin,
  ShieldCheck,
  QrCode,
  HeartPulse
} from 'lucide-react';
import { api } from '../services/api';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, showToast } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // States
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Forgot password dialog
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState({ loading: false, msg: '', error: '' });

  // From location state (e.g. redirected from protected page or signup)
  const from = location.state?.from?.pathname || '/workspace/trip-goa-2026';

  const validate = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      await login({ email, password, rememberMe });
      setIsSuccess(true);
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 700);
    } catch (err) {
      setFormError(err.message || 'Login failed. Please check your email and password, or create an account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotStatus({ loading: false, msg: '', error: 'Please enter a valid email address' });
      return;
    }
    setForgotStatus({ loading: true, msg: '', error: '' });
    try {
      const res = await api.forgotPassword({ email: forgotEmail });
      setForgotStatus({ loading: false, msg: res.message, error: '' });
    } catch (err) {
      setForgotStatus({ loading: false, msg: '', error: err.message || 'Request failed' });
    }
  };

  return (
    <div className="min-h-screen bg-brand-sand dark:bg-[#0A111E] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      
      {/* Top Bar with Home Logo & Celestial Theme Toggle */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between pb-4">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <Logo size={38} dark={false} showTagline={false} />
        </Link>
        
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/signup"
            className="text-xs font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover px-4 py-1.5 rounded-full transition-colors shadow-sm"
          >
            Create Account
          </Link>
        </div>
      </div>

      {/* Two-Column Card Composition */}
      <div className="max-w-5xl w-full mx-auto bg-white dark:bg-[#111C2E] rounded-3xl sm:rounded-[2.5rem] shadow-floating border border-brand-sand-border dark:border-[#1E2D42] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* Left Column: Cinematic Visual & Brand Atmosphere */}
        <div className="hidden lg:flex lg:col-span-5 relative bg-brand-navy flex-col justify-between p-10 text-white overflow-hidden">
          
          {/* Subtle Ambient Video Background */}
          <div className="absolute inset-0 z-0">
            <video
              src="/videos/landing-hero.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover opacity-45 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/70 to-brand-navy/50" />
            <div className="absolute inset-0 bg-brand-navy/30" />
          </div>

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-brand-yellow">
              <Sparkles className="w-3.5 h-3.5" />
              <span>India Collaborative Travel</span>
            </div>
          </div>

          {/* Center Travel Badge & Quote */}
          <div className="relative z-10 space-y-4 my-auto">
            <h2 className="text-2xl xl:text-3xl font-semibold leading-tight text-white tracking-tight">
              Bring your travel crew together in rhythm.
            </h2>
            
            <p className="text-xs text-white/80 leading-relaxed max-w-sm">
              Discover verified stays, vote on coastal dining in real-time, and split budgets transparently with personal UPI QR codes.
            </p>

            <div className="pt-2 flex items-center gap-2.5 text-xs text-white/80">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-medium">Bank-grade 256-bit encryption · Real traveler accounts</span>
            </div>
          </div>

          {/* Bottom Destination Snippet */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-white/70">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-orange" />
              Goa · Manali · Jaipur
            </span>
            <span className="text-brand-yellow font-medium">Safe Travel Matrix</span>
          </div>

        </div>

        {/* Right Column: Clean Authentication Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          
          <div className="max-w-md w-full mx-auto space-y-5">

            {/* Header copy */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy dark:text-slate-100 tracking-tight">
                Welcome back
              </h1>
              <p className="text-xs sm:text-sm text-brand-navy/60 dark:text-slate-400 mt-1">
                Sign in to continue planning and chatting with your crew.
              </p>
            </div>

            {/* Global Error Banner */}
            {formError && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Success Banner */}
            {isSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">Authentication successful! Opening workspace...</span>
              </div>
            )}

            {/* Google Authentication Button */}
            <GoogleAuthButton
              text="Continue with Google"
              onSuccess={() => {
                navigate(from, { replace: true });
              }}
              onError={(err) => {
                setFormError(err.message || 'Google sign-in was not completed');
              }}
            />

            {/* Divider */}
            <div className="relative flex items-center justify-center my-3">
              <div className="w-full border-t border-brand-sand-border dark:border-slate-800" />
              <span className="absolute bg-white dark:bg-[#111C2E] px-3 text-[10px] font-medium text-brand-navy/40 dark:text-slate-500 uppercase tracking-wider">
                or sign in with email
              </span>
            </div>

            {/* Standard Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              
              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span>Email address</span>
                  {errors.email && (
                    <span className="text-[11px] font-normal text-red-600">{errors.email}</span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-navy/40">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    }}
                    placeholder="yourname@email.com"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-brand-sand/40 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-brand-navy dark:text-slate-200">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-xs font-medium text-brand-orange hover:text-brand-orange-hover transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-navy/40">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                    }}
                    placeholder="••••••••••••"
                    disabled={isLoading}
                    className="w-full pl-10 pr-11 py-2.5 rounded-2xl text-xs bg-brand-sand/40 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-teal"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-brand-navy/40 hover:text-brand-navy"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.password}</p>
                )}
              </div>

              {/* Remember me option */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-teal focus:ring-brand-teal border-brand-sand-border"
                  />
                  <span className="text-xs text-brand-navy/70 dark:text-slate-400">Remember this device</span>
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold shadow-card transition-all active:scale-[0.99] disabled:opacity-60"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span>Log In to Trip</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>

            {/* Link to Signup */}
            <div className="text-center pt-3 border-t border-brand-sand-border dark:border-slate-800">
              <p className="text-xs text-brand-navy/70 dark:text-slate-400">
                New traveler?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-brand-orange hover:text-brand-orange-hover transition-colors underline underline-offset-2"
                >
                  Create safe account & add UPI QR
                </Link>
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-floating border border-brand-sand-border dark:border-slate-800 space-y-4">
            <h3 className="font-semibold text-lg text-brand-navy dark:text-white">
              Reset Your Password
            </h3>
            <p className="text-xs text-brand-navy/70 dark:text-slate-400 leading-relaxed">
              Enter your registered TripTandem email address. We'll send you instructions to reset your password.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-4 py-3 rounded-2xl text-xs bg-brand-sand/50 dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white focus:outline-none focus:border-brand-teal"
              />

              {forgotStatus.msg && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  {forgotStatus.msg}
                </p>
              )}
              {forgotStatus.error && (
                <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
                  {forgotStatus.error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-brand-navy/70 dark:text-slate-400 hover:bg-brand-sand dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotStatus.loading}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-brand-navy hover:bg-brand-navy-light text-white shadow-sm"
                >
                  {forgotStatus.loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subtle bottom note */}
      <div className="text-center text-[11px] text-brand-navy/40 dark:text-slate-500 pt-4">
        TripTandem Collaborative Travel · Verified Safety Safeguard
      </div>

    </div>
  );
};

export default LoginPage;
