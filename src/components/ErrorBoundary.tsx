import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "";
      const isSupabaseError = errorMessage.includes('Supabase configuration missing') || 
                             errorMessage.includes('invalid input syntax for type uuid') ||
                             errorMessage.includes('apiKey');

      return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-6">
          <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-headline font-bold text-white">Application Error</h2>
            <p className="text-on-surface-variant leading-relaxed">
              {isSupabaseError 
                ? "There seems to be an issue with your Supabase configuration. Please double-check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Secrets panel."
                : "An unexpected error occurred while loading the application."}
            </p>
            {this.state.error && (
              <div className="bg-black/20 p-3 rounded text-xs text-left font-mono text-red-400 overflow-auto max-h-32">
                {this.state.error.stack || this.state.error.message}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-white text-black py-3 rounded-full font-bold text-sm tracking-tight hover:opacity-90 active:scale-95 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
