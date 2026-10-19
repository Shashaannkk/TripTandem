import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../assets/Logo';
import { Heart, Globe, Shield, Sparkles, Compass } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-brand-sand-border pt-16 pb-12 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-brand-sand-border">
          
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <Logo size={36} showTagline={true} />
            <p className="text-sm text-brand-navy/70 leading-relaxed pt-2">
              Discover places, plan together, and find your rhythm. The collaborative travel platform designed for friends, families, and adventurous souls.
            </p>
            <div className="flex items-center gap-2 text-xs text-brand-teal font-medium pt-1">
              <Sparkles className="w-4 h-4" />
              <span>Grounded AI Concierge + Real-Time Consensus</span>
            </div>
          </div>

          {/* Explore Col */}
          <div>
            <h4 className="font-semibold text-brand-navy text-sm tracking-wide mb-4 uppercase">
              Explore Destinations
            </h4>
            <ul className="space-y-2.5 text-sm text-brand-navy/70">
              <li><Link to="/explore?destination=Goa" className="hover:text-brand-orange transition-colors">Goa Coastal Villas & Shacks</Link></li>
              <li><Link to="/explore?destination=Manali" className="hover:text-brand-orange transition-colors">Manali Himalayan Chalets</Link></li>
              <li><Link to="/explore?destination=Jaipur" className="hover:text-brand-orange transition-colors">Jaipur Heritage Haveli Suites</Link></li>
              <li><Link to="/explore?destination=Bali" className="hover:text-brand-orange transition-colors">Bali Bamboo Jungle Sanctuaries</Link></li>
              <li><Link to="/explore?destination=Kyoto" className="hover:text-brand-orange transition-colors">Kyoto Traditional Ryokans</Link></li>
            </ul>
          </div>

          {/* Features Col */}
          <div>
            <h4 className="font-semibold text-brand-navy text-sm tracking-wide mb-4 uppercase">
              TripTandem Rhythm
            </h4>
            <ul className="space-y-2.5 text-sm text-brand-navy/70">
              <li><Link to="/workspace/trip-goa-2026" className="hover:text-brand-orange transition-colors">Collaborative Workspace</Link></li>
              <li><Link to="/ai-concierge" className="hover:text-brand-orange transition-colors">AI Concierge Planning</Link></li>
              <li><Link to="/login" className="hover:text-brand-orange transition-colors">Log In to Account</Link></li>
              <li><Link to="/signup" className="hover:text-brand-orange transition-colors">Create Free Account</Link></li>
              <li><span className="text-brand-navy/60">Fair Budget Split Engine</span></li>
            </ul>
          </div>

          {/* Trust & Guarantee */}
          <div>
            <h4 className="font-semibold text-brand-navy text-sm tracking-wide mb-4 uppercase">
              TripTandem Trust
            </h4>
            <p className="text-xs text-brand-navy/70 leading-relaxed mb-4">
              We never fabricate ratings, reviews, or live rates. Indicative estimates are always transparently labeled.
            </p>
            <div className="bg-brand-sand p-3.5 rounded-2xl border border-brand-sand-border text-xs text-brand-navy space-y-2">
              <div className="flex items-center gap-2 text-brand-navy font-medium">
                <Shield className="w-4 h-4 text-brand-teal" />
                <span>Verified Provider Standards</span>
              </div>
              <div className="text-[11px] text-brand-navy/70">
                Encrypted Socket.IO rooms & transparent group voting.
              </div>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-brand-navy/60 gap-4">
          <div className="flex items-center gap-2">
            <span>© 2026 TripTandem Inc. All rights reserved.</span>
            <span>·</span>
            <span className="flex items-center gap-1 text-brand-navy/80">
              Made with <Heart className="w-3.5 h-3.5 text-brand-orange fill-brand-orange" /> for travellers worldwide
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-brand-navy cursor-pointer">Privacy</span>
            <span className="hover:text-brand-navy cursor-pointer">Terms of Service</span>
            <span className="hover:text-brand-navy cursor-pointer">Sitemap</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
