# RapidRoute AI — Intelligent Emergency Medical Operations & Dispatch Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1.0-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.17-38bdf8.svg)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-92%20passing-brightgreen.svg)](https://vitest.dev/)

> **"Find the fastest suitable ambulance, not simply the nearest ambulance."**

RapidRoute AI is a mission-critical, human-in-the-loop Emergency Medical Services (EMS) coordination platform. Built for municipal Emergency Operations Centres (EOC), ambulance fleet dispatchers, and receiving hospital emergency departments, RapidRoute replaces outdated proximity-only dispatching with multi-factor clinical suitability, traffic-aware routing, automated hospital pre-alerts, and real-time operational telemetry.

---

## 🚑 The Core Problem & Solution

Traditional Computer-Aided Dispatch (CAD) systems assign the physically closest ambulance based on straight-line Euclidean distance or static road maps. This leads to fatal outcomes:

1. **Traffic Traps**: An ambulance 3 km away stuck behind an arterial highway jam may take 16 minutes, while an ambulance 5.8 km away on a clear corridor arrives in 9 minutes.
2. **Clinical Mismatches**: Dispatching a Basic Life Support (BLS) unit to an acute myocardial infarction because it was 1 km closer wastes irreplaceable minutes when the patient requires defibrillation and advanced cardiac pharmacotherapy.
3. **Hospital Bottlenecks**: Inbound ambulances arrive without hospital notification, leading to delayed triage bay allocation and offload delays.

**RapidRoute solves this by combining:**
- **AI-Assisted Emergency Intake**: Structuring chaotic caller narratives with deterministic clinical safety checks.
- **Two-Stage Dispatch Decision Engine**: Hard clinical capability filtering followed by multi-factor scoring (50% ETA, 25% clinical capability match, 15% traffic condition, 10% availability).
- **Receiving Hospital Specialty Routing & HL7 Pre-Alerts**: Direct matching of patient acuity to receiving emergency department readiness (e.g. 24/7 Primary PCI Cath Lab standby).
- **Multi-Persona Operational Workspaces**: Tailored interfaces for Dispatchers, Operations Managers, Hospital Operators, and System Admins.

---

## 👥 Operational Personas & Role Switcher

RapidRoute features a four-persona **Demo Role Switcher** integrated into the navigation header. Switching roles updates workspace access, navigation items, default landing pages, and operator credentials.

| Role | Persona | Default Workspace | Accessible Pages |
| :--- | :--- | :--- | :--- |
| **Dispatcher** | Officer S. Sharma (`SS`)<br>*EOC Dispatcher #4* | **Emergency Calls** (`/`) | `/`, `/emergency-calls`, `/live-operations`, `/fleet`, `/hospitals` |
| **Operations Manager** | Dr. R. Mehta (`RM`)<br>*EOC Operations Director* | **Network Overview** (`/overview`) | `/overview`, `/live-operations`, `/fleet`, `/hospitals`, `/analytics` |
| **Hospital Operator** | Nurse Supervisor P. Kaur (`PK`)<br>*City Emergency ED* | **Hospital Operations** (`/hospital-operations`) | `/hospital-operations`, `/hospitals` |
| **Admin** | SysAdmin A. Kumar (`AK`)<br>*Lead Systems Administrator* | **Settings** (`/settings`) | `/settings`, `/overview`, `/analytics` |

> Route guards (`RoleProtectedRoute`) protect specialized workspaces. If an unauthorized route is accessed, a healthcare-grade **Access Restricted** screen appears, allowing single-click persona escalation or workspace return.

---

## 🎯 Deterministic Master Demo Scenario (`INC-8841`)

RapidRoute includes a deterministic master scenario designed for live presentations, hackathon evaluations, and operator training.

### Scenario Parameters
- **Incident ID**: `INC-8841`
- **Location**: Chitkara University, Rajpura (Punjab/Tricity corridor)
- **Clinical Condition**: Acute Coronary Syndrome / Severe Chest Pain + Dyspnea
- **Patient**: 54-year-old faculty member, collapsed in admin block, diaphoresis
- **Acuity & Required Equipment**: Critical, **ALS + Cardiac** (12-lead ECG monitor & telemetry defibrillator)

