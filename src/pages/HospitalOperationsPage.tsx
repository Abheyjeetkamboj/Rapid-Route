import { useState, useMemo } from 'react';
import {
  Building2,
  BedDouble,
  HeartPulse,
  Truck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  UserCheck,
} from 'lucide-react';
import { useDispatchContext } from '../context/DispatchContext';
import { PageHero, MetricCard } from '../components/ui';
import type { HospitalEmergencyStatus, ActiveEmergency } from '../types';

export default function HospitalOperationsPage() {
  const {
    emergencies,
    hospitals,
    simulateHospitalAcknowledgement,
    recordHospitalArrival,
    completeHospitalHandover,
  } = useDispatchContext();

  // Hospital Operator is situated at City Emergency Hospital (HOSP-01)
  const currentHospital = useMemo(() => {
    return hospitals.find((h) => h.id === 'HOSP-01') || hospitals[0];
  }, [hospitals]);

  const [edStatus, setEdStatus] = useState<HospitalEmergencyStatus>(
    currentHospital.emergencyStatus || 'ready'
  );
  const icuBeds = currentHospital.icuBedsAvailable || 3;
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionSuccessToast(msg);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  // Inbound incidents designated for this hospital
  const inboundCases = useMemo(() => {
    return emergencies.filter((e) => {
      const isTargetHospital =
        e.selectedHospitalId === currentHospital.id ||
        e.recommendedHospital?.id === currentHospital.id ||
        !e.selectedHospitalId; // Show awaiting or assigned
      return isTargetHospital && e.status !== 'Completed';
    });
  }, [emergencies, currentHospital]);

  // Completed handovers
  const completedCases = useMemo(() => {
    return emergencies.filter(
      (e) =>
        (e.selectedHospitalId === currentHospital.id || e.recommendedHospital?.id === currentHospital.id) &&
        e.status === 'Completed'
    );
  }, [emergencies, currentHospital]);

  const handleAcknowledge = (incidentId: string) => {
    simulateHospitalAcknowledgement(
      incidentId,
      'Trauma Bay 2 & Cath Lab standby confirmed by ED Charge Nurse.'
    );
    showToast(`Pre-Alert for incident ${incidentId} confirmed on standby.`);
  };

  const handleMarkArrived = (incidentId: string) => {
    recordHospitalArrival(incidentId);
    showToast(`Unit arrival at emergency bay logged for incident ${incidentId}.`);
  };

  const handleStartHandover = (incidentId: string) => {
    // Stage arrival / handover initiation
    recordHospitalArrival(incidentId);
    showToast(`Clinical handover initiated for incident ${incidentId}.`);
  };

  const handleCompleteHandover = (incidentId: string) => {
    completeHospitalHandover(
      incidentId,
      'Patient transferred to trauma resuscitation bay. Transporting crew released.'
    );
    showToast(`Handover completed and signed off for incident ${incidentId}.`);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* 1. PAGE HERO */}
      <PageHero
        category="Hospital Emergency Department Portal"
        title={`${currentHospital.name} · ED Operations`}
        description="Inbound ambulance telemetry, clinical HL7 pre-alerts, ED bed capacity, and patient bedside handover management."
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-fg-muted font-medium mr-1">Set ED Intake Status:</span>
            {(['ready', 'busy', 'diverting'] as HospitalEmergencyStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setEdStatus(st);
                  showToast(`Hospital intake status updated to ${st.toUpperCase()}.`);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold capitalize transition-all border ${
                  edStatus === st
                    ? 'bg-accent-blueSubtle text-accent-blue border-accent-blue/40 shadow-xs'
                    : 'bg-surface-raised hover:bg-surface border-border-subtle text-fg-muted'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        }
      />

      {/* Action toast */}
      {actionSuccessToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* 2. ED CAPACITY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Inbound Cases"
          value={inboundCases.length.toString()}
          subtitle="En route or awaiting arrival"
          icon={<Truck className="w-4 h-4 text-accent-blue" />}
          accentColor="blue"
        />
        <MetricCard
          label="ICU Beds Available"
          value={`${icuBeds} / 12`}
          subtitle="Resuscitation / critical care"
          icon={<BedDouble className="w-4 h-4 text-status-available" />}
          accentColor="green"
        />
        <MetricCard
          label="ED Beds Ready"
          value={`${currentHospital.emergencyBedsAvailable || 8} / 24`}
          subtitle="Acute emergency intake"
          icon={<Building2 className="w-4 h-4 text-purple-400" />}
          accentColor="blue"
        />
        <MetricCard
          label="Completed Handovers"
          value={completedCases.length.toString()}
          subtitle="Signed off today"
          icon={<CheckCircle2 className="w-4 h-4 text-status-available" />}
          accentColor="green"
        />
      </div>

      {/* 3. INBOUND CASES & PRE-ALERTS QUEUE */}
      <div className="rounded-2xl bg-surface border border-border-subtle shadow-sm overflow-hidden space-y-0">
        <div className="p-5 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-blueSubtle flex items-center justify-center text-accent-blue">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg tracking-tight">Inbound Patients & Pre-Alerts</h3>
              <p className="text-[11px] text-fg-muted font-mono">
                Real-time ambulance corridor arrivals and clinical notifications
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-accent-blueSubtle text-accent-blue">
            {inboundCases.length} Active Case{inboundCases.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="divide-y divide-border-subtle">
          {inboundCases.length === 0 ? (
            <div className="p-12 text-center text-xs text-fg-muted space-y-2">
              <CheckCircle2 className="w-8 h-8 text-status-available mx-auto stroke-1" />
              <p className="font-bold text-fg text-sm">No Inbound Ambulances En Route</p>
              <p className="text-fg-faint">
                Emergency department reception is clear. All current admissions completed.
              </p>
            </div>
          ) : (
            inboundCases.map((incident: ActiveEmergency) => {
              const isAcknowledged =
                incident.preAlert?.status === 'ACKNOWLEDGED' ||
                incident.timeline.some((t) => t.title.toLowerCase().includes('acknowledged'));
              const isArrived =
                incident.dispatchStage === 'Arrived' ||
                incident.timeline.some((t) => t.title.toLowerCase().includes('arrival on scene') || t.title.toLowerCase().includes('arrived'));
              const isHandoverInProgress = isArrived && incident.status !== 'Completed';

              return (
                <div key={incident.id} className="p-5 sm:p-6 space-y-4 hover:bg-surface-raised/30 transition-colors">
                  {/* Top line: Incident ID, Severity, ETA, Assigned Unit */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-fg">{incident.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          incident.severity === 'Critical'
                            ? 'bg-accent-redSubtle text-accent-red border border-accent-red/30'
                            : incident.severity === 'Urgent'
                            ? 'bg-accent-amberSubtle text-status-enroute border border-status-enroute/30'
                            : 'bg-accent-blueSubtle text-accent-blue border border-accent-blue/30'
                        }`}
                      >
                        {incident.severity}
                      </span>
                      <span className="text-xs text-fg-faint font-mono">Reported {incident.reportedAt}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-surface-raised border border-border-subtle text-fg">
                        Unit: <span className="text-accent-blue">{incident.assignedAmbulance || 'RR-204'}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-accent-blueSubtle text-accent-blue flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>ETA: {incident.etaMinutes || 8} min</span>
                      </span>
                    </div>
                  </div>

                  {/* Middle: Clinical Presentation & Required Preparation */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 rounded-xl bg-surface-raised/60 border border-border-subtle text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-fg-faint uppercase tracking-wider font-semibold block mb-1">
                        Clinical Presentation
                      </span>
                      <div className="font-bold text-fg">{incident.emergencyType}</div>
                      <div className="text-fg-muted mt-0.5">
                        {incident.symptoms && incident.symptoms.length > 0
                          ? `Symptoms: ${incident.symptoms.join(', ')}`
                          : incident.notes}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-fg-faint uppercase tracking-wider font-semibold block mb-1">
                        Patient Triage Profile
                      </span>
                      <div className="text-fg font-medium">
                        Patient Count: <span className="font-bold">{incident.patientCount}</span>
                        {incident.patientAge && ` · Age: ${incident.patientAge}`}
                      </div>
                      <div className="text-fg-muted mt-0.5">
                        Required Capability: <span className="font-mono font-semibold text-accent-blue">{incident.requiredCapability}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-fg-faint uppercase tracking-wider font-semibold block mb-1">
                        Receiving Preparation Needed
                      </span>
                      <div className="font-bold text-fg flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-accent-red" />
                        <span>Cath Lab Standby / Resuscitation Bay</span>
                      </div>
                      <div className="text-[11px] text-fg-muted mt-0.5">
                        HL7 pre-alert received via RapidRoute EOC Gateway
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Action Workflow Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border-subtle/80">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-fg-muted">Coordination State:</span>
                      {isAcknowledged ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Standby Acknowledged
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Pre-Alert Pending Standby
                        </span>
                      )}

                      {isArrived && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          Vehicle at Bay
                        </span>
                      )}
                    </div>

                    {/* Sequential Hospital Actions */}
                    <div className="flex items-center gap-2">
                      {!isAcknowledged && (
                        <button
                          onClick={() => handleAcknowledge(incident.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ACKNOWLEDGE PRE-ALERT</span>
                        </button>
                      )}

                      {isAcknowledged && !isArrived && (
                        <button
                          onClick={() => handleMarkArrived(incident.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-surface-raised hover:bg-surface border border-border text-fg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5 text-accent-blue" />
                          <span>MARK ARRIVED AT BAY</span>
                        </button>
                      )}

                      {isArrived && !isHandoverInProgress && (
                        <button
                          onClick={() => handleStartHandover(incident.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-surface-raised hover:bg-surface border border-border text-fg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-status-enroute" />
                          <span>START HANDOVER</span>
                        </button>
                      )}

                      {isArrived && (
                        <button
                          onClick={() => handleCompleteHandover(incident.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>COMPLETE HANDOVER</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. COMPLETED HANDOVERS LOG */}
      {completedCases.length > 0 && (
        <div className="rounded-2xl bg-surface border border-border-subtle p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-status-available" />
              <h3 className="text-sm font-bold text-fg tracking-tight">Recent Handover Records</h3>
            </div>
            <span className="text-[11px] font-mono text-fg-faint">Completed Transfers</span>
          </div>

          <div className="divide-y divide-border-subtle text-xs">
            {completedCases.map((c) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-fg">{c.id}</span>
                  <span className="text-fg-muted">{c.emergencyType}</span>
                </div>
                <div className="flex items-center gap-3 text-fg-faint font-mono text-[11px]">
                  <span>Unit: {c.assignedAmbulance || 'RR-204'}</span>
                  <span>Handover Verified</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
