import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, X, ArrowRight, Sparkles, CheckCircle2, Ticket } from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';

export const JoinTripModal = () => {
  const navigate = useNavigate();
  const { isJoinModalOpen, setIsJoinModalOpen, joinTripByCode } = useTrip();
  const { currentUser } = useAuth();

  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  if (!isJoinModalOpen) return null;

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');

    if (!inviteCodeInput.trim()) {
      setError('Please enter a trip invite code.');
      return;
    }

    setIsJoining(true);
    try {
      const targetTrip = await joinTripByCode(inviteCodeInput.trim());
      if (targetTrip) {
        setIsJoinModalOpen(false);
        setInviteCodeInput('');
        navigate(`/workspace/${targetTrip.id}`);
      } else {
        setError('Could not find a group trip matching this invite code.');
      }
    } catch (err) {
      setError('Failed to join trip. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleUseDemoCode = (code) => {
    setInviteCodeInput(code);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-[#111C2E] rounded-3xl shadow-card border border-brand-sand-border dark:border-[#1E2D42] p-6 space-y-5 animate-scaleUp">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-brand-sand-border dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-brand-orange-light dark:bg-orange-950/40 text-brand-orange">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-brand-navy dark:text-white">
                Join Group Trip & Team
              </h3>
              <p className="text-xs text-brand-navy/60 dark:text-slate-400">
                Enter your crew's invite code to collaborate
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsJoinModalOpen(false)}
            className="p-1 rounded-full text-brand-navy/40 hover:text-brand-navy hover:bg-brand-sand dark:text-slate-400 dark:hover:text-white transition-colors"
            aria-label="Close Join Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Identity Confirmation */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-brand-sand dark:bg-slate-800/80 border border-brand-sand-border/70 dark:border-slate-700">
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={currentUser?.name || 'Traveler'}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-teal"
          />
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-brand-navy/50 dark:text-slate-400">
              Joining group as:
            </span>
            <div className="text-xs font-bold text-brand-navy dark:text-white truncate">
              {currentUser?.name || 'Traveler'} <span className="font-normal text-brand-teal">({currentUser?.role || 'Explorer'})</span>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-brand-navy dark:text-slate-200 mb-1.5">
              Trip Invite Code or Link
            </label>
            <div className="relative">
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => {
                  setInviteCodeInput(e.target.value.toUpperCase());
                  if (error) setError('');
                }}
                placeholder="e.g. TANDEM-GOA-77"
                className="w-full pl-3.5 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-sm font-bold tracking-wider text-brand-navy dark:text-white placeholder:text-brand-navy/30 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange uppercase"
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-1.5 text-xs font-semibold text-rose-500 animate-fadeIn">
                {error}
              </p>
            )}
          </div>

          {/* Real Team Join Guidance */}
          <div className="p-3 rounded-2xl bg-brand-sand/50 dark:bg-slate-800/50 border border-brand-sand-border dark:border-slate-700/60 text-xs text-brand-navy/70 dark:text-slate-300 flex items-start gap-2">
            <Users className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
            <p>
              Enter the invite code or trip ID shared by your trip host to collaborate in real-time.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isJoining}
            className="w-full py-3.5 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-bold flex items-center justify-center gap-2 shadow-card hover:shadow-card-hover transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Users className="w-4 h-4" />
            <span>{isJoining ? 'Joining Team...' : 'Join Group & Enter Workspace →'}</span>
          </button>
        </form>

        <p className="text-[11px] text-center text-brand-navy/50 dark:text-slate-500">
          Once you join, you will be able to vote on stays, add tasks & split expenses with the team.
        </p>

      </div>
    </div>
  );
};

export default JoinTripModal;
