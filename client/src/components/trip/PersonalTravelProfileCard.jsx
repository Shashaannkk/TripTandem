import React, { useState, useEffect } from 'react';
import { ShieldCheck, Utensils, Wallet, Compass, Check, Edit3, Sparkles, QrCode, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createUpiQrSvg } from '../../utils/qrHelper';

const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian 🥦' },
  { id: 'vegan', label: 'Vegan 🌱' },
  { id: 'halal', label: 'Halal 🥩' },
  { id: 'jain', label: 'Jain (No Root Veg) 🌾' },
  { id: 'gluten-free', label: 'Gluten-Free 🌾' },
];

const PREFERRED_CATEGORIES = [
  { id: 'heritage', label: 'Heritage & Havelis 🏰' },
  { id: 'adventure', label: 'Treks & Water Sports 🏄‍♂️' },
  { id: 'fine-dining', label: 'Seaside & Fine Dining 🍷' },
  { id: 'chalets', label: 'Mountain Chalets 🏔️' },
  { id: 'nightlife', label: 'Sunset Lounges & Music 🎶' },
];

export const PersonalTravelProfileCard = () => {
  const { currentUser, formatPrice, showToast, updateProfile } = useAuth();

  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(`tt_user_pref_${currentUser?.id || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      budgetCeiling: 25000,
      dietaryTags: ['vegetarian'],
      favoredCategories: ['heritage', 'fine-dining'],
    };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempBudget, setTempBudget] = useState(preferences.budgetCeiling);
  const [tempDietary, setTempDietary] = useState(preferences.dietaryTags);
  const [tempCategories, setTempCategories] = useState(preferences.favoredCategories);

  const handleToggleDietary = (tagId) => {
    setTempDietary(prev => 
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleToggleCategory = (catId) => {
    setTempCategories(prev => 
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const handleSave = () => {
    const updated = {
      budgetCeiling: Number(tempBudget) || 25000,
      dietaryTags: tempDietary,
      favoredCategories: tempCategories,
    };
    setPreferences(updated);
    try {
      localStorage.setItem(`tt_user_pref_${currentUser?.id || 'default'}`, JSON.stringify(updated));
    } catch (e) {}
    setIsEditing(false);
    showToast('Updated your Personal Travel DNA profile!', 'success');
  };

  const [userUpiId, setUserUpiId] = useState(currentUser?.upiId || 'traveler@okhdfcbank');
  const [userUpiQr, setUserUpiQr] = useState(currentUser?.upiQrCode || null);
  const [isSavingUpi, setIsSavingUpi] = useState(false);

  useEffect(() => {
    if (currentUser?.upiId) setUserUpiId(currentUser.upiId);
    if (currentUser?.upiQrCode) setUserUpiQr(currentUser.upiQrCode);
  }, [currentUser]);

  const handleQrFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserUpiQr(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUpi = async () => {
    setIsSavingUpi(true);
    try {
      const finalQr = userUpiQr || createUpiQrSvg(userUpiId, currentUser?.name || 'Traveler');
      await updateProfile({
        upiId: userUpiId.trim(),
        upiQrCode: finalQr,
      });
      setUserUpiQr(finalQr);
      showToast('UPI QR code and ID saved for instant group settlements!', 'success');
    } catch (err) {
      showToast('Saved UPI settings locally.', 'info');
    } finally {
      setIsSavingUpi(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#111C2E] rounded-3xl p-5 sm:p-6 border border-brand-sand-border dark:border-[#1E2D42] shadow-subtle space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-orange-light dark:bg-orange-950/40 text-brand-orange flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-brand-navy dark:text-white flex items-center gap-2">
              <span>Personal Travel Preference Profile (Traveler DNA)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal font-bold">
                PRD §6.3
              </span>
            </h3>
            <p className="text-xs text-brand-navy/60 dark:text-slate-400">
              Aggregated budget ceilings and dietary constraints used by the AI Concierge for hard-rule matching.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (isEditing) handleSave();
            else {
              setTempBudget(preferences.budgetCeiling);
              setTempDietary(preferences.dietaryTags);
              setTempCategories(preferences.favoredCategories);
              setIsEditing(true);
            }
          }}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer ${
            isEditing
              ? 'bg-brand-orange text-white shadow-card'
              : 'bg-brand-sand dark:bg-slate-800 text-brand-navy dark:text-white hover:border-brand-teal border border-brand-sand-border dark:border-slate-700'
          }`}
        >
          {isEditing ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Save Preferences</span>
            </>
          ) : (
            <>
              <Edit3 className="w-3.5 h-3.5 text-brand-teal" />
              <span>Edit DNA</span>
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-brand-sand-border dark:border-slate-800">
          {/* Budget Ceiling Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-navy dark:text-slate-300 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-brand-teal" />
              <span>Personal Budget Ceiling (₹)</span>
            </label>
            <input
              type="number"
              step="1000"
              value={tempBudget}
              onChange={(e) => setTempBudget(e.target.value)}
              className="w-full text-xs rounded-xl p-2.5 bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white focus:outline-none"
            />
            <p className="text-[10px] text-brand-navy/50 dark:text-slate-500">
              AI Concierge will never propose venues exceeding this ceiling.
            </p>
          </div>

          {/* Dietary Constraints Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-navy dark:text-slate-300 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-brand-orange" />
              <span>Dietary Requirements</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DIETARY_OPTIONS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleToggleDietary(d.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    tempDietary.includes(d.id)
                      ? 'bg-brand-orange text-white shadow-xs'
                      : 'bg-brand-sand dark:bg-slate-800 text-brand-navy/70 dark:text-slate-400'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Favored Categories */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-navy dark:text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-brand-teal" />
              <span>Favorite Experience Tags</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PREFERRED_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleToggleCategory(c.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    tempCategories.includes(c.id)
                      ? 'bg-brand-teal text-white shadow-xs'
                      : 'bg-brand-sand dark:bg-slate-800 text-brand-navy/70 dark:text-slate-400'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-brand-sand-border dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-brand-sand/60 dark:bg-slate-800/60 border border-brand-sand-border dark:border-slate-700/60">
            <div className="text-[11px] text-brand-navy/60 dark:text-slate-400 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-brand-teal" />
              <span>Budget Ceiling</span>
            </div>
            <div className="text-base font-bold text-brand-navy dark:text-white mt-1">
              {formatPrice(preferences.budgetCeiling)} / trip
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-brand-sand/60 dark:bg-slate-800/60 border border-brand-sand-border dark:border-slate-700/60">
            <div className="text-[11px] text-brand-navy/60 dark:text-slate-400 flex items-center gap-1">
              <Utensils className="w-3.5 h-3.5 text-brand-orange" />
              <span>Dietary Tags Enforced</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {preferences.dietaryTags.map(tag => (
                <span key={tag} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-brand-orange border border-brand-orange/30">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-brand-sand/60 dark:bg-slate-800/60 border border-brand-sand-border dark:border-slate-700/60">
            <div className="text-[11px] text-brand-navy/60 dark:text-slate-400 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-brand-teal" />
              <span>Affinity Categories</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {preferences.favoredCategories.map(cat => (
                <span key={cat} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-brand-teal border border-brand-teal/30">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Personal UPI & Payment QR Code Container */}
      <div className="pt-4 border-t border-brand-sand-border dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-brand-navy dark:text-white flex items-center gap-1.5">
                <span>Personal UPI & Payment QR Code</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full font-semibold">
                  Direct Settlement Ready
                </span>
              </h4>
              <p className="text-[11px] text-brand-navy/60 dark:text-slate-400">
                Uploaded QR code is scanned by friends to settle group expenses directly into your bank.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveUpi}
            disabled={isSavingUpi}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-brand-teal hover:bg-brand-teal/90 text-white shadow-xs transition-all flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSavingUpi ? 'Saving...' : 'Save UPI Settings'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl bg-brand-sand/50 dark:bg-slate-800/50 border border-brand-sand-border dark:border-slate-700">
          {/* QR Code Preview */}
          <div className="w-28 h-28 bg-white p-2 rounded-2xl border border-brand-sand-border shadow-xs flex items-center justify-center shrink-0">
            <img
              src={userUpiQr || createUpiQrSvg(userUpiId || 'traveler@upi', currentUser?.name || 'Traveler')}
              alt="My UPI QR"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>

          <div className="space-y-2.5 flex-1 w-full text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-navy/60 dark:text-slate-400 mb-1">
                Your UPI ID / VPA
              </label>
              <input
                type="text"
                value={userUpiId}
                onChange={(e) => setUserUpiId(e.target.value)}
                placeholder="yourname@okhdfcbank or 9820112345@upi"
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 font-mono text-brand-navy dark:text-white focus:outline-none focus:border-brand-teal"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-brand-sand-border dark:border-slate-700 hover:border-brand-teal cursor-pointer text-[11px] font-bold text-brand-teal transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload My Real QR Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrFileUpload}
                  className="hidden"
                />
              </label>
              {userUpiQr && (
                <button
                  type="button"
                  onClick={() => setUserUpiQr(null)}
                  className="text-[11px] text-rose-500 hover:underline font-semibold"
                >
                  Reset to default SVG QR
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
