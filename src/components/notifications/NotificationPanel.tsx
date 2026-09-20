import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Truck,
  Building2,
  CheckCircle2,
  Info,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react';
import { useDispatchContext } from '../../context/DispatchContext';
import { getNotificationTargetUrl } from '../../realtime/notificationService';
import type { AppNotification } from '../../realtime/eventTypes';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function NotificationPanel({ isOpen, onClose, anchorRef }: NotificationPanelProps) {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    dismissNotification,
  } = useDispatchContext();

  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        (!anchorRef?.current || !anchorRef.current.contains(target))
      ) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return 'Recently';
    }
  };

  const getPriorityBadgeClass = (notif: AppNotification) => {
    if (notif.priority === 'CRITICAL' || notif.category === 'CRITICAL') {
      return 'bg-accent-red/10 text-accent-red border-accent-red/30';
    }
    switch (notif.category) {
      case 'OPERATIONS':
        return 'bg-accent-blue/10 text-accent-blue border-accent-blue/30';
      case 'HOSPITAL':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'FLEET':
        return 'bg-status-available/10 text-status-available border-status-available/30';
      default:
        return 'bg-surface-raised text-fg-muted border-border-subtle';
    }
  };

  const getCategoryIcon = (notif: AppNotification) => {
    if (notif.priority === 'CRITICAL' || notif.category === 'CRITICAL') {
      return <AlertTriangle className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />;
    }
    switch (notif.category) {
      case 'OPERATIONS':
        return <Truck className="w-3.5 h-3.5 text-accent-blue flex-shrink-0" />;
      case 'HOSPITAL':
        return <Building2 className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />;
      case 'FLEET':
        return <CheckCircle2 className="w-3.5 h-3.5 text-status-available flex-shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-fg-muted flex-shrink-0" />;
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    markNotificationAsRead(notif.id);
    const targetUrl = getNotificationTargetUrl(notif);
    navigate(targetUrl);
    onClose();
  };

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Notifications Panel"
      className="absolute right-0 top-full mt-2 w-84 sm:w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-surface border border-border shadow-2xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Top Header */}
      <div className="px-4 py-3 bg-surface-raised border-b border-border-subtle flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent-blue" />
          <span className="text-xs font-bold uppercase tracking-wider text-fg font-mono">
            NOTIFICATIONS
          </span>
          {unreadNotificationCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-accent-red text-white text-[10px] font-mono font-bold">
              {unreadNotificationCount}
            </span>
          )}
        </div>

        {unreadNotificationCount > 0 && (
          <button
            onClick={() => markAllNotificationsAsRead()}
            className="text-[11px] font-semibold text-accent-blue hover:text-accent-blue/80 transition-colors flex items-center gap-1 focus:outline-none focus-visible:underline"
            title="Mark all notifications as read"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Notification Items List */}
      <div className="max-h-[min(480px,65vh)] overflow-y-auto divide-y divide-border-subtle">
        {notifications.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-1.5">
            <div className="w-10 h-10 rounded-full bg-surface-raised border border-border-subtle flex items-center justify-center mx-auto text-fg-muted">
              <Bell className="w-5 h-5 opacity-40" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-fg font-mono pt-1">
              NO NEW NOTIFICATIONS
            </p>
            <p className="text-xs text-fg-muted">You're all caught up.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = !notif.read;
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative p-3 sm:p-3.5 transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isUnread
                    ? 'bg-surface-raised/70 hover:bg-surface-overlay border-l-2 border-l-accent-blue'
                    : 'bg-surface hover:bg-surface-raised/50'
                }`}
              >
                {/* Category Icon */}
                <div className="pt-0.5">{getCategoryIcon(notif)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${getPriorityBadgeClass(
                        notif
                      )}`}
                    >
                      {notif.category}
                    </span>
                    {notif.entityId && notif.entityId !== 'SYSTEM' && (
                      <span className="text-[10px] font-mono text-fg-faint">
                        {notif.entityId}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-fg mt-1 tracking-tight leading-snug">
                    {notif.title}
                  </h4>

                  <p className="text-[11px] text-fg-muted mt-0.5 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-fg-faint font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                    <span className="text-accent-blue hover:text-accent-blue/80 transition-colors flex items-center gap-0.5 font-sans font-semibold">
                      Open
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>

                {/* Unread indicator dot */}
                {isUnread && (
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      notif.priority === 'CRITICAL' ? 'bg-accent-red animate-pulse' : 'bg-accent-blue'
                    }`}
                    title="Unread notification"
                  />
                )}

                {/* Dismiss button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notif.id);
                  }}
                  className="p-1 text-fg-muted hover:text-fg hover:bg-surface-raised rounded transition-colors"
                  title="Dismiss notification"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 bg-surface-raised/40 border-t border-border-subtle flex items-center justify-between text-[11px]">
          <span className="text-fg-faint font-mono">
            {notifications.length} total alert{notifications.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => {
              navigate('/settings');
              onClose();
            }}
            className="text-accent-blue hover:underline font-medium"
          >
            Notification settings
          </button>
        </div>
      )}
    </div>
  );
}

