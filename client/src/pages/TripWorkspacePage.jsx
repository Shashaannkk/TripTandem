import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import { useTrip } from '../context/TripContext';
import { api } from '../services/api';
import { Calendar, Wallet, Sparkles, MessageSquare, Info, BarChart3 } from 'lucide-react';

export const TripWorkspacePage = () => {
  const { tripId } = useParams();
  const { trip, setTrip, isChatOpen, isAiConciergeOpen, conflicts } = useTrip();
  const [workspaceTab, setWorkspaceTab] = useState('itinerary'); // 'itinerary' | 'budget'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [targetDayForAdd, setTargetDayForAdd] = useState(1);

  useEffect(() => {
    if (tripId && trip?.id !== tripId) {
      api.getTripById(tripId).then(fetched => {
        if (fetched) {
          setTrip(fetched);
        }
      });
    }
  }, [tripId, trip?.id, setTrip]);

  const handleOpenAddModal = (dayNumber) => {
    setTargetDayForAdd(dayNumber);
    setIsAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-brand-sand pb-24">
      
      {/* 1. Trip Header with live presence & quick triggers */}
      <TripHeader />

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

            <button
              onClick={() => setIsAnalyticsModalOpen(true)}
              className="py-4 text-sm font-semibold transition-all relative flex items-center gap-2 text-brand-navy/60 hover:text-brand-navy cursor-pointer ml-auto"
              title="View live event-driven session collaboration metrics & zero-sum budget reconciliation"
            >
              <BarChart3 className="w-4 h-4 text-brand-teal" />
              <span className="hidden sm:inline">Session Analytics</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal border border-brand-teal/30">
                Audit
              </span>
            </button>

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
