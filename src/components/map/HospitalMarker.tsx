import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Hospital } from '../../types';
import type { LatLngTuple } from '../../map/mapTypes';

interface HospitalMarkerProps {
  hospital: Hospital;
  position: LatLngTuple;
  isSelected?: boolean;
  onSelect: (hospitalId: string) => void;
}

export const HospitalMarker: React.FC<HospitalMarkerProps> = ({
  hospital,
  position,
  isSelected = false,
  onSelect,
}) => {
  const isReady = hospital.edStatus === 'Ready';
  const statusColor = isReady ? '#16a34a' : '#d97706';

  const customIcon = L.divIcon({
    className: 'custom-hospital-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          display: flex;
          align-items: center;
          gap: 4px;
          background: #1e3a8a;
          color: white;
          padding: 3px 6px;
          border-radius: 6px;
          border: 1.5px solid ${isSelected ? '#60a5fa' : '#3b82f6'};
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          transform: ${isSelected ? 'scale(1.08)' : 'scale(1)'};
          transition: transform 0.15s ease;
        ">
          <div style="
            width: 14px; 
            height: 14px; 
            border-radius: 3px; 
            background: white; 
            color: #1e3a8a; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-weight: 900; 
            font-size: 10px;
          ">
            H
          </div>
          <span style="font-size: 10px; font-weight: 700; white-space: nowrap;">
            ${hospital.icuBedsAvailable} ICU
          </span>
        </div>
        <div style="
          width: 0; 
          height: 0; 
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid #3b82f6;
        "></div>
      </div>
    `,
    iconSize: [64, 32],
    iconAnchor: [32, 28],
    popupAnchor: [0, -26],
  });

  return (
    <Marker
      position={position}
      icon={customIcon}
      eventHandlers={{
        click: () => onSelect(hospital.id),
      }}
    >
      <Popup>
        <div className="p-3 min-w-[240px] space-y-2">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-accent-blue text-white flex items-center justify-center font-bold text-[10px]">
                H
              </div>
              <span className="text-xs font-bold text-fg truncate">{hospital.name}</span>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
              style={{
                backgroundColor: `${statusColor}22`,
                color: statusColor,
              }}
            >
              {hospital.edStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] bg-surface-overlay/60 p-2 rounded-md border border-border-subtle">
            <div>
              <span className="text-fg-faint block text-[10px] uppercase">Trauma Level</span>
              <span className="font-semibold text-fg block">{hospital.traumaLevel}</span>
            </div>
            <div>
              <span className="text-fg-faint block text-[10px] uppercase">ICU Capacity</span>
              <span className="font-mono font-bold text-status-available block">
                {hospital.icuBedsAvailable} Beds Free
              </span>
            </div>
            <div>
              <span className="text-fg-faint block text-[10px] uppercase">Regional Area</span>
              <span className="font-semibold text-fg truncate block">{hospital.area}</span>
            </div>
            <div>
              <span className="text-fg-faint block text-[10px] uppercase">Incoming</span>
              <span className="font-mono font-semibold text-fg block">
                {hospital.incomingPatients} en route
              </span>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-fg-muted">
            <span>Specialty: <strong className="text-fg font-medium">{hospital.emergencyCapability}</strong></span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
