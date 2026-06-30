import './polyfill.ts';
import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error logger to capture non-React or bundle issues and display them on screen
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const errorBox = document.getElementById('global-error-reporter');
    if (errorBox) {
      errorBox.style.display = 'block';
      errorBox.textContent = `Global Uncaught Exception:\nMessage: ${event.message}\nSource: ${event.filename}\nLine: ${event.lineno}:${event.colno}\nStack: ${event.error?.stack || 'N/A'}`;
    }
  });
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-sans max-w-2xl mx-auto shadow-sm">
          <h2 className="text-lg font-bold mb-2">Application Render Error</h2>
          <p className="text-sm mb-4 leading-relaxed">An unexpected error occurred during rendering. Please see the details below:</p>
          <pre className="p-4 bg-white border border-rose-100 rounded-lg text-xs font-mono text-rose-700 overflow-auto whitespace-pre-wrap leading-normal">
            {this.state.error?.toString()}
            {this.state.errorInfo?.componentStack}
          </pre>
          <button
            onClick={() => {
              try {
                localStorage.clear();
                window.location.reload();
              } catch (e) {
                window.location.reload();
              }
            }}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition"
          >
            Clear Stored Data & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  // Insert global error element as a fallback container
  const reporter = document.createElement('pre');
  reporter.id = 'global-error-reporter';
  reporter.style.display = 'none';
  reporter.style.margin = '20px';
  reporter.style.padding = '15px';
  reporter.style.background = '#fff5f5';
  reporter.style.color = '#c53030';
  reporter.style.border = '1px solid #feb2b2';
  reporter.style.borderRadius = '8px';
  reporter.style.fontFamily = 'monospace';
  reporter.style.fontSize = '12px';
  reporter.style.whiteSpace = 'pre-wrap';
  reporter.style.wordBreak = 'break-all';
  document.body.insertBefore(reporter, rootElement);

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
