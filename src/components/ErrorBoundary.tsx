import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      // Manual check for dev environment if process is not available
      const isDev = window.location.hostname === 'localhost';

      return (
        <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl text-red-500">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">משהו השתבש</h1>
          <p className="text-gray-400 mb-8 max-w-xs">
            אירעה שגיאה בטעינת הרכיб. נסו לרענן את האפליקציה.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-white text-black rounded-2xl font-bold active:scale-95 transition-transform"
          >
            רענון
          </button>
          {isDev && (
            <pre className="mt-8 p-4 bg-black/50 rounded-xl text-left text-xs text-red-400 overflow-auto max-w-full">
              {this.state.error?.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
