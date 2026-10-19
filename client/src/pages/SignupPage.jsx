import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../assets/Logo';
import { useAuth } from '../context/AuthContext';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { createUpiQrSvg, SAMPLE_QR_PRESETS } from '../utils/qrHelper';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Check,
  Compass,
  MapPin,
  ShieldCheck,
  HeartPulse,
  QrCode,
  Upload,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  Wallet
} from 'lucide-react';

export const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, showToast } = useAuth();

  // Wizard Step: 1 = Basics, 2 = Emergency & Safety, 3 = UPI & QR Code
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Account Basics & Persona
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [travelRole, setTravelRole] = useState('Trip Lead 👑');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Emergency & Health Safety Guard
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Parent');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Step 3: Distributed Payment & Personal UPI QR
  const [upiId, setUpiId] = useState('');
  const [upiQrImage, setUpiQrImage] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState('gpay');

  // UI state
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-generate UPI ID if user types email
  const handleEmailChange = (val) => {
    setEmail(val);
    if (!upiId && val.includes('@')) {
      setUpiId(`${val.split('@')[0]}@okaxis`);
    }
  };

  // Password strength calculation
  const calculatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-400' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-400' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-teal-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = calculatePasswordStrength(password);

  // Handle local QR code image upload
  const handleQrUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUpiQrImage(reader.result);
        setSelectedPreset('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  // Select Preset Sample QR
  const applyPresetQr = (preset) => {
    setSelectedPreset(preset.id);
    const generated = createUpiQrSvg(upiId || 'traveler@upi', name || 'Traveler', preset.color);
    setUpiQrImage(generated);
    if (!upiId) setUpiId(preset.upi);
  };

  // Validation per step
  const validateStep1 = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim()) {
      errs.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }

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

    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    if (!acceptTerms) {
      errs.terms = 'Please accept the Terms to continue';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!emergencyName.trim()) {
      errs.emergencyName = 'Emergency contact person is required for your safety';
    }
    if (!emergencyPhone.trim()) {
      errs.emergencyPhone = 'Emergency contact phone number is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    setFormError('');
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) {
        // Pre-fill QR code if not uploaded yet
        if (!upiQrImage) {
          const generated = createUpiQrSvg(upiId || `${name.toLowerCase().replace(/\s+/g, '')}@okaxis`, name, '#0B2545');
          setUpiQrImage(generated);
          if (!upiId) setUpiId(`${name.toLowerCase().replace(/\s+/g, '')}@okaxis`);
        }
        setCurrentStep(3);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    setIsLoading(true);
    try {
      const finalUpi = upiId.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@okhdfcbank`;
      const finalQr = upiQrImage || createUpiQrSvg(finalUpi, name, '#0B2545');

      await signup({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || '+91 98000 12345',
        password,
        confirmPassword,
        role: travelRole,
        emergencyContact: {
          name: emergencyName.trim(),
          phone: emergencyPhone.trim(),
          relationship: emergencyRelationship,
          bloodGroup,
          medicalNotes: medicalNotes.trim() || 'None',
        },
        upiId: finalUpi,
        upiQrCode: finalQr,
      });

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/workspace/trip-goa-2026', { replace: true });
      }, 700);
    } catch (err) {
      setFormError(err.message || 'Account registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const ROLES = [
    'Trip Lead 👑',
    'Navigator & Driver 🗺️',
    'Foodie & Culture 🍜',
    'Adventure Scout 🧗',
    'Budget Maven 💰',
    'Medic & First Aider 🩺',
  ];

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
            to="/login"
            className="text-xs font-semibold text-brand-navy dark:text-slate-200 hover:text-brand-orange px-3 py-1.5 rounded-full border border-brand-sand-border dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors"
          >
            Log In
          </Link>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="max-w-5xl w-full mx-auto bg-white dark:bg-[#111C2E] rounded-3xl sm:rounded-[2.5rem] shadow-floating border border-brand-sand-border dark:border-[#1E2D42] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[660px]">
        
        {/* Left Column: Cinematic Visual & Safety Value Props */}
        <div className="hidden lg:flex lg:col-span-5 relative bg-brand-navy flex-col justify-between p-10 text-white overflow-hidden">
          
          <div className="absolute inset-0 z-0">
            <video
              src="/videos/landing-hero.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover opacity-40 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/75 to-brand-navy/50" />
          </div>

          {/* Top Pill */}
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-brand-orange font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safe Collaborative Journeys</span>
            </span>
          </div>

          {/* Step Narrative */}
          <div className="relative z-10 space-y-4 my-auto">
            <h2 className="text-2xl xl:text-3xl font-semibold leading-tight text-white tracking-tight">
              {currentStep === 1 && 'Travel connected. Adventure safely.'}
              {currentStep === 2 && 'Group safety & emergency safeguard.'}
              {currentStep === 3 && 'Seamless UPI split & debt collection.'}
            </h2>

            <p className="text-xs text-white/80 leading-relaxed">
              {currentStep === 1 && 'Create your traveler persona to vote on stays, chat in real-time, and coordinate itineraries with friends.'}
              {currentStep === 2 && 'Your emergency contacts and medical alert stay private and are accessible only to confirmed members during active trips.'}
              {currentStep === 3 && 'Upload your personal UPI QR code so friends can scan and instantly settle their share directly to your bank.'}
            </p>

            {/* Wizard Step Badges */}
            <div className="pt-2 flex items-center gap-2">
              {[
                { num: 1, title: 'Profile' },
                { num: 2, title: 'Safety' },
                { num: 3, title: 'Payment QR' },
              ].map((s) => (
                <div
                  key={s.num}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    currentStep === s.num
                      ? 'bg-brand-orange text-white ring-2 ring-brand-orange/40'
                      : currentStep > s.num
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  <span>{currentStep > s.num ? '✓' : s.num}</span>
                  <span>{s.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Trust Tag */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-white/70">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-brand-teal" />
              TripTandem Verified Traveler
            </span>
            <span className="text-brand-yellow font-medium">India 2026</span>
          </div>

        </div>

        {/* Right Column: Step-by-Step Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          
          <div className="max-w-md w-full mx-auto space-y-4">
            
            {/* Step Progress Bar */}
            <div className="flex items-center justify-between text-xs text-brand-navy/60 dark:text-slate-400">
              <span className="font-semibold text-brand-navy dark:text-slate-200">
                Step {currentStep} of 3
              </span>
              <span>
                {currentStep === 1 && 'Personal & Account Basics'}
                {currentStep === 2 && 'Group Safety & Emergency Details'}
                {currentStep === 3 && 'UPI ID & Settlement QR Code'}
              </span>
            </div>
            
            <div className="w-full h-1.5 bg-brand-sand dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-orange transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>

            {/* Global Error Banner */}
            {formError && (
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Success Banner */}
            {isSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">Account created with Emergency Guard & UPI QR! Opening trip...</span>
              </div>
            )}

            {/* ================= STEP 1: ACCOUNT BASICS ================= */}
            {currentStep === 1 && (
              <form onSubmit={handleNext} className="space-y-3 animate-fadeIn" noValidate>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-slate-100 tracking-tight">
                    Create your traveler account
                  </h1>
                  <p className="text-xs text-brand-navy/60 dark:text-slate-400 mt-1">
                    Join with friends to plan trips, vote live, and split expenses.
                  </p>
                </div>

                <GoogleAuthButton
                  text="Sign up with Google"
                  onSuccess={() => {
                    setCurrentStep(2);
                  }}
                  onError={(err) => {
                    setFormError(err.message || 'Google sign-up failed');
                  }}
                />

                <div className="relative flex items-center justify-center my-2">
                  <div className="w-full border-t border-brand-sand-border dark:border-slate-800" />
                  <span className="absolute bg-white dark:bg-[#111C2E] px-3 text-[10px] font-medium text-brand-navy/40 dark:text-slate-500 uppercase tracking-wider">
                    or register with email
                  </span>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1 flex items-center justify-between">
                    <span>Full name</span>
                    {errors.name && <span className="text-[11px] text-red-600 font-normal">{errors.name}</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-navy/40">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors(prev => ({ ...prev, name: null }));
                      }}
                      placeholder="Alex Morgan"
                      className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-teal"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1 flex items-center justify-between">
                    <span>Email address</span>
                    {errors.email && <span className="text-[11px] text-red-600 font-normal">{errors.email}</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-navy/40">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="alex@traveler.com"
                      className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-teal"
                    />
                  </div>
                </div>

                {/* Phone & Travel Role in Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-navy/40">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98201 12345"
                        className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-teal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1">
                      Travel Role
                    </label>
                    <select
                      value={travelRole}
                      onChange={(e) => setTravelRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-teal"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-3 pr-8 py-2 rounded-xl text-xs bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-teal"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-brand-navy/40 hover:text-brand-navy"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1">
                      Confirm
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-3 pr-8 py-2 rounded-xl text-xs bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-teal"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-brand-navy/40 hover:text-brand-navy"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {errors.password && <p className="text-[11px] text-red-600">{errors.password}</p>}
                {errors.confirmPassword && <p className="text-[11px] text-red-600">{errors.confirmPassword}</p>}

                {/* Terms checkbox */}
                <div>
                  <label className="flex items-start gap-2 cursor-pointer select-none text-[11px] text-brand-navy/70 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-brand-teal mt-0.5"
                    />
                    <span>I agree to TripTandem Community Safety & Terms of Service.</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold shadow-card transition-all active:scale-[0.99]"
                >
                  <span>Continue to Emergency & Safety</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* ================= STEP 2: EMERGENCY & SAFETY ================= */}
            {currentStep === 2 && (
              <form onSubmit={handleNext} className="space-y-3.5 animate-fadeIn" noValidate>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-[11px] font-semibold border border-rose-200 dark:border-rose-900/40 mb-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Traveler SafeGuard Protocol</span>
                  </div>
                  <h2 className="text-xl font-bold text-brand-navy dark:text-slate-100 tracking-tight">
                    Emergency & Medical Details
                  </h2>
                  <p className="text-xs text-brand-navy/60 dark:text-slate-400">
                    Needed to ensure group safety during road trips, water sports, and medical emergencies.
                  </p>
                </div>

                {/* Emergency Contact Name */}
                <div>
                  <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1 flex items-center justify-between">
                    <span>Emergency Contact Name</span>
                    {errors.emergencyName && <span className="text-[11px] text-red-600 font-normal">{errors.emergencyName}</span>}
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Ramesh Poojari"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-teal"
                  />
                </div>

                {/* Relationship & Emergency Phone in Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1">
                      Relationship
                    </label>
                    <select
                      value={emergencyRelationship}
                      onChange={(e) => setEmergencyRelationship(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-teal"
                    >
                      <option value="Parent">Parent (Mother / Father)</option>
                      <option value="Spouse">Spouse / Partner</option>
                      <option value="Sibling">Sibling (Brother / Sister)</option>
                      <option value="Friend">Close Friend / Roommate</option>
                      <option value="Guardian">Guardian</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1 flex items-center justify-between">
                      <span>Emergency Phone</span>
                      {errors.emergencyPhone && <span className="text-[11px] text-red-600 font-normal">{errors.emergencyPhone}</span>}
                    </label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="+91 98200 99881"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-teal"
                    />
                  </div>
                </div>

                {/* Blood Group & Medical Alerts */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1">
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 font-bold text-rose-600"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1">
                      Allergies / Medical Notes
                    </label>
                    <input
                      type="text"
                      value={medicalNotes}
                      onChange={(e) => setMedicalNotes(e.target.value)}
                      placeholder="e.g. Asthma, Penicillin, None"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 focus:outline-none focus:border-brand-teal"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Your medical alert is encrypted and only visible to co-travelers in your active trip during an emergency.
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-brand-sand-border dark:border-slate-700 text-xs font-semibold text-brand-navy dark:text-slate-200 hover:bg-brand-sand dark:hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-brand-teal hover:bg-brand-teal-hover text-white text-xs font-semibold shadow-card transition-all"
                  >
                    <span>Next: Add UPI QR for Payments</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* ================= STEP 3: DISTRIBUTED PAYMENT & QR CODE ================= */}
            {currentStep === 3 && (
              <form onSubmit={handleSubmit} className="space-y-3.5 animate-fadeIn" noValidate>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 mb-1">
                    <Wallet className="w-3 h-3" />
                    <span>Direct-to-Bank Split Settlements</span>
                  </div>
                  <h2 className="text-xl font-bold text-brand-navy dark:text-slate-100 tracking-tight">
                    Your Personal UPI ID & QR Code
                  </h2>
                  <p className="text-xs text-brand-navy/60 dark:text-slate-400">
                    When you pay for the villa or meals, other trip members scan your QR code directly to repay you.
                  </p>
                </div>

                {/* UPI ID input */}
                <div>
                  <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1">
                    Your UPI ID (VPA)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-navy/40">
                      <QrCode className="w-4 h-4 text-brand-teal" />
                    </div>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="alex@okhdfcbank or 9820112345@upi"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-brand-sand/50 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-slate-100 font-mono focus:outline-none focus:border-brand-teal"
                    />
                  </div>
                </div>

                {/* QR Code Upload / Preview Container */}
                <div className="p-3.5 rounded-2xl bg-brand-sand/40 dark:bg-slate-900/60 border border-brand-sand-border dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-brand-navy dark:text-slate-200 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-brand-orange" />
                      <span>Live QR Code Preview</span>
                    </span>
                    <span className="text-[10px] text-brand-teal font-medium bg-brand-teal-light dark:bg-teal-950/40 px-2 py-0.5 rounded-full">
                      Ready for scanning
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* QR Image Display */}
                    <div className="w-28 h-28 bg-white p-2 rounded-2xl border border-brand-sand-border shadow-sm flex items-center justify-center shrink-0">
                      <img
                        src={upiQrImage || createUpiQrSvg(upiId || 'traveler@upi', name || 'Traveler')}
                        alt="Your UPI QR"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>

                    <div className="space-y-2 text-xs flex-1">
                      {/* Upload local image file */}
                      <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-dashed border-brand-sand-border dark:border-slate-700 hover:border-brand-teal cursor-pointer transition-colors text-brand-navy dark:text-slate-200 font-medium">
                        <Upload className="w-3.5 h-3.5 text-brand-teal" />
                        <span>Upload My Real QR</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQrUpload}
                          className="hidden"
                        />
                      </label>

                      {/* 1-Click Fast Presets for Quick Testing */}
                      <div className="text-[10px] text-brand-navy/60 dark:text-slate-400">
                        Or pick instant preset:
                      </div>
                      <div className="flex gap-1.5">
                        {SAMPLE_QR_PRESETS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => applyPresetQr(p)}
                            className={`flex-1 py-1 px-1 rounded-lg text-[10px] font-semibold border transition-all ${
                              selectedPreset === p.id
                                ? 'bg-brand-teal text-white border-brand-teal shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-brand-navy/70 dark:text-slate-300 border-brand-sand-border dark:border-slate-700 hover:bg-brand-sand'
                            }`}
                          >
                            {p.id === 'gpay' ? 'GPay' : p.id === 'phonepe' ? 'PhonePe' : 'Paytm'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-3 rounded-xl border border-brand-sand-border dark:border-slate-700 text-xs font-semibold text-brand-navy dark:text-slate-200 hover:bg-brand-sand dark:hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold shadow-card transition-all disabled:opacity-60"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating ID & Workspace...</span>
                      </div>
                    ) : (
                      <>
                        <span>Finish & Enter Trip Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Link to Login */}
            <div className="text-center pt-2">
              <p className="text-xs text-brand-navy/70 dark:text-slate-400">
                Already registered?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-brand-orange hover:text-brand-orange-hover transition-colors underline underline-offset-2"
                >
                  Sign in here
                </Link>
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default SignupPage;
