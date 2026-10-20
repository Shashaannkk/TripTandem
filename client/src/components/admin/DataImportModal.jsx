import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Database, 
  Download, 
  MapPin, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';

export const DataImportModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [providerStatuses, setProviderStatuses] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('google_places');
  const [destination, setDestination] = useState('Goa');
  const [category, setCategory] = useState('hotel');
  const [radius, setRadius] = useState(5000);

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedVenues, setSelectedVenues] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  // Load provider statuses on modal open
  useEffect(() => {
    if (isOpen) {
      loadStatuses();
      setPreviewData(null);
      setImportResult(null);
      setError(null);
    }
  }, [isOpen]);

  const loadStatuses = async () => {
    try {
      const statuses = await api.getProviderStatuses();
      setProviderStatuses(statuses || []);
    } catch (e) {
      console.warn('Failed to fetch provider status:', e);
    }
  };

  const handleFetchPreview = async () => {
    setIsLoadingPreview(true);
    setError(null);
    setImportResult(null);

    try {
      const res = await api.previewProviderPlaces({
        destination,
        category,
        provider: selectedProvider,
        radius,
        limit: 10,
      });

      setPreviewData(res);
      // Select non-duplicate candidates by default
      const newItems = (res.data || []).filter((v) => !v.alreadyImported);
      setSelectedVenues(newItems);
    } catch (err) {
      setError(err.message || 'Failed to preview places from provider');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const toggleVenueSelect = (venue) => {
    setSelectedVenues((prev) => {
      const exists = prev.some((v) => v.id === venue.id);
      return exists ? prev.filter((v) => v.id !== venue.id) : [...prev, venue];
    });
  };

  const handleExecuteImport = async () => {
    if (selectedVenues.length === 0) return;

    setIsImporting(true);
    setError(null);

    try {
      const res = await api.importProviderPlaces(selectedVenues);
      setImportResult(res);
      onImportSuccess?.(res);
    } catch (err) {
      setError(err.message || 'Failed to import venues into database');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-floating border border-brand-sand-border overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-brand-sand-border flex items-center justify-between bg-brand-sand/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-navy text-white flex items-center justify-center shadow-sm">
              <Database className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-brand-navy">
                Travel Data & Provider Hub
              </h2>
              <p className="text-xs text-brand-navy/60">
                Preview, deduplicate, and import verified places across Google Places (New), Geoapify, StayingAPI, and OpenStreetMap
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-brand-navy/50 hover:text-brand-navy hover:bg-brand-sand transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Provider Status Bar */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-brand-navy uppercase tracking-wider block">
              Configured Travel Providers
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {providerStatuses.map((p) => (
                <div
                  key={p.provider}
                  onClick={() => setSelectedProvider(p.provider)}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    selectedProvider === p.provider
                      ? 'border-brand-teal bg-brand-teal-light/40 ring-1 ring-brand-teal'
                      : 'border-brand-sand-border hover:bg-brand-sand/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-brand-navy truncate">
                      {p.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        p.configured ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-amber-400'
                      }`}
                    />
                  </div>
                  <div className="text-[10px] text-brand-navy/60 leading-tight truncate">
                    {p.configured ? 'Active & Ready' : 'Awaiting .env Key'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discovery Query Form */}
          <div className="bg-brand-sand/50 rounded-2xl p-4 border border-brand-sand-border space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Destination */}
              <div>
                <label className="block text-[11px] font-semibold text-brand-navy mb-1">
                  Destination
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-brand-sand-border bg-white focus:outline-none focus:border-brand-teal"
                >
                  <option value="Goa">Goa (Coastal Corridor)</option>
                  <option value="Manali">Manali (Himachal Valley)</option>
                  <option value="Jaipur">Jaipur (Rajasthan)</option>
                  <option value="Varanasi">Varanasi (Ghats)</option>
                  <option value="Kerala">Kerala (Backwaters)</option>
                  <option value="Mumbai">Mumbai (Maharashtra)</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-semibold text-brand-navy mb-1">
                  Venue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-brand-sand-border bg-white focus:outline-none focus:border-brand-teal"
                >
                  <option value="hotel">Hotels & Stays</option>
                  <option value="restaurant">Restaurants & Dining</option>
                  <option value="cafe">Cafes & Bakeries</option>
                  <option value="attraction">Sights & Viewpoints</option>
                </select>
              </div>

              {/* Search Radius */}
              <div>
                <label className="block text-[11px] font-semibold text-brand-navy mb-1">
                  Radius
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-brand-sand-border bg-white focus:outline-none focus:border-brand-teal"
                >
                  <option value="2000">2 km (Town center)</option>
                  <option value="5000">5 km (Suburbs)</option>
                  <option value="15000">15 km (Wide region)</option>
                </select>
              </div>

            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-brand-navy/60">
                Selected provider: <strong className="text-brand-navy">{selectedProvider.toUpperCase()}</strong>
              </span>

              <button
                type="button"
                onClick={handleFetchPreview}
                disabled={isLoadingPreview}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-brand-navy hover:bg-brand-navy-light text-white shadow-sm transition-all disabled:opacity-60"
              >
                {isLoadingPreview ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying Provider...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-brand-orange" />
                    <span>Discover Places</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback & Error */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {importResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Import Succeeded!</span>
              </div>
              <p>
                Imported: <strong>{importResult.imported}</strong> new venues. Skipped duplicates: <strong>{importResult.skipped}</strong>. Total venues in catalog now: <strong>{importResult.totalVenuesNow}</strong>.
              </p>
            </div>
          )}

          {/* Preview Results Table */}
          {previewData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                    Discovered Places ({previewData.totalFound})
                  </h3>
                  <span className="text-[11px] text-brand-navy/60">
                    {previewData.newCandidates} new places ready for import, {previewData.totalFound - previewData.newCandidates} already in catalog
                  </span>
                </div>

                {selectedVenues.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={isImporting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-brand-orange hover:bg-brand-orange-hover text-white shadow-sm transition-all"
                  >
                    {isImporting ? (
                      <span>Importing...</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Import {selectedVenues.length} Selected</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="border border-brand-sand-border rounded-2xl overflow-hidden divide-y divide-brand-sand-border">
                {previewData.data.map((venue) => {
                  const isChecked = selectedVenues.some((v) => v.id === venue.id);

                  return (
                    <div
                      key={venue.id}
                      className={`p-3.5 flex items-center justify-between transition-colors ${
                        venue.alreadyImported
                          ? 'bg-slate-50/70 opacity-60'
                          : isChecked
                            ? 'bg-brand-teal-light/20'
                            : 'hover:bg-brand-sand/30'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          disabled={venue.alreadyImported}
                          checked={isChecked}
                          onChange={() => toggleVenueSelect(venue)}
                          className="w-4 h-4 rounded text-brand-teal focus:ring-brand-teal border-brand-sand-border mt-0.5"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-brand-navy truncate">
                              {venue.name}
                            </span>
                            {venue.alreadyImported && (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                                Duplicate Detected
                              </span>
                            )}
                            <span className="text-[9px] uppercase font-bold text-brand-teal bg-brand-teal-light px-1.5 py-0.5 rounded">
                              {venue.sourceProvider}
                            </span>
                          </div>
                          <p className="text-[11px] text-brand-navy/60 truncate max-w-lg mt-0.5">
                            {venue.address || venue.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-brand-navy/70 flex-shrink-0 pl-3">
                        <span className="font-semibold block capitalize">{venue.type}</span>
                        <span className="text-[10px] text-brand-navy/50">
                          {venue.coordinates?.lat != null ? Number(venue.coordinates.lat).toFixed(3) : (venue.lat != null ? Number(venue.lat).toFixed(3) : '—')}, {venue.coordinates?.lng != null ? Number(venue.coordinates.lng).toFixed(3) : (venue.lng != null ? Number(venue.lng).toFixed(3) : '—')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-brand-sand-border bg-brand-sand/40 flex items-center justify-between text-xs text-brand-navy/60">
          <span>Attribution: OpenStreetMap © Contributors · Geoapify Places · Amadeus SDK</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full font-semibold text-brand-navy hover:bg-brand-sand"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default DataImportModal;
