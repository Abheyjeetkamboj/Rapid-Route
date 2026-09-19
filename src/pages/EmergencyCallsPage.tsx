import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  MapPin,
  HeartPulse,
  Users,
  Stethoscope,
  Clock,
  Navigation,
  Building2,
  CheckCircle2,
  Send,
  X,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Check,
  Truck,
  Edit3,
  FileText,
} from 'lucide-react';
import {
  PageHero,
  StatusPill,
  StatusDot,
  Button,
  Drawer,
} from '../components/ui';
import type {
  ActiveEmergency,
  EmergencySeverity,
  AmbulanceCapability,
  DispatchStage,
  DispatchRecommendation,
  Hospital,
} from '../types';
import { useDispatchContext } from '../context/DispatchContext';
import { findBestAmbulance } from '../engine/dispatchEngine';
import { recommendHospital } from '../engine/hospitalSelectionEngine';
import { generateHospitalPreAlert } from '../services/preAlertService';
import { AiIntakeAssistant } from '../components/ai/AiIntakeAssistant';
import { AiDispatchExplanationCard } from '../components/ai/AiDispatchExplanationCard';
import { explainDispatchRecommendation } from '../ai/aiService';
import type { ExtractedEmergency } from '../ai/aiTypes';

const DISPATCH_STAGES: DispatchStage[] = [
  'Awaiting dispatch',
  'Recommended',
  'Dispatched',
  'En route',
  'Arrived',
  'Completed',
];

