import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Calendar,
  MapPin,
  ChevronRight,
  X,
} from 'lucide-react';
import { useCitizen } from '../../context/CitizenContext';
import type { ActiveEmergency } from '../../types';

export const CitizenHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { citizenHistory, setActiveIncidentId } = useCitizen();
  const [selectedIncident, setSelectedIncident] = useState<ActiveEmergency | null>(null);

  const handleOpenIncident = (incident: ActiveEmergency) => {
    setSelectedIncident(incident);
  };

  const handleTrackIncident = (incidentId: string) => {
    setActiveIncidentId(incidentId);
    setSelectedIncident(null);
    navigate(`/citizen/emergency?id=${incidentId}`);
  };

  return (
    <div className="flex flex-col gap-5 py-2">
      <div>
        <h1 className="text-xl xs:text-2xl font-black tracking-tight text-fg">
          My Request History
        </h1>
        <p className="text-xs text-fg-muted mt-0.5">
          Past emergency assistance calls and completed transports.
        </p>
      </div>

      {citizenHistory.length === 0 ? (
        <div className="p-8 rounded-3xl bg-surface border border-border text-center space-y-3 max-w-md mx-auto">
          <Clock className="w-10 h-10 text-fg-muted mx-auto" />
          <p className="text-xs text-fg-muted">No emergency requests found in your history.</p>
          <button
            type="button"
            onClick={() => navigate('/citizen/request')}
            className="px-4 py-2 rounded-xl bg-accent-red text-white text-xs font-bold shadow-md shadow-accent-red/20"
          >
            Request Ambulance
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {citizenHistory.map((item) => {
            const isCompleted = item.status === 'Completed' || item.dispatchStage === 'Completed';

            return (
              <div
                key={item.id}
                onClick={() => handleOpenIncident(item)}
                className="p-4 rounded-2xl bg-surface hover:bg-surface-raised border border-border transition-all cursor-pointer shadow-sm flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-fg">{item.id}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-accent-red/10 text-accent-red border border-accent-red/20'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-fg truncate">
                    {item.emergencyType}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] text-fg-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{item.reportedAt || 'Recent'}</span>
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-surface-raised text-fg-muted group-hover:text-fg transition-colors flex-shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Basic Summary Modal (No internal dispatcher leaks) */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl border border-border max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-fg-muted">Request Record</span>
                <h3 className="font-mono font-bold text-sm text-fg">{selectedIncident.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="p-1 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-raised"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-fg-muted block text-[10px] uppercase">Patient Location</span>
                <span className="font-semibold text-fg">{selectedIncident.location}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-fg-muted block text-[10px] uppercase">Emergency Type</span>
                  <span className="font-semibold text-fg">{selectedIncident.emergencyType}</span>
                </div>
                <div>
                  <span className="text-fg-muted block text-[10px] uppercase">Status</span>
                  <span className="font-semibold text-accent-red">{selectedIncident.status}</span>
                </div>
              </div>

              {selectedIncident.assignedAmbulance && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-fg-muted block text-[10px] uppercase">Assigned Unit</span>
                    <span className="font-semibold text-fg">{selectedIncident.assignedAmbulance}</span>
                  </div>
                  <div>
                    <span className="text-fg-muted block text-[10px] uppercase">Arrival Duration</span>
                    <span className="font-semibold text-fg">{selectedIncident.actualResponseMinutes || 9} min</span>
                  </div>
                </div>
              )}

              {selectedIncident.recommendedHospital && (
                <div>
                  <span className="text-fg-muted block text-[10px] uppercase">Receiving Hospital</span>
                  <span className="font-semibold text-fg">{selectedIncident.recommendedHospital.name}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => handleTrackIncident(selectedIncident.id)}
                className="flex-1 py-2.5 rounded-xl bg-accent-red text-white font-bold text-xs shadow-sm hover:bg-accent-red/90 transition-colors"
              >
                View Live Screen
              </button>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="py-2.5 px-4 rounded-xl bg-surface-raised text-fg font-bold text-xs border border-border hover:bg-border transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CitizenHistoryPage;
