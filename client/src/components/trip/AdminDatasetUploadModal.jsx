import React, { useState, useEffect } from 'react';
import { Database, Upload, AlertCircle, CheckCircle2, X, FileJson, Sparkles, Eye, ListFilter, RefreshCw, MapPin, Clock, Tag } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SAMPLE_DATASET = [
  {
    name: "Tribute by the Lake",
    category: "dinner",
    pricePerPerson: 1200,
    dietaryTags: ["vegetarian", "vegan", "halal"],
    hours: { open: "12:00", close: "23:00" },
    coordinates: { lat: 24.5854, lng: 73.6844 },
    description: "Fine dining overlooking Lake Pichola with dedicated vegan menu."
  },
  {
    name: "Ambrai Ghat Restaurant",
    category: "dinner",
    pricePerPerson: 1600,
    dietaryTags: ["vegetarian", "gluten-free"],
    hours: { open: "11:30", close: "23:00" },
    coordinates: { lat: 24.5772, lng: 73.6801 },
    description: "Heritage lakeside seating directly opposite the illuminated City Palace."
  },
  {
    name: "Fateh Prakash Palace Sunset Terrace",
    category: "stay",
    pricePerPerson: 6500,
    dietaryTags: ["vegetarian", "jain"],
    hours: { open: "07:00", close: "23:00" },
    coordinates: { lat: 24.5762, lng: 73.6828 },
    description: "Historic luxury heritage wing with royal courtyard and palace views."
  }
];

