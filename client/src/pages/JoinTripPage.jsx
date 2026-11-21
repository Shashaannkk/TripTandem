import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, Calendar, MapPin, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useTrip } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { fetchTripSnapshot } from '../services/cloudRelay';

export const JoinTripPage = () => {
  const { inviteCode: paramCode } = useParams();
  const navigate = useNavigate();
  const { trip: activeTrip, joinTripByCode, activeUser } = useTrip();
  const { currentUser, showToast } = useAuth();
  const effectiveUser = currentUser || activeUser;

  const [code, setCode] = useState(paramCode ? paramCode.toUpperCase() : '');
  const [selectedRole, setSelectedRole] = useState('Planner'); // 'Planner' | 'Viewer' (PRD Section 5.1/5.2)
  const [customName, setCustomName] = useState('');
  const [previewTrip, setPreviewTrip] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (paramCode) {
      setCode(paramCode.toUpperCase());
    }
  }, [paramCode]);

  useEffect(() => {
    const cleanCode = (code || '').trim();
    if (!cleanCode) {
      setPreviewTrip(null);
      return;
    }

    const norm = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const targetNorm = norm(cleanCode);

    let active = true;

    // 1. Check in-memory activeTrip
    if (activeTrip && (norm(activeTrip.inviteCode) === targetNorm || norm(activeTrip.id) === targetNorm || (targetNorm.length >= 4 && norm(activeTrip.inviteCode).includes(targetNorm)))) {
      setPreviewTrip(activeTrip);
      return;
    }

    // 2. Check localStorage
    try {
      const stored = localStorage.getItem('tt_all_trips');
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find(
          t => norm(t.inviteCode) === targetNorm || norm(t.id) === targetNorm || (targetNorm.length >= 4 && (norm(t.inviteCode).includes(targetNorm) || targetNorm.includes(norm(t.inviteCode))))
        );
        if (found) {
          setPreviewTrip(found);
          return;
        }
      }
      const activeTripStored = localStorage.getItem('tt_active_trip');
      if (activeTripStored) {
        const parsed = JSON.parse(activeTripStored);
        if (norm(parsed.inviteCode) === targetNorm || norm(parsed.id) === targetNorm || (targetNorm.length >= 4 && norm(parsed.inviteCode).includes(targetNorm))) {
          setPreviewTrip(parsed);
          return;
        }
      }
    } catch (e) {}

    // 3. Ask other open tabs via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('triptandem_live_sync');
        bc.postMessage({ type: 'REQUEST_TRIP_STATE', inviteCode: cleanCode });
        bc.onmessage = (e) => {
          if (!active) return;
          if (e.data?.type === 'PROVIDE_TRIP_STATE' && e.data.trip) {
            const bTrip = e.data.trip;
            if (norm(bTrip.inviteCode) === targetNorm || norm(bTrip.id) === targetNorm || (targetNorm.length >= 4 && norm(bTrip.inviteCode).includes(targetNorm))) {
              setPreviewTrip(bTrip);
              try { bc.close(); } catch (err) {}
            }
          }
        };
        setTimeout(() => {
          try { bc.close(); } catch (err) {}
        }, 1200);
      } catch (e) {}
    }

    // 4. Check API
    api.getTripByInviteCode(cleanCode).then(data => {
      if (!active) return;
      if (data) {
        setPreviewTrip(data);
      }
    });

    // 5. Query Cloud Relay Snapshot (for cross-device / incognito previews)
    fetchTripSnapshot(cleanCode).then(cloudTrip => {
      if (!active) return;
      if (cloudTrip) {
        setPreviewTrip(cloudTrip);
      }
    });

    return () => { active = false; };
  }, [code, activeTrip]);

  const displayedTrip = previewTrip || (code && (
    (activeTrip?.inviteCode && activeTrip.inviteCode.toUpperCase() === code.trim().toUpperCase()) ||
    (activeTrip?.id && activeTrip.id.toUpperCase() === code.trim().toUpperCase())
  ) ? activeTrip : null);

  const handleJoinTrip = async () => {
    if (!code || !code.trim()) {
      showToast('Please enter an invite code to join a trip', 'error');
      return;
    }

    setIsJoining(true);
    try {
      const finalName = customName.trim() || effectiveUser?.name || 'Guest Traveler';
      const joiningUser = {
        ...effectiveUser,
        id: effectiveUser?.id || `user-guest-${Date.now().toString(36)}`,
        name: finalName,
        email: effectiveUser?.email || `${finalName.toLowerCase().replace(/[^a-z0-9]/g, '')}@triptandem.travel`,
        role: selectedRole || 'Planner',
      };
      try {
        localStorage.setItem('tt_traveler_identity', JSON.stringify(joiningUser));
      } catch (e) {}

      const joinedTrip = await joinTripByCode(code.trim(), selectedRole, joiningUser);
      if (joinedTrip) {
        navigate(`/workspace/${joinedTrip.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-brand-sand dark:bg-[#0A111E]">
      <div className="max-w-xl w-full bg-white dark:bg-[#111C2E] rounded-3xl shadow-card border border-brand-sand-border dark:border-[#1E2D42] overflow-hidden animate-scaleUp">
        
        {/* Cover Graphic */}
        <div className="relative h-48 bg-gradient-to-r from-brand-orange via-brand-yellow to-brand-teal p-6 flex flex-col justify-between text-white">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              Group Trip Invitation 🎟️
            </span>
            {code ? (
              <span className="text-xs font-mono font-bold bg-white/25 px-2.5 py-1 rounded-xl">
                Code: {code}
              </span>
            ) : null}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-md">
              {displayedTrip?.title || (code ? `Trip Room (${code})` : 'Join Travel Group')}
            </h1>
            <p className="text-xs text-white/90 flex items-center gap-1.5 mt-1 drop-shadow-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span>{displayedTrip?.destination || 'Collaborative Travel Room'}</span>
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          <div className="space-y-2">
            <h2 className="text-sm sm:text-base font-bold text-brand-navy dark:text-white">
              You are invited to collaborate on this trip itinerary!
            </h2>
            <p className="text-xs text-brand-navy/70 dark:text-slate-400 leading-relaxed">
              Join your travel crew to vote on handpicked stays, lock in daily tasks, coordinate airport transit, and split group expenses with live consensus safeguards.
            </p>
          </div>

          {/* Invite Code Input Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200">
              Trip Invite Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. TANDEM-7X4K"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-sm font-bold tracking-wider text-brand-navy dark:text-white uppercase placeholder:text-brand-navy/30 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>

          {/* Crew Members Preview */}
          <div className="p-4 rounded-2xl bg-brand-sand dark:bg-slate-800/60 border border-brand-sand-border/80 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-brand-navy dark:text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand-teal" />
                <span>
                  {displayedTrip 
                    ? `Active Travel Crew (${(displayedTrip.members || []).length} Members)` 
                    : 'Crew Members Roster'}
                </span>
              </span>
              <span className="text-[11px] text-brand-teal font-semibold">Live Room</span>
            </div>

            {displayedTrip && (displayedTrip.members || []).length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {(displayedTrip.members || []).map((m) => (
                  <div key={m.id || m.name} className="flex items-center gap-2 pr-3 py-1 bg-white dark:bg-slate-900 rounded-full border border-brand-sand-border dark:border-slate-700 shrink-0">
                    <img
                      src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={m.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                      }}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs font-semibold text-brand-navy dark:text-slate-200">
                      {(m.name || 'Member').split(' ')[0]} <span className="text-[10px] text-brand-teal font-normal">({m.role || 'Planner'})</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-navy/60 dark:text-slate-400 py-1">
                {code ? `Enter your display name below to join the crew for "${code}".` : 'Enter a trip invite code above to preview your travel crew.'}
              </p>
            )}
          </div>

          {/* Role Selection (PRD Section 5.1/5.2) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-navy/60 dark:text-slate-400">
              Select Your Participation Mode:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('Planner')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedRole === 'Planner'
                    ? 'bg-brand-orange-light/40 border-brand-orange text-brand-navy dark:text-white shadow-subtle'
                    : 'bg-white dark:bg-slate-800 border-brand-sand-border dark:border-slate-700 text-brand-navy/60 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Co-Planner ✍️</span>
                  {selectedRole === 'Planner' && <CheckCircle2 className="w-3.5 h-3.5 text-brand-orange" />}
                </div>
                <p className="text-[10px] mt-1 text-brand-navy/70 dark:text-slate-300">
                  Full canvas access to pin stays, vote on activities & split costs.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('Viewer')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedRole === 'Viewer'
                    ? 'bg-brand-teal-light/40 border-brand-teal text-brand-navy dark:text-white shadow-subtle'
                    : 'bg-white dark:bg-slate-800 border-brand-sand-border dark:border-slate-700 text-brand-navy/60 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Viewer 👀</span>
                  {selectedRole === 'Viewer' && <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" />}
                </div>
                <p className="text-[10px] mt-1 text-brand-navy/70 dark:text-slate-300">
                  Follow live itinerary updates and cast votes on contested slots.
                </p>
              </button>
            </div>
          </div>

          {/* Display Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200">
              Your Display Name (for Crew Roster & Chat)
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={effectiveUser?.name || 'e.g. Maya, Rohan, Dev...'}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-sm font-semibold text-brand-navy dark:text-white placeholder:text-brand-navy/40 focus:outline-none focus:ring-2 focus:ring-brand-teal"
            />
          </div>

          {/* Current User Badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-brand-sand-border dark:border-slate-700 text-xs">
            <span className="text-brand-navy/60 dark:text-slate-400">Joining as:</span>
            <div className="flex items-center gap-2 font-medium">
              <img
                src={effectiveUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={effectiveUser?.name || 'Traveler'}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                }}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-brand-teal"
              />
              <span>{customName.trim() || effectiveUser?.name || 'Traveler'}</span>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleJoinTrip}
              disabled={isJoining}
              className="w-full py-4 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white text-sm sm:text-base font-bold flex items-center justify-center gap-2 shadow-card hover:shadow-card-hover transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              <span>{isJoining ? 'Joining Team...' : 'Accept Invite & Enter Workspace →'}</span>
            </button>

            <Link
              to="/trips"
              className="block text-center text-xs font-semibold text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy dark:hover:text-white"
            >
              View My Existing Trips Instead
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};

export default JoinTripPage;
