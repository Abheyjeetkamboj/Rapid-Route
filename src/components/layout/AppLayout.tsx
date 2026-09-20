import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../notifications/ToastContainer';
import { DemoLiveController } from '../notifications/DemoLiveController';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useRole } from '../../context/RoleContext';
import { CitizenLayout } from '../citizen/CitizenLayout';

const pageTitles: Record<string, string> = {
  '/': 'Emergency Calls',
  '/emergency-calls': 'Emergency Calls',
  '/overview': 'Network Operations Overview',
  '/live-operations': 'Live Operations',
  '/fleet': 'Ambulance Fleet',
  '/hospitals': 'Hospitals',
  '/hospital-operations': 'Hospital Operations Portal',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export function AppLayout() {
  const { pathname } = useLocation();
  const { currentRole } = useRole();
  const title = pageTitles[pathname] ?? 'Emergency Calls';

  // Dedicated Mobile-First Citizen Emergency Experience
  if (currentRole === 'CITIZEN') {
    return <CitizenLayout />;
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-app-bg text-fg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto relative">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Realtime In-App Notifications Toast Feed */}
      <ToastContainer />

      {/* Interactive Floating Simulation Controller for Evaluation & Live Demo */}
      <DemoLiveController />
    </div>
  );
}
