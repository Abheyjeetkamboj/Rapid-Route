import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Ambulance } from '../../types';
import type { LatLngTuple } from '../../map/mapTypes';

interface AmbulanceMarkerProps {
  ambulance: Ambulance;
  positionOverride?: LatLngTuple | null;
  isRecommended?: boolean;
  isSelected?: boolean;
  onSelect: (ambulanceId: string) => void;
}

export const AmbulanceMarker: React.FC<AmbulanceMarkerProps> = ({
  ambulance,
  positionOverride,
  isRecommended = false,
  isSelected = false,
  onSelect,
}) => {
  const position: LatLngTuple = positionOverride || [ambulance.lat, ambulance.lng];

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'AVAILABLE':
        return '#16a34a'; // Emerald
      case 'EN_ROUTE':
        return '#2563eb'; // Blue
      case 'BUSY':
        return '#d97706'; // Amber
      default:
        return '#64748b'; // Slate
    }
  };

  const statusColor = getStatusColor(ambulance.status);

  const customIcon = L.divIcon({
    className: 'custom-ambulance-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        ${isRecommended ? `
          <div style="position: absolute; top: -18px; background: #16a34a; color: white; font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 9999px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); letter-spacing: 0.5px; white-space: nowrap;">
            ★ RECOMMENDED
          </div>
        ` : ''}
        <div style="
          display: flex;
          align-items: center;
          gap: 4px;
          background: ${isSelected ? '#1e293b' : 'rgba(15, 23, 42, 0.92)'};
          color: white;
          padding: 3px 6px 3px 5px;
          border-radius: 6px;
          border: 1.5px solid ${isRecommended ? '#16a34a' : isSelected ? '#38bdf8' : statusColor};
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          transform: ${isSelected ? 'scale(1.08)' : 'scale(1)'};
          transition: transform 0.15s ease;
        ">
          <div style="width: 8px; height: 8px; border-radius: 2px; background: ${statusColor}; flex-shrink: 0;"></div>
          <span style="font-family: monospace; font-size: 11px; font-weight: 700; letter-spacing: -0.2px;">
            ${ambulance.id}
          </span>
        </div>
        <div style="
          width: 0; 
          height: 0; 
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid ${isRecommended ? '#16a34a' : isSelected ? '#38bdf8' : statusColor};
        "></div>
      </div>
    `,
    iconSize: [80, 42],
    iconAnchor: [40, 36],
    popupAnchor: [0, -32],
  });

  return (
    <Marker
      position={position}
      icon={customIcon}
      eventHandlers={{
        click: () => onSelect(ambulance.id),
      }}
    >
      <Popup>
        <div className="p-3 min-w-[240px] space-y-2">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: statusColor }}
              />
              <span className="font-mono text-xs font-bold text-fg">{ambulance.id}</span>
              {isRecommended && (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-status-available/20 text-status-available">
                  Top Match
                </span>
              )}
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
              style={{
                backgroundColor: `${statusColor}22`,
                color: statusColor,
              }}
            >
              {ambulance.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] bg-surface-overlay/60 p-2 rounded-md border border-border-subtle">
            <div>
              <span className="text-fg-faint block text-[10px] uppercase">Base Station</span>
              <span className="font-semibold text-fg truncate block">{ambulance.currentArea}</span>
            </div>
            <div>
              <span className="text-fg-faint block text-[10px] uppercase">Medical Tier</span>
              <span className="font-mono font-bold text-accent-blue truncate block">
                {ambulance.capability}
              </span>
            </div>
            <div>
              <span className="text-fg-faint block text-[10px] uppercase">Corridor Traffic</span>
              <span className="font-semibold text-fg block">
                {ambulance.trafficCondition || 'Normal'}
              </span>
            </div>
            <div>
              <span className="text-fg-faint block text-[10px] uppercase">Arrival ETA</span>
              <span className="font-mono font-bold text-status-available block">
                {ambulance.etaMinutes !== null ? `${ambulance.etaMinutes} min` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-fg-muted">
            <span>Crew: <strong className="text-fg font-medium">{ambulance.driverName}</strong></span>
            <button
              type="button"
              onClick={() => onSelect(ambulance.id)}
              className="text-[11px] font-semibold text-accent-blue hover:underline"
            >
              Select Unit →
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
