import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DispatchProvider } from './context/DispatchContext';
import { RoleProvider, useRole } from './context/RoleContext';
import { CitizenProvider } from './context/CitizenContext';
import { AppLayout } from './components/layout/AppLayout';
import { RoleProtectedRoute } from './components/auth/RoleProtectedRoute';
import EmergencyCallsPage from './pages/EmergencyCallsPage';
import OverviewPage from './pages/OverviewPage';
import FleetPage from './pages/FleetPage';
import LiveOperationsPage from './pages/LiveOperationsPage';
import HospitalsPage from './pages/HospitalsPage';
import HospitalOperationsPage from './pages/HospitalOperationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import CitizenHomePage from './pages/citizen/CitizenHomePage';
import CitizenRequestPage from './pages/citizen/CitizenRequestPage';
import CitizenEmergencyPage from './pages/citizen/CitizenEmergencyPage';
import CitizenHistoryPage from './pages/citizen/CitizenHistoryPage';
import CitizenNotificationsPage from './pages/citizen/CitizenNotificationsPage';
import CitizenProfilePage from './pages/citizen/CitizenProfilePage';

function IndexRoute() {
  const { currentRole, currentConfig } = useRole();
  if (currentRole === 'DISPATCHER') {
    return <EmergencyCallsPage />;
  }
  return <Navigate to={currentConfig.defaultPath} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <DispatchProvider>
        <CitizenProvider>
          <RoleProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                {/* Dynamic Default Landing Route */}
                <Route index element={<IndexRoute />} />
                <Route path="emergency-calls" element={<Navigate to="/" replace />} />

                {/* Dispatcher Workspace */}
                <Route
                  element={
                    <RoleProtectedRoute
                      allowedRoles={['DISPATCHER']}
                      workspaceName="Emergency Calls"
                    />
                  }
                >
                  <Route path="calls" element={<EmergencyCallsPage />} />
                </Route>

                {/* Operations Manager Workspace */}
                <Route
                  element={
                    <RoleProtectedRoute
                      allowedRoles={['OPERATIONS_MANAGER', 'ADMIN']}
                      workspaceName="Network Operations Overview"
                    />
                  }
                >
                  <Route path="overview" element={<OverviewPage />} />
                </Route>

                {/* Hospital Operator Workspace */}
                <Route
                  element={
                    <RoleProtectedRoute
                      allowedRoles={['HOSPITAL_OPERATOR']}
                      workspaceName="Hospital Operations Portal"
                    />
                  }
                >
                  <Route path="hospital-operations" element={<HospitalOperationsPage />} />
                </Route>

                {/* Shared Ops: Live Operations Map */}
                <Route
                  element={
                    <RoleProtectedRoute
                      allowedRoles={['DISPATCHER', 'OPERATIONS_MANAGER']}
                      workspaceName="Live Operations Map"
                    />
                  }
                >
                  <Route path="live-operations" element={<LiveOperationsPage />} />
                </Route>

                {/* Shared Ops: Ambulance Fleet */}
                <Route
                  element={
                    <RoleProtectedRoute
                      allowedRoles={['DISPATCHER', 'OPERATIONS_MANAGER']}
                      workspaceName="Ambulance Fleet"
                    />
                  }
                >
                  <Route path="fleet" element={<FleetPage />} />
                </Route>

                {/* Shared Ops: Hospitals Directory */}
                <Route
                  element={
                    <RoleProtectedRoute
                      allowedRoles={['DISPATCHER', 'OPERATIONS_MANAGER']}
                      workspaceName="Hospitals Directory"
                    />
                  }
                >
                  <Route path="hospitals" element={<HospitalsPage />} />
                </Route>

                {/* Analytics & Operational Intelligence */}
                <Route
                  element={
                    <RoleProtectedRoute
                      allowedRoles={['OPERATIONS_MANAGER', 'ADMIN']}
                      workspaceName="Analytics & Intelligence"
                    />
                  }
                >
                  <Route path="analytics" element={<AnalyticsPage />} />
                </Route>

                {/* Admin Settings */}
                <Route
                  element={
                    <RoleProtectedRoute
                      allowedRoles={['ADMIN']}
                      workspaceName="System Settings"
                    />
                  }
                >
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Citizen / Patient Emergency Experience */}
                <Route
                  element={
                    <RoleProtectedRoute
                      allowedRoles={['CITIZEN']}
                      workspaceName="Citizen Emergency Portal"
                    />
                  }
                >
                  <Route path="citizen" element={<CitizenHomePage />} />
                  <Route path="citizen/request" element={<CitizenRequestPage />} />
                  <Route path="citizen/emergency" element={<CitizenEmergencyPage />} />
                  <Route path="citizen/history" element={<CitizenHistoryPage />} />
                  <Route path="citizen/notifications" element={<CitizenNotificationsPage />} />
                  <Route path="citizen/profile" element={<CitizenProfilePage />} />
                </Route>

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </RoleProvider>
      </CitizenProvider>
    </DispatchProvider>
  </ThemeProvider>
);
}
