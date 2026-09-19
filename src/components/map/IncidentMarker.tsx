import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { ActiveEmergency } from '../../types';
import type { LatLngTuple } from '../../map/mapTypes';

interface IncidentMarkerProps {
  incident: ActiveEmergency;
  position: LatLngTuple;
  isSelected: boolean;
  onSelect: (incidentId: string) => void;
}

export const IncidentMarker: React.FC<IncidentMarkerProps> = ({
  incident,
  position,
  isSelected,
  onSelect,
}) => {
  const isCritical = incident.severity === 'Critical';
  const isUrgent = incident.severity === 'Urgent';

  const colorClass = isCritical ? '#dc2626' : isUrgent ? '#f59e0b' : '#2563eb';
  const badgeBg = isCritical ? 'rgba(220, 38, 38, 0.2)' : isUrgent ? 'rgba(245, 158, 11, 0.2)' : 'rgba(37, 99, 235, 0.2)';

  const customIcon = L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: ${badgeBg}; animation: ping-subtle 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: ${isSelected ? '24px' : '20px'}; height: ${isSelected ? '24px' : '20px'}; border-radius: 50%; background: ${colorClass}; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: white;"></div>
        </div>
        ${isSelected ? `<div style="position: absolute; top: -18px; background: ${colorClass}; color: white; font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,0.3); font-family: monospace;">TARGET</div>` : ''}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });

  return (
    <Marker
      position={position}
      icon={customIcon}
      eventHandlers={{
        click: () => onSelect(incident.id),
      }}
    >
      <Popup>
        <div className="p-3 min-w-[240px] space-y-2">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colorClass }}
              />
              <span className="font-mono text-xs font-bold text-fg">{incident.id}</span>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
              style={{
                backgroundColor: badgeBg,
                color: colorClass,
              }}
            >
              {incident.severity}
            </span>
          </div>

          <div>
            <p className="text-xs font-bold text-fg leading-tight">{incident.location}</p>
            <p className="text-[11px] text-fg-muted mt-0.5">{incident.emergencyType}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] bg-surface-overlay/60 p-2 rounded-md border border-border-subtle">
            <div>
              <span className="text-fg-faint block text-[10px] uppercase">Patients</span>
              <span className="font-mono font-semibold text-fg">{incident.patientCount}</span>
            </div>
            <div>
              <span className="text-fg-faint block text-[10px] uppercase">Req. Capability</span>
              <span className="font-semibold text-fg truncate block">
                {incident.requiredCapability}
              </span>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-fg-muted">
            <span>Status: <strong className="text-fg">{incident.status}</strong></span>
            <button
              type="button"
              onClick={() => onSelect(incident.id)}
              className="text-[11px] font-semibold text-accent-blue hover:underline"
            >
              Focus Incident →
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
