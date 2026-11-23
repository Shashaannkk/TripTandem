import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TripHeader } from '../components/trip/TripHeader';
import { ItineraryDayTabs } from '../components/trip/ItineraryDayTabs';
import { ItineraryView } from '../components/trip/ItineraryView';
import { BudgetDashboard } from '../components/trip/BudgetDashboard';
import { GroupChatDrawer } from '../components/trip/GroupChatDrawer';
import { AiConciergeDrawer } from '../components/trip/AiConciergeDrawer';
import { InviteModal } from '../components/trip/InviteModal';
import { AddActivityModal } from '../components/trip/AddActivityModal';
import { ContestedSlotDuelModal } from '../components/trip/ContestedSlotDuelModal';
import { SessionAnalyticsModal } from '../components/trip/SessionAnalyticsModal';
import { LiveMultiplayerCanvas } from '../components/trip/LiveMultiplayerCanvas';
import { useTrip } from '../context/TripContext';
import { api } from '../services/api';
import { fetchTripSnapshot } from '../services/cloudRelay';
import { Calendar, Wallet, Sparkles, MessageSquare, Info, BarChart3, Compass } from 'lucide-react';

export const TripWorkspacePage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { trip, setTrip, isChatOpen, isAiConciergeOpen, conflicts } = useTrip();
  const [workspaceTab, setWorkspaceTab] = useState('itinerary'); // 'itinerary' | 'budget'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [targetDayForAdd, setTargetDayForAdd] = useState(1);

  useEffect(() => {
    if (!tripId) return;

    // 1. If in-memory trip is already this trip, preserve it!
    const norm = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const targetNorm = norm(tripId);

    if (trip && (norm(trip.id) === targetNorm || norm(trip.inviteCode) === targetNorm || (targetNorm.length >= 4 && (norm(trip.id).includes(targetNorm) || norm(trip.inviteCode).includes(targetNorm))))) {
      return;
    }

    // 2. Check localStorage
    try {
      const stored = localStorage.getItem('tt_all_trips');
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find(t => norm(t.id) === targetNorm || norm(t.inviteCode) === targetNorm || (targetNorm.length >= 4 && (norm(t.id).includes(targetNorm) || norm(t.inviteCode).includes(targetNorm))));
        if (found) {
          setTrip(found);
          return;
        }
      }
      const activeStored = localStorage.getItem('tt_active_trip');
      if (activeStored) {
        const parsed = JSON.parse(activeStored);
        if (norm(parsed.id) === targetNorm || norm(parsed.inviteCode) === targetNorm) {
          setTrip(parsed);
          return;
        }
      }
    } catch (e) {}

    // 3. Query other open tabs via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('triptandem_live_sync');
        bc.postMessage({ type: 'REQUEST_TRIP_STATE', tripId });
        bc.onmessage = (e) => {
          if (e.data?.type === 'PROVIDE_TRIP_STATE' && e.data.trip) {
            const bTrip = e.data.trip;
            if (norm(bTrip.id) === targetNorm || norm(bTrip.inviteCode) === targetNorm) {
              setTrip(bTrip);
              try { bc.close(); } catch (err) {}
            }
          }
        };
        setTimeout(() => {
          try { bc.close(); } catch (err) {}
        }, 1200);
      } catch (e) {}
    }

    // 4. Check server API
    api.getTripById(tripId).then(fetched => {
      if (fetched && (norm(fetched.id) === targetNorm || norm(fetched.inviteCode) === targetNorm)) {
        setTrip(prev => {
          if (prev && (norm(prev.id) === targetNorm || norm(prev.inviteCode) === targetNorm)) {
            const prevItemCount = (prev.days || []).reduce((acc, d) => acc + (d.items || []).length, 0);
            const fetchedItemCount = (fetched.days || []).reduce((acc, d) => acc + (d.items || []).length, 0);
            if (prevItemCount >= fetchedItemCount && prevItemCount > 0) return prev;
          }
          return fetched;
        });
      }
    });

    // 5. Query Cloud Relay Snapshot (for cross-device / direct URL visits)
    fetchTripSnapshot(tripId).then(snapshot => {
      if (snapshot && (norm(snapshot.id) === targetNorm || norm(snapshot.inviteCode) === targetNorm || (targetNorm.length >= 4 && norm(snapshot.inviteCode).includes(targetNorm)))) {
        setTrip(prev => {
          if (prev && (norm(prev.id) === targetNorm || norm(prev.inviteCode) === targetNorm)) {
            const prevItemCount = (prev.days || []).reduce((acc, d) => acc + (d.items || []).length, 0);
            const snapshotItemCount = (snapshot.days || []).reduce((acc, d) => acc + (d.items || []).length, 0);
            if (prevItemCount >= snapshotItemCount && prevItemCount > 0) return prev;
          }
          return snapshot;
        });
      }
    });
  }, [tripId, setTrip]);

  const handleOpenAddModal = (dayNumber) => {
    setTargetDayForAdd(dayNumber);
    setIsAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-brand-sand pb-24">
      
      {/* 1. Trip Header with live presence & quick triggers */}
      <TripHeader />

      {/* Live Multiplayer Collaborative Canvas (Multi-Cursor & Focus) */}
      <LiveMultiplayerCanvas>
        {/* 2. Workspace View Tabs: Itinerary vs Budget */}
        <div className="bg-white border-b border-brand-sand-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              
              <button
                onClick={() => setWorkspaceTab('itinerary')}
                className={`py-4 text-sm font-semibold transition-all relative flex items-center gap-2 ${
                  workspaceTab === 'itinerary'
                    ? 'text-brand-navy'
                    : 'text-brand-navy/60 hover:text-brand-navy'
                }`}
              >
                <Calendar className="w-4 h-4 text-brand-orange" />
                <span>Itinerary & Real-Time Voting</span>
                {conflicts && conflicts.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
                {workspaceTab === 'itinerary' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange rounded-full" />
                )}
              </button>

              <button
                onClick={() => setWorkspaceTab('budget')}
                className={`py-4 text-sm font-semibold transition-all relative flex items-center gap-2 ${
                  workspaceTab === 'budget'
                    ? 'text-brand-navy'
                    : 'text-brand-navy/60 hover:text-brand-navy'
                }`}
              >
                <Wallet className="w-4 h-4 text-brand-teal" />
                <span>Shared Budget & Fair Splits</span>
                {workspaceTab === 'budget' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-teal rounded-full" />
                )}
              </button>

              <div className="flex items-center gap-2 ml-auto py-2">
                <button
                  onClick={() => {
                    const destCity = (trip?.destination || 'Manali').split(',')[0].trim();
                    navigate(`/explore?destination=${encodeURIComponent(destCity)}&tripId=${trip?.id}&tripTitle=${encodeURIComponent(trip?.title || 'Trip')}`);
                  }}
                  className="py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 bg-brand-orange/10 hover:bg-brand-orange text-brand-orange hover:text-white border border-brand-orange/30 cursor-pointer shadow-xs"
                  title={`Browse all available places in ${trip?.destination || 'destination'} to add or edit itinerary`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Browse {(trip?.destination || 'Destination').split(',')[0].trim()} Catalog ➔</span>
                  <span className="sm:hidden">Places ➔</span>
                </button>

                <button
                  onClick={() => setIsAnalyticsModalOpen(true)}
                  className="py-2 px-3 text-xs font-semibold transition-all relative flex items-center gap-1.5 text-brand-navy/60 hover:text-brand-navy cursor-pointer border border-brand-sand-border rounded-full hover:bg-brand-sand"
                  title="View live event-driven session collaboration metrics & zero-sum budget reconciliation"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-brand-teal" />
                  <span className="hidden md:inline">Analytics</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* 3. Itinerary Day Tabs (Only shown when viewing Itinerary) */}
        {workspaceTab === 'itinerary' && (
          <ItineraryDayTabs />
        )}

        {/* 4. Main Body Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {workspaceTab === 'itinerary' ? (
            <ItineraryView onOpenAddModal={handleOpenAddModal} />
          ) : (
            <BudgetDashboard />
          )}
        </div>
      </LiveMultiplayerCanvas>

      {/* Real-time Side Drawers */}
      <GroupChatDrawer />
      <AiConciergeDrawer />
      
      {/* Modals */}
      <InviteModal />
      <AddActivityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultDayNumber={targetDayForAdd}
      />
      <ContestedSlotDuelModal />
      {isAnalyticsModalOpen && trip && (
        <SessionAnalyticsModal
          trip={trip}
          onClose={() => setIsAnalyticsModalOpen(false)}
        />
      )}

    </div>
  );
};

export default TripWorkspacePage;
