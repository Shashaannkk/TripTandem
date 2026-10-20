import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Star, X, ExternalLink, Layers, ZoomIn, ZoomOut, Compass, Navigation } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Interactive Real Map Component with Satellite View
 * - Supports authentic high-res Satellite Imagery (Esri World Imagery) and Street Map (OpenStreetMap)
 * - Dynamic Leaflet engine with fallback
 * - Custom price-badged hotel pins
 * - Interactive selected hotel drawer / popup
 */
export const MapView = ({ venues = [], onSelectVenue }) => {
  const { formatPrice } = useAuth();
  const [selectedPin, setSelectedPin] = useState(null);
  const [mapMode, setMapMode] = useState('satellite'); // 'satellite' | 'streets'
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const tileLayerRef = useRef(null);

  // Dynamic Leaflet CDN Loader
  useEffect(() => {
    if (window.L) {
      setIsLeafletReady(true);
      return;
    }

    // Inject Leaflet CSS
    const existingLink = document.getElementById('leaflet-css');
    if (!existingLink) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Inject Leaflet JS
    const existingScript = document.getElementById('leaflet-js');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setIsLeafletReady(true);
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener('load', () => setIsLeafletReady(true));
    }
  }, []);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current || !window.L) return;

    const L = window.L;

    // Center map around first venue or default to India center (Goa/Central)
    const validVenues = venues.filter(v => v.lat && v.lng);
    const initialLat = validVenues[0]?.lat || 15.598;
    const initialLng = validVenues[0]?.lng || 73.743;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: validVenues.length > 0 ? 12 : 5,
        zoomControl: false, // Custom styled zoom controls
        attributionControl: false,
      });

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Switch Tile Layer (Satellite vs Street Map)
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    if (mapMode === 'satellite') {
      // High-resolution Esri World Imagery Satellite Tiles
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          subdomains: ['server', 'services'],
        }
      ).addTo(map);
    } else {
      // Clean OpenStreetMap Street Cartography
      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
        }
      ).addTo(map);
    }

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Add custom hotel price markers
    const bounds = [];

    validVenues.forEach((venue) => {
      const priceText = formatPrice(venue.price);
      const isSelected = selectedPin?.id === venue.id;

      const markerHtml = `
        <div class="cursor-pointer transition-transform duration-200 transform hover:scale-110 active:scale-95">
          <div class="px-2.5 py-1 rounded-full font-bold text-[11px] shadow-card flex items-center gap-1 border ${
            isSelected
              ? 'bg-[#FF6B45] text-white border-white scale-110 ring-4 ring-[#FF6B45]/40'
              : 'bg-white/95 text-[#0B2545] border-slate-200 hover:bg-[#FF6B45] hover:text-white'
          }">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${isSelected ? '#FFF' : '#2A9D8F'};"></span>
            <span>${priceText}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-hotel-pin',
        iconSize: [80, 32],
        iconAnchor: [40, 16],
      });

      const marker = L.marker([venue.lat, venue.lng], { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          setSelectedPin(venue);
          map.panTo([venue.lat, venue.lng], { animate: true });
        });

      markersRef.current.push(marker);
      bounds.push([venue.lat, venue.lng]);
    });

    if (bounds.length > 0 && !selectedPin) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (e) {}
    }

    // Ensure map container renders properly after layout
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [isLeafletReady, venues, mapMode, selectedPin]);

  // Handle map controls
  const handleZoomIn = () => {
    if (leafletMapRef.current) leafletMapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (leafletMapRef.current) leafletMapRef.current.zoomOut();
  };

  const handleResetCenter = () => {
    if (!leafletMapRef.current) return;
    const validVenues = venues.filter(v => v.lat && v.lng);
    if (validVenues.length > 0) {
      const bounds = validVenues.map(v => [v.lat, v.lng]);
      leafletMapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  };

  return (
    <div className="relative w-full h-[620px] rounded-3xl overflow-hidden border border-brand-sand-border dark:border-[#1E2D42] shadow-card bg-slate-900 select-none">
      
      {/* Real Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Fallback Display if Leaflet CDN is connecting */}
      {!isLeafletReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white space-y-3 z-10">
          <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-300">Loading Satellite Map Engine...</p>
        </div>
      )}

      {/* Top Left: Map Mode Selector (Satellite vs Street) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="bg-white/95 dark:bg-[#0E1A2E]/95 backdrop-blur-md p-1 rounded-2xl border border-brand-sand-border dark:border-slate-700 shadow-floating flex items-center gap-1">
          <button
            onClick={() => setMapMode('satellite')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mapMode === 'satellite'
                ? 'bg-brand-navy text-white shadow-sm'
                : 'text-brand-navy/70 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white'
            }`}
          >
            <span>🛰️ Satellite</span>
          </button>
          <button
            onClick={() => setMapMode('streets')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mapMode === 'streets'
                ? 'bg-brand-navy text-white shadow-sm'
                : 'text-brand-navy/70 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white'
            }`}
          >
            <span>🗺️ Street Map</span>
          </button>
        </div>

        {/* Venues count badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/90 dark:bg-[#0E1A2E]/90 backdrop-blur-md border border-brand-sand-border dark:border-slate-700 shadow-subtle text-xs font-bold text-brand-navy dark:text-white">
          <span className="w-2 h-2 rounded-full bg-brand-teal animate-ping" />
          <span>{venues.length} stays mapped</span>
        </div>
      </div>

      {/* Top Right: Zoom and Recenter Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5">
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 rounded-xl bg-white/95 dark:bg-[#0E1A2E]/95 backdrop-blur-md border border-brand-sand-border dark:border-slate-700 shadow-floating text-brand-navy dark:text-white hover:text-brand-orange flex items-center justify-center transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 rounded-xl bg-white/95 dark:bg-[#0E1A2E]/95 backdrop-blur-md border border-brand-sand-border dark:border-slate-700 shadow-floating text-brand-navy dark:text-white hover:text-brand-orange flex items-center justify-center transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCenter}
          className="w-9 h-9 rounded-xl bg-white/95 dark:bg-[#0E1A2E]/95 backdrop-blur-md border border-brand-sand-border dark:border-slate-700 shadow-floating text-brand-navy dark:text-white hover:text-brand-teal flex items-center justify-center transition-all cursor-pointer"
          title="Reset to All Properties"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Hotel Floating Card at Bottom */}
      {selectedPin && (
        <div className="absolute bottom-5 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-20 max-w-md w-full bg-white/98 dark:bg-[#0E1A2E]/98 backdrop-blur-xl rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-brand-sand-border dark:border-slate-700 animate-fadeIn">
          <button
            onClick={() => setSelectedPin(null)}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white dark:bg-slate-800 text-brand-navy dark:text-white hover:bg-brand-sand shadow-xs z-10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5 items-center">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-brand-sand-border dark:border-slate-700">
              <img
                src={selectedPin.coverImage || selectedPin.images?.[0] || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=900&auto=format&fit=crop&q=80'}
                alt={selectedPin.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=900&auto=format&fit=crop&q=80';
                }}
                className="w-full h-full object-cover"
              />
              {selectedPin.badge && (
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-orange text-white">
                  {selectedPin.badge}
                </span>
              )}
            </div>

            <div className="flex-1 space-y-1 min-w-0 text-left">
              <div className="flex items-center gap-1 text-xs font-bold text-brand-navy dark:text-white">
                <Star className="w-3.5 h-3.5 fill-brand-yellow text-brand-yellow" />
                <span>{selectedPin.rating || '4.8'}</span>
                <span className="text-brand-navy/50 dark:text-slate-400 font-normal">
                  ({selectedPin.reviewCount || 120} reviews)
                </span>
              </div>

              <h4 className="font-bold text-sm text-brand-navy dark:text-white truncate">
                {selectedPin.name}
              </h4>

              <p className="text-xs text-brand-navy/60 dark:text-slate-400 truncate">
                {selectedPin.region || selectedPin.destination || 'India'}
              </p>

              <div className="flex items-baseline gap-1 pt-0.5">
                <span className="text-sm font-bold text-brand-orange">
                  {formatPrice(selectedPin.price)}
                </span>
                <span className="text-[10px] text-brand-navy/60 dark:text-slate-400">
                  /{selectedPin.priceUnit || 'night'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-brand-sand-border dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => onSelectVenue && onSelectVenue(selectedPin)}
              className="text-xs font-bold text-brand-navy dark:text-white hover:text-brand-orange flex items-center gap-1 transition-colors"
            >
              <span>View Property Details</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSelectVenue && onSelectVenue(selectedPin)}
              className="px-4 py-2 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold shadow-sm transition-all transform active:scale-95 cursor-pointer"
            >
              Reserve & Add to Trip
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default MapView;
