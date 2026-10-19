import React from 'react';
import { Filter, RotateCcw, Check, Sparkles } from 'lucide-react';
import { CATEGORIES } from '../../data/mockData';

export const FilterSidebar = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalResults,
}) => {
  const dietaryOptions = [
    'Vegetarian Friendly',
    'Pure Veg Options',
    'Vegan Options',
    'Jain On Request',
    'Halal Chicken',
  ];

  const amenityOptions = [
    'Private Pool',
    'Air Conditioning',
    'Free High-speed Wi-Fi',
    'Equipped Kitchen',
    'Dedicated Butler',
    'Sea View Seating',
  ];

  const handleDietaryToggle = (item) => {
    const current = filters.dietary || [];
    const next = current.includes(item)
      ? current.filter(d => d !== item)
      : [...current, item];
    onFilterChange('dietary', next);
  };

  const handleAmenityToggle = (item) => {
    const current = filters.amenities || [];
    const next = current.includes(item)
      ? current.filter(a => a !== item)
      : [...current, item];
    onFilterChange('amenities', next);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-brand-sand-border shadow-subtle space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-brand-sand-border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-orange" />
          <h3 className="font-semibold text-sm text-brand-navy">Filters</h3>
          <span className="text-xs bg-brand-sand px-2 py-0.5 rounded-full text-brand-navy/60 font-medium">
            {totalResults} places
          </span>
        </div>

        <button
          onClick={onResetFilters}
          className="text-xs text-brand-navy/60 hover:text-brand-orange flex items-center gap-1 font-medium transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Category selector */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-brand-navy uppercase tracking-wider">
          Category
        </label>
        <select
          value={filters.category || 'all'}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="w-full text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none bg-brand-sand font-medium"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.filter(c => c.id !== 'all').map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Place Type */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-brand-navy uppercase tracking-wider">
          Place Type
        </label>
        <div className="grid grid-cols-4 gap-1 text-[11px] font-medium">
          {[
            { id: 'all', label: 'All' },
            { id: 'stay', label: 'Stays' },
            { id: 'restaurant', label: 'Dining' },
            { id: 'experience', label: 'Things To Do' },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onFilterChange('type', t.id)}
              className={`py-1.5 px-1 rounded-xl border text-center transition-all truncate ${
                (filters.type || 'all') === t.id
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : 'bg-brand-sand/50 text-brand-navy/70 border-brand-sand-border hover:bg-brand-sand'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Maximum Price Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-brand-navy">
          <span className="uppercase tracking-wider">Max Budget / Night</span>
          <span className="text-brand-orange font-bold">
            ₹{(filters.maxPrice || 35000).toLocaleString('en-IN')}
          </span>
        </div>
        <input
          type="range"
          min="500"
          max="35000"
          step="500"
          value={filters.maxPrice || 35000}
          onChange={(e) => onFilterChange('maxPrice', Number(e.target.value))}
          className="w-full accent-brand-orange cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-brand-navy/50">
          <span>₹500</span>
          <span>₹15,000</span>
          <span>₹35,000+</span>
        </div>
      </div>

      {/* Minimum Rating */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-brand-navy uppercase tracking-wider">
          Minimum Guest Rating
        </label>
        <div className="flex items-center gap-1.5">
          {[0, 4.5, 4.8, 4.9].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onFilterChange('minRating', rating)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                (filters.minRating || 0) === rating
                  ? 'bg-brand-teal text-white border-brand-teal'
                  : 'bg-brand-sand/50 text-brand-navy/70 border-brand-sand-border hover:bg-brand-sand'
              }`}
            >
              {rating === 0 ? 'Any' : `${rating} ★`}
            </button>
          ))}
        </div>
      </div>

      {/* Dietary Suitability Filter */}
      <div className="space-y-2 pt-2 border-t border-brand-sand-border">
        <label className="block text-xs font-semibold text-brand-navy uppercase tracking-wider">
          Dietary Suitability
        </label>
        <div className="space-y-1.5">
          {dietaryOptions.map((diet) => {
            const isChecked = (filters.dietary || []).includes(diet);
            return (
              <label
                key={diet}
                className="flex items-center gap-2.5 text-xs text-brand-navy cursor-pointer hover:text-brand-orange transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleDietaryToggle(diet)}
                  className="rounded text-brand-orange focus:ring-brand-orange"
                />
                <span>{diet}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Amenities Filter */}
      <div className="space-y-2 pt-2 border-t border-brand-sand-border">
        <label className="block text-xs font-semibold text-brand-navy uppercase tracking-wider">
          Amenities & Comforts
        </label>
        <div className="space-y-1.5">
          {amenityOptions.map((amenity) => {
            const isChecked = (filters.amenities || []).includes(amenity);
            return (
              <label
                key={amenity}
                className="flex items-center gap-2.5 text-xs text-brand-navy cursor-pointer hover:text-brand-orange transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleAmenityToggle(amenity)}
                  className="rounded text-brand-orange focus:ring-brand-orange"
                />
                <span>{amenity}</span>
              </label>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default FilterSidebar;
