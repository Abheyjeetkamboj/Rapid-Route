import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Crosshair,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Compass,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { PatientLocation } from '../../types';
import {
  getCurrentLocation,
  searchLocations,
  DEMO_LOCATIONS,
} from '../../services/locationService';

interface PatientLocationSelectorProps {
  value: PatientLocation | null;
  onChange: (location: PatientLocation | null) => void;
  error?: string | null;
}

export const PatientLocationSelector: React.FC<PatientLocationSelectorProps> = ({
  value,
  onChange,
  error,
}) => {
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PatientLocation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocations(searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError(null);

    try {
      const detectedLocation = await getCurrentLocation();
      onChange(detectedLocation);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to acquire current location.';
      setLocationError(msg);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectResult = (loc: PatientLocation) => {
    onChange(loc);
    setSearchQuery('');
    setSearchResults([]);
    setLocationError(null);
  };

  const handleClearLocation = () => {
    onChange(null);
    setSearchQuery('');
    setSearchResults([]);
    setLocationError(null);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-accent-red" />
          Patient Location
        </label>
        <span className="text-[10px] font-mono font-bold text-accent-red tracking-wider">
          *REQUIRED
        </span>
      </div>

      {/* 1. CONFIRMED LOCATION PREVIEW STATE */}
      {value ? (
        <div className="rounded-xl border border-status-available/40 bg-status-available/5 p-4 space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent-red flex-shrink-0" />
                <span className="text-sm font-bold text-fg leading-tight">
                  {value.address}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-status-available/15 text-status-available border border-status-available/30">
                  <CheckCircle2 className="w-3 h-3 text-status-available" />
                  PATIENT LOCATION CONFIRMED
                </span>
                <span className="text-[10px] text-fg-muted font-medium">
                  Source:{' '}
                  <strong className="text-fg">
                    {value.source === 'current' ? 'Current device location' : 'Manual selection'}
                  </strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearLocation}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface hover:bg-surface-overlay border border-border text-fg-muted hover:text-fg transition-colors flex-shrink-0"
            >
              Change Location
            </button>
          </div>

          {/* Coordinates & Details Accordion */}
          <div className="pt-2 border-t border-border-subtle/80">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-[11px] font-mono text-fg-muted hover:text-fg transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-accent-blue" />
                Coordinates: {value.latitude.toFixed(4)}° N, {value.longitude.toFixed(4)}° E
              </span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDetails && (
              <div className="mt-2 p-2.5 rounded-lg bg-surface/80 border border-border-subtle text-[11px] space-y-1 font-mono text-fg-muted animate-fadeIn">
                <div className="flex justify-between">
                  <span>Telemetry Source:</span>
                  <span className="text-fg font-bold uppercase">{value.source}</span>
                </div>
                <div className="flex justify-between">
                  <span>Geographic Point:</span>
                  <span className="text-fg">{value.latitude}, {value.longitude}</span>
                </div>
                {value.subtext && (
                  <div className="pt-1 text-[10px] text-fg-faint border-t border-border-subtle/50">
                    {value.subtext}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 2. SELECTION MODE: USE CURRENT LOCATION OR SEARCH */
        <div className="rounded-xl border border-border bg-surface p-4 space-y-3.5 shadow-card">
          {/* Option A: Use Current Location */}
          <div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-accent-blue/10 hover:bg-accent-blue/15 border border-accent-blue/30 text-xs font-bold text-accent-blue transition-all disabled:opacity-50 shadow-xs"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-accent-blue" />
                  <span>Locating patient...</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4 text-accent-blue" />
                  <span>USE CURRENT LOCATION</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-fg-faint text-center mt-1.5">
              Use your device location to automatically set the patient's position.
            </p>
          </div>

          {/* Location Error / Denied Feedback */}
          {locationError && (
            <div className="p-3 rounded-lg bg-accent-redSubtle border border-accent-red/30 text-xs text-accent-red flex items-start justify-between gap-2 animate-fadeIn">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">{locationError}</span>
                  <span className="text-[11px] text-fg-muted mt-0.5 block">
                    Please use the search field below to specify the location manually.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => searchInputRef.current?.focus()}
                className="px-2 py-1 rounded bg-surface border border-border text-[10px] font-bold uppercase text-fg hover:bg-surface-overlay flex-shrink-0"
              >
                Enter Manually
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-border-subtle w-full" />
            <span className="bg-surface px-3 text-[10px] font-mono uppercase font-bold text-fg-faint absolute">
              OR ENTER MANUALLY
            </span>
          </div>

          {/* Option B: Manual Search */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search address, area, landmark..."
                className="w-full pl-9 pr-8 py-2.5 rounded-lg bg-surface-overlay border border-border text-xs text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Demo Preset Suggestions Chips */}
            {!searchQuery && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-mono text-fg-faint block uppercase">
                  Suggested Locations:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DEMO_LOCATIONS.slice(0, 4).map((loc) => (
                    <button
                      key={loc.address}
                      type="button"
                      onClick={() => handleSelectResult(loc)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-surface-overlay hover:bg-surface-raised border border-border-subtle text-fg-muted hover:text-fg transition-colors flex items-center gap-1"
                    >
                      <MapPin className="w-2.5 h-2.5 text-fg-faint" />
                      {loc.address.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Search Results Dropdown */}
            {searchQuery && (
              <div className="rounded-lg border border-border bg-surface-overlay/95 shadow-md overflow-hidden divide-y divide-border-subtle max-h-48 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-center text-xs text-fg-muted flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-blue" />
                    Searching regional database...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-center text-xs text-fg-muted">
                    No matching landmarks found. Try "Chitkara", "Sector 17", or "Rajpura".
                  </div>
                ) : (
                  searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className="w-full text-left p-2.5 hover:bg-surface-raised transition-colors flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-fg flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-accent-red flex-shrink-0" />
                          <span className="truncate">{result.address}</span>
                        </div>
                        {result.subtext && (
                          <div className="text-[10px] text-fg-muted truncate pl-4">
                            {result.subtext}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-fg-muted uppercase">
                          DEMO SEARCH DATA
                        </span>
                        <span className="font-mono text-[9px] text-fg-faint mt-0.5">
                          {result.latitude.toFixed(2)}, {result.longitude.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Warning */}
      {error && !value && (
        <div className="p-2.5 rounded-lg bg-accent-redSubtle border border-accent-red/30 text-xs text-accent-red font-medium flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
