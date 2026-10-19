import React, { useState } from 'react';
import { Database, Upload, AlertCircle, CheckCircle2, X, FileJson, Sparkles } from 'lucide-react';
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
  }
];

export const AdminDatasetUploadModal = ({ isOpen, onClose }) => {
  const { showToast } = useAuth();
  const [destination, setDestination] = useState('Udaipur, Rajasthan');
  const [jsonInput, setJsonInput] = useState(JSON.stringify(SAMPLE_DATASET, null, 2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [successInfo, setSuccessInfo] = useState(null);

  if (!isOpen) return null;

  const handleLoadSample = () => {
    setJsonInput(JSON.stringify(SAMPLE_DATASET, null, 2));
    setValidationErrors([]);
    setSuccessInfo(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setValidationErrors([]);
    setSuccessInfo(null);

    let parsedVenues;
    try {
      parsedVenues = JSON.parse(jsonInput);
      if (!Array.isArray(parsedVenues)) {
        setValidationErrors(['Input must be a valid JSON array of venue objects [ {...}, {...} ]']);
        return;
      }
    } catch (err) {
      setValidationErrors([`JSON Syntax Error: ${err.message}`]);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.uploadVenueDataset(destination, parsedVenues);
      setSuccessInfo(res);
      showToast(`Successfully uploaded ${res.ingestedCount} venues!`, 'success');
    } catch (err) {
      setValidationErrors(err.errors && err.errors.length > 0 ? err.errors : [err.message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#111C2E] max-w-2xl w-full rounded-3xl shadow-floating border border-brand-sand-border dark:border-[#1E2D42] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-brand-navy to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 text-brand-orange flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Admin Venue Dataset Ingestion</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-orange text-white font-bold">
                  PRD §6.3 & §10.1
                </span>
              </div>
              <p className="text-xs text-white/70">
                Upload destination venues with strict price, dietary vocabulary, hours, and geo-coordinate validation.
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

        {/* Form Body */}
        <form onSubmit={handleUpload} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          <div>
            <label className="block text-xs font-bold text-brand-navy dark:text-slate-300 mb-1">
              Destination Name
            </label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Udaipur, Rajasthan"
              className="w-full text-xs rounded-xl p-2.5 bg-brand-sand dark:bg-slate-800 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-navy dark:text-slate-300 flex items-center gap-1.5">
                <FileJson className="w-3.5 h-3.5 text-brand-teal" />
                <span>Venues JSON Payload (PRD Schema Compliant)</span>
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-[11px] font-bold text-brand-teal hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Load Sample JSON</span>
              </button>
            </div>

            <textarea
              rows={9}
              required
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full font-mono text-xs p-3 rounded-2xl bg-brand-sand/70 dark:bg-slate-900 border border-brand-sand-border dark:border-slate-700 text-brand-navy dark:text-white focus:outline-none focus:border-brand-orange"
            />
            <p className="text-[10px] text-brand-navy/60 dark:text-slate-400">
              * Schema rules: positive price, lat [-90, 90], lng [-180, 180], 24h hours (HH:MM), tag vocabulary: [vegetarian, vegan, halal, jain, gluten-free].
            </p>
          </div>

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

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-brand-sand-border dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-brand-navy/70 dark:text-slate-400 hover:bg-brand-sand"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-brand-orange hover:bg-brand-orange-hover text-white shadow-card transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Validating...' : 'Validate & Ingest Dataset'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