export default function EmergencyCallsPage() {
  const {
    emergencies,
    ambulanceFleet,
    hospitals,
    addEmergency,
    dispatchAmbulance,
    confirmHospital,
    sendHospitalPreAlert,
    simulateHospitalAcknowledgement,
    recordHospitalArrival,
    completeHospitalHandover,
    resetDemoData,
  } = useDispatchContext();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryIncidentId = searchParams.get('id');

  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(() => {
    if (queryIncidentId && emergencies.some((e) => e.id === queryIncidentId)) {
      return queryIncidentId;
    }
    return 'INC-4821';
  });

  // Sync if URL search query changes
  useEffect(() => {
    if (queryIncidentId && emergencies.some((e) => e.id === queryIncidentId)) {
      setSelectedIncidentId(queryIncidentId);
    }
  }, [queryIncidentId, emergencies]);

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    setSearchParams({ id });
  };
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | EmergencySeverity | 'AWAITING'>('ALL');
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState<boolean>(false);
  const [isHospitalSelectorOpen, setIsHospitalSelectorOpen] = useState<boolean>(false);
  const [intakeTab, setIntakeTab] = useState<'AI' | 'MANUAL'>('AI');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showExcludedList, setShowExcludedList] = useState<boolean>(false);
  const [manualOverrideModal, setManualOverrideModal] = useState<{
    open: boolean;
    candidateId: string | null;
  }>({ open: false, candidateId: null });
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // New emergency intake form state
  const [intakeForm, setIntakeForm] = useState({
    patientLocation: '',
    emergencyType: '',
    severity: 'Critical' as EmergencySeverity,
    patientCount: 1,
    requiredCapability: 'ALS + Cardiac' as AmbulanceCapability,
    notes: '',
  });

  const [formValidationWarning, setFormValidationWarning] = useState<string | null>(null);

  // Selected incident reference
  const selectedIncident = useMemo(() => {
    return emergencies.find((e) => e.id === selectedIncidentId) || emergencies[0];
  }, [emergencies, selectedIncidentId]);

  // Compute live hospital recommendation for selected incident
  const liveHospitalRecommendation = useMemo(() => {
    if (!selectedIncident) return null;
    return recommendHospital(selectedIncident, hospitals);
  }, [selectedIncident, hospitals]);

  // Designated hospital object (confirmed or top recommendation)
  const designatedHospital: Hospital | null = useMemo(() => {
    if (!selectedIncident) return null;
    const targetId =
      selectedIncident.selectedHospitalId ||
      selectedIncident.recommendedHospital?.id ||
      liveHospitalRecommendation?.recommendedHospitalId ||
      'HOSP-01';
    return hospitals.find((h) => h.id === targetId) || hospitals[0] || null;
  }, [selectedIncident, liveHospitalRecommendation, hospitals]);

  // Active or draft pre-alert
  const activePreAlert = useMemo(() => {
    if (selectedIncident?.preAlert) return selectedIncident.preAlert;
    if (selectedIncident && designatedHospital) {
      const assignedAmb = ambulanceFleet.find((a) => a.id === selectedIncident.assignedAmbulance) || {
        id: selectedIncident.assignedAmbulance || 'RR-204',
        etaMinutes: selectedIncident.etaMinutes || 8,
      };
      return generateHospitalPreAlert(selectedIncident, assignedAmb, designatedHospital);
    }
    return null;
  }, [selectedIncident, designatedHospital, ambulanceFleet]);

  // Compute live dispatch recommendation for selected incident using the Dispatch Decision Engine
  const liveRecommendation: DispatchRecommendation | null = useMemo(() => {
    if (!selectedIncident) return null;

    return findBestAmbulance(
      {
        id: selectedIncident.id,
        location: selectedIncident.location,
        emergencyType: selectedIncident.emergencyType,
        severity: selectedIncident.severity,
        patientCount: selectedIncident.patientCount,
        requiredCapability: selectedIncident.requiredCapability,
        notes: selectedIncident.notes,
      },
      ambulanceFleet
    );
  }, [selectedIncident, ambulanceFleet]);

  // Compute AI natural-language explanation strictly grounded in engine calculation facts
  const aiExplanation = useMemo(() => {
    if (!liveRecommendation || !selectedIncident) return null;
    const runnerUp =
      liveRecommendation.eligibleCandidates.find(
        (c) => c.ambulance.id !== liveRecommendation.recommendedAmbulanceId
      ) || null;

    return explainDispatchRecommendation({
      recommendation: liveRecommendation,
      incidentLocation: selectedIncident.location,
      incidentCategory: selectedIncident.emergencyType,
      incidentSeverity: selectedIncident.severity,
      requiredCapability: selectedIncident.requiredCapability,
      runnerUp,
    });
  }, [liveRecommendation, selectedIncident]);

  const handleAcceptAiExtraction = (extracted: ExtractedEmergency) => {
    const newId = `INC-${Math.floor(4800 + Math.random() * 200)}`;
    const nowTime =
      new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';
    const location = extracted.location || 'Chitkara University, Rajpura';

    const engineRec = findBestAmbulance(
      {
        id: newId,
        location,
        emergencyType: extracted.emergencyCategory,
        severity: extracted.suggestedUrgency,
        patientCount: extracted.patientCount,
        requiredCapability: extracted.suggestedCapability,
        notes: extracted.notes || '',
      },
      ambulanceFleet
    );

    const newEmergency: ActiveEmergency = {
      id: newId,
      severity: extracted.suggestedUrgency,
      location,
      emergencyType: extracted.emergencyCategory,
      patientCount: extracted.patientCount,
      requiredCapability: extracted.suggestedCapability,
      notes: extracted.notes || 'Emergency call recorded via AI Intake Assistant with human verification.',
      status: 'Awaiting Dispatch',
      dispatchStage: engineRec.hasSuitableAmbulance ? 'Recommended' : 'Awaiting dispatch',
      assignedAmbulance: null,
      etaMinutes: engineRec.etaMinutes,
      reportedAt: nowTime,
      aiExtractionUsed: true,
      symptoms: extracted.symptoms,
      patientAge: extracted.patientAge,
      ambulanceDetails: engineRec.recommendedAmbulance
        ? {
            id: engineRec.recommendedAmbulance.id,
            etaMinutes: engineRec.recommendedAmbulance.etaMinutes,
            capability: engineRec.recommendedAmbulance.capability,
            traffic: engineRec.recommendedAmbulance.trafficCondition || 'Light',
            currentStatus: 'AVAILABLE',
            driverName: engineRec.recommendedAmbulance.driverName,
            recommendationReason: engineRec.reasons.join('. '),
          }
        : undefined,
      recommendedHospital: {
        id: 'HOSP-01',
        name: 'City Emergency Hospital',
        readiness: 'Ready',
        etaMinutes: 8,
        preAlertStatus: 'Pending Dispatch',
        icuBedsAvailable: 3,
        traumaLevel: 'Level I Trauma',
      },
      timeline: [
        {
          title: 'Emergency call received & AI-analyzed',
          timestamp: nowTime,
          detail: `AI Assistant extracted triage parameters (${extracted.patientCount} pt, ${extracted.suggestedCapability})`,
          status: 'completed',
        },
        {
          title: 'Dispatcher confirmed parameters',
          timestamp: nowTime,
          detail: `Officer S. Sharma verified location: ${location}, symptoms: ${extracted.symptoms.join(', ')}`,
          status: 'completed',
        },
        {
          title: 'Dispatch decision analysis completed',
          timestamp: nowTime,
          detail: engineRec.hasSuitableAmbulance
            ? `Engine identified ${engineRec.recommendedAmbulanceId} (Score: ${engineRec.finalScore})`
            : 'Engine found no suitable available ambulance matching clinical tier',
          status: 'completed',
        },
        {
          title: engineRec.hasSuitableAmbulance
            ? `Ambulance recommended: ${engineRec.recommendedAmbulanceId}`
            : 'No suitable ambulance available',
          timestamp: nowTime,
          detail: engineRec.hasSuitableAmbulance
            ? `${engineRec.recommendedAmbulanceId} prioritized based on ${engineRec.etaMinutes} min ETA`
            : engineRec.statusMessage,
          status: 'completed',
        },
        {
          title: 'Dispatcher authorization',
          timestamp: undefined,
          detail: 'Awaiting dispatcher verification and approval',
          status: 'current',
        },
        {
          title: 'Ambulance dispatched',
          timestamp: undefined,
          detail: 'Telemetry route transmission to vehicle mobile terminal',
          status: 'pending',
        },
        {
          title: 'Hospital pre-alert transmitted',
          timestamp: undefined,
          detail: 'Automated clinical pre-alert to City Emergency Hospital',
          status: 'pending',
        },
        {
          title: 'Ambulance arrival on scene',
          timestamp: undefined,
          detail: `Target arrival within ${engineRec.etaMinutes || 8} min window`,
          status: 'pending',
        },
      ],
    };

    addEmergency(newEmergency);
    handleSelectIncident(newId);
    setIsIntakeModalOpen(false);
    setActionSuccessToast(`Emergency ${newId} verified & registered via AI Intake Assistant`);
    setTimeout(() => setActionSuccessToast(null), 5000);
  };

  const handleEditAiExtraction = (extracted: ExtractedEmergency) => {
    setIntakeForm({
      patientLocation: extracted.location || '',
      emergencyType: extracted.emergencyCategory || extracted.symptoms.join(', '),
      severity: extracted.suggestedUrgency,
      patientCount: extracted.patientCount,
      requiredCapability: extracted.suggestedCapability,
      notes: extracted.notes || '',
    });
    setIntakeTab('MANUAL');
  };

  // Filtered incidents
  const filteredEmergencies = useMemo(() => {
    return emergencies.filter((e) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.emergencyType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.assignedAmbulance && e.assignedAmbulance.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSeverity =
        severityFilter === 'ALL' ||
        (severityFilter === 'AWAITING' ? e.status === 'Awaiting Dispatch' : e.severity === severityFilter);

      return matchesSearch && matchesSeverity;
    });
  }, [emergencies, searchQuery, severityFilter]);

  // Quick Intake Form Submit
  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!intakeForm.patientLocation.trim() || !intakeForm.emergencyType.trim()) {
      setFormValidationWarning('Patient location and emergency condition are required.');
      return;
    }
    setFormValidationWarning(null);

    setIsAnalyzing(true);

    setTimeout(() => {
      const newId = `INC-${Math.floor(4800 + Math.random() * 200)}`;
      const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

      // Run engine on the newly submitted parameters
      const engineRec = findBestAmbulance(
        {
          id: newId,
          location: intakeForm.patientLocation,
          emergencyType: intakeForm.emergencyType,
          severity: intakeForm.severity,
          patientCount: intakeForm.patientCount,
          requiredCapability: intakeForm.requiredCapability,
          notes: intakeForm.notes,
        },
        ambulanceFleet
      );

      const newEmergency: ActiveEmergency = {
        id: newId,
        severity: intakeForm.severity,
        location: intakeForm.patientLocation,
        emergencyType: intakeForm.emergencyType,
        patientCount: intakeForm.patientCount,
        requiredCapability: intakeForm.requiredCapability,
        notes: intakeForm.notes || 'Emergency call recorded via CAD intake console. Awaiting dispatch assignment.',
        status: 'Awaiting Dispatch',
        dispatchStage: engineRec.hasSuitableAmbulance ? 'Recommended' : 'Awaiting dispatch',
        assignedAmbulance: null,
        etaMinutes: engineRec.etaMinutes,
        reportedAt: nowTime,
        ambulanceDetails: engineRec.recommendedAmbulance
          ? {
              id: engineRec.recommendedAmbulance.id,
              etaMinutes: engineRec.recommendedAmbulance.etaMinutes,
              capability: engineRec.recommendedAmbulance.capability,
              traffic: engineRec.recommendedAmbulance.trafficCondition || 'Light',
              currentStatus: 'AVAILABLE',
              driverName: engineRec.recommendedAmbulance.driverName,
              recommendationReason: engineRec.reasons.join('. '),
            }
          : undefined,
        recommendedHospital: {
          id: 'HOSP-01',
          name: 'City Emergency Hospital',
          readiness: 'Ready',
          etaMinutes: 8,
          preAlertStatus: 'Pending Dispatch',
          icuBedsAvailable: 3,
          traumaLevel: 'Level I Trauma',
        },
        timeline: [
          {
            title: 'Emergency call received',
            timestamp: nowTime,
            detail: `Direct CAD intake for ${intakeForm.patientCount} patient(s)`,
            status: 'completed',
          },
          {
            title: 'Dispatch decision analysis completed',
            timestamp: nowTime,
            detail: engineRec.hasSuitableAmbulance
              ? `Engine identified ${engineRec.recommendedAmbulanceId} (Score: ${engineRec.finalScore})`
              : 'Engine found no suitable available ambulance matching clinical tier',
            status: 'completed',
          },
          {
            title: engineRec.hasSuitableAmbulance
              ? `Ambulance recommended: ${engineRec.recommendedAmbulanceId}`
              : 'No suitable ambulance available',
            timestamp: nowTime,
            detail: engineRec.hasSuitableAmbulance
              ? `Rank #1 based on ${engineRec.etaMinutes}m ETA & ${intakeForm.requiredCapability} capability`
              : engineRec.statusMessage,
            status: 'completed',
          },
          {
            title: 'Dispatcher authorization',
            timestamp: undefined,
            detail: 'Standing by for dispatcher verification',
            status: 'current',
          },
          {
            title: 'Ambulance dispatched',
            timestamp: undefined,
            detail: 'Telemetry route transmission pending',
            status: 'pending',
          },
          {
            title: 'Hospital pre-alert transmitted',
            timestamp: undefined,
            detail: 'Direct notification to receiving trauma bay',
            status: 'pending',
          },
          {
            title: 'Ambulance arrived on scene',
            timestamp: undefined,
            detail: 'Target window based on dynamic transit conditions',
            status: 'pending',
          },
        ],
      };

      addEmergency(newEmergency);
      setSelectedIncidentId(newId);
      setIsAnalyzing(false);
      setIsIntakeModalOpen(false);

      // Reset form
      setIntakeForm({
        patientLocation: '',
        emergencyType: '',
        severity: 'Critical',
        patientCount: 1,
        requiredCapability: 'ALS + Cardiac',
        notes: '',
      });

      setActionSuccessToast(`Emergency ${newId} created. Decision engine evaluated candidates.`);
      setTimeout(() => setActionSuccessToast(null), 5000);
    }, 350);
  };

  // Dispatch Recommended Ambulance
  const handleDispatchRecommended = () => {
    if (!selectedIncident || !liveRecommendation?.recommendedAmbulanceId) return;

    const recommendedId = liveRecommendation.recommendedAmbulanceId;
    dispatchAmbulance(selectedIncident.id, recommendedId, recommendedId);

    setActionSuccessToast(
      `Ambulance ${recommendedId} authorized and dispatched to ${selectedIncident.id}. Status updated to EN ROUTE.`
    );
    setTimeout(() => setActionSuccessToast(null), 5000);
  };

  // Dispatch Alternative Ambulance (Manual Override)
  const handleConfirmOverrideDispatch = () => {
    if (!selectedIncident || !manualOverrideModal.candidateId || !liveRecommendation?.recommendedAmbulanceId) return;

    const chosenId = manualOverrideModal.candidateId;
    const recommendedId = liveRecommendation.recommendedAmbulanceId;

    dispatchAmbulance(selectedIncident.id, chosenId, recommendedId, overrideReason.trim() || 'Dispatcher operational discretion');

    setManualOverrideModal({ open: false, candidateId: null });
    setOverrideReason('');

    setActionSuccessToast(
      `Alternative ${chosenId} dispatched to ${selectedIncident.id}. Manual override recorded for audit.`
    );
    setTimeout(() => setActionSuccessToast(null), 5000);
  };

  return (
    <div className="p-6 lg:p-8 space-y-7 max-w-[1680px] mx-auto">
      {/* 1. PAGE HERO / TOP DISPATCH BAR */}
      <PageHero
        category="Emergency Dispatch Operations"
        title="Emergency Calls"
        description="Receive, assess and dispatch emergency incidents. Run the multi-factor decision engine to identify the fastest suitable ambulance and authorize deployment."
        telemetryStatus="DECISION ENGINE ACTIVE"
        telemetryDot="green"
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={resetDemoData}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              className="text-xs text-fg-muted hover:text-fg"
              title="Reset fleet and emergencies to initial demo state"
            >
              Reset Data
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsIntakeModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
              className="font-bold tracking-wide uppercase px-4 shadow-sm"
            >
              + NEW EMERGENCY
            </Button>
          </div>
        }
      />

      {/* DISPATCH SUCCESS ALERT TOAST */}
      {actionSuccessToast && (
        <div className="p-4 rounded-xl bg-accent-greenSubtle border border-status-available/30 flex items-center justify-between gap-3 animate-fadeIn text-xs text-fg shadow-card">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-status-available flex-shrink-0" />
            <span className="font-semibold text-status-available">{actionSuccessToast}</span>
          </div>
          <button
            onClick={() => setActionSuccessToast(null)}
            className="p-1 text-fg-muted hover:text-fg rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. MASTER-DETAIL DISPATCH WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* LEFT PANE: ACTIVE INCIDENTS QUEUE (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-border bg-surface shadow-card overflow-hidden">
            {/* Queue Header & Filters */}
            <div className="p-4 border-b border-border-subtle bg-surface-overlay/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-fg tracking-tight">Active Incident Queue</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-accent-redSubtle text-accent-red">
                    {emergencies.filter((e) => e.status !== 'Completed').length} Active
                  </span>
                </div>
                <span className="text-[11px] text-fg-faint font-mono">
                  {ambulanceFleet.filter((a) => a.status === 'AVAILABLE').length} Units Available
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by ID, address, condition..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-overlay border border-border-subtle text-xs text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent-blue"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1">
                {(['ALL', 'AWAITING', 'Critical', 'Urgent', 'Routine'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSeverityFilter(tab)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      severityFilter === tab
                        ? 'bg-surface text-fg font-bold shadow-xs'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {tab === 'ALL'
                      ? 'All'
                      : tab === 'AWAITING'
                      ? 'Needs Dispatch'
                      : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Incident Cards List */}
            <div className="divide-y divide-border-subtle max-h-[740px] overflow-y-auto">
              {filteredEmergencies.length === 0 ? (
                <div className="p-8 text-center text-xs text-fg-muted">
                  No active incidents match the current filter criteria.
                </div>
              ) : (
                filteredEmergencies.map((incident) => {
                  const isSelected = selectedIncident?.id === incident.id;
                  const isCritical = incident.severity === 'Critical';
                  const isAwaiting = incident.status === 'Awaiting Dispatch';

                  return (
                    <div
                      key={incident.id}
                      onClick={() => handleSelectIncident(incident.id)}
                      className={`p-4 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-surface-raised border-l-4 border-l-accent-blue'
                          : 'hover:bg-surface-overlay/50'
                      } ${isCritical && !isSelected ? 'border-l-4 border-l-accent-red/80 bg-accent-redSubtle/10' : ''}`}
                    >
                      {/* Top row: ID, Severity, Received Time */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-fg">
                            {incident.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              incident.severity === 'Critical'
                                ? 'bg-accent-redSubtle text-accent-red border border-accent-red/30'
                                : incident.severity === 'Urgent'
                                ? 'bg-accent-amberSubtle text-status-enroute border border-status-enroute/30'
                                : 'bg-accent-blueSubtle text-accent-blue border border-accent-blue/30'
                            }`}
                          >
                            <StatusDot
                              color={incident.severity === 'Critical' ? 'red' : incident.severity === 'Urgent' ? 'amber' : 'blue'}
                              pulse={isCritical && isAwaiting}
                              size="xs"
                            />
                            <span className="ml-1">{incident.severity}</span>
                          </span>
                        </div>

                        <span className="font-mono text-[11px] text-fg-faint flex items-center gap-1">
                          <Clock className="w-3 h-3 text-fg-faint" />
                          {incident.reportedAt}
                        </span>
                      </div>

                      {/* Emergency Type & Patient Count */}
                      <div className="mb-2">
                        <div className="text-sm font-bold text-fg tracking-tight truncate">
                          {incident.emergencyType}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-fg-muted mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-fg-faint flex-shrink-0" />
                            <span className="truncate">{incident.location}</span>
                          </span>
                          <span className="flex items-center gap-1 flex-shrink-0 font-mono text-[11px]">
                            <Users className="w-3 h-3 text-fg-faint" />
                            {incident.patientCount} {incident.patientCount === 1 ? 'patient' : 'patients'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom status & assigned ambulance status */}
                      <div className="flex items-center justify-between pt-2 border-t border-border-subtle/60 text-xs">
                        <div className="flex items-center gap-2">
                          <StatusPill
                            status={
                              incident.status === 'Awaiting Dispatch'
                                ? 'AWAITING'
                                : incident.status === 'En Route'
                                ? 'EN_ROUTE'
                                : incident.status === 'Dispatched'
                                ? 'DISPATCHED'
                                : 'READY'
                            }
                            label={incident.status}
                            size="sm"
                          />
                        </div>

                        <div className="flex items-center gap-2 font-mono text-xs">
                          {incident.assignedAmbulance ? (
                            <span className="text-fg font-semibold flex items-center gap-1">
                              <Navigation className="w-3 h-3 text-status-available" />
                              {incident.assignedAmbulance}
                              {incident.etaMinutes && (
                                <span className="text-status-available">({incident.etaMinutes}m)</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-accent-red font-semibold text-[11px] flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />
                              Awaiting Dispatch
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANE: ACTIVE INCIDENT WORKSPACE (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedIncident ? (
            <div className="space-y-6">
              {/* WORKSPACE HEADER BAR */}
              <div className="p-6 rounded-xl border border-border bg-surface shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold text-fg">
                        {selectedIncident.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                          selectedIncident.severity === 'Critical'
                            ? 'bg-accent-redSubtle text-accent-red border border-accent-red/30'
                            : 'bg-accent-amberSubtle text-status-enroute border border-status-enroute/30'
                        }`}
                      >
                        {selectedIncident.severity} TRIAGE
                      </span>
                      <StatusPill
                        status={
                          selectedIncident.status === 'Awaiting Dispatch'
                            ? 'AWAITING'
                            : selectedIncident.status === 'En Route'
                            ? 'EN_ROUTE'
                            : selectedIncident.status === 'Dispatched'
                            ? 'DISPATCHED'
                            : 'READY'
                        }
                        label={selectedIncident.status}
                      />
                    </div>
                    <p className="text-sm font-bold text-fg mt-1 tracking-tight">
                      {selectedIncident.emergencyType}
                    </p>
                  </div>

                  {/* Immediate Dispatch Action if Awaiting and Recommendation is ready */}
                  {selectedIncident.status === 'Awaiting Dispatch' && liveRecommendation?.recommendedAmbulanceId && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleDispatchRecommended}
                      icon={<Send className="w-4 h-4" />}
                      className="font-bold tracking-wide uppercase px-4 shadow-sm"
                    >
                      Dispatch {liveRecommendation.recommendedAmbulanceId}
                    </Button>
                  )}
                </div>

                {/* DISPATCH PROGRESSION STEPPER */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                      Dispatch Progression
                    </span>
                    <span className="text-xs font-mono font-semibold text-accent-blue">
                      STAGE: {selectedIncident.dispatchStage.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5">
                    {DISPATCH_STAGES.map((stageName, i) => {
                      const currentIdx = DISPATCH_STAGES.indexOf(selectedIncident.dispatchStage);
                      const isComplete = i < currentIdx;
                      const isCurrent = i === currentIdx;

                      return (
                        <div key={stageName} className="space-y-1.5">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isComplete
                                ? 'bg-status-available'
                                : isCurrent
                                ? 'bg-accent-blue animate-pulse'
                                : 'bg-surface-inset'
                            }`}
                          />
                          <span
                            className={`block text-[10px] text-center font-medium truncate ${
                              isCurrent
                                ? 'text-fg font-bold'
                                : isComplete
                                ? 'text-status-available font-medium'
                                : 'text-fg-faint'
                            }`}
                          >
                            {stageName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 1. DISPATCH DECISION ENGINE RECOMMENDATION PANEL (For Awaiting Dispatch) */}
              {selectedIncident.status === 'Awaiting Dispatch' && (
                <div className="p-6 rounded-xl border-2 border-accent-blue/40 bg-surface shadow-card space-y-5">
                  <div className="flex items-start justify-between gap-4 border-b border-border-subtle pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent-blueSubtle text-accent-blue border border-accent-blue/30 uppercase tracking-wide">
                          Decision Engine
                        </span>
                        <h3 className="text-base font-bold text-fg tracking-tight">
                          Dispatch Recommendation
                        </h3>
                      </div>
                      <p className="text-xs text-fg-muted mt-1">
                        Dispatch recommendation based on current prototype ETA, traffic, availability and capability data. <span className="font-mono text-[10px] text-fg-faint">[SIMULATED DATA]</span>
                      </p>
                    </div>

                    {liveRecommendation?.finalScore !== null && liveRecommendation?.finalScore !== undefined && (
                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] uppercase font-bold text-fg-faint tracking-wider block">
                          Composite Score
                        </span>
                        <span className="font-mono text-2xl font-black text-accent-blue">
                          {liveRecommendation.finalScore}
                          <span className="text-xs text-fg-muted font-normal"> / 100</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {liveRecommendation?.hasSuitableAmbulance && liveRecommendation.recommendedAmbulance ? (
                    <div className="space-y-5">
                      {/* Top Candidate Hero Card */}
                      <div className="p-5 rounded-xl bg-surface-overlay/80 border border-border space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-greenSubtle to-emerald-500/10 border border-status-available/30 flex items-center justify-center font-mono font-black text-status-available text-base shadow-xs">
                              {liveRecommendation.recommendedAmbulance.id}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-base font-bold text-fg">
                                  {liveRecommendation.recommendedAmbulance.id}
                                </span>
                                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-accent-blueSubtle text-accent-blue border border-accent-blue/20">
                                  {liveRecommendation.recommendedAmbulance.capability}
                                </span>
                                <StatusPill status="AVAILABLE" label="AVAILABLE" size="sm" />
                              </div>
                              <p className="text-xs text-fg-muted mt-1 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-fg-faint" />
                                Station: {liveRecommendation.recommendedAmbulance.currentArea} • Crew: {liveRecommendation.recommendedAmbulance.driverName}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-5 sm:border-l sm:border-border sm:pl-5">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint block">
                                Arrival ETA
                              </span>
                              <span className="font-mono text-2xl font-black text-status-available">
                                {String(liveRecommendation.recommendedAmbulance.etaMinutes).padStart(2, '0')} min
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint block">
                                Corridor Traffic
                              </span>
                              <span
                                className={`text-xs font-bold inline-flex items-center gap-1 mt-1 ${
                                  liveRecommendation.recommendedAmbulance.trafficCondition === 'Light'
                                    ? 'text-status-available'
                                    : 'text-status-enroute'
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full bg-current" />
                                {liveRecommendation.recommendedAmbulance.trafficCondition || 'Light'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* WHY THIS AMBULANCE? Explanations */}
                        <div className="pt-3 border-t border-border-subtle/80 space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-status-available" />
                            Why this ambulance is recommended:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {liveRecommendation.reasons.map((reason, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 rounded-lg bg-surface-raised/70 border border-border-subtle text-xs font-medium text-fg"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-status-available flex-shrink-0" />
                                <span>{reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* AI-Assisted Operational Explanation Card */}
                        {aiExplanation && (
                          <AiDispatchExplanationCard
                            explanation={aiExplanation}
                            winnerId={liveRecommendation.recommendedAmbulance.id}
                          />
                        )}

                        {/* Dispatch Action CTA Buttons */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                          <Button
                            variant="primary"
                            size="md"
                            onClick={handleDispatchRecommended}
                            icon={<Send className="w-4 h-4" />}
                            className="w-full sm:flex-1 py-3 text-xs font-bold uppercase tracking-wider shadow-sm"
                          >
                            DISPATCH {liveRecommendation.recommendedAmbulance.id}
                          </Button>
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={() => navigate(`/live-operations?incidentId=${selectedIncident.id}`)}
                            icon={<Navigation className="w-4 h-4 text-accent-blue" />}
                            className="w-full sm:w-auto text-xs font-semibold"
                          >
                            VIEW ON LIVE MAP
                          </Button>
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => {
                              const firstAlternative = liveRecommendation.eligibleCandidates.find(
                                (c) => c.ambulance.id !== liveRecommendation.recommendedAmbulanceId
                              );
                              if (firstAlternative) {
                                setManualOverrideModal({ open: true, candidateId: firstAlternative.ambulance.id });
                              }
                            }}
                            disabled={liveRecommendation.eligibleCandidates.length <= 1}
                            className="w-full sm:w-auto text-xs font-semibold text-fg-muted hover:text-fg"
                          >
                            REVIEW OTHER OPTIONS
                          </Button>
                        </div>
                      </div>

                      {/* OTHER ELIGIBLE ALTERNATIVES */}
                      {liveRecommendation.eligibleCandidates.length > 1 && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted flex items-center gap-2">
                              <Truck className="w-3.5 h-3.5 text-accent-blue" />
                              Other Eligible Ambulances ({liveRecommendation.eligibleCandidates.length - 1})
                            </h4>
                            <span className="text-[11px] text-fg-faint">
                              Ranked by Decision Engine
                            </span>
                          </div>

                          <div className="space-y-2">
                            {liveRecommendation.eligibleCandidates
                              .filter((c) => c.ambulance.id !== liveRecommendation.recommendedAmbulanceId)
                              .map((candidate) => (
                                <div
                                  key={candidate.ambulance.id}
                                  className="flex items-center justify-between p-3.5 rounded-lg bg-surface-overlay/50 border border-border-subtle hover:border-border transition-colors text-xs"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="font-mono text-xs font-bold text-fg-faint w-5">
                                      #{candidate.rank}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-fg">
                                          {candidate.ambulance.id}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-raised text-fg-muted border border-border-subtle">
                                          {candidate.ambulance.capability}
                                        </span>
                                        <span className="text-[11px] text-fg-muted truncate">
                                          {candidate.ambulance.currentArea}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 flex-shrink-0">
                                    <div className="text-right">
                                      <span className="font-mono font-bold text-fg block">
                                        {candidate.ambulance.etaMinutes} min
                                      </span>
                                      <span className="font-mono text-[10px] text-fg-faint block">
                                        Score: {candidate.scoreBreakdown?.finalScore}
                                      </span>
                                    </div>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setManualOverrideModal({ open: true, candidateId: candidate.ambulance.id })
                                      }
                                      className="text-xs font-semibold"
                                    >
                                      Select
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* EXCLUDED AMBULANCES ACCORDION */}
                      {liveRecommendation.excludedCandidates.length > 0 && (
                        <div className="pt-2 border-t border-border-subtle">
                          <button
                            type="button"
                            onClick={() => setShowExcludedList(!showExcludedList)}
                            className="flex items-center justify-between w-full text-xs font-semibold text-fg-muted hover:text-fg py-1 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <ShieldAlert className="w-3.5 h-3.5 text-fg-faint" />
                              Excluded Ambulances ({liveRecommendation.excludedCandidates.length})
                            </span>
                            {showExcludedList ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {showExcludedList && (
                            <div className="mt-2 space-y-1.5 animate-fadeIn">
                              {liveRecommendation.excludedCandidates.map((ex) => (
                                <div
                                  key={ex.ambulance.id}
                                  className="flex items-center justify-between p-2.5 rounded-lg bg-surface-raised/40 border border-border-subtle text-xs text-fg-muted"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-fg">{ex.ambulance.id}</span>
                                    <span className="text-[11px] text-fg-faint">({ex.ambulance.capability})</span>
                                  </div>
                                  <span className="text-[11px] text-accent-red font-medium">
                                    Excluded: {ex.exclusionReason}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* NO SUITABLE AMBULANCE AVAILABLE BANNER */
                    <div className="p-6 rounded-xl bg-accent-redSubtle/30 border border-accent-red/30 space-y-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-accent-redSubtle border border-accent-red/30 flex items-center justify-center mx-auto text-accent-red">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-fg">
                          NO SUITABLE AMBULANCE AVAILABLE
                        </h4>
                        <p className="text-xs text-fg-muted max-w-md mx-auto leading-relaxed">
                          {liveRecommendation?.statusMessage || 'All fleet units fail hard clinical or availability criteria for this emergency.'}
                        </p>
                      </div>

                      {/* Excluded reasons */}
                      {liveRecommendation && liveRecommendation.excludedCandidates.length > 0 && (
                        <div className="p-3 rounded-lg bg-surface/80 border border-border-subtle text-left max-w-md mx-auto space-y-1.5 text-xs text-fg-muted">
                          <p className="font-bold text-fg text-[11px] uppercase tracking-wider mb-1">
                            Regional Unit Status Breakdown:
                          </p>
                          {liveRecommendation.excludedCandidates.map((ex) => (
                            <div key={ex.ambulance.id} className="flex items-center justify-between">
                              <span className="font-mono font-semibold">{ex.ambulance.id}</span>
                              <span className="text-accent-red text-[11px]">{ex.exclusionReason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 2. ASSIGNED AMBULANCE (When Dispatched or En Route) */}
              {selectedIncident.status !== 'Awaiting Dispatch' && selectedIncident.ambulanceDetails && (
                <div className="p-6 rounded-xl border border-border bg-surface shadow-card space-y-4">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-status-available" />
                      Assigned Ambulance Deployment
                    </h3>
                    <span className="text-xs font-bold text-status-available font-mono">
                      ● ACTIVE EN ROUTE
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-overlay/70 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent-greenSubtle border border-status-available/20 flex items-center justify-center font-mono font-bold text-status-available text-sm">
                        {selectedIncident.ambulanceDetails.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-fg">
                            {selectedIncident.ambulanceDetails.id}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-blueSubtle text-accent-blue">
                            {selectedIncident.ambulanceDetails.capability}
                          </span>
                          <StatusPill status="EN_ROUTE" label="EN ROUTE" size="sm" />
                        </div>
                        <p className="text-xs text-fg-muted mt-0.5">
                          Driver / Paramedic: {selectedIncident.ambulanceDetails.driverName || 'Verified Crew'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[11px] text-fg-faint uppercase font-medium block">
                          Current ETA
                        </span>
                        <span className="font-mono text-xl font-bold text-status-available">
                          {selectedIncident.ambulanceDetails.etaMinutes ? `${selectedIncident.ambulanceDetails.etaMinutes} min` : 'On Scene'}
                        </span>
                      </div>
                      <div className="border-l border-border pl-4">
                        <span className="text-[11px] text-fg-faint uppercase font-medium block">
                          Traffic
                        </span>
                        <span className="text-xs font-bold text-fg">
                          {selectedIncident.ambulanceDetails.traffic}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedIncident.ambulanceDetails.recommendationReason && (
                    <div className="p-3.5 rounded-lg bg-surface-raised border border-border-subtle text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent-blue flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Dispatch Assignment Rationale:
                      </span>
                      <p className="text-fg-muted leading-relaxed">
                        {selectedIncident.ambulanceDetails.recommendationReason}
                      </p>
                    </div>
                  )}

                  <div className="pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/live-operations?incidentId=${selectedIncident.id}`)}
                      icon={<Navigation className="w-3.5 h-3.5 text-status-available" />}
                      className="w-full text-xs font-semibold"
                    >
                      TRACK ON LIVE MAP & ROUTE TELEMETRY →
                    </Button>
                  </div>
                </div>
              )}

              {/* 3. PATIENT / INCIDENT INFORMATION */}
              <div className="p-6 rounded-xl border border-border bg-surface shadow-card space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-accent-red" />
                    Patient / Incident Information
                  </h3>
                  <span className="font-mono text-xs text-fg-faint">
                    Received: {selectedIncident.reportedAt}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-surface-overlay/50 border border-border-subtle">
                    <span className="text-[11px] font-medium text-fg-faint uppercase block mb-1">
                      Patient Location
                    </span>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-accent-red flex-shrink-0 mt-0.5" />
                      <span className="font-semibold text-fg text-sm">{selectedIncident.location}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-surface-overlay/50 border border-border-subtle">
                    <span className="text-[11px] font-medium text-fg-faint uppercase block mb-1">
                      Triage & Capacity Requirement
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-fg">
                        {selectedIncident.patientCount} {selectedIncident.patientCount === 1 ? 'Patient' : 'Patients'}
                      </span>
                      <span className="font-mono font-bold text-accent-blue px-2 py-0.5 rounded bg-accent-blueSubtle">
                        Tier: {selectedIncident.requiredCapability}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-surface-overlay/50 border border-border-subtle">
                  <span className="text-[11px] font-medium text-fg-faint uppercase block mb-1">
                    CAD Clinical Assessment Notes
                  </span>
                  <p className="text-xs text-fg leading-relaxed">
                    {selectedIncident.notes}
                  </p>
                </div>
              </div>

              {/* 4. RECEIVING HOSPITAL PRE-ALERT & HANDOVER WORKFLOW */}
              <div className="p-6 rounded-xl border border-border bg-surface shadow-card space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-accent-blue" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-fg">
                      Receiving Hospital & Clinical Pre-Alert
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent-blueSubtle text-accent-blue border border-accent-blue/20">
                      SIMULATED HL7 CLINICAL CAD
                    </span>
                  </div>
                </div>

                {designatedHospital ? (
                  <div className="space-y-4">
                    {/* Facility Summary Card */}
                    <div className="p-4 rounded-xl bg-surface-overlay/50 border border-border-subtle space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-fg">
                              {designatedHospital.name}
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-accent-blueSubtle text-accent-blue border border-accent-blue/20">
                              {designatedHospital.traumaLevel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-fg-muted font-mono">
                            <MapPin className="w-3.5 h-3.5 text-fg-faint" />
                            <span>{designatedHospital.area}</span>
                            <span>•</span>
                            <span>{designatedHospital.distanceKm} km</span>
                            <span>•</span>
                            <span className="font-bold text-fg">
                              ~{liveHospitalRecommendation?.etaMinutes ?? 7}m transit
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusPill
                            status={designatedHospital.emergencyStatus === 'ready' ? 'READY' : designatedHospital.emergencyStatus === 'limited' ? 'LIMITED' : 'DIVERTING'}
                            label={designatedHospital.emergencyStatus.toUpperCase()}
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsHospitalSelectorOpen(true)}
                          >
                            Change Hospital
                          </Button>
                        </div>
                      </div>

                      {/* Capacity numbers */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-subtle/60 text-xs font-mono">
                        <div className="p-2 rounded bg-surface border border-border-subtle">
                          <span className="text-[10px] text-fg-faint block uppercase">ICU Available</span>
                          <span className="font-bold text-fg">
                            {designatedHospital.icuBedsAvailable} / {designatedHospital.icuBedsTotal}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-surface border border-border-subtle">
                          <span className="text-[10px] text-fg-faint block uppercase">ED Free</span>
                          <span className="font-bold text-fg">
                            {designatedHospital.emergencyBedsAvailable} / {designatedHospital.emergencyBedsTotal}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-surface border border-border-subtle">
                          <span className="text-[10px] text-fg-faint block uppercase">Inbound Load</span>
                          <span className="font-bold text-fg">
                            {designatedHospital.currentIncomingPatients} units
                          </span>
                        </div>
                      </div>

                      {/* Rationale Reasons */}
                      {liveHospitalRecommendation?.reasons && liveHospitalRecommendation.reasons.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] font-mono text-fg-faint uppercase block mb-1.5 font-bold">
                            Engine Suitability Rationale
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {liveHospitalRecommendation.reasons.map((reason, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-surface border border-border-subtle text-fg-muted"
                              >
                                <Check className="w-3 h-3 text-status-available flex-shrink-0" />
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Structured HL7 Pre-Alert Box */}
                    <div className="p-4 rounded-xl border border-accent-blue/30 bg-accent-blueSubtle/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent-blue" />
                          <span className="text-xs font-bold text-fg uppercase tracking-wider">
                            Structured HL7 Clinical Pre-Alert
                          </span>
                        </div>
                        <StatusPill
                          status={
                            activePreAlert?.status === 'HANDOVER_COMPLETED' || activePreAlert?.status === 'PATIENT_ARRIVED'
                              ? 'READY'
                              : activePreAlert?.status === 'ACKNOWLEDGED'
                              ? 'READY'
                              : activePreAlert?.status === 'SENT'
                              ? 'LIMITED'
                              : 'LIMITED'
                          }
                          label={activePreAlert?.status || 'READY_TO_SEND'}
                          size="sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded bg-surface border border-border-subtle space-y-1">
                          <span className="text-[10px] uppercase font-bold text-fg-faint block">
                            Chief Complaint & Symptoms
                          </span>
                          <p className="font-medium text-fg">
                            {selectedIncident.symptoms && selectedIncident.symptoms.length > 0
                              ? selectedIncident.symptoms.join(', ')
                              : selectedIncident.emergencyType}
                          </p>
                          {selectedIncident.patientAge && (
                            <span className="text-[11px] text-fg-muted block">
                              Patient Age: {selectedIncident.patientAge} y/o
                            </span>
                          )}
                        </div>

                        <div className="p-2.5 rounded bg-surface border border-border-subtle space-y-1">
                          <span className="text-[10px] uppercase font-bold text-fg-faint block">
                            Inbound Unit & Transit Window
                          </span>
                          <p className="font-mono font-bold text-fg">
                            {selectedIncident.assignedAmbulance || liveRecommendation?.recommendedAmbulanceId || 'RR-204'}
                            {' • '}
                            ETA ~{liveHospitalRecommendation?.etaMinutes ?? 7} min
                          </p>
                          <span className="text-[11px] text-accent-blue font-medium block">
                            Priority: Resuscitation Bay Standby
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-surface border border-border-subtle text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-fg-faint block">
                          Receiving Department Preparation Directive
                        </span>
                        <p className="font-semibold text-fg">
                          {activePreAlert?.requiredPreparation}
                        </p>
                        {activePreAlert?.acknowledgementNotes && (
                          <div className="mt-2 pt-2 border-t border-border-subtle text-[11px] text-status-available flex items-start gap-1.5 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>{activePreAlert.acknowledgementNotes}</span>
                          </div>
                        )}
                      </div>

                      {/* Lifecycle Action Buttons */}
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        {(!activePreAlert || activePreAlert.status === 'READY_TO_SEND' || activePreAlert.status === 'DRAFT') && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Send className="w-3.5 h-3.5" />}
                            onClick={() => {
                              sendHospitalPreAlert(selectedIncident.id);
                              setActionSuccessToast(`HL7 Pre-Alert transmitted to ${designatedHospital.name}`);
                            }}
                          >
                            Transmit HL7 Pre-Alert
                          </Button>
                        )}

                        {activePreAlert?.status === 'SENT' && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            onClick={() => {
                              simulateHospitalAcknowledgement(selectedIncident.id);
                              setActionSuccessToast(`${designatedHospital.name} confirmed standby readiness`);
                            }}
                          >
                            Simulate ED Standby Confirmation
                          </Button>
                        )}

                        {activePreAlert?.status === 'ACKNOWLEDGED' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Navigation className="w-3.5 h-3.5" />}
                            onClick={() => {
                              recordHospitalArrival(selectedIncident.id);
                              setActionSuccessToast('Ambulance arrival recorded at hospital intake');
                            }}
                          >
                            Record Ambulance Arrival at ED
                          </Button>
                        )}

                        {activePreAlert?.status === 'PATIENT_ARRIVED' && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            onClick={() => {
                              completeHospitalHandover(selectedIncident.id);
                              setActionSuccessToast('Clinical handover complete — Unit returned to AVAILABLE status');
                            }}
                          >
                            Complete Clinical Handover & Release Unit
                          </Button>
                        )}

                        {activePreAlert?.status === 'HANDOVER_COMPLETED' && (
                          <div className="w-full flex items-center gap-2 p-3 bg-status-available/10 border border-status-available/30 rounded-lg text-xs font-semibold text-status-available">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            <span>
                              Clinical Handover Complete — Patient transferred to hospital ED team. Ambulance released to AVAILABLE fleet.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-surface-overlay text-xs text-fg-muted">
                    Hospital coordination ready once ambulance is assigned.
                  </div>
                )}
              </div>

              {/* 5. ACTIVITY TIMELINE */}
              <div className="p-6 rounded-xl border border-border bg-surface shadow-card space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-fg-muted flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent-blue" />
                    Response Activity Timeline
                  </h3>
                  <span className="text-xs font-mono text-fg-faint">
                    {selectedIncident.timeline.length} AUDIT EVENTS
                  </span>
                </div>

                <div className="space-y-4 pt-1">
                  {selectedIncident.timeline.map((step, idx) => {
                    const isCompleted = step.status === 'completed';
                    const isCurrent = step.status === 'current';

                    return (
                      <div key={idx} className="flex items-start gap-3 relative group">
                        {/* Connecting line */}
                        {idx !== selectedIncident.timeline.length - 1 && (
                          <div
                            className={`absolute left-2.5 top-6 bottom-0 w-0.5 ${
                              isCompleted ? 'bg-status-available/40' : 'bg-border-subtle'
                            }`}
                          />
                        )}

                        {/* Dot indicator */}
                        <div className="pt-0.5 z-10 flex-shrink-0">
                          {isCompleted ? (
                            <div className="w-5 h-5 rounded-full bg-status-available text-white flex items-center justify-center shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          ) : isCurrent ? (
                            <div className="w-5 h-5 rounded-full bg-accent-blue text-white flex items-center justify-center animate-pulse shadow-glow-blue">
                              <span className="w-2 h-2 rounded-full bg-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-surface-raised border border-border-subtle flex items-center justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-fg-faint" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1 pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs font-bold ${
                                isCompleted ? 'text-fg' : isCurrent ? 'text-accent-blue' : 'text-fg-muted'
                              }`}
                            >
                              {step.title}
                            </span>
                            {step.timestamp && (
                              <span className="font-mono text-[11px] text-fg-faint flex-shrink-0">
                                {step.timestamp}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                            {step.detail}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-xl border border-border bg-surface text-fg-muted">
              Select an incident from the queue to view details.
            </div>
          )}
        </div>
      </div>

      {/* 3. NEW EMERGENCY INTAKE DRAWER */}
      <Drawer
        open={isIntakeModalOpen}
        onClose={() => setIsIntakeModalOpen(false)}
        title="New Emergency Intake"
        subtitle="AI triage extraction with human verification & CAD entry"
        badge={
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent-redSubtle text-accent-red">
            HIGH PRIORITY
          </span>
        }
      >
        {/* Intake Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-overlay border border-border-subtle mb-5">
          <button
            type="button"
            onClick={() => setIntakeTab('AI')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              intakeTab === 'AI'
                ? 'bg-surface text-fg font-bold shadow-xs border border-border-subtle'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
            AI Intake Assistant (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setIntakeTab('MANUAL')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              intakeTab === 'MANUAL'
                ? 'bg-surface text-fg font-bold shadow-xs border border-border-subtle'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-fg-muted" />
            Manual CAD Entry
          </button>
        </div>

        {intakeTab === 'AI' ? (
          <AiIntakeAssistant
            onAccept={handleAcceptAiExtraction}
            onEdit={handleEditAiExtraction}
            onCancel={() => setIsIntakeModalOpen(false)}
          />
        ) : (
          <form onSubmit={handleIntakeSubmit} className="space-y-5">
            {formValidationWarning && (
              <div className="p-3 rounded-lg bg-accent-redSubtle border border-accent-red/30 text-xs text-accent-red font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formValidationWarning}</span>
              </div>
            )}

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-accent-red" />
                Patient Location / Sector
              </span>
              <span className="text-[10px] font-mono text-accent-red">*REQUIRED</span>
            </label>
            <input
              type="text"
              required
              value={intakeForm.patientLocation}
              onChange={(e) => setIntakeForm({ ...intakeForm, patientLocation: e.target.value })}
              placeholder="e.g. Chitkara University, Rajpura or Sector 17, Chandigarh"
              className="w-full px-3.5 py-2.5 rounded-lg bg-surface-overlay border border-border text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
            />
          </div>

          {/* Emergency Condition */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-accent-red" />
              Reported Emergency Condition
            </label>
            <input
              type="text"
              required
              value={intakeForm.emergencyType}
              onChange={(e) => setIntakeForm({ ...intakeForm, emergencyType: e.target.value })}
              placeholder="e.g. Suspected Cardiac Arrest, Road Collision, Fall Trauma"
              className="w-full px-3.5 py-2.5 rounded-lg bg-surface-overlay border border-border text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
            />
          </div>

          {/* Severity selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5">
              Triage Severity Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Critical', 'Urgent', 'Routine'] as EmergencySeverity[]).map((sev) => {
                const isSelected = intakeForm.severity === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setIntakeForm({ ...intakeForm, severity: sev })}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? sev === 'Critical'
                          ? 'bg-accent-redSubtle text-accent-red border-accent-red shadow-xs font-bold'
                          : sev === 'Urgent'
                          ? 'bg-accent-amberSubtle text-status-enroute border-status-enroute shadow-xs font-bold'
                          : 'bg-accent-blueSubtle text-accent-blue border-accent-blue shadow-xs font-bold'
                        : 'bg-surface-overlay border-border-subtle text-fg-muted hover:text-fg'
                    }`}
                  >
                    {sev}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Patient count & Medical capability */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-fg-muted" />
                Patient Count
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={intakeForm.patientCount}
                onChange={(e) =>
                  setIntakeForm({ ...intakeForm, patientCount: Math.max(1, parseInt(e.target.value) || 1) })
                }
                className="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border text-sm text-fg font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-fg-muted" />
                Required Capability
              </label>
              <select
                value={intakeForm.requiredCapability}
                onChange={(e) =>
                  setIntakeForm({ ...intakeForm, requiredCapability: e.target.value as AmbulanceCapability })
                }
                className="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border text-xs text-fg font-medium"
              >
                <option value="ALS + Cardiac">ALS + Cardiac Care</option>
                <option value="ALS">Advanced Life Support (ALS)</option>
                <option value="BLS">Basic Life Support (BLS)</option>
                <option value="ICU">Mobile ICU</option>
              </select>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-fg-muted mb-1.5">
              Additional Information / Clinical Notes
            </label>
            <textarea
              rows={3}
              value={intakeForm.notes}
              onChange={(e) => setIntakeForm({ ...intakeForm, notes: e.target.value })}
              placeholder="Caller description, landmarks, consciousness, bleeding, pulse..."
              className="w-full px-3.5 py-2 rounded-lg bg-surface-overlay border border-border text-xs text-fg placeholder:text-fg-faint focus:outline-none focus:border-accent-blue"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isAnalyzing}
              className="w-full py-3 font-bold uppercase tracking-wider text-xs shadow-sm flex items-center justify-center gap-2"
              icon={
                isAnalyzing ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )
              }
            >
              {isAnalyzing ? 'EVALUATING FLEET...' : 'FIND BEST AMBULANCE'}
            </Button>
          </div>
        </form>
        )}
      </Drawer>

      {/* 4. MANUAL OVERRIDE DISPATCH MODAL */}
      {manualOverrideModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setManualOverrideModal({ open: false, candidateId: null })}
          />
          <div className="relative w-full max-w-md bg-surface border border-border shadow-elevated rounded-xl p-6 space-y-4 animate-fadeIn z-10">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-accent-blue" />
                <h3 className="text-sm font-bold text-fg">Manual Dispatch Selection</h3>
              </div>
              <button
                onClick={() => setManualOverrideModal({ open: false, candidateId: null })}
                className="p-1 rounded text-fg-muted hover:text-fg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-fg">
              <p>
                You are manually selecting <span className="font-mono font-bold text-accent-blue">{manualOverrideModal.candidateId}</span> instead of the top AI recommendation ({liveRecommendation?.recommendedAmbulanceId}).
              </p>
              <p className="text-fg-muted">
                Please optionally enter a dispatcher justification for the audit log:
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-muted mb-1">
                Override Justification (Optional)
              </label>
              <textarea
                rows={2}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Local detour knowledge, specific paramedic team requested by doctor..."
                className="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-border-subtle text-xs text-fg focus:outline-none focus:border-accent-blue"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setManualOverrideModal({ open: false, candidateId: null })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmOverrideDispatch}
                icon={<Send className="w-3.5 h-3.5" />}
                className="font-bold"
              >
                Confirm Dispatch ({manualOverrideModal.candidateId})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. RECEIVING HOSPITAL SELECTOR DRAWER */}
      <Drawer
        open={isHospitalSelectorOpen}
        onClose={() => setIsHospitalSelectorOpen(false)}
        title="Select Receiving Hospital"
        subtitle={`Incident ${selectedIncident.id} • ${selectedIncident.emergencyType} (${selectedIncident.severity})`}
      >
        <div className="space-y-6">
          {/* Active requirements summary */}
          <div className="p-4 rounded-xl bg-surface-overlay border border-border-subtle space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-fg-faint uppercase font-bold text-[10px]">Triage Requirements</span>
              <span className="font-mono text-accent-blue font-semibold">{selectedIncident.requiredCapability}</span>
            </div>
            <div className="text-fg-muted">
              Location: <strong className="text-fg">{selectedIncident.location}</strong>
            </div>
            {selectedIncident.symptoms && selectedIncident.symptoms.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedIncident.symptoms.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-medium text-fg">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Eligible candidates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted">
                Eligible Receiving Facilities ({liveHospitalRecommendation?.eligibleHospitals.length || 0})
              </h4>
              <span className="text-[10px] text-fg-faint font-mono">RANKED BY MULTI-FACTOR SCORE</span>
            </div>

            <div className="space-y-3">
              {liveHospitalRecommendation?.eligibleHospitals.map((cand) => {
                const isWinner = cand.hospital.id === liveHospitalRecommendation.recommendedHospitalId;
                const isCurrentlyAssigned = cand.hospital.id === designatedHospital?.id;

                return (
                  <div
                    key={cand.hospital.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isWinner
                        ? 'border-accent-blue/40 bg-accent-blueSubtle/20 shadow-xs'
                        : isCurrentlyAssigned
                        ? 'border-status-available/40 bg-status-available/5'
                        : 'border-border-subtle bg-surface hover:border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-fg">{cand.hospital.name}</span>
                          {isWinner && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-accent-blue text-white">
                              #1 TOP MATCH
                            </span>
                          )}
                          {isCurrentlyAssigned && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-status-available text-white">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-fg-muted font-mono">
                          <span>{cand.hospital.area}</span>
                          <span>•</span>
                          <span>{cand.distanceKm} km</span>
                          <span>•</span>
                          <span className="font-bold text-fg">{cand.etaMinutes} min transit</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-mono font-bold text-accent-blue">{cand.score}</span>
                        <span className="text-[10px] text-fg-faint block font-mono">/ 100</span>
                      </div>
                    </div>

                    {/* Reasons */}
                    <div className="space-y-1 my-3 text-xs">
                      {cand.reasons.map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-fg-muted">
                          <Check className="w-3 h-3 text-status-available flex-shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>

                    {/* Capacity details & select button */}
                    <div className="flex items-center justify-between pt-3 border-t border-border-subtle/60 text-xs">
                      <div className="flex items-center gap-3 text-[11px] font-mono text-fg-muted">
                        <span>ICU: <strong className="text-fg">{cand.hospital.icuBedsAvailable}/{cand.hospital.icuBedsTotal}</strong></span>
                        <span>ED: <strong className="text-fg">{cand.hospital.emergencyBedsAvailable}/{cand.hospital.emergencyBedsTotal}</strong></span>
                        <span>Inbound: <strong className="text-fg">{cand.hospital.currentIncomingPatients}</strong></span>
                      </div>

                      <Button
                        size="sm"
                        variant={isCurrentlyAssigned ? 'secondary' : isWinner ? 'primary' : 'secondary'}
                        onClick={() => {
                          confirmHospital(selectedIncident.id, cand.hospital.id);
                          setIsHospitalSelectorOpen(false);
                          setActionSuccessToast(`Receiving hospital set to ${cand.hospital.name}`);
                        }}
                      >
                        {isCurrentlyAssigned ? 'Keep Selected' : 'Select Hospital'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Excluded hospitals */}
          {liveHospitalRecommendation?.excludedHospitals && liveHospitalRecommendation.excludedHospitals.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-2">
                Excluded Facilities ({liveHospitalRecommendation.excludedHospitals.length})
              </h4>
              <div className="space-y-2">
                {liveHospitalRecommendation.excludedHospitals.map((ex, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-surface-overlay/50 border border-border-subtle text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-fg">
                      <span>{ex.hospital.name}</span>
                      <span className="text-[10px] uppercase font-bold text-accent-red px-1.5 py-0.5 rounded bg-accent-red/10 border border-accent-red/20">
                        {ex.hospital.emergencyStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-fg-faint">{ex.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