### Candidate Ambulances Evaluated by Dispatch Engine
| Unit | Distance | Traffic Along Corridor | Capability | Calculated ETA | Engine Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RR-101** | 3.2 km | **Heavy Congestion** (NH-7 arterial) | ALS | 16 min | **Ranked Lower / Delayed**: 16 min transit time fails golden-hour cardiac window |
| **RR-204** | 5.8 km | **Light Traffic** (Expressway corridor) | **ALS + Cardiac** | **9 min** | **RECOMMENDED (#1)**: Fastest suitable unit; specialized cardiac monitor onboard |
| **RR-317** | 4.1 km | **Heavy Congestion** | BLS | 21 min | **ELIMINATED**: Basic Life Support unit lacks cardiac defibrillation & airway kit |

### Receiving Hospital Selection Evaluated by Hospital Engine
| Hospital | Distance | ED Status | Capabilities | Travel ETA | Engine Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **City Emergency Hospital** | 4.8 km | **READY** (3 ICU beds) | Level 1 Trauma, **Cardiac Cath Lab**, ICU | **10 min** | **SELECTED**: 24/7 Primary PCI catheterization lab ready; shortest transit |
| **Regional Trauma Centre** | 6.2 km | **READY** (4 ICU beds) | Level 1 Trauma, General Surgery, Orthopedic | 12 min | **EXCLUDED**: Lacks 24/7 specialized acute cardiac intervention suite |

---

## 🎮 Floating `DEMO CONTROLS` Toolbar

A persistent, floating control bar is available on the bottom-right of the screen (`print:hidden`), providing full manual and automated demo control:

- ⚡ **LOAD CARDIAC SCENARIO (INC-8841)**: Single-click instant setup of the master scenario at Chitkara University.
- ⏯️ **Live Simulation Loop**: Play / Pause / Step / Reset through all 7 operational stages:
  1. *Emergency Created* (`INC-8841`)
  2. *Ambulance Dispatched* (`RR-204` $\rightarrow$ EN ROUTE)
  3. *ETA Updated* (Corridor progression: 9m $\rightarrow$ 4m)
  4. *Pre-Alert Sent* (Automated HL7 clinical alert to City Emergency Hospital)
  5. *Hospital Acknowledged* (Cath lab team notified & prep bay reserved)
  6. *Ambulance Arrived* (Vehicle enters ED intake bay)
  7. *Handover Completed* (Clinical transfer completed; `RR-204` released to AVAILABLE)
- 🎛️ **Discrete Presentation Triggers**:
  - `TRIGGER NEW EMERGENCY`: Emits inbound CAD triage call.
  - `SIMULATE ETA UPDATE`: Telemetry update simulating cleared flyover corridor.
  - `SIMULATE HOSPITAL ACK`: Receiving hospital acknowledges pre-alert with bed notes.
  - `SIMULATE AMBULANCE ARRIVAL`: Ambulance enters intake bay.
  - `COMPLETE PATIENT HANDOVER`: Finishes clinical care transfer and resets unit.
  - `RESET SCENARIO`: Restores fleet and incident state back to baseline.

---

## 🛠️ Technology Stack & Architecture

- **UI Framework**: React 18.3.1 with TypeScript 5.7.3 (Strict mode, zero `any` loopholes)
- **Styling**: Tailwind CSS 3.4.17 with dual **Light ("Day Shift")** and **Dark ("Night Operations")** themes designed specifically for emergency control rooms
- **Mapping & GIS**: Leaflet 1.9.4 & React-Leaflet with custom SVG markers, dynamic traffic polyline color coding, and corridor bounds fitting
- **State Management & Telemetry**: Typed reactive `EventBus` with React Context API and local state synchronization
- **Persistence Layer**: Repository pattern with auto-detection:
  - **DEMO MODE**: Zero-configuration browser `localStorage` persistence retaining operational state across reloads.
  - **CONNECTED MODE**: Full Supabase PostgreSQL schema with automatic connectivity fallbacks.
- **Diagnostics & Error Isolation**: `ErrorBoundary` components isolating component failures with safe reload triggers, plus a real-time `GlobalSystemStatus` subsystem health popover.
- **Automated Testing**: Vitest 5.0.1 with 8 comprehensive test suites and 92 automated tests covering dispatch logic, hospital scoring, GIS routing, AI intake extraction, and persistence.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### 2. Installation
```bash
git clone https://github.com/AbheyjeetKamboj/Rapid-Route.git
cd Rapid-Route
npm install
```

### 3. Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173` (or the port indicated in the terminal).

### 4. Code Quality & Type Checking
```bash
npm run lint
```
Runs strict `tsc --noEmit` across all application and test code.

### 5. Automated Unit & Integration Tests
```bash
npm test
```
Executes the full test suite with 92 passing tests across 8 test suites.

### 6. Production Build
```bash
npm run build
```
Generates optimized, minified production assets in the `dist/` folder.

---

## 🔒 Security & Medical Ethics Disclaimer

1. **Human-in-the-Loop Decision Support**: RapidRoute AI is explicitly designed as a *decision-support system*. It never performs autonomous dispatches or autonomous clinical diagnoses. Every ambulance dispatch, override, and hospital pre-alert requires explicit dispatcher or medical coordinator authorization.
2. **Deterministic Fallbacks**: All AI extraction systems feature deterministic keyword and rule-based heuristics that operate 100% locally even without external LLM API access.
3. **Simulated Telemetry**: GPS vehicle coordinates, traffic speed telemetry, and hospital bed sensor feeds in DEMO MODE use simulated models of the Rajpura / Zirakpur / Mohali / Chandigarh corridor for demonstration purposes.

---

*RapidRoute AI — Built for speed, safety, and human-in-the-loop operational excellence.*
