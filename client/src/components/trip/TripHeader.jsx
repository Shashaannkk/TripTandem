import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Sparkles, 
  MessageSquare, 
  Wallet, 
  Radio, 
  Calendar, 
  MapPin, 
  Share2 
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';

export const TripHeader = () => {
  const { 
    trip, 
    activeCollaborators, 
    setIsInviteModalOpen, 
    setIsAiConciergeOpen, 
    isAiConciergeOpen,
    setIsChatOpen, 
    isChatOpen,
    budgetSummary,
    updateMemberRole,
    removeMember,
    syncDriftMs = 38,
    connectionQuality = 'fast',
    isLeaderConnected = true,
    transferLeaderRole,
    toggleRoomLock
  } = useTrip();

  const { formatPrice, currentUser } = useAuth();
  const [isCrewModalOpen, setIsCrewModalOpen] = useState(false);

  if (!trip) return null;

  return (
    <div className="bg-white border-b border-brand-sand-border shadow-subtle relative">
      
      {/* 0. Leader Disconnect Alert Banner (PRD Section 6.1) */}
      {!isLeaderConnected && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="font-bold">Trip Leader Disconnected</span>
            <span className="hidden sm:inline">— Lock/finalize mutations are frozen until reconnection or role handover.</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/50 dark:bg-amber-900/40">
            PRD §6.1 Enforced
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Top row: Destination badge, Real-time status, Action drawers */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-sand text-brand-navy border border-brand-sand-border">
              <MapPin className="w-3.5 h-3.5 text-brand-orange" />
              <span>{trip.destination}</span>
            </span>

            {/* Live Canvas Sync Drift & Connection Health (PRD Section 1.3 & 7.3.4) */}
            <span 
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                connectionQuality === 'fast'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : connectionQuality === 'good'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
              title={`Canvas sync drift roundtrip: ${syncDriftMs}ms (PRD Target < 100ms)`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>{syncDriftMs}ms · Sync Drift &lt; 100ms</span>
            </span>

            {trip.isRoomLocked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                🔒 Workspace Locked
              </span>
            )}
          </div>

          {/* Quick Drawer Toggles */}
          <div className="flex items-center gap-2">
            
            {/* AI Concierge Toggle */}
            <button
              onClick={() => setIsAiConciergeOpen(!isAiConciergeOpen)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                isAiConciergeOpen
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'bg-brand-orange-light text-brand-orange hover:bg-brand-orange hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Concierge</span>
            </button>

            {/* Chat Drawer Toggle */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                isChatOpen
                  ? 'bg-brand-navy text-white shadow-sm'
                  : 'bg-brand-sand hover:bg-brand-sand-muted text-brand-navy'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-brand-teal" />
              <span>Group Chat</span>
              {trip.chat && trip.chat.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-brand-orange" />
              )}
            </button>

            {/* Invite Button */}
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-brand-teal hover:bg-brand-teal-hover text-white shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Friends</span>
            </button>

          </div>
        </div>

        {/* Main Title, Dates & Collaborator Avatars */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-brand-navy tracking-tight">
              {trip.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-brand-navy/70">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4 text-brand-teal" />
                <span>{trip.startDate} to {trip.endDate} ({trip.daysCount} Days)</span>
              </span>
              <span>·</span>
              <span className="font-semibold text-brand-navy">
                Target Budget: {formatPrice(trip.budget.totalTarget)} ({formatPrice(budgetSummary?.perPersonTarget || 10000)}/person)
              </span>
            </div>
          </div>

          {/* Connected Collaborators with live glowing dots */}
          <div className="relative">
            <button
              onClick={() => setIsCrewModalOpen(true)}
              className="flex items-center gap-3 bg-brand-sand hover:bg-brand-sand-muted p-2 px-4 rounded-2xl border border-brand-sand-border transition-all cursor-pointer text-left"
              title="Click to view & manage team crew members"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-brand-navy flex items-center justify-end gap-1">
                  <span>{(trip.members || []).length} Travelers</span>
                </div>
                <div className="text-[11px] text-brand-teal font-medium flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
                  <span>Manage Crew</span>
                </div>
              </div>

              <div className="flex items-center -space-x-2.5">
                {(trip.members || []).map((member) => {
                  const isOnline = activeCollaborators.some(c => c.id === member.id) || member.id === currentUser?.id;
                  return (
                    <div key={member.id} className="relative group">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-9 h-9 rounded-full object-cover border-2 border-white ring-1 ring-brand-sand-border"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-brand-navy text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap z-30 shadow-card">
                        {member.name} ({member.role || 'Planner'})
                      </div>
                    </div>
                  );
                })}
              </div>
            </button>

            {/* Real Crew Management & Moderation Modal (PRD Section 5.1/6.1) */}
            {isCrewModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white dark:bg-[#111C2E] max-w-md w-full rounded-3xl shadow-floating border border-brand-sand-border dark:border-slate-800 p-6 space-y-4">
                  
                  <div className="flex items-center justify-between border-b border-brand-sand-border dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-brand-teal" />
                      <div>
                        <h3 className="text-base font-bold text-brand-navy dark:text-white">
                          Trip Planning Crew
                        </h3>
                        <p className="text-xs text-brand-navy/60 dark:text-slate-400">
                          {(trip.members || []).length} real members joined
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsCrewModalOpen(false)}
                      className="p-1.5 rounded-full hover:bg-brand-sand dark:hover:bg-slate-800 text-brand-navy/50 dark:text-slate-400 hover:text-brand-navy dark:hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Members List */}
                  <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                    {(trip.members || []).map((m) => {
                      const isSelf = m.id === currentUser?.id;
                      const isLeader = trip.leaderUserId === currentUser?.id || trip.members?.[0]?.id === currentUser?.id;
                      const isMemberLeader = m.role === 'Leader' || m.role === 'Owner' || trip.leaderUserId === m.id;

                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-brand-sand/50 dark:bg-slate-800/50 border border-brand-sand-border dark:border-slate-700/60 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <img src={m.avatar} alt={m.name} className="w-9 h-9 rounded-full object-cover ring-1 ring-brand-teal" />
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-brand-navy dark:text-white truncate flex items-center gap-1.5">
                                <span>{m.name}</span>
                                {isSelf && <span className="text-[10px] text-brand-orange font-bold">(You)</span>}
                              </div>
                              <div className="text-[10px] text-brand-navy/60 dark:text-slate-400 truncate">
                                {m.email || 'Joined via invite link'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Role Tag or Role Switcher for Trip Leader */}
                            {isLeader && !isMemberLeader && !isSelf ? (
                              <select
                                value={m.role || 'Planner'}
                                onChange={(e) => updateMemberRole(m.id, e.target.value)}
                                className="text-[11px] font-bold py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white focus:outline-none cursor-pointer"
                              >
                                <option value="Planner">Planner ✍️</option>
                                <option value="Viewer">Viewer 👀</option>
                              </select>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isMemberLeader
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : m.role === 'Viewer'
                                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}>
                                {m.role || 'Planner'}
                              </span>
                            )}

                            {/* Transfer Leadership (PRD Section 6.1) */}
                            {isLeader && !isMemberLeader && !isSelf && (
                              <button
                                onClick={() => transferLeaderRole(m.id, m.name)}
                                className="text-[10px] font-bold px-2 py-1 rounded bg-amber-100 text-amber-900 hover:bg-amber-200"
                                title="Transfer Leader Role"
                              >
                                👑 Make Lead
                              </button>
                            )}

                            {/* Remove button for Trip Leader */}
                            {isLeader && !isMemberLeader && !isSelf && (
                              <button
                                onClick={() => removeMember(m.id)}
                                className="text-[11px] text-rose-500 hover:text-rose-700 p-1"
                                title="Remove participant from trip"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Leader Controls: Lock Workspace Toggle (PRD Section 6.1) */}
                  <div className="pt-2 border-t border-brand-sand-border dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-brand-navy dark:text-white flex items-center gap-1.5">
                        <span>🔒 Lock Workspace</span>
                        {trip.isRoomLocked && <span className="text-[10px] text-amber-600 font-bold">(Active)</span>}
                      </div>
                      <div className="text-[10px] text-brand-navy/60 dark:text-slate-400">
                        Prevents concurrent item moves or deletes
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleRoomLock(!trip.isRoomLocked)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        trip.isRoomLocked
                          ? 'bg-amber-500 text-slate-900 shadow-sm'
                          : 'bg-brand-sand dark:bg-slate-800 text-brand-navy dark:text-white border border-brand-sand-border dark:border-slate-700'
                      }`}
                    >
                      {trip.isRoomLocked ? 'Unlock Room' : 'Lock Room'}
                    </button>
                  </div>

                  {/* Invite New Travelers Button */}
                  <div>
                    <button
                      onClick={() => {
                        setIsCrewModalOpen(false);
                        setIsInviteModalOpen(true);
                      }}
                      className="w-full py-3 rounded-2xl bg-brand-teal hover:bg-brand-teal-hover text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Invite More Co-Travelers</span>
                    </button>
                  </div>

                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default TripHeader;
