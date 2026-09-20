import React, { useState } from 'react';
import {
  User,
  Globe,
  Eye,
  Check,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';

export const CitizenProfilePage: React.FC = () => {
  const { setDemoRole } = useRole();

  // Citizen Profile Preferences State (stored locally for demo)
  const [name, setName] = useState('Aman Sharma');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [emergencyContact, setEmergencyContact] = useState('Priya Sharma (Spouse) — +91 98765 11223');
  const [language, setLanguage] = useState<'en' | 'hi' | 'pa'>('en');
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 py-2">
      <div>
        <h1 className="text-xl xs:text-2xl font-black tracking-tight text-fg">
          Citizen Profile
        </h1>
        <p className="text-xs text-fg-muted mt-0.5">
          Personal emergency information & accessibility preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* =========================================================================
              1. PERSONAL INFORMATION
              ========================================================================= */}
          <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-accent-red" />
              <span>Personal Information</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[11px] text-fg-muted block mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-surface-raised text-fg outline-none focus:ring-1 focus:ring-accent-red"
                />
              </div>

              <div>
                <label className="text-[11px] text-fg-muted block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-surface-raised text-fg outline-none focus:ring-1 focus:ring-accent-red font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-fg-muted block mb-1">Primary Emergency Contact</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-surface-raised text-fg outline-none focus:ring-1 focus:ring-accent-red"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Language & Accessibility */}
          <div className="space-y-4">
            {/* =========================================================================
                2. LANGUAGE PREFERENCES
                ========================================================================= */}
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>Language</span>
              </h3>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'hi', label: 'हिंदी (Hindi)' },
                  { id: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setLanguage(lang.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                      language === lang.id
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500 ring-1 ring-blue-500'
                        : 'border-border bg-surface-raised text-fg-muted hover:text-fg'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* =========================================================================
                3. ACCESSIBILITY OPTIONS
                ========================================================================= */}
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-purple-500" />
                <span>Accessibility</span>
              </h3>

              <div className="space-y-2 text-xs">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-surface-raised cursor-pointer">
                  <span className="text-fg font-medium">High-Contrast Emergency Badges</span>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="w-4 h-4 rounded text-accent-red focus:ring-accent-red"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-surface-raised cursor-pointer">
                  <span className="text-fg font-medium">Enlarged Touch Targets</span>
                  <input
                    type="checkbox"
                    checked={largeText}
                    onChange={(e) => setLargeText(e.target.checked)}
                    className="w-4 h-4 rounded text-accent-red focus:ring-accent-red"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Save Confirmation Button */}
        <button
          type="submit"
          className="w-full py-3 px-4 rounded-2xl bg-surface-raised hover:bg-border text-fg font-bold text-xs border border-border transition-colors flex items-center justify-center gap-2"
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500">Preferences Saved</span>
            </>
          ) : (
            <span>Save Profile Preferences</span>
          )}
        </button>
      </form>

      {/* =========================================================================
          4. ROLE EVALUATION SWITCHER (Allows evaluator to quickly switch)
          ========================================================================= */}
      <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-fg-muted font-medium">Current Role Mode:</span>
          <span className="font-bold text-accent-red">Citizen / Patient</span>
        </div>
        <p className="text-[11px] text-fg-muted">
          Need to switch to the Dispatcher or Hospital Operator view to test real-time synchronization?
        </p>
        <button
          type="button"
          onClick={() => setDemoRole('DISPATCHER')}
          className="w-full mt-2 py-2 px-3 rounded-xl bg-accent-red/10 text-accent-red hover:bg-accent-red/20 font-bold border border-accent-red/30 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>Switch to Dispatcher Console →</span>
        </button>
      </div>
    </div>
  );
};
export default CitizenProfilePage;
