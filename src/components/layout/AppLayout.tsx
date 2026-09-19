import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const pageTitles: Record<string, string> = {
  '/': 'Emergency Calls',
  '/emergency-calls': 'Emergency Calls',
  '/live-operations': 'Live Operations',
  '/fleet': 'Ambulance Fleet',
  '/hospitals': 'Hospitals',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export function AppLayout() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? 'Emergency Calls';

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
