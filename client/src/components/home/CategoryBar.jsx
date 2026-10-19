import React from 'react';
import { 
  Sparkles, 
  Flame, 
  Palmtree, 
  Mountain, 
  Compass, 
  Building2, 
  Trees, 
  Footprints, 
  Users, 
  UtensilsCrossed, 
  Coins 
} from 'lucide-react';
import { CATEGORIES } from '../../data/mockData';

const iconMap = {
  Sparkles: Sparkles,
  Flame: Flame,
  Palmtree: Palmtree,
  Mountain: Mountain,
  Compass: Compass,
  Building2: Building2,
  Trees: Trees,
  Footprints: Footprints,
  Users: Users,
  UtensilsCrossed: UtensilsCrossed,
  Coins: Coins,
};

export const CategoryBar = ({ selectedCategory = 'all', onSelectCategory }) => {
  return (
    <div className="w-full bg-white border-y border-brand-sand-border sticky top-20 z-30 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-3.5 scroll-smooth">
          {CATEGORIES.map((cat) => {
            const Icon = iconMap[cat.icon] || Sparkles;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory && onSelectCategory(cat.id)}
                className={`flex flex-col items-center gap-1.5 flex-shrink-0 group transition-all pb-1 relative ${
                  isSelected ? 'text-brand-orange font-semibold' : 'text-brand-navy/60 hover:text-brand-navy'
                }`}
              >
                <div
                  className={`p-2.5 rounded-2xl transition-all ${
                    isSelected
                      ? 'bg-brand-orange-light text-brand-orange scale-105 shadow-sm'
                      : 'bg-brand-sand group-hover:bg-brand-sand-muted text-brand-navy/70'
                  }`}
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                </div>
                <span className="text-xs whitespace-nowrap tracking-tight">
                  {cat.name}
                </span>

                {/* Active indicator bar */}
                {isSelected && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-brand-orange rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryBar;
