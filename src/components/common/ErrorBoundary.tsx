import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught operational component error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-surface border border-accent-red/30 p-6 sm:p-8 shadow-xl text-center space-y-5">
            <div className="w-12 h-12 mx-auto rounded-xl bg-accent-red/10 border border-accent-red/30 flex items-center justify-center text-accent-red">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-fg tracking-tight">
                {this.props.fallbackTitle || 'Operational Component Error'}
              </h3>
              <p className="text-xs text-fg-muted leading-relaxed">
                {this.props.fallbackMessage ||
                  'An unexpected view exception occurred. Patient records and dispatch state remain safe.'}
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle text-[11px] font-mono text-fg-faint text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-raised hover:bg-surface border border-border text-xs font-semibold text-fg transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry View</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Calls</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
