-- =============================================================================
-- RAPIDROUTE AI — PRODUCTION RELATIONAL SCHEMA (POSTGRESQL / SUPABASE)
-- =============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. EMERGENCIES TABLE
CREATE TABLE IF NOT EXISTS emergencies (
    id TEXT PRIMARY KEY,
    location TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    emergency_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('Critical', 'Urgent', 'Routine')),
    patient_count INTEGER NOT NULL DEFAULT 1 CHECK (patient_count >= 1),
    patient_age INTEGER,
    symptoms TEXT[] DEFAULT '{}',
    required_capability TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (
        status IN (
            'NEW',
            'ASSESSING',
            'AWAITING_DISPATCH',
            'DISPATCHED',
            'EN_ROUTE',
            'ARRIVED_AT_HOSPITAL',
            'HANDOVER_IN_PROGRESS',
            'COMPLETED'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 2. AMBULANCES TABLE
CREATE TABLE IF NOT EXISTS ambulances (
    id TEXT PRIMARY KEY,
    current_area TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (
        status IN ('AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'AT_HOSPITAL', 'BUSY', 'OFFLINE')
    ),
    capabilities TEXT NOT NULL,
    eta_minutes INTEGER,
    traffic TEXT CHECK (traffic IS NULL OR traffic IN ('Light', 'Moderate', 'Heavy')),
    driver_name TEXT NOT NULL,
    current_incident_id TEXT REFERENCES emergencies(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS hospitals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    emergency_status TEXT NOT NULL DEFAULT 'ready' CHECK (
        emergency_status IN ('ready', 'limited', 'diverting', 'full')
    ),
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    trauma_level TEXT NOT NULL,
    cardiac_unit BOOLEAN NOT NULL DEFAULT FALSE,
    icu_beds_available INTEGER NOT NULL DEFAULT 0 CHECK (icu_beds_available >= 0),
    icu_beds_total INTEGER NOT NULL DEFAULT 0 CHECK (icu_beds_total >= 0),
    emergency_beds_available INTEGER NOT NULL DEFAULT 0 CHECK (emergency_beds_available >= 0),
    emergency_beds_total INTEGER NOT NULL DEFAULT 0 CHECK (emergency_beds_total >= 0),
    current_incoming_patients INTEGER NOT NULL DEFAULT 0 CHECK (current_incoming_patients >= 0),
    contact_status TEXT NOT NULL DEFAULT 'online' CHECK (contact_status IN ('online', 'offline')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DISPATCHES TABLE
CREATE TABLE IF NOT EXISTS dispatches (
    id TEXT PRIMARY KEY,
    emergency_id TEXT NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    recommended_ambulance_id TEXT NOT NULL REFERENCES ambulances(id) ON DELETE RESTRICT,
    selected_ambulance_id TEXT NOT NULL REFERENCES ambulances(id) ON DELETE RESTRICT,
    recommendation_score DOUBLE PRECISION NOT NULL,
    recommended_eta INTEGER NOT NULL,
    is_override BOOLEAN NOT NULL DEFAULT FALSE,
    override_reason TEXT,
    authorized_by TEXT NOT NULL DEFAULT 'Officer S. Sharma',
    dispatcher_selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 5. HOSPITAL_ALERTS (PRE-ALERTS) TABLE
CREATE TABLE IF NOT EXISTS hospital_alerts (
    id TEXT PRIMARY KEY,
    emergency_id TEXT NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    ambulance_id TEXT NOT NULL REFERENCES ambulances(id) ON DELETE RESTRICT,
    hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN (
            'DRAFT',
            'READY_TO_SEND',
            'SENT',
            'ACKNOWLEDGED',
            'ARRIVED',
            'HANDOVER_COMPLETED'
        )
    ),
    payload JSONB NOT NULL DEFAULT '{}',
    acknowledgement_notes TEXT,
    sent_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    handover_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ACTIVITY_EVENTS TABLE (AUDIT LOG & TIMELINE SOURCE OF TRUTH)
CREATE TABLE IF NOT EXISTS activity_events (
    id TEXT PRIMARY KEY,
    emergency_id TEXT REFERENCES emergencies(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_emergencies_status ON emergencies(status);
CREATE INDEX IF NOT EXISTS idx_ambulances_status ON ambulances(status);
CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(emergency_status);
CREATE INDEX IF NOT EXISTS idx_dispatches_emergency ON dispatches(emergency_id);
CREATE INDEX IF NOT EXISTS idx_hospital_alerts_emergency ON hospital_alerts(emergency_id);
CREATE INDEX IF NOT EXISTS idx_hospital_alerts_hospital ON hospital_alerts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_emergency ON activity_events(emergency_id, created_at ASC);

-- ROW LEVEL SECURITY (RLS) POLICIES
-- For prototype demonstration purposes, enable RLS with permissive public read/write policies
ALTER TABLE emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on emergencies" ON emergencies FOR SELECT USING (true);
CREATE POLICY "Allow public insert on emergencies" ON emergencies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on emergencies" ON emergencies FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on ambulances" ON ambulances FOR SELECT USING (true);
CREATE POLICY "Allow public update on ambulances" ON ambulances FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on hospitals" ON hospitals FOR SELECT USING (true);
CREATE POLICY "Allow public update on hospitals" ON hospitals FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on dispatches" ON dispatches FOR SELECT USING (true);
CREATE POLICY "Allow public insert on dispatches" ON dispatches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on dispatches" ON dispatches FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on hospital_alerts" ON hospital_alerts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on hospital_alerts" ON hospital_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on hospital_alerts" ON hospital_alerts FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on activity_events" ON activity_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert on activity_events" ON activity_events FOR INSERT WITH CHECK (true);