const VALID_DIETARY_TAGS = new Set(['vegetarian', 'vegan', 'halal', 'jain', 'gluten-free', 'dairy-free']);
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const AdminDatasetUploadModal = ({ isOpen, onClose }) => {
  const { showToast } = useAuth();
  const [destination, setDestination] = useState('Udaipur, Rajasthan');
  const [jsonInput, setJsonInput] = useState(JSON.stringify(SAMPLE_DATASET, null, 2));
  const [activeTab, setActiveTab] = useState('visualizer'); // 'visualizer' | 'editor' | 'database'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [successInfo, setSuccessInfo] = useState(null);
  
  // Persisted Database Catalog state
  const [dbVenues, setDbVenues] = useState([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Parse JSON live for visualizer
  let parsedVenues = [];
  let jsonParseError = null;
  try {
    const raw = JSON.parse(jsonInput);
    if (Array.isArray(raw)) {
      parsedVenues = raw;
    } else {
      jsonParseError = 'Payload must be a JSON array of venue objects.';
    }
  } catch (err) {
    jsonParseError = err.message;
  }

  // Live item validation helper
  const validateItem = (v) => {
    const errors = [];
    if (!v.name) errors.push('Missing name');
    const p = Number(v.pricePerPerson ?? v.price);
    if (isNaN(p) || p <= 0) errors.push('Price must be > 0');
    const lat = Number(v.coordinates?.lat ?? v.lat);
    const lng = Number(v.coordinates?.lng ?? v.lng);
    if (isNaN(lat) || lat < -90 || lat > 90) errors.push('Lat [-90,90]');
    if (isNaN(lng) || lng < -180 || lng > 180) errors.push('Lng [-180,180]');
    const open = v.hours?.open || v.hours_open;
    const close = v.hours?.close || v.hours_close;
    if (!open || !TIME_REGEX.test(open) || !close || !TIME_REGEX.test(close)) errors.push('Hours HH:MM');
    const tags = Array.isArray(v.dietaryTags) ? v.dietaryTags : Array.isArray(v.dietary) ? v.dietary : [];
    const invalidTags = tags.filter(t => !VALID_DIETARY_TAGS.has(String(t).toLowerCase()));
    if (invalidTags.length > 0) errors.push(`Tags: ${invalidTags.join(',')}`);
    return errors;
  };

  const handleLoadSample = () => {
    setJsonInput(JSON.stringify(SAMPLE_DATASET, null, 2));
    setValidationErrors([]);
    setSuccessInfo(null);
  };

  const fetchDatabaseVenues = async () => {
    setIsLoadingDb(true);
    try {
      const data = await api.getVenuesByDestination(destination);
      setDbVenues(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load DB venues:', err);
      setDbVenues([]);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'database') {
      fetchDatabaseVenues();
    }
  }, [isOpen, activeTab, destination]);

  if (!isOpen) return null;

  const handleUpload = async (e) => {
    e.preventDefault();
    setValidationErrors([]);
    setSuccessInfo(null);

    let venuesToUpload;
    try {
      venuesToUpload = JSON.parse(jsonInput);
      if (!Array.isArray(venuesToUpload) || venuesToUpload.length === 0) {
        setValidationErrors(['Input must be a non-empty JSON array of venue objects [ {...}, {...} ]']);
        return;
      }
    } catch (err) {
      setValidationErrors([`JSON Syntax Error: ${err.message}`]);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.uploadVenueDataset(destination, venuesToUpload);
      setSuccessInfo(res);
      showToast(`Successfully uploaded ${res.ingestedCount || venuesToUpload.length} venues!`, 'success');
      // Refresh DB tab in background
      fetchDatabaseVenues();
    } catch (err) {
      setValidationErrors(err.errors && err.errors.length > 0 ? err.errors : [err.message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#111C2E] max-w-4xl w-full rounded-3xl shadow-floating border border-brand-sand-border dark:border-[#1E2D42] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-brand-navy to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 text-brand-orange flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Admin Venue Dataset Ingestion & Visualizer</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-orange text-white font-bold">
                  PRD §6.3 & §10.1
                </span>
              </div>
              <p className="text-xs text-white/70">
                Upload and inspect destination datasets with strict schema validation, price bounds, tag vocabulary, and persistent MongoDB storage.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls & Destination Input Bar */}
        <div className="px-6 py-3 bg-brand-sand/50 dark:bg-slate-900/60 border-b border-brand-sand-border dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('visualizer')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'visualizer'
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-brand-navy/70 dark:text-slate-300 hover:text-brand-navy'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visualizer & Live Preview ({parsedVenues.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-brand-navy/70 dark:text-slate-300 hover:text-brand-navy'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>JSON Editor</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('database'); fetchDatabaseVenues(); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'database'
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-brand-navy/70 dark:text-slate-300 hover:text-brand-navy'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Persisted DB Catalog ({dbVenues.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-brand-navy/60 dark:text-slate-400">Target Destination:</span>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Udaipur, Rajasthan"
              className="text-xs font-semibold rounded-xl px-3 py-1.5 bg-white dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white focus:outline-none focus:border-brand-orange w-48 sm:w-56"
            />
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: VISUALIZER & LIVE PREVIEW */}
          {activeTab === 'visualizer' && (
            <div className="space-y-3">
              {jsonParseError ? (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>JSON Parsing Error:</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px]">{jsonParseError}</p>
                </div>
              ) : parsedVenues.length === 0 ? (
                <div className="text-center py-12 text-brand-navy/50 dark:text-slate-500 text-xs">
                  No venues in payload. Switch to JSON Editor or click "Load Sample JSON".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {parsedVenues.map((v, i) => {
                    const itemErrors = validateItem(v);
                    const isValid = itemErrors.length === 0;
                    const price = v.pricePerPerson ?? v.price;
                    const open = v.hours?.open || v.hours_open || '10:00';
                    const close = v.hours?.close || v.hours_close || '22:00';
                    const tags = v.dietaryTags || v.dietary || [];

                    return (
                      <div
                        key={i}
                        className={`p-4 rounded-2xl border transition-all ${
                          isValid
                            ? 'bg-brand-sand/30 dark:bg-slate-800/40 border-brand-sand-border dark:border-slate-700'
                            : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-xs sm:text-sm text-brand-navy dark:text-white">
                                {v.name || 'Unnamed Venue'}
                              </h4>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-navy/10 dark:bg-white/10 text-brand-navy dark:text-slate-300 uppercase">
                                {v.category || 'dining'}
                              </span>
                            </div>
                            <p className="text-[11px] text-brand-navy/60 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {v.description || `Verified venue in ${destination}`}
                            </p>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                              isValid
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {isValid ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Valid Schema</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                <span>{itemErrors.length} Issue(s)</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-brand-navy/80 dark:text-slate-300">
                          <span className="font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-md">
                            ₹{Number(price || 0).toLocaleString()} / person
                          </span>
                          <span className="flex items-center gap-1 bg-brand-sand dark:bg-slate-700 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3 text-brand-navy/60 dark:text-slate-400" />
                            <span>{open} - {close}</span>
                          </span>
                          <span className="flex items-center gap-1 bg-brand-sand dark:bg-slate-700 px-2 py-0.5 rounded-md font-mono text-[10px]">
                            <MapPin className="w-3 h-3 text-brand-navy/60 dark:text-slate-400" />
                            <span>{Number(v.coordinates?.lat ?? v.lat ?? 0).toFixed(4)}, {Number(v.coordinates?.lng ?? v.lng ?? 0).toFixed(4)}</span>
                          </span>
                        </div>

                        {tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tags.map((tag, ti) => (
                              <span
                                key={ti}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal font-semibold"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {!isValid && (
                          <div className="mt-2 text-[10px] text-rose-600 dark:text-rose-400 space-y-0.5">
                            {itemErrors.map((err, ei) => (
                              <div key={ei}>• {err}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RAW JSON EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-navy dark:text-slate-300 flex items-center gap-1.5">
                  <FileJson className="w-3.5 h-3.5 text-brand-teal" />
                  <span>Venues JSON Payload (PRD Schema Compliant)</span>
                </span>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-[11px] font-bold text-brand-teal hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Load Sample JSON</span>
                </button>
              </div>

              <textarea
                rows={11}
                required
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full font-mono text-xs p-3 rounded-2xl bg-brand-sand/70 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white focus:outline-none focus:border-brand-orange"
              />
              <p className="text-[10px] text-brand-navy/60 dark:text-slate-400">
                * Schema rules: positive price, lat [-90, 90], lng [-180, 180], 24h hours (HH:MM), tag vocabulary: [vegetarian, vegan, halal, jain, gluten-free, dairy-free].
              </p>
            </div>
          )}

          {/* TAB 3: PERSISTED DATABASE CATALOG */}
          {activeTab === 'database' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-navy dark:text-slate-300">
                  Live MongoDB Records for Destination: <span className="text-brand-orange">{destination}</span>
                </span>
                <button
                  type="button"
                  onClick={fetchDatabaseVenues}
                  disabled={isLoadingDb}
                  className="text-xs font-bold text-brand-teal hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? 'animate-spin' : ''}`} />
                  <span>Refresh DB</span>
                </button>
              </div>

              {isLoadingDb ? (
                <div className="text-center py-8 text-xs text-brand-navy/60 dark:text-slate-400">
                  Querying database service for persisted venues...
                </div>
              ) : dbVenues.length === 0 ? (
                <div className="text-center py-10 bg-brand-sand/40 dark:bg-slate-900/40 rounded-2xl border border-dashed border-brand-sand-border dark:border-slate-800 text-xs text-brand-navy/50 dark:text-slate-500">
                  No persisted venues found in MongoDB for "{destination}". Ingest the dataset to persist records.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                  {dbVenues.map((v, i) => (
                    <div
                      key={v.id || i}
                      className="p-3 rounded-xl bg-brand-sand/30 dark:bg-slate-800/30 border border-brand-sand-border dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-navy dark:text-white">{v.name}</span>
                        <span className="text-[10px] text-brand-orange font-bold">
                          ₹{(v.pricePerPerson || v.price || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-brand-navy/60 dark:text-slate-400 flex items-center gap-2">
                        <span>{v.category || v.type}</span>
                        <span>•</span>
                        <span>{v.openingHours || (v.hours ? `${v.hours.open} - ${v.hours.close}` : 'N/A')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Validation Errors Box */}
          {validationErrors.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs space-y-1 animate-shake">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>PRD Validation Constraints Failed:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Banner */}
          {successInfo && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">{successInfo.message}</span>
                <span className="block text-[11px] opacity-80">
                  Total Catalog Venues: {successInfo.totalCatalogVenues}
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-brand-sand/30 dark:bg-slate-900/40 flex items-center justify-between border-t border-brand-sand-border dark:border-slate-800">
          <div className="text-[11px] text-brand-navy/60 dark:text-slate-400">
            {parsedVenues.length > 0 && (
              <span>Ready to ingest: <strong>{parsedVenues.length} venue(s)</strong> for <em>{destination}</em></span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-brand-navy/70 dark:text-slate-400 hover:bg-brand-sand cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isSubmitting || parsedVenues.length === 0 || !!jsonParseError}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-brand-orange hover:bg-brand-orange-hover text-white shadow-card transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Validating & Storing...' : 'Validate & Ingest Dataset'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
