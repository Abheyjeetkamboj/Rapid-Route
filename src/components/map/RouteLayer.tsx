import React from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import type { RouteGeometry } from '../../map/mapTypes';

interface RouteLayerProps {
  routes: RouteGeometry[];
  selectedRouteId?: string | null;
  onSelectRoute?: (routeId: string) => void;
}

export const RouteLayer: React.FC<RouteLayerProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
}) => {
  return (
    <>
      {routes.map((route) => {
        const isRec = route.isRecommended;
        const isSelected = selectedRouteId === route.id;
        const isHospitalTransfer = route.originId.startsWith('INC-') && route.destinationId.startsWith('HOSP-');

        let strokeColor = '#94a3b8'; // default subtle slate
        let strokeWidth = 3;
        let dashArray: string | undefined = '6, 8';
        let opacity = 0.65;

        if (isHospitalTransfer) {
          strokeColor = '#3b82f6'; // Hospital blue
          strokeWidth = 3.5;
          dashArray = '4, 6';
          opacity = 0.85;
        } else if (isRec) {
          strokeColor = '#10b981'; // Emerald winner
          strokeWidth = isSelected ? 6 : 5;
          dashArray = undefined; // Solid line
          opacity = 0.95;
        } else if (isSelected) {
          strokeColor = '#f59e0b'; // Amber selected alternative
          strokeWidth = 4.5;
          dashArray = '5, 5';
          opacity = 0.9;
        }

        return (
          <React.Fragment key={route.id}>
            {/* Outer subtle glow/casing for recommended route */}
            {isRec && (
              <Polyline
                positions={route.coordinates}
                pathOptions={{
                  color: '#064e3b',
                  weight: strokeWidth + 4,
                  opacity: 0.4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}

            {/* Main route polyline */}
            <Polyline
              positions={route.coordinates}
              pathOptions={{
                color: strokeColor,
                weight: strokeWidth,
                dashArray,
                opacity,
                lineCap: 'round',
                lineJoin: 'round',
              }}
              eventHandlers={{
                click: () => onSelectRoute?.(route.id),
              }}
            >
              <Tooltip sticky>
                <div className="p-1 text-xs space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: strokeColor }}
                    />
                    <span>
                      {isHospitalTransfer
                        ? `Transfer Path: ${route.destinationName}`
                        : `Unit ${route.originId} Corridor`}
                    </span>
                    {isRec && (
                      <span className="text-[9px] bg-status-available text-white px-1.5 py-0.2 rounded font-extrabold">
                        FASTEST
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-fg-muted font-mono">
                    {route.distanceKm} km • {route.etaMinutes} min • {route.trafficCondition} Traffic
                  </div>
                  <div className="text-[10px] text-fg-faint">{route.corridorName}</div>
                </div>
              </Tooltip>
            </Polyline>
          </React.Fragment>
        );
      })}
    </>
  );
};
