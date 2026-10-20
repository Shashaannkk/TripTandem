import React, { useState } from 'react';
import { 
  Clock, 
  MapPin, 
  ThumbsUp, 
  ThumbsDown, 
  Lock, 
  Vote, 
  Sparkles, 
  Trash2, 
  MoreVertical, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Edit3,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTrip } from '../../context/TripContext';
import { Badge } from '../common/Badge';

export const ActivityCard = ({ item, dayNumber, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const { currentUser, formatPrice } = useAuth();
  const { castVote, removeActivity, updateActivity, trip } = useTrip();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item.title);
  const [editedTime, setEditedTime] = useState(item.startTime);

  const votes = item.votes || { up: [], down: [] };
  const hasUpvoted = currentUser?.id ? votes.up?.includes(currentUser.id) : false;
  const hasDownvoted = currentUser?.id ? votes.down?.includes(currentUser.id) : false;

  const totalMembers = trip?.members?.length || 4;
  const lockThreshold = Math.ceil(totalMembers * 0.75); // e.g. 3 votes
  const isLocked = item.status === 'locked';

  const handleSaveEdit = () => {
    updateActivity(item.id, {
      title: editedTitle,
      startTime: editedTime,
    });
    setIsEditing(false);
  };

  return (
    <div
      className={`group relative rounded-3xl p-4 sm:p-5 border transition-all duration-300 shadow-subtle hover:shadow-card flex flex-col md:flex-row gap-5 items-start ${
        isLocked
          ? 'border-brand-teal/40 bg-white dark:bg-slate-900 dark:border-teal-700/50'
          : item.status === 'voting'
          ? 'border-brand-orange/40 bg-white dark:bg-slate-900 dark:border-orange-700/50'
          : 'border-dashed border-brand-sand-border dark:border-slate-800 bg-white/80 dark:bg-slate-900/80'
      }`}
    >
      
      {/* Left: Thumbnail & Source Badges */}
      <div className="relative w-full md:w-48 h-36 rounded-2xl overflow-hidden flex-shrink-0 bg-brand-sand">
        <img
          src={item.image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80'}
          alt={item.title}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80';
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Status Pill Badge */}
        <div className="absolute top-2.5 left-2.5">
          {isLocked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-teal text-white shadow-sm">
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </span>
          ) : item.status === 'voting' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-orange text-white shadow-sm animate-pulse">
              <Vote className="w-3 h-3" />
              <span>Voting ({votes.up?.length}/{lockThreshold})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-md text-brand-navy shadow-sm">
              <Sparkles className="w-3 h-3 text-brand-orange" />
              <span>Draft</span>
            </span>
          )}
        </div>

        {/* Source Badge */}
        {item.source === 'ai_suggestion' && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-900/80 backdrop-blur-md text-purple-200">
              <Sparkles className="w-2.5 h-2.5" />
              <span>AI Suggestion</span>
            </span>
          </div>
        )}
      </div>

      {/* Center: Details & Timing */}
      <div className="flex-1 space-y-2 w-full">
        
        <div className="flex items-center justify-between gap-2">
          
          {/* Time & Duration */}
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-teal">
            <Clock className="w-3.5 h-3.5 text-brand-orange" />
            {isEditing ? (
              <input
                type="text"
                value={editedTime}
                onChange={(e) => setEditedTime(e.target.value)}
                className="border border-brand-sand-border rounded px-1.5 py-0.5 text-xs text-brand-navy"
              />
            ) : (
              <span>{item.startTime} · {item.duration}</span>
            )}
            <span className="text-brand-navy/30">·</span>
            <span className="capitalize text-brand-navy/60 font-medium">{item.timeSlot}</span>
          </div>

          {/* Quick Ordering buttons */}
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="p-1 rounded-lg hover:bg-brand-sand text-brand-navy disabled:opacity-20"
              title="Move activity up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="p-1 rounded-lg hover:bg-brand-sand text-brand-navy disabled:opacity-20"
              title="Move activity down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Activity Title */}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full text-base font-semibold border border-brand-sand-border rounded-xl p-1.5 text-brand-navy"
            />
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 bg-brand-teal text-white rounded-xl text-xs font-semibold"
            >
              Save
            </button>
          </div>
        ) : (
          <h3 className="text-base sm:text-lg font-semibold text-brand-navy dark:text-slate-100 leading-snug">
            {item.title}
          </h3>
        )}

        {/* Location & Cost */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-brand-navy/70 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-brand-orange" />
            <span>{item.location}</span>
          </span>
          <span>·</span>
          <span className="font-semibold text-brand-navy dark:text-slate-200">
            {formatPrice(item.costPerPerson)}/person
          </span>
          <span className="text-brand-navy/50 dark:text-slate-400">
            ({formatPrice(item.costPerPerson * totalMembers)} total)
          </span>
        </div>

        {/* Notes / Tips */}
        {item.notes && (
          <p className="text-xs text-brand-navy/70 dark:text-slate-300 bg-brand-sand/60 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-brand-sand-border/60 dark:border-slate-700">
            💬 {item.notes}
          </p>
        )}

        {/* Voters Avatars Row */}
        {votes.up && votes.up.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] font-medium text-brand-navy/60">Voted by:</span>
            <div className="flex items-center -space-x-1.5">
              {votes.up.map((userId) => {
                const voter = trip?.members?.find((m) => m.id === userId);
                if (!voter) return null;
                return (
                  <img
                    key={userId}
                    src={voter.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={voter.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                    }}
                    className="w-5 h-5 rounded-full object-cover border border-white"
                    title={voter.name}
                  />
                );
              })}
            </div>
            {isLocked && (
              <span className="text-[11px] font-semibold text-brand-teal flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Locked by consensus
              </span>
            )}
          </div>
        )}

      </div>

      {/* Right Column: Collaborative Voting Engine & Actions */}
      <div className="flex md:flex-col items-center justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-brand-sand-border md:pl-5 flex-shrink-0">
        
        {/* Voting Buttons */}
        <div className="flex items-center gap-2">
          {/* Upvote Button */}
          <button
            onClick={() => castVote(item.id, 'up')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              hasUpvoted
                ? 'bg-brand-teal text-white shadow-sm scale-105'
                : 'bg-brand-sand hover:bg-brand-teal-light hover:text-brand-teal text-brand-navy'
            }`}
            title="Vote in favor to lock into itinerary"
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-white' : ''}`} />
            <span>{votes.up?.length || 0}</span>
          </button>

          {/* Downvote Button */}
          <button
            onClick={() => castVote(item.id, 'down')}
            className={`p-1.5 rounded-full text-xs transition-all ${
              hasDownvoted
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-brand-sand hover:bg-rose-50 hover:text-rose-600 text-brand-navy/70'
            }`}
            title="Vote against this activity"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Actions Menu */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 rounded-xl hover:bg-brand-sand text-brand-navy/70 hover:text-brand-navy"
            title="Edit details"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => removeActivity(item.id)}
            className="p-1.5 rounded-xl hover:bg-rose-50 text-brand-navy/70 hover:text-rose-600"
            title="Remove from itinerary"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};

export default ActivityCard;
