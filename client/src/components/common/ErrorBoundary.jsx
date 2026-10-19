import React from 'react';
import { AlertCircle, RotateCcw, Home, Sparkles } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('TripTandem caught runtime exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/explore';
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-sand flex items-center justify-center p-6 text-brand-navy">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-brand-sand-border shadow-floating text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-brand-orange-light text-brand-orange flex items-center justify-center mx-auto shadow-subtle">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-brand-navy">
                Let's get back on track
              </h2>
              <p className="text-xs text-brand-navy/70 leading-relaxed">
                An unexpected hiccup occurred while rendering this page. Your saved trips and wishlist remain completely safe.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-xs transition-all shadow-card flex items-center justify-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Explore</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 py-3 px-4 rounded-full bg-brand-sand hover:bg-brand-sand-muted text-brand-navy font-semibold text-xs border border-brand-sand-border transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home Page</span>
              </button>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="text-left text-[11px] bg-brand-sand/60 p-3 rounded-2xl border border-brand-sand-border/80 text-brand-navy/60 overflow-x-auto">
                <summary className="cursor-pointer font-bold text-brand-navy/80 mb-1">
                  Technical Details
                </summary>
                <pre className="font-mono text-[10px] whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
