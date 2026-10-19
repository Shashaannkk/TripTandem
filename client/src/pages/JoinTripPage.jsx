import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, Calendar, MapPin, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useTrip } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';

import { api } from '../services/api';

export const JoinTripPage = () => {
  const { inviteCode: paramCode } = useParams();
  const navigate = useNavigate();
  const { trip: activeTrip, joinTripByCode } = useTrip();
  const { currentUser } = useAuth();

  const [code, setCode] = useState(paramCode || 'TANDEM-GOA-77');
  const [selectedRole, setSelectedRole] = useState('Planner'); // 'Planner' | 'Viewer' (PRD Section 5.1/5.2)
  const [previewTrip, setPreviewTrip] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (paramCode) {
      setCode(paramCode.toUpperCase());
      api.getTripByInviteCode(paramCode).then(data => {
        if (data) setPreviewTrip(data);
      });
    }
  }, [paramCode]);

  const displayedTrip = previewTrip || activeTrip;

  const handleJoinTrip = async () => {
    setIsJoining(true);
    try {
      const joinedTrip = await joinTripByCode(code, selectedRole);
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
            <span className="text-xs font-mono font-bold bg-white/25 px-2.5 py-1 rounded-xl">
              Code: {code}
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-md">
              {trip?.title || 'Goa Collaborative Coastal Escape'}
            </h1>
            <p className="text-xs text-white/90 flex items-center gap-1.5 mt-1 drop-shadow-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span>{trip?.destination || 'Goa, India'}</span>
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

          {/* Crew Members Preview */}
          <div className="p-4 rounded-2xl bg-brand-sand dark:bg-slate-800/60 border border-brand-sand-border/80 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-brand-navy dark:text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand-teal" />
                <span>Active Travel Crew ({(displayedTrip?.members || []).length} Members)</span>
              </span>
              <span className="text-[11px] text-brand-teal font-semibold">Live Room</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {(displayedTrip?.members || []).map((m) => (
                <div key={m.id || m.name} className="flex items-center gap-2 pr-3 py-1 bg-white dark:bg-slate-900 rounded-full border border-brand-sand-border dark:border-slate-700 shrink-0">
                  <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover" />
                  <span className="text-xs font-semibold text-brand-navy dark:text-slate-200">
                    {(m.name || 'Member').split(' ')[0]} <span className="text-[10px] text-brand-teal font-normal">({m.role || 'Planner'})</span>
                  </span>
                </div>
              ))}
            </div>
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

          {/* Current User Badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-brand-sand-border dark:border-slate-700 text-xs">
            <span className="text-brand-navy/60 dark:text-slate-400">Joining as:</span>
            <div className="flex items-center gap-2 font-bold text-brand-navy dark:text-white">
              <img src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} alt={currentUser?.name || 'Traveler'} className="w-6 h-6 rounded-full object-cover ring-1 ring-brand-teal" />
              <span>{currentUser?.name || 'Traveler'}</span>
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
