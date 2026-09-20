import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  MapPin,
  Navigation,
  Building2,
  PhoneCall,
  CheckCircle2,
  Circle,
  Sparkles,
  Crosshair,
  Loader2,
  X,
} from 'lucide-react';
import { useCitizen } from '../../context/CitizenContext';
import { CitizenTrackingMap } from '../../components/citizen/CitizenTrackingMap';
import { getCurrentLocation } from '../../services/locationService';

export const CitizenEmergencyPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeEmergency,
    assignedAmbulance,
    receivingHospital,
    loadDemoIncident,
    updateLiveLocation,
  } = useCitizen();

  // Live Location Share State
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // Derive Timeline Steps
  const timelineStages = useMemo(() => {
    if (!activeEmergency) return [];

    const isAssigned = Boolean(activeEmergency.assignedAmbulance);
    const isEnRoute = activeEmergency.status === 'En Route' || activeEmergency.dispatchStage === 'En route';
    const isArrived = activeEmergency.status === 'On Scene' || activeEmergency.dispatchStage === 'Arrived';
    const isCompleted = activeEmergency.status === 'Completed' || activeEmergency.dispatchStage === 'Completed';

    return [
      {
        id: 1,
        title: 'Request received',
        subtitle: `Logged at ${activeEmergency.reportedAt || 'Just now'}`,
        state: 'completed',
      },
      {
        id: 2,
        title: 'Ambulance assigned',
        subtitle: isAssigned ? `Unit ${activeEmergency.assignedAmbulance} assigned to your location` : 'Locating best emergency unit',
        state: isAssigned ? 'completed' : 'current',
      },
      {
        id: 3,
        title: 'Ambulance en route',
        subtitle: isEnRoute || isArrived || isCompleted
          ? 'Unit navigating through traffic corridor'
          : 'Awaiting departure clearance',
        state: isCompleted || isArrived ? 'completed' : isEnRoute ? 'current' : 'pending',
      },
      {
        id: 4,
        title: 'Ambulance arriving',
        subtitle: isArrived || isCompleted ? 'Paramedic crew arrived on scene' : 'Vehicle approaching patient location',
        state: isCompleted ? 'completed' : isArrived ? 'current' : 'pending',
      },
      {
        id: 5,
        title: 'Emergency completed',
        subtitle: isCompleted ? 'Patient safely transferred to emergency department' : 'Hospital handover',
        state: isCompleted ? 'completed' : 'pending',
      },
    ];
  }, [activeEmergency]);

  // Handle Live Location Share
  const handleShareLiveLocation = async () => {
    setIsSharingLocation(true);
    setShareError(null);
    setShareSuccess(null);

    try {
      const loc = await getCurrentLocation();
      updateLiveLocation(loc);
      setShareSuccess(`Live GPS updated (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}). Transmitted to ambulance crew.`);
    } catch (err: any) {
      setShareError(err.message || 'Unable to access device location. Please ensure location permissions are enabled in your browser.');
    } finally {
      setIsSharingLocation(false);
    }
  };

  // If no active emergency, provide fallback
  if (!activeEmergency) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-5 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-fg-muted shadow-sm">
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h2 className="text-xl font-bold text-fg">No Active Emergency Request</h2>
          <p className="text-xs text-fg-muted">
            You currently do not have an active emergency request in progress.
          </p>
        </div>

        <div className="flex flex-col w-full max-w-xs gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => navigate('/citizen/request')}
            className="w-full py-3.5 px-4 rounded-2xl bg-accent-red hover:bg-accent-red/90 text-white font-bold text-sm tracking-wide shadow-md shadow-accent-red/20 transition-all"
          >
            🚨 Request Ambulance Now
          </button>

          <button
            type="button"
            onClick={loadDemoIncident}
            className="w-full py-3 px-4 rounded-2xl bg-surface-raised hover:bg-border text-fg font-semibold text-xs border border-border transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-accent-red" />
            <span>Load Master Demo Incident (Chitkara)</span>
          </button>
        </div>
      </div>
    );
  }

  const isAssigned = Boolean(activeEmergency.assignedAmbulance);
  const isCompleted = activeEmergency.status === 'Completed';

  return (
    <div className="py-2 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Left Column (col-span-7): Status, ETA, Map, GPS Sharing */}
        <div className="lg:col-span-7 space-y-5">
          {/* =========================================================================
              1. TOP STATUS & ETA CARD
              ========================================================================= */}
      <div className={`p-5 rounded-3xl border shadow-sm flex flex-col gap-4 ${
        isCompleted
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : isAssigned
          ? 'bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-xl shadow-red-500/20 border-red-400/30'
          : 'bg-surface-raised border-border'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              isCompleted ? 'bg-emerald-500' : isAssigned ? 'bg-white animate-ping' : 'bg-amber-500 animate-pulse'
            }`} />
            <span className={`text-xs font-black uppercase tracking-wider ${isAssigned && !isCompleted ? 'text-white/90' : 'text-fg-muted'}`}>
              {isCompleted
                ? 'EMERGENCY COMPLETED'
                : isAssigned
                ? 'AMBULANCE ASSIGNED'
                : 'REQUEST RECEIVED'}
            </span>
          </div>
          <span className={`font-mono text-xs font-bold ${isAssigned && !isCompleted ? 'text-white/80' : 'text-fg-muted'}`}>
            #{activeEmergency.id}
          </span>
        </div>

        {/* Big ETA Display */}
        {isAssigned && !isCompleted && activeEmergency.etaMinutes !== null && activeEmergency.etaMinutes !== undefined ? (
          <div className="flex items-baseline justify-between border-y border-white/20 py-3">
            <div>
              <div className="text-4xl xs:text-5xl font-black tracking-tight leading-none">
                {String(activeEmergency.etaMinutes).padStart(2, '0')}{' '}
                <span className="text-2xl font-bold text-white/90">min</span>
              </div>
              <p className="text-xs font-semibold text-white/80 mt-1 uppercase tracking-wider">
                Estimated arrival time
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-white/70 block">Ambulance</span>
              <span className="text-xl font-mono font-black">{activeEmergency.assignedAmbulance}</span>
              <span className="text-[10px] text-white/80 block mt-0.5">{assignedAmbulance?.capability || 'ALS'} Unit</span>
            </div>
          </div>
        ) : !isAssigned && !isCompleted ? (
          <div className="space-y-1">
            <h2 className="text-xl font-black text-fg tracking-tight">
              Finding the fastest suitable ambulance...
            </h2>
            <p className="text-xs text-fg-muted">
              Regional CAD dispatch engine is matching patient condition with corridor traffic.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <h2 className="text-xl font-black text-emerald-500 tracking-tight">
              Patient Handover Complete
            </h2>
            <p className="text-xs text-fg-muted">
              The emergency has concluded and the patient is receiving specialized clinical care.
            </p>
          </div>
        )}

        {/* Location Subtext */}
        <div className="flex items-start gap-2 text-xs">
          <MapPin className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isAssigned && !isCompleted ? 'text-white/80' : 'text-fg-muted'}`} />
          <span className={`line-clamp-2 ${isAssigned && !isCompleted ? 'text-white/90' : 'text-fg'}`}>
            {activeEmergency.location}
          </span>
        </div>
      </div>

      {/* =========================================================================
          2. CITIZEN TRACKING MAP
          ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-accent-red" />
            <span>Live Response Map</span>
          </h3>
          <span className="text-[11px] text-fg-muted">
            {assignedAmbulance ? 'Live GPS Route' : 'Patient Location'}
          </span>
        </div>

        <CitizenTrackingMap
          incident={activeEmergency}
          ambulance={assignedAmbulance}
          hospital={receivingHospital}
          className="h-72 sm:h-80 lg:h-[440px] w-full"
        />
      </div>

      {/* =========================================================================
          3. LIVE LOCATION SHARING
          ========================================================================= */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-fg">Precise Location Sharing</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
            GPS
          </span>
        </div>

        <p className="text-[11px] text-fg-muted leading-relaxed">
          Allow the ambulance crew to navigate directly to your device's exact GPS coordinates.
        </p>

        {shareSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{shareSuccess}</span>
          </div>
        )}

        {shareError && (
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 text-xs font-medium border border-red-500/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{shareError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleShareLiveLocation}
          disabled={isSharingLocation}
          className="w-full py-2.5 px-4 rounded-xl bg-surface-raised hover:bg-border text-fg font-bold text-xs border border-border flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {isSharingLocation ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Transmitting GPS Location...</span>
            </>
          ) : (
            <>
              <Crosshair className="w-3.5 h-3.5 text-blue-500" />
              <span>📍 SHARE LIVE LOCATION</span>
            </>
          )}
        </button>
      </div>
    </div>

    {/* Right Column (col-span-5): Receiving Hospital, Lifecycle Timeline, Support Action */}
    <div className="lg:col-span-5 space-y-5">
      {/* =========================================================================
          4. RECEIVING HOSPITAL (Once confirmed)
          ========================================================================= */}
      {(receivingHospital || activeEmergency.recommendedHospital || activeEmergency.preAlert) && (
        <div className="p-4 rounded-2xl bg-surface border border-purple-500/30 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-fg uppercase tracking-wider">Receiving Hospital</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
              Pre-Alert Confirmed
            </span>
          </div>

          <div>
            <h4 className="text-sm font-black text-fg">
              {receivingHospital?.name || activeEmergency.recommendedHospital?.name || activeEmergency.preAlert?.hospitalName}
            </h4>
            <p className="text-[11px] text-fg-muted mt-0.5">
              {receivingHospital?.area || 'Designated Regional Emergency Trauma & Cardiac Center'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border-subtle">
            <div>
              <span className="text-[10px] text-fg-muted block uppercase">Hospital Status</span>
              <span className="font-bold text-emerald-500">Trauma Team Ready</span>
            </div>
            <div>
              <span className="text-[10px] text-fg-muted block uppercase">Transit ETA</span>
              <span className="font-bold text-fg">
                {activeEmergency.recommendedHospital?.etaMinutes || 10} min to ED
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. STATUS TIMELINE
          ========================================================================= */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-fg">
          Emergency Lifecycle
        </h3>

        <div className="space-y-4">
          {timelineStages.map((stage, idx) => (
            <div key={stage.id} className="flex items-start gap-3 relative">
              {/* Connecting vertical line */}
              {idx < timelineStages.length - 1 && (
                <div
                  className={`absolute left-3 top-6 w-0.5 h-7 -translate-x-1/2 ${
                    stage.state === 'completed' ? 'bg-emerald-500' : 'bg-border-subtle'
                  }`}
                />
              )}

              {/* Node Icon */}
              <div className="flex-shrink-0 z-10">
                {stage.state === 'completed' ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : stage.state === 'current' ? (
                  <div className="w-6 h-6 rounded-full bg-accent-red text-white flex items-center justify-center shadow-md animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-surface-raised border border-border-subtle text-fg-faint flex items-center justify-center">
                    <Circle className="w-3 h-3 text-fg-faint" />
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <h4
                  className={`text-xs font-bold ${
                    stage.state === 'current'
                      ? 'text-accent-red'
                      : stage.state === 'completed'
                      ? 'text-fg'
                      : 'text-fg-muted'
                  }`}
                >
                  {stage.title}
                </h4>
                <p className="text-[11px] text-fg-muted mt-0.5">{stage.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          6. CONTACT / SUPPORT BUTTON
          ========================================================================= */}
      <button
        type="button"
        onClick={() => setShowContactModal(true)}
        className="w-full py-3.5 px-4 rounded-2xl bg-surface-raised hover:bg-border text-fg font-bold text-xs border border-border flex items-center justify-center gap-2 shadow-sm transition-colors"
      >
        <PhoneCall className="w-4 h-4 text-accent-red" />
        <span>CONTACT RESPONSE TEAM</span>
      </button>
    </div>
  </div>

      {/* Contact Response Team Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-border max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-red">
                <PhoneCall className="w-5 h-5" />
                <h3 className="font-bold text-sm text-fg">Emergency CAD Contact</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="p-1 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-raised"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-fg-muted leading-relaxed">
              Communication channel would connect to the regional emergency response centre handling Incident #{activeEmergency.id}.
            </p>

            <div className="p-3.5 rounded-2xl bg-surface-raised border border-border-subtle space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-fg-muted">Assigned Unit:</span>
                <span className="font-bold text-fg">{activeEmergency.assignedAmbulance || 'Awaiting dispatch'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-muted">CAD Helpline:</span>
                <span className="font-bold text-fg">112 (National Emergency)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-muted">Operator Desk:</span>
                <span className="font-bold text-fg">Tricity EOC Console #4</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowContactModal(false)}
              className="w-full py-2.5 rounded-xl bg-accent-red text-white font-bold text-xs transition-opacity hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default CitizenEmergencyPage;
