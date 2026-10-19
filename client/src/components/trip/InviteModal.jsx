import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Users, 
  Mail, 
  Shield, 
  CheckCircle2, 
  Share2, 
  UserPlus, 
  MessageCircle, 
  Sparkles 
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';

export const InviteModal = () => {
  const { isInviteModalOpen, setIsInviteModalOpen, trip, addMember } = useTrip();
  const { showToast } = useAuth();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('Scout & Collaborator');

  if (!isInviteModalOpen || !trip) return null;

  const inviteCode = trip.inviteCode || `TANDEM-${(trip.destination || 'INDIA').slice(0, 3).toUpperCase()}-77`;
  const shareableUrl = `${window.location.origin}/join/${inviteCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    showToast('Trip invite link copied! Send it to your travel crew. 📋', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    showToast(`Trip code ${inviteCode} copied! 🎟️`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast('Please enter the friends name', 'warning');
      return;
    }

    const email = emailInput.trim() || `${nameInput.toLowerCase().replace(/\s+/g, '.')}@triptandem.travel`;
    addMember({
      name: nameInput.trim(),
      email,
      role: selectedRole,
    });

    setNameInput('');
    setEmailInput('');
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Hey! Join our collaborative travel crew for "${trip.title}" on TripTandem. We are voting on stays, planning days & splitting bills! Link: ${shareableUrl} (Invite Code: ${inviteCode})`
  )}`;

  return (
    <div className="fixed inset-0 z-50 bg-brand-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-floating border border-brand-sand-border space-y-5 animate-scale-up text-brand-navy">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-sand-border pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-orange/10 text-brand-orange">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-brand-navy">Invite Friends to Group Trip</h3>
              <p className="text-xs text-brand-navy/60">Collaborate, vote on stays, chat & split group expenses</p>
            </div>
          </div>

          <button
            onClick={() => setIsInviteModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-brand-sand text-brand-navy/60 hover:text-brand-navy transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unique Join Code & Share via WhatsApp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Join Code Card */}
          <div className="p-3.5 rounded-2xl bg-brand-sand/60 border border-brand-sand-border space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-navy/50 block">
              Trip Access Code
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-extrabold text-sm text-brand-orange tracking-wider">
                {inviteCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-[11px] font-bold text-brand-navy/70 hover:text-brand-orange flex items-center gap-1"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Instant WhatsApp Share */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-between transition-colors group cursor-pointer"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Instant Chat Share
              </span>
              <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5 mt-0.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Share via WhatsApp</span>
              </span>
            </div>
            <Share2 className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition-transform" />
          </a>
        </div>

        {/* Shareable Link Box */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-brand-navy">
            Direct Shareable Invite Link
          </label>
          <div className="flex items-center gap-2 bg-brand-sand p-2 rounded-2xl border border-brand-sand-border">
            <input
              type="text"
              readOnly
              value={shareableUrl}
              className="bg-transparent text-xs text-brand-navy font-mono flex-1 px-2 focus:outline-none select-all"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand-navy text-white hover:bg-brand-navy-light'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Add Member Directly by Name & Role */}
        <form onSubmit={handleSendInvite} className="space-y-3 pt-1 border-t border-brand-sand-border/70">
          <label className="block text-xs font-bold text-brand-navy">
            Add Group Member Directly
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              required
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Friend's Name (e.g. Vikram, Ananya)"
              className="text-xs rounded-xl p-2.5 bg-white border border-brand-sand-border focus:outline-none focus:border-brand-orange"
            />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Email (Optional)"
              className="text-xs rounded-xl p-2.5 bg-white border border-brand-sand-border focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="flex-1 text-xs rounded-xl p-2.5 border border-brand-sand-border focus:outline-none bg-brand-sand font-medium"
            >
              <option value="Trip Collaborator">Collaborator (Can vote & add stays)</option>
              <option value="Foodie & Dining Scout">Foodie & Dining Scout</option>
              <option value="Adventure Lead">Adventure Lead</option>
              <option value="Budget Maven">Budget Maven</option>
              <option value="Trip Guest">Guest / Viewer Only</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-orange hover:bg-brand-orange-hover text-white transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add to Trip</span>
            </button>
          </div>
        </form>

        {/* Current Members List */}
        <div className="space-y-2.5 pt-2 border-t border-brand-sand-border">
          <div className="flex items-center justify-between text-xs font-bold text-brand-navy">
            <span>Current Group Members ({trip.members.length})</span>
            <span className="text-[10px] text-brand-teal font-medium">All connected to live bill split</span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {trip.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-brand-sand/40 border border-brand-sand-border text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-brand-sand-border"
                  />
                  <div>
                    <span className="font-bold text-brand-navy">{member.name}</span>
                    <span className="text-[10px] text-brand-navy/60 block">{member.email || member.role}</span>
                  </div>
                </div>
                <span className="text-[10px] bg-white border border-brand-sand-border px-2.5 py-0.5 rounded-full font-bold text-brand-teal">
                  {member.role || 'Explorer'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default InviteModal;
