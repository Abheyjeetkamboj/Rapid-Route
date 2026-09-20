import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  Truck,
  Building2,
  CheckCircle2,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useDispatchContext } from '../../context/DispatchContext';
import type { AppNotification, NotificationCategory } from '../../realtime/eventTypes';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    dismissNotification,
  } = useDispatchContext();

  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | NotificationCategory>('ALL');

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === 'ALL') return notifications;
    return notifications.filter((n) => n.category === selectedCategory);
  }, [notifications, selectedCategory]);

  if (!isOpen) return null;

  const getCategoryIcon = (notif: AppNotification) => {
    if (notif.priority === 'CRITICAL') {
      return <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0" />;
    }
    switch (notif.category) {
      case 'OPERATIONS':
        return <Truck className="w-4 h-4 text-accent-blue flex-shrink-0" />;
      case 'HOSPITAL':
        return <Building2 className="w-4 h-4 text-purple-400 flex-shrink-0" />;
      case 'FLEET':
        return <CheckCircle2 className="w-4 h-4 text-status-available flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-fg-muted flex-shrink-0" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return 'Recently';
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    markNotificationAsRead(notif.id);
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <aside aria-label="Notifications panel" className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-border-subtle shadow-2xl flex flex-col transition-all duration-300">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-border-subtle flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border-subtle flex items-center justify-center text-fg">
                <Bell className="w-4 h-4 text-accent-blue" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-fg tracking-tight">EOC Notifications</h3>
                <span className="text-[11px] font-mono text-fg-muted">
                  {unreadNotificationCount} unread alert{unreadNotificationCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadNotificationCount > 0 && (
                <button
                  onClick={markAllNotificationsAsRead}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-accent-blue hover:bg-surface-raised border border-transparent hover:border-border-subtle transition-all flex items-center gap-1"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-raised border border-transparent hover:border-border-subtle transition-all"
                aria-label="Close notifications panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="px-4 py-2 border-b border-border-subtle bg-surface-raised/40 flex items-center gap-1 overflow-x-auto">
            {(['ALL', 'CRITICAL', 'OPERATIONS', 'HOSPITAL', 'FLEET'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-surface text-fg shadow-xs border border-border-subtle font-bold'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle p-3 sm:p-4 space-y-2">
            {filteredNotifications.length === 0 ? (
              <div className="py-16 text-center text-xs text-fg-muted space-y-2">
                <Bell className="w-8 h-8 text-fg-faint mx-auto stroke-1" />
                <p className="font-semibold text-fg">No notifications</p>
                <p className="text-[11px] text-fg-faint">
                  There are no alerts in the {selectedCategory.toLowerCase()} category.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    notif.read
                      ? 'bg-surface/50 border-border-subtle hover:bg-surface-raised'
                      : notif.priority === 'CRITICAL'
                      ? 'bg-accent-red/5 border-accent-red/30 shadow-xs'
                      : 'bg-surface border-accent-blue/30 shadow-xs'
                  }`}
                >
                  {/* Unread indicator */}
                  {!notif.read && (
                    <span
                      className={`w-2 h-2 rounded-full absolute top-3 right-3 ${
                        notif.priority === 'CRITICAL' ? 'bg-accent-red animate-pulse' : 'bg-accent-blue'
                      }`}
                    />
                  )}

                  {/* Icon */}
                  <div className="pt-0.5">{getCategoryIcon(notif)}</div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-fg-faint">
                        {notif.category}
                      </span>
                      <span className="text-fg-faint text-[10px]">·</span>
                      <span className="text-[10px] font-mono text-fg-muted flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-fg mt-0.5 tracking-tight line-clamp-1">
                      {notif.title}
                    </h4>
                    <p className="text-xs text-fg-muted mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.actionUrl && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-accent-blue group-hover:underline">
                        <span>Open incident console</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(notif.id);
                    }}
                    className="p-1 text-fg-muted hover:text-fg hover:bg-surface-raised rounded transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

