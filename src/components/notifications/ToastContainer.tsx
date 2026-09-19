import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Truck,
  X,
  ArrowRight,
} from 'lucide-react';
import { useDispatchContext } from '../../context/DispatchContext';
import type { ToastAlert } from '../../realtime/eventTypes';

export function ToastContainer() {
  const { toasts, dismissToast } = useDispatchContext();
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  const getToastIcon = (toast: ToastAlert) => {
    if (toast.priority === 'CRITICAL') {
      return <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0" />;
    }
    switch (toast.category) {
      case 'OPERATIONS':
        return <Truck className="w-4 h-4 text-accent-blue flex-shrink-0" />;
      case 'HOSPITAL':
        return <Building2 className="w-4 h-4 text-purple-400 flex-shrink-0" />;
      case 'FLEET':
        return <CheckCircle2 className="w-4 h-4 text-status-available flex-shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-fg-muted flex-shrink-0" />;
    }
  };

  const getBorderColor = (priority: ToastAlert['priority']) => {
    switch (priority) {
      case 'CRITICAL':
        return 'border-l-4 border-l-accent-red';
      case 'HIGH':
        return 'border-l-4 border-l-status-enroute';
      case 'NORMAL':
        return 'border-l-4 border-l-status-available';
      default:
        return 'border-l-4 border-l-accent-blue';
    }
  };

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none transition-all duration-300">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-xl bg-surface/95 backdrop-blur-md border border-border-subtle shadow-elevated p-3.5 flex items-start gap-3 transition-all transform animate-in fade-in slide-in-from-top-3 duration-200 ${getBorderColor(
            toast.priority
          )}`}
        >
          <div className="pt-0.5">{getToastIcon(toast)}</div>

          <div
            className={`flex-1 min-w-0 ${toast.actionUrl ? 'cursor-pointer' : ''}`}
            onClick={() => {
              if (toast.actionUrl) {
                navigate(toast.actionUrl);
                dismissToast(toast.id);
              }
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-fg truncate">{toast.title}</h4>
              <span className="text-[10px] font-mono text-fg-faint flex-shrink-0">{toast.timestamp}</span>
            </div>
            <p className="text-xs text-fg-muted mt-0.5 line-clamp-2 leading-relaxed">{toast.message}</p>

            {toast.actionUrl && (
              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-accent-blue hover:underline">
                <span>Open in console</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </div>
            )}
          </div>

          <button
            onClick={() => dismissToast(toast.id)}
            className="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors flex-shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

