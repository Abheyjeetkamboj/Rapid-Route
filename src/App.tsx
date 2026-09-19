import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DispatchProvider } from './context/DispatchContext';
import { AppLayout } from './components/layout/AppLayout';
import EmergencyCallsPage from './pages/EmergencyCallsPage';
import FleetPage from './pages/FleetPage';
import LiveOperationsPage from './pages/LiveOperationsPage';
import HospitalsPage from './pages/HospitalsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <ThemeProvider>
      <DispatchProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              {/* Emergency Calls is the primary workspace and default landing page */}
              <Route index element={<EmergencyCallsPage />} />
              <Route path="emergency-calls" element={<Navigate to="/" replace />} />
              <Route path="live-operations" element={<LiveOperationsPage />} />
              <Route path="fleet" element={<FleetPage />} />
              <Route path="hospitals" element={<HospitalsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              {/* Catch-all redirect to Emergency Calls */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DispatchProvider>
    </ThemeProvider>
  );
}
