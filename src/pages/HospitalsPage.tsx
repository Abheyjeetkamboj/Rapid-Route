import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  BedDouble,
  Users,
  MapPin,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  HeartPulse,
  ArrowUpRight,
} from 'lucide-react';
import {
  Button,
  MetricCard,
  StatusDot,
  StatusPill,
  PageHero,
  CapacityMeter,
  Drawer,
} from '../components/ui';
import type { Hospital, HospitalStatus } from '../types';
import { useDispatchContext } from '../context/DispatchContext';

export default function HospitalsPage() {
  const { hospitals, emergencies } = useDispatchContext();
  const [searchParams] = useSearchParams();
  const queryHospitalId = searchParams.get('id');

  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | HospitalStatus>('ALL');
  const [capabilityFilter, setCapabilityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'distance' | 'icu' | 'name'>('distance');

  // Auto-select and open drawer if navigated with ?id=
  useEffect(() => {
    if (queryHospitalId) {
      const match = hospitals.find((h) => h.id.toLowerCase() === queryHospitalId.toLowerCase());
      if (match) {
        setSelectedHospital(match);
        setIsDrawerOpen(true);
      }
    }
  }, [queryHospitalId, hospitals]);

  // Network Metrics
  const totalHospitals = hospitals.length;
  const readyHospitals = useMemo(
    () => hospitals.filter((h) => h.emergencyStatus === 'ready' || h.edStatus === 'Ready').length,
    [hospitals]
  );
  const totalIcuBeds = useMemo(
    () => hospitals.reduce((acc, h) => acc + h.icuBedsAvailable, 0),
    [hospitals]
  );
  const totalIncomingPatients = useMemo(
    () => hospitals.reduce((acc, h) => acc + (h.currentIncomingPatients || h.incomingPatients || 0), 0),
    [hospitals]
  );

  // Filter & Sort
  const filteredHospitals = useMemo(() => {
    const list = hospitals.filter((hospital) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hospital.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hospital.emergencyCapability.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hospital.traumaLevel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hospital.capabilities.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || hospital.edStatus === statusFilter;

      const matchesCapability =
        capabilityFilter === 'ALL' ||
        hospital.capabilities.includes(capabilityFilter) ||
        (capabilityFilter === 'Cardiac' && hospital.cardiacUnit) ||
        hospital.emergencyCapability.toLowerCase().includes(capabilityFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesCapability;
    });

    return list.sort((a, b) => {
      if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
      if (sortBy === 'icu') return b.icuBedsAvailable - a.icuBedsAvailable;
      return a.name.localeCompare(b.name);
    });
  }, [hospitals, searchQuery, statusFilter, capabilityFilter, sortBy]);

  const handleOpenDetails = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const inboundIncidents = useMemo(() => {
    if (!selectedHospital) return [];
    return emergencies.filter(
      (e) =>
        (e.selectedHospitalId === selectedHospital.id || e.recommendedHospital?.id === selectedHospital.id) &&
        e.status !== 'Completed'
    );
  }, [selectedHospital, emergencies]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* 1. PAGE HERO */}
      <PageHero
        category="Emergency Medical Network"
        title="Hospital Coordination"
        description="Monitor receiving emergency capacity, critical-care resources, trauma readiness, and incoming ambulance patient handovers across the regional network."
        telemetryStatus="NETWORK TELEMETRY"
        telemetryDot="green"
      />

      {/* 2. ELEVATED METRIC ROW */}
      <section aria-label="Network Capacity Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          label="Total Facilities"
          value={totalHospitals}
          icon={<Building2 className="w-5 h-5 text-accent-blue" />}
          subtitle="Regional designated centers"
          accentColor="blue"
          variant="secondary"
        />
        <MetricCard
          label="Ready for Intake"
          value={readyHospitals}
          icon={<CheckCircle2 className="w-5 h-5 text-status-available" />}
          subtitle="No ED intake diversion"
          trend="100% target"
          trendUp
          accentColor="green"
          variant="primary"
        />
        <MetricCard
          label="Available ICU Beds"
          value={totalIcuBeds}
          icon={<BedDouble className="w-5 h-5 text-status-enroute" />}
          subtitle="Across 5 triage hubs"
          trend="4 surge ready"
          trendUp
          accentColor="amber"
          variant="primary"
        />
        <MetricCard
          label="Inbound Patients"
          value={totalIncomingPatients}
          icon={<Users className="w-5 h-5 text-accent-red" />}
          subtitle="Active en-route transports"
          accentColor="red"
          variant="secondary"
        />
      </section>

      {/* 3. CONTROL BAR (Search, Filter, Sort) */}
      <section
        aria-label="Hospital Controls"
        className="space-y-3 p-4 rounded-xl bg-surface border border-border shadow-card"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hospital, sector, or clinical capability..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-overlay border border-border-subtle text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-colors"
            />
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter Tabs */}
            <div className="inline-flex rounded-lg p-1 bg-surface-overlay border border-border-subtle text-xs font-medium text-fg-muted">
              {(['ALL', 'Ready', 'Limited', 'Diverting'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    statusFilter === tab
                      ? 'bg-surface text-fg font-semibold shadow-xs'
                      : 'hover:text-fg'
                  }`}
                >
                  {tab === 'ALL' ? 'All Status' : tab}
                </button>
              ))}
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-2 text-xs text-fg-muted">
              <SlidersHorizontal className="w-3.5 h-3.5 text-fg-faint" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort hospitals"
                className="bg-surface-overlay border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:border-accent-blue"
              >
                <option value="distance">Sort by Distance</option>
                <option value="icu">Sort by ICU Beds</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Capability Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-subtle/50 text-xs">
          <span className="text-[11px] font-bold text-fg-faint uppercase mr-1">Specialty:</span>
          {['ALL', 'Cardiac', 'Trauma', 'ICU', 'Emergency Surgery'].map((cap) => (
            <button
              key={cap}
              onClick={() => setCapabilityFilter(cap)}
              className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                capabilityFilter === cap
                  ? 'bg-accent-blue text-white font-semibold shadow-xs'
                  : 'bg-surface-overlay text-fg-muted hover:text-fg border border-border-subtle'
              }`}
            >
              {cap === 'ALL' ? 'All Specialities' : cap}
            </button>
          ))}
        </div>
      </section>

      {/* 4. HOSPITAL GRID (Large Premium Cards) */}
      <section aria-label="Receiving Hospitals Grid">
        {filteredHospitals.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-surface border border-border-subtle">
            <Building2 className="w-8 h-8 text-fg-faint mx-auto mb-3" />
            <p className="text-base font-semibold text-fg">No facilities found</p>
            <p className="text-sm text-fg-muted mt-1">Try adjusting your search or intake status filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredHospitals.map((hospital) => {
              // Derive status mapping
              const isReady = hospital.edStatus === 'Ready';
              const isLimited = hospital.edStatus === 'Limited';
              const statusPillType = isReady ? 'READY' : isLimited ? 'LIMITED' : 'DIVERTING';

              // Parse capabilities into badges
              const capabilities = hospital.emergencyCapability.split(',').map((c) => c.trim());

              return (
                <div
                  key={hospital.id}
                  className="group relative flex flex-col justify-between rounded-xl bg-surface border border-border-subtle hover:border-border hover:shadow-card-hover transition-all duration-200 p-6"
                >
                  {/* Card Header: Hospital name & Status */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-accent-blue flex-shrink-0" />
                          <h2 className="text-base font-bold text-fg tracking-tight truncate group-hover:text-accent-blue transition-colors">
                            {hospital.name}
                          </h2>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-fg-muted">
                          <MapPin className="w-3.5 h-3.5 text-fg-faint" />
                          <span>{hospital.area}</span>
                          <span className="text-fg-faint">•</span>
                          <span className="font-mono text-fg font-medium">{hospital.distanceKm} km</span>
                        </div>
                      </div>

                      <StatusPill status={statusPillType} label={hospital.edStatus.toUpperCase()} />
                    </div>

                    {/* Trauma & Clinical capability chips */}
                    <div className="flex flex-wrap items-center gap-1.5 my-4">
                      <span className="px-2 py-0.5 rounded bg-accent-blueSubtle text-accent-blue text-[11px] font-semibold tracking-wide border border-accent-blue/20">
                        {hospital.traumaLevel}
                      </span>
                      {hospital.cardiacUnit && (
                        <span className="px-2 py-0.5 rounded bg-accent-red/10 text-accent-red text-[11px] font-semibold border border-accent-red/20">
                          Cardiac Unit
                        </span>
                      )}
                      {capabilities.map((cap, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-surface-overlay text-fg-muted text-[11px] font-medium border border-border-subtle"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>

                    {/* Visual Capacity & Clinical Status Section */}
                    <div className="space-y-3 pt-3 border-t border-border-subtle">
                      {/* ICU Capacity Bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-fg-muted flex items-center gap-1.5">
                            <BedDouble className="w-3.5 h-3.5 text-fg-faint" />
                            ICU Availability
                          </span>
                          <span className="font-mono font-semibold text-fg">
                            {hospital.icuBedsAvailable} / {hospital.icuBedsTotal} free
                          </span>
                        </div>
                        <CapacityMeter
                          value={hospital.icuBedsAvailable}
                          max={hospital.icuBedsTotal}
                          color={hospital.icuBedsAvailable <= 1 ? 'red' : hospital.icuBedsAvailable <= 3 ? 'amber' : 'green'}
                          size="sm"
                        />
                      </div>

                      {/* Emergency Department Beds Capacity Bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-fg-muted flex items-center gap-1.5">
                            <HeartPulse className="w-3.5 h-3.5 text-fg-faint" />
                            ED Intake Beds
                          </span>
                          <span className="font-mono font-semibold text-fg">
                            {hospital.emergencyBedsAvailable} / {hospital.emergencyBedsTotal} free
                          </span>
                        </div>
                        <CapacityMeter
                          value={hospital.emergencyBedsAvailable}
                          max={hospital.emergencyBedsTotal}
                          color={hospital.emergencyBedsAvailable <= 2 ? 'red' : hospital.emergencyBedsAvailable <= 5 ? 'amber' : 'green'}
                          size="sm"
                        />
                      </div>

                      {/* ED Status & Inbound transports */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div className="p-2.5 rounded-lg bg-surface-overlay/60 border border-border-subtle">
                          <span className="text-[11px] text-fg-faint uppercase font-medium block mb-0.5">
                            Emergency Dept
                          </span>
                          <span className="font-medium text-fg flex items-center gap-1.5">
                            <StatusDot color={isReady ? 'green' : isLimited ? 'amber' : 'red'} size="xs" />
                            {hospital.emergencyStatus.toUpperCase()}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-surface-overlay/60 border border-border-subtle">
                          <span className="text-[11px] text-fg-faint uppercase font-medium block mb-0.5">
                            Inbound Transfers
                          </span>
                          <span className="font-mono font-medium text-fg">
                            {hospital.currentIncomingPatients || hospital.incomingPatients}{' '}
                            {(hospital.currentIncomingPatients || hospital.incomingPatients) === 1 ? 'patient' : 'patients'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-4 mt-4 border-t border-border-subtle flex items-center justify-between">
                    <span className="text-[11px] text-fg-faint font-mono">
                      CODE: {hospital.id}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDetails(hospital)}
                      className="text-accent-blue hover:text-accent-blue font-semibold hover:bg-accent-blueSubtle"
                    >
                      <span>View hospital</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. INTERACTIVE DETAILS DRAWER */}
      <Drawer
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={selectedHospital?.name || 'Hospital Details'}
        subtitle={`${selectedHospital?.area} • ${selectedHospital?.distanceKm} km`}
        badge={
          selectedHospital && (
            <StatusPill
              status={selectedHospital.edStatus === 'Ready' ? 'READY' : selectedHospital.edStatus === 'Limited' ? 'LIMITED' : 'DIVERTING'}
              size="sm"
            />
          )
        }
      >
        {selectedHospital && (
          <div className="space-y-6">
            {/* Critical Metrics Snapshot */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-surface-raised border border-border-subtle">
                <span className="text-xs text-fg-muted block">ICU Beds Available</span>
                <span className="text-2xl font-bold font-mono text-fg mt-1 block">
                  {selectedHospital.icuBedsAvailable}
                </span>
                <span className="text-[11px] text-fg-faint">Critical Care Unit</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-raised border border-border-subtle">
                <span className="text-xs text-fg-muted block">Active Inbound</span>
                <span className="text-2xl font-bold font-mono text-accent-blue mt-1 block">
                  {selectedHospital.incomingPatients}
                </span>
                <span className="text-[11px] text-fg-faint">Ambulance transfers</span>
              </div>
            </div>

            {/* General Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Facility Specifications
              </h3>
              <div className="divide-y divide-border-subtle rounded-xl bg-surface-raised border border-border-subtle text-xs">
                <div className="flex items-center justify-between p-3">
                  <span className="text-fg-muted">Trauma Certification</span>
                  <span className="font-semibold text-fg">{selectedHospital.traumaLevel}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-fg-muted">ED Receiving Status</span>
                  <span className="font-semibold text-fg">{selectedHospital.edStatus}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-fg-muted">Estimated Direct Distance</span>
                  <span className="font-mono text-fg font-medium">{selectedHospital.distanceKm} km</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-fg-muted">Facility Identifier</span>
                  <span className="font-mono text-fg font-medium">{selectedHospital.id}</span>
                </div>
              </div>
            </div>

            {/* Clinical Capabilities List */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Clinical Specialities & Facilities
              </h3>
              <div className="p-4 rounded-xl bg-surface-raised border border-border-subtle space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-fg">
                  <HeartPulse className="w-4 h-4 text-accent-red" />
                  <span>{selectedHospital.emergencyCapability}</span>
                </div>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Equipped for rapid emergency intake, resuscitation protocols, and emergency surgical intervention.
                </p>
              </div>
            </div>

            {/* Inbound CAD Ambulance Transports & Pre-Alerts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  Active Inbound Transports ({inboundIncidents.length})
                </h3>
                <span className="text-[10px] font-mono text-accent-blue font-bold px-1.5 py-0.5 rounded bg-accent-blueSubtle">
                  CAD TELEMETRY
                </span>
              </div>

              {inboundIncidents.length === 0 ? (
                <div className="p-4 rounded-xl bg-surface-raised border border-border-subtle text-xs text-fg-muted text-center">
                  No active ambulance transfers currently en route to this facility.
                </div>
              ) : (
                <div className="space-y-2">
                  {inboundIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-3 rounded-xl bg-surface-raised border border-border-subtle text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between font-semibold text-fg">
                        <span className="font-mono text-accent-blue font-bold">{inc.id}</span>
                        <StatusPill
                          status={
                            inc.preAlert?.status === 'HANDOVER_COMPLETED' || inc.preAlert?.status === 'PATIENT_ARRIVED'
                              ? 'READY'
                              : inc.preAlert?.status === 'ACKNOWLEDGED'
                              ? 'READY'
                              : inc.preAlert?.status === 'SENT'
                              ? 'LIMITED'
                              : 'LIMITED'
                          }
                          label={inc.preAlert?.status || 'READY_TO_SEND'}
                          size="sm"
                        />
                      </div>
                      <p className="text-[11px] text-fg-muted">
                        {inc.emergencyType} • {inc.location.split(',')[0]}
                      </p>
                      {inc.preAlert?.requiredPreparation && (
                        <div className="p-2 rounded bg-surface border border-border-subtle text-[11px] text-fg">
                          <span className="text-[9px] uppercase font-bold text-fg-faint block">
                            Direct Clinical Preparation:
                          </span>
                          <span>{inc.preAlert.requiredPreparation}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] font-mono text-fg-muted pt-1 border-t border-border-subtle/50">
                        <span>Assigned Unit: <strong className="text-fg">{inc.assignedAmbulance || 'Awaiting'}</strong></span>
                        <span>Severity: <strong className="text-fg">{inc.severity}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
