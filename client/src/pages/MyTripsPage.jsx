import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Users, 
  Calendar, 
  MapPin, 
  ArrowRight, 
  Sparkles, 
  Wallet, 
  Ticket, 
  Copy, 
  Trash2, 
  ExternalLink,
  CheckCircle2,
  BarChart3,
  Database
} from 'lucide-react';
import { useTrip } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { PersonalTravelProfileCard } from '../components/trip/PersonalTravelProfileCard';
import { SessionAnalyticsModal } from '../components/trip/SessionAnalyticsModal';
import { AdminDatasetUploadModal } from '../components/trip/AdminDatasetUploadModal';

const DEFAULT_TRIPS = [
  {
    id: 'trip-manali-2026',
    title: 'Manali Alpine Pines & Solang High',
    destination: 'Manali, Himachal Pradesh',
    inviteCode: 'TANDEM-MAN-42',
    coverImage: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&auto=format&fit=crop&q=80',
    startDate: '2026-12-20',
    endDate: '2026-12-24',
    daysCount: 4,
    members: [
      { name: 'Alex Morgan', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
      { name: 'Rohan Mehta', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    ],
    budget: { totalTarget: 32000, spent: 14500 },
    status: 'Upcoming',
  },
  {
    id: 'trip-jaipur-2026',
    title: 'Pink City Royal Haveli Retreat',
    destination: 'Jaipur, Rajasthan',
    inviteCode: 'TANDEM-JAI-19',
    coverImage: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&auto=format&fit=crop&q=80',
    startDate: '2026-10-05',
    endDate: '2026-10-08',
    daysCount: 3,
    members: [
      { name: 'Priya Sharma', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
      { name: 'Aisha Khan', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    ],
    budget: { totalTarget: 28000, spent: 28000 },
    status: 'Completed',
  },
  {
    id: 'trip-kerala-2026',
    title: 'Kerala Backwaters & Misty Tea Hills',
    destination: 'Munnar & Alleppey, Kerala',
    inviteCode: 'TANDEM-KER-88',
    coverImage: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80',
    startDate: '2026-11-12',
    endDate: '2026-11-17',
    daysCount: 5,
    members: [
      { name: 'Alex Morgan', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
      { name: 'Priya Sharma', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
      { name: 'Rohan Mehta', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    ],
    budget: { totalTarget: 45000, spent: 18200 },
    status: 'Upcoming',
  }
];

export const MyTripsPage = () => {
  const navigate = useNavigate();
  const { trip, setTrip, setIsJoinModalOpen } = useTrip();
  const { formatPrice, currentUser, showToast } = useAuth();

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'upcoming' | 'completed'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDestination, setNewDestination] = useState('Manali, India');
  const [newDays, setNewDays] = useState('4');
  const [newBudget, setNewBudget] = useState('32000');

  // PRD Modals State
  const [selectedTripForAnalytics, setSelectedTripForAnalytics] = useState(null);
  const [isAdminUploadOpen, setIsAdminUploadOpen] = useState(false);

  // Load persistent trips list
  const [tripsList, setTripsList] = useState(() => {
    try {
      const stored = localStorage.getItem('tt_all_trips');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [trip, ...DEFAULT_TRIPS].filter(Boolean);
  });

  // Sync active trip into the trips list
  useEffect(() => {
    if (!trip) return;
    setTripsList(prev => {
      const exists = prev.find(t => t.id === trip.id);
      let updated;
      if (exists) {
        updated = prev.map(t => t.id === trip.id ? { ...t, ...trip } : t);
      } else {
        updated = [trip, ...prev];
      }
      try {
        localStorage.setItem('tt_all_trips', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, [trip]);

  const handleCopyCode = (e, code) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard?.writeText(code);
    showToast(`Copied invite code: ${code}`, 'success');
  };

  const handleDeleteTrip = (e, tripId) => {
    e.stopPropagation();
    if (tripId === trip?.id) {
      showToast('Cannot delete currently active trip workspace', 'warning');
      return;
    }
    const filtered = tripsList.filter(t => t.id !== tripId);
    setTripsList(filtered);
    try {
      localStorage.setItem('tt_all_trips', JSON.stringify(filtered));
    } catch (e) {}
    showToast('Trip workspace removed', 'info');
  };

  const handleOpenTrip = (targetTrip) => {
    setTrip(targetTrip);
    localStorage.setItem('tt_active_trip', JSON.stringify(targetTrip));
    navigate(`/workspace/${targetTrip.id}`);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const created = await api.createTrip({
      title: newTitle || `${newDestination} Rhythm Escape`,
      destination: newDestination,
      daysCount: Number(newDays),
      budgetTotal: Number(newBudget),
      createdBy: currentUser,
    });

    const updated = [created, ...tripsList];
    setTripsList(updated);
    try {
      localStorage.setItem('tt_all_trips', JSON.stringify(updated));
    } catch (err) {}

    setTrip(created);
    setIsCreateModalOpen(false);
    showToast(`Created trip: ${created.title}!`, 'success');
    navigate(`/workspace/${created.id}`);
  };

  // Filter trips
  const displayedTrips = tripsList.filter(item => {
    if (!item) return false;
    const isActive = item.id === trip?.id;
    if (activeFilter === 'active') return isActive;
    if (activeFilter === 'upcoming') return item.status === 'Upcoming' && !isActive;
    if (activeFilter === 'completed') return item.status === 'Completed';
    return true;
  });

  return (
    <div className="min-h-screen bg-brand-sand py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-orange uppercase tracking-wider mb-1">
              <Users className="w-3.5 h-3.5" />
              <span>Collaborative Itineraries</span>
            </div>
            <h1 className="text-3xl font-semibold text-brand-navy dark:text-white">
              My Collaborative Trips
            </h1>
            <p className="text-xs text-brand-navy/60 dark:text-slate-400 mt-1">
              Shared workspaces with live voting, conflict safeguards, real rate maps, and split budgets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            {/* PRD Admin Dataset Management (Section 6.3 & 10.1) */}
            <button
              onClick={() => setIsAdminUploadOpen(true)}
              className="inline-flex items-center gap-2 bg-brand-sand hover:bg-brand-sand-muted text-brand-navy border border-brand-sand-border dark:bg-slate-800 dark:border-slate-700 dark:text-white px-4 py-3 rounded-full text-xs sm:text-sm font-semibold shadow-subtle transition-all cursor-pointer"
              title="Admin destination dataset upload & schema validator"
            >
              <Database className="w-4 h-4 text-brand-orange" />
              <span>Admin Ingestion</span>
            </button>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white px-5 py-3 rounded-full text-sm font-semibold shadow-subtle hover:border-brand-teal transition-all active:scale-95 cursor-pointer"
            >
              <Ticket className="w-4 h-4 text-brand-teal" />
              <span>Join with Code</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-hover text-white px-6 py-3 rounded-full text-sm font-semibold shadow-card transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Trip</span>
            </button>
          </div>
        </div>

        {/* PRD Section 6.3: Personal Travel Preference Profile (Traveler DNA) */}
        <PersonalTravelProfileCard />

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-brand-sand-border dark:border-slate-800 pb-3 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: `All Trips (${tripsList.length})` },
            { id: 'active', label: 'Active Workspace' },
            { id: 'upcoming', label: 'Upcoming Trips' },
            { id: 'completed', label: 'Past / Completed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-brand-navy text-white dark:bg-white dark:text-brand-navy shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-brand-navy/70 dark:text-slate-300 hover:text-brand-navy border border-brand-sand-border dark:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedTrips.map((item) => {
            const isActive = item.id === trip?.id;
            const targetBudget = item.budget?.totalTarget || 30000;
            const spentBudget = item.budget?.spent || 0;
            const spentPercent = Math.min(100, Math.round((spentBudget / targetBudget) * 100));

            return (
              <div
                key={item.id}
                onClick={() => handleOpenTrip(item)}
                className={`group cursor-pointer bg-white dark:bg-[#111C2E] rounded-3xl p-4 border transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between space-y-4 shadow-subtle hover:shadow-card-hover ${
                  isActive 
                    ? 'border-brand-orange ring-2 ring-brand-orange/30' 
                    : 'border-brand-sand-border dark:border-[#1E2D42]'
                }`}
              >
                <div className="space-y-3">
                  <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-brand-sand dark:bg-slate-800 relative">
                    <img
                      src={item.coverImage || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm ${
                        isActive 
                          ? 'bg-brand-orange text-white' 
                          : 'bg-white/95 dark:bg-slate-900/95 text-brand-navy dark:text-white'
                      }`}>
                        {isActive ? '🌟 Active Workspace' : item.status || 'Upcoming'}
                      </span>
                    </div>

                    {/* Quick Invite Code Copy Pill */}
                    {item.inviteCode && (
                      <button
                        onClick={(e) => handleCopyCode(e, item.inviteCode)}
                        className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 hover:bg-black/80 transition-colors"
                        title="Copy Invite Code"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{item.inviteCode}</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 px-1">
                    <div className="flex items-center gap-1 text-xs text-brand-navy/60 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                      <span>{item.destination}</span>
                    </div>
                    <h3 className="font-bold text-base text-brand-navy dark:text-white group-hover:text-brand-orange transition-colors truncate">
                      {item.title}
                    </h3>
                    
                    <div className="flex items-center gap-3 text-xs text-brand-navy/70 dark:text-slate-300 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-brand-teal" />
                        <span>{item.daysCount || item.days?.length || 3} Days</span>
                      </span>
                      <span>·</span>
                      <span>Budget: {formatPrice(targetBudget)}</span>
                    </div>

                    {/* Budget Progress Bar */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[10px] text-brand-navy/60 dark:text-slate-400 pb-1">
                        <span>Spent: {formatPrice(spentBudget)}</span>
                        <span>{spentPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-brand-sand dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-teal to-brand-orange rounded-full"
                          style={{ width: `${spentPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Members row & Enter workspace CTA */}
                <div className="pt-3 border-t border-brand-sand-border dark:border-slate-800 flex items-center justify-between px-1">
                  <div className="flex items-center -space-x-2">
                    {(item.members || []).map((m, idx) => (
                      <img
                        key={idx}
                        src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={m.name}
                        className="w-6 h-6 rounded-full object-cover border border-white dark:border-slate-800"
                        title={m.name}
                      />
                    ))}
                    <span className="pl-3 text-[11px] text-brand-navy/60 dark:text-slate-400 font-medium">
                      {item.members?.length || 2} travelers
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Session Analytics (PRD Section 6.3) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTripForAnalytics(item);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-brand-sand dark:bg-slate-800 hover:bg-brand-sand-muted text-[11px] font-bold text-brand-navy dark:text-slate-300 flex items-center gap-1 border border-brand-sand-border dark:border-slate-700"
                      title="View Post-Trip Session Analytics & Audit"
                    >
                      <BarChart3 className="w-3 h-3 text-brand-teal" />
                      <span>Analytics</span>
                    </button>

                    {!isActive && (
                      <button
                        onClick={(e) => handleDeleteTrip(e, item.id)}
                        className="p-1.5 rounded-full text-brand-navy/40 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove trip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange group-hover:translate-x-1 transition-transform">
                      <span>Enter Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Create New Trip Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-floating border border-brand-sand-border dark:border-slate-800 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-brand-sand-border dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-brand-navy dark:text-white">Create Collaborative Trip</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-navy dark:text-slate-300 mb-1">
                  Trip Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Manali Alpine Chalets & High Trails"
                  className="w-full text-xs rounded-xl p-2.5 bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-navy dark:text-slate-300 mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  required
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  placeholder="e.g. Goa, Manali, Jaipur, Kerala, Udaipur"
                  className="w-full text-xs rounded-xl p-2.5 bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-brand-navy dark:text-slate-300 mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={newDays}
                    onChange={(e) => setNewDays(e.target.value)}
                    className="w-full text-xs rounded-xl p-2.5 bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-navy dark:text-slate-300 mb-1">
                    Target Budget (₹)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="w-full text-xs rounded-xl p-2.5 bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-brand-navy/70 dark:text-slate-400 hover:bg-brand-sand"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold bg-brand-orange hover:bg-brand-orange-hover text-white shadow-sm cursor-pointer"
                >
                  Create & Launch Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Analytics Modal (PRD Section 6.3) */}
      <SessionAnalyticsModal
        trip={selectedTripForAnalytics}
        onClose={() => setSelectedTripForAnalytics(null)}
      />

      {/* Admin Dataset Management Modal (PRD Section 6.3 & 10.1) */}
      <AdminDatasetUploadModal
        isOpen={isAdminUploadOpen}
        onClose={() => setIsAdminUploadOpen(false)}
      />

    </div>
  );
};

export default MyTripsPage;
