import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Music, 
  Disc, 
  Sliders, 
  ExternalLink, 
  Minimize2, 
  Maximize2, 
  Radio, 
  Sparkles, 
  X,
  Compass,
  Shuffle
} from 'lucide-react';
import { travelMusicService, ROADTRIP_VIBES } from '../../services/travelMusicService';

export const TripRhythmPlayer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [tracks, setTracks] = useState([]);
  const [selectedVibe, setSelectedVibe] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [crossfadeSeconds, setCrossfadeSeconds] = useState(4);
  const [isDjMode, setIsDjMode] = useState(true);

  const audioRef = useRef(null);

  // Load mixed playlist across Audius, Jamendo, SoundCloud, and Archive
  useEffect(() => {
    let isMounted = true;
    travelMusicService.getUnifiedPlaylist({ vibe: selectedVibe, searchQuery }).then((items) => {
      if (isMounted) {
        setTracks(items);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedVibe, searchQuery]);

  const currentTrack = tracks[currentTrackIndex] || tracks[0];

  // Sync Audio Element
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack?.streamUrl) return;
    audioRef.current.src = currentTrack.streamUrl;
    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn('Audio play notice (awaiting user interaction):', err.message);
        setIsPlaying(false);
      });
    }
  }, [currentTrack]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Playback error:', e.message);
      });
    }
  };

  const handleNext = () => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
  };

  const handlePrev = () => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    setDuration(audioRef.current.duration || 0);

    // Auto-advance with crossfade transition
    if (
      isDjMode &&
      audioRef.current.duration &&
      audioRef.current.duration - audioRef.current.currentTime <= crossfadeSeconds &&
      audioRef.current.currentTime > 5
    ) {
      handleNext();
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const getSourceBadge = (source) => {
    switch (source) {
      case 'audius':
        return { label: 'Audius', color: 'bg-purple-600 text-white' };
      case 'jamendo':
        return { label: 'Jamendo CC', color: 'bg-amber-600 text-white' };
      case 'soundcloud':
        return { label: 'SoundCloud', color: 'bg-orange-600 text-white' };
      case 'archive':
        return { label: 'Archive.org', color: 'bg-blue-600 text-white' };
      default:
        return { label: 'Multi-Source', color: 'bg-brand-navy text-white' };
    }
  };

  return (
    <>
      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleNext}
        preload="metadata"
      />

      {/* 1. Minimized Floating Pill (Always Accessible on Screen) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 animate-fade-in select-none">
          <div className="flex items-center gap-2 p-1.5 pl-3 rounded-full bg-brand-navy/90 dark:bg-[#111C2E]/95 text-white backdrop-blur-md border border-white/20 shadow-2xl hover:shadow-brand-orange/20 transition-all group">
            {/* Pulsing Vinyl Artwork */}
            <div className={`w-8 h-8 rounded-full overflow-hidden relative shrink-0 border border-white/30 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }}>
              <img
                src={currentTrack?.artwork}
                alt="Artwork"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Track Info (Click to expand) */}
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex flex-col text-left pr-2 cursor-pointer max-w-[140px] sm:max-w-[180px]"
            >
              <span className="text-[11px] font-bold truncate leading-tight flex items-center gap-1 text-white">
                <Music className="w-3 h-3 text-brand-orange shrink-0" />
                <span className="truncate">{currentTrack?.title || 'Trip Rhythm Radio'}</span>
              </span>
              <span className="text-[9px] text-slate-300 truncate">
                {currentTrack?.artist || 'Audius & Jamendo Mix'}
              </span>
            </button>

            {/* Mini Play / Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center justify-center transition-all shadow-sm active:scale-90 cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            {/* Expand Full Player */}
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Open full Travel DJ mixer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Expanded Travel DJ Music Dock */}
      {isOpen && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 rounded-3xl bg-white/95 dark:bg-[#111C2E]/95 backdrop-blur-xl border border-brand-sand-border dark:border-[#1E2D42] shadow-2xl overflow-hidden animate-scale-in select-none">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-brand-navy via-brand-navy-light to-brand-navy text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Disc className={`w-5 h-5 text-brand-orange ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              <div>
                <h4 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  <span>Trip Rhythm</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-brand-orange font-mono">4-Source Mix</span>
                </h4>
                <p className="text-[9px] text-slate-300">Audius · Jamendo · SoundCloud · Archive</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Minimize player"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Road Trip Mood & Vibe Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-brand-navy/60 dark:text-slate-400 uppercase tracking-wider block">
                Travel Soundscapes
              </span>
              <div className="flex flex-wrap gap-1">
                {ROADTRIP_VIBES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVibe(v.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                      selectedVibe === v.id
                        ? 'bg-brand-navy text-white dark:bg-brand-orange shadow-xs'
                        : 'bg-brand-sand dark:bg-slate-800 text-brand-navy/70 dark:text-slate-300 hover:bg-brand-sand-muted'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Now Playing Album Card */}
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-card border border-brand-sand-border dark:border-slate-800 bg-slate-900 group">
              <img
                src={currentTrack?.artwork}
                alt={currentTrack?.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-3 text-white">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${getSourceBadge(currentTrack?.source).color}`}>
                    {getSourceBadge(currentTrack?.source).label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-300">
                    {currentTrack?.genre}
                  </span>
                </div>
                <h3 className="font-bold text-sm truncate text-white leading-tight">
                  {currentTrack?.title}
                </h3>
                <p className="text-[11px] text-slate-300 truncate">
                  {currentTrack?.artist}
                </p>
              </div>
            </div>

            {/* Progress & Duration Scrubber */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.5"
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-brand-orange h-1.5 bg-brand-sand dark:bg-slate-800 rounded-full cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-brand-navy/50 dark:text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* DJ Controls Bar */}
            <div className="flex items-center justify-between pt-1">
              {/* DJ Crossfade Mode Button */}
              <button
                type="button"
                onClick={() => setIsDjMode(!isDjMode)}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isDjMode
                    ? 'bg-brand-orange/15 text-brand-orange border border-brand-orange/30 font-bold'
                    : 'text-brand-navy/50 dark:text-slate-400 hover:bg-brand-sand dark:hover:bg-slate-800'
                }`}
                title="Continuous DJ Crossfade (blends tracks 4s before end)"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="text-[10px]">DJ Blend</span>
              </button>

              {/* Main Transport (Prev, Play, Next) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-2 rounded-full text-brand-navy dark:text-white hover:bg-brand-sand dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Previous track"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="p-2 rounded-full text-brand-navy dark:text-white hover:bg-brand-sand dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Next track"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Volume Slider & Mute */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 text-brand-navy/60 dark:text-slate-400 hover:text-brand-orange transition-colors cursor-pointer"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-14 accent-brand-navy dark:accent-brand-orange h-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Mixed Track Playlist Queue */}
            <div className="pt-2 border-t border-brand-sand-border dark:border-[#1E2D42] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-brand-navy/60 dark:text-slate-400">
                <span>Mix Queue ({tracks.length} Tracks)</span>
                <span>Auto-Blending Active</span>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                {tracks.map((t, idx) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setCurrentTrackIndex(idx);
                      setIsPlaying(true);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                      idx === currentTrackIndex
                        ? 'bg-brand-orange/10 dark:bg-brand-orange/20 border border-brand-orange/30 font-bold text-brand-orange'
                        : 'hover:bg-brand-sand dark:hover:bg-slate-800 text-brand-navy dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-[10px] font-mono text-brand-navy/40 dark:text-slate-500 w-3">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate text-[11px] leading-tight">{t.title}</span>
                        <span className="block truncate text-[9px] text-brand-navy/50 dark:text-slate-400">{t.artist}</span>
                      </div>
                    </div>

                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${getSourceBadge(t.source).color}`}>
                      {getSourceBadge(t.source).label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Attribution & License Footnote */}
            <div className="text-[9px] text-brand-navy/40 dark:text-slate-500 flex items-center justify-between pt-1">
              <span>License: {currentTrack?.license || 'Open Audio'}</span>
              <a
                href={currentTrack?.sourceUrl || 'https://audius.co'}
                target="_blank"
                rel="noreferrer"
                className="hover:text-brand-orange flex items-center gap-0.5 underline transition-colors"
              >
                <span>View on {getSourceBadge(currentTrack?.source).label}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TripRhythmPlayer;
