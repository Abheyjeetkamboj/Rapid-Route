import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Building2,
  Navigation,
  Inbox,
} from 'lucide-react';
import { useCitizen } from '../../context/CitizenContext';
import { useDispatchContext } from '../../context/DispatchContext';

export const CitizenNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { citizenNotifications } = useCitizen();
  const { markNotificationAsRead, markAllNotificationsAsRead } = useDispatchContext();

  const getCitizenFriendlyIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('dispatched') || t.includes('ambulance assigned')) {
      return <Navigation className="w-4 h-4 text-emerald-500" />;
    }
    if (t.includes('eta') || t.includes('arrival')) {
      return <Clock className="w-4 h-4 text-blue-500" />;
    }
    if (t.includes('hospital') || t.includes('pre-alert')) {
      return <Building2 className="w-4 h-4 text-purple-500" />;
    }
    if (t.includes('completed') || t.includes('handover')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    return <Bell className="w-4 h-4 text-accent-red" />;
  };

  const handleNotificationClick = (id: string, actionUrl?: string) => {
    markNotificationAsRead(id);
    if (actionUrl) {
      // Direct citizen notifications to the emergency screen
      navigate('/citizen/emergency');
    }
  };

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl xs:text-2xl font-black tracking-tight text-fg">
            Notifications & Alerts
          </h1>
          <p className="text-xs text-fg-muted mt-0.5">
            Real-time status updates for your emergency requests.
          </p>
        </div>

        {citizenNotifications.length > 0 && (
          <button
            type="button"
            onClick={markAllNotificationsAsRead}
            className="flex items-center gap-1.5 text-xs font-bold text-fg-muted hover:text-fg p-1 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden xs:inline">Mark all read</span>
          </button>
        )}
      </div>

      {citizenNotifications.length === 0 ? (
        <div className="p-8 rounded-3xl bg-surface border border-border text-center space-y-3 max-w-md mx-auto">
          <Inbox className="w-10 h-10 text-fg-muted mx-auto" />
          <p className="text-xs text-fg-muted">No notifications right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {citizenNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n.id, n.actionUrl)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-start gap-3 ${
                n.read
                  ? 'bg-surface border-border-subtle'
                  : 'bg-surface-raised border-accent-red/30 ring-1 ring-accent-red/20'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                {getCitizenFriendlyIcon(n.title)}
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-fg truncate">{n.title}</h4>
                  <span className="text-[10px] text-fg-muted flex-shrink-0 ml-2">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-fg-muted leading-relaxed line-clamp-2">
                  {n.message}
                </p>
              </div>

              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-accent-red flex-shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default CitizenNotificationsPage;
