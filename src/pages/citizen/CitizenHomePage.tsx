import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  ShieldAlert,
  ArrowRight,
  Clock,
  MapPin,
  HeartPulse,
} from 'lucide-react';
import { useCitizen } from '../../context/CitizenContext';

export const CitizenHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { activeEmergency } = useCitizen();

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* 1 & 2. HERO + HELPLINE SECTION (Responsive 12-Column Desktop Grid, Vertical Stack on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Left Column (8 cols): Hero or Active Emergency */}
        <div className="lg:col-span-8">
          {activeEmergency ? (
            <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-xl shadow-red-500/25 flex flex-col gap-5 border border-red-400/30">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  Active Emergency
                </span>
                <span className="font-mono text-xs font-bold text-white/80">#{activeEmergency.id}</span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  {activeEmergency.status === 'Awaiting Dispatch'
                    ? 'Request Received'
                    : activeEmergency.status === 'Completed'
                    ? 'Emergency Handover Complete'
                    : 'Ambulance En Route'}
                </h2>
                <p className="text-white/80 text-sm sm:text-base mt-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{activeEmergency.location}</span>
                </p>
              </div>

              {activeEmergency.etaMinutes !== null && activeEmergency.etaMinutes !== undefined && (
                <div className="flex items-baseline gap-2 bg-black/20 rounded-2xl p-4 backdrop-blur-sm">
                  <span className="text-4xl sm:text-5xl font-black">{String(activeEmergency.etaMinutes).padStart(2, '0')}</span>
                  <span className="text-base font-semibold text-white/80">min estimated arrival</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate('/citizen/emergency')}
                className="w-full sm:w-auto self-start py-3.5 px-6 rounded-2xl bg-white text-red-600 hover:bg-white/95 font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
              >
                <span>Track My Ambulance Live</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="rounded-3xl p-6 sm:p-8 bg-surface-raised border border-border flex flex-col items-center text-center gap-5 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-accent-red/10 border border-accent-red/20 text-accent-red flex items-center justify-center shadow-inner">
                <ShieldAlert className="w-9 h-9" />
              </div>

              <div className="space-y-2 max-w-lg">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-fg">
                  NEED EMERGENCY HELP?
                </h1>
                <p className="text-fg-muted text-sm sm:text-base leading-relaxed">
                  RapidRoute connects your emergency request directly with the regional ambulance dispatch team and nearest hospitals.
                </p>
              </div>

              {/* PRIMARY CTA: REQUEST AMBULANCE */}
              <button
                type="button"
                onClick={() => navigate('/citizen/request')}
                className="w-full max-w-md py-4 px-6 rounded-2xl bg-accent-red hover:bg-accent-red/90 text-white font-extrabold text-base sm:text-lg tracking-wide flex items-center justify-center gap-3 shadow-xl shadow-accent-red/30 transition-all transform active:scale-[0.98]"
              >
                <span className="text-2xl">🚨</span>
                <span>REQUEST AMBULANCE</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Helpline & Rapid Direct Access */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl p-5 bg-surface border border-border-subtle flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-fg uppercase tracking-wider">National Emergency</h3>
                <p className="text-xs text-fg-muted">Toll-free 24/7 direct operator</p>
              </div>
            </div>
            <a
              href="tel:112"
              className="w-full py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-bold text-sm border border-blue-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call 112 Directly</span>
            </a>
          </div>

          <div className="rounded-2xl p-4 bg-surface-raised/50 border border-border-subtle text-xs text-fg-muted space-y-2">
            <h4 className="font-bold text-fg text-xs uppercase tracking-wider">Emergency Protocol</h4>
            <p className="text-[11px] leading-relaxed">
              Stay calm. If in immediate life danger, keep your phone accessible. Emergency dispatchers receive live coordinates automatically once requested.
            </p>
          </div>
        </div>
      </div>

      {/* 3. WHAT HAPPENS AFTER YOU REQUEST (Responsive 3-Column Grid) */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted px-1">
          How RapidRoute Protects You
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-surface border border-border-subtle flex items-start gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-fg">Precise GPS Pinpointing</h4>
              <p className="text-[11px] text-fg-muted leading-relaxed mt-1">
                Your device location is shared directly with the nearest suitable ambulance crew.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border-subtle flex items-start gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-fg">Fastest Route & Live ETA</h4>
              <p className="text-[11px] text-fg-muted leading-relaxed mt-1">
                Calculates real-time traffic corridors to ensure the fastest arrival time, not just the closest vehicle.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border-subtle flex items-start gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-fg">Hospital Pre-Alert Coordination</h4>
              <p className="text-[11px] text-fg-muted leading-relaxed mt-1">
                Pre-alerts the receiving hospital trauma bay before arrival so doctors are prepared immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CitizenHomePage;
