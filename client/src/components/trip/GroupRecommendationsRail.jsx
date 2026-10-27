import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Star, 
  Plus, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  MapPin, 
  Utensils, 
  Compass, 
  Hotel,
  TrendingUp,
  Info
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const GroupRecommendationsRail = () => {
  const { trip, activeDayIndex, addActivity } = useTrip();
  const { formatPrice } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [addedIds, setAddedIds] = useState(new Set());
  const [categoryFilter, setCategoryFilter] = useState('all');

  const currentDay = trip?.days?.[activeDayIndex] || { dayNumber: 1 };

  useEffect(() => {
    let isMounted = true;
    if (!trip?.id) {
      setLoading(false);
      return;
    }

    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const data = await api.getGroupRecommendations(trip.id, 8);
        if (isMounted) {
          setRecommendations(data.recommendations || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Group recommendation engine offline/fallback:', err);
          setError('Could not load automated recommendations.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRecommendations();
    return () => {
      isMounted = false;
    };
  }, [trip?.id]);

  const handleAddVenue = (venue) => {
    if (addedIds.has(venue.id)) return;

    addActivity(currentDay.dayNumber, 'afternoon', {
      venueId: venue.id,
      venueName: venue.name,
      title: venue.name,
      category: venue.category || 'experience',
      costPerPerson: venue.price || 0,
      image: venue.images?.[0] || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
      notes: `Recommended for group fit (${venue.matchPercentage || 85}% match): ${venue.explanation || ''}`,
    });

    setAddedIds(prev => new Set(prev).add(venue.id));
  };

  const filteredRecs = categoryFilter === 'all'
    ? recommendations
    : recommendations.filter(r => (r.category || '').toLowerCase() === categoryFilter.toLowerCase());

  if (loading) {
    return (
      <div className="mb-6 p-4 rounded-3xl bg-white dark:bg-[#111C2E] border border-brand-sand-border dark:border-[#1E2D42] shadow-subtle animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-orange/20" />
          <div className="h-4 bg-brand-sand-border dark:bg-slate-700 rounded w-48" />
        </div>
      </div>
    );
  }

  if (recommendations.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="mb-8 rounded-3xl bg-gradient-to-br from-white to-brand-sand/40 dark:from-[#111C2E] dark:to-[#0B1320] border border-brand-sand-border dark:border-[#1E2D42] shadow-subtle overflow-hidden transition-all">
      
      {/* Header bar */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-brand-sand-border dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-orange to-amber-500 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-brand-navy dark:text-white">
                Recommended for Your Group
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
                Hybrid AI
              </span>
            </div>
            <p className="text-[11px] text-brand-navy/60 dark:text-slate-400">
              Personalized to all {trip?.members?.length || 'group'} members' dietary profiles, budget ceiling & past travel affinity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter Pills */}
          <div className="hidden sm:flex items-center gap-1 bg-brand-sand dark:bg-slate-800 p-1 rounded-xl border border-brand-sand-border dark:border-slate-700 text-xs">
            {['all', 'restaurant', 'experience'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-white dark:bg-slate-700 text-brand-navy dark:text-white shadow-xs'
                    : 'text-brand-navy/60 dark:text-slate-400 hover:text-brand-navy'
                }`}
              >
                {cat === 'all' ? 'All Fits' : cat === 'restaurant' ? 'Dining' : 'Experiences'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl hover:bg-brand-sand dark:hover:bg-slate-800 text-brand-navy/60 dark:text-slate-400 transition-all cursor-pointer"
            title={isExpanded ? 'Collapse recommendations rail' : 'Expand recommendations rail'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Recommendations Carousel / Grid */}
      {isExpanded && (
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredRecs.map((rec) => {
              const isAdded = addedIds.has(rec.id);
              const coverImg = rec.images?.[0] || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80';

              return (
                <div
                  key={rec.id}
                  className="bg-white dark:bg-[#162338] rounded-2xl border border-brand-sand-border dark:border-slate-800 overflow-hidden shadow-subtle hover:shadow-floating transition-all flex flex-col justify-between"
                >
                  {/* Image & Match Score Badge */}
                  <div className="relative h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={coverImg}
                      alt={rec.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-navy/80 backdrop-blur-md text-white text-[10px] font-bold">
                      <Sparkles className="w-3 h-3 text-brand-orange" />
                      <span>{rec.matchPercentage}% Group Fit</span>
                    </div>

                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-brand-navy dark:text-white text-[10px] font-bold shadow-xs">
                      {formatPrice(rec.price)}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] uppercase font-bold text-brand-orange tracking-wider">
                          {rec.category || 'Experience'}
                        </span>
                        {rec.rating && (
                          <div className="flex items-center gap-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{rec.rating}</span>
                          </div>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-brand-navy dark:text-white line-clamp-1">
                        {rec.name}
                      </h4>

                      {/* Explanation Snippet */}
                      <p className="text-[11px] text-brand-navy/70 dark:text-slate-300 mt-1 line-clamp-2 italic bg-brand-sand/60 dark:bg-slate-800/60 p-1.5 rounded-lg border border-brand-sand-border dark:border-slate-700/50">
                        "{rec.explanation}"
                      </p>

                      {/* Dietary / Feature Tags */}
                      {rec.dietaryTags && rec.dietaryTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {rec.dietaryTags.slice(0, 2).map((tag, i) => (
                            <span 
                              key={i} 
                              className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add to Day Action */}
                    <button
                      onClick={() => handleAddVenue(rec)}
                      disabled={isAdded}
                      className={`w-full mt-3 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-500 text-white'
                          : 'bg-brand-navy hover:bg-slate-800 text-white shadow-xs'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added to Day {currentDay.dayNumber}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Day {currentDay.dayNumber}</span>
                        </>
                      )}
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

