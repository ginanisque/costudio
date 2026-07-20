import React from 'react';

type State = { hasError: boolean; message?: string; stack?: string };

export default class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const e = error instanceof Error ? error : new Error(String(error));
    return { hasError: true, message: e.message, stack: e.stack ?? '' };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('App crashed', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-xl w-full border rounded-lg p-6 bg-card text-card-foreground shadow">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-sm mb-4">This page hit an unexpected error. Try reloading. If it persists, click Details and share a screenshot.</p>
            <details className="text-xs whitespace-pre-wrap bg-muted/40 rounded p-3">
              <summary className="cursor-pointer mb-2">Details</summary>
              {this.state.message}{'\n\n'}{this.state.stack}
            </details>
            <div className="mt-4 flex gap-2">
              <button type="button" className="border rounded px-3 py-2" onClick={() => location.reload()}>Reload</button>
              <button type="button" className="border rounded px-3 py-2" onClick={() => this.setState({ hasError: false })}>Try again</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children ?? null;
  }
}
