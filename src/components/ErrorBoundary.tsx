'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 w-full flex items-center justify-center bg-[#e5e5f7] p-8">
          <div className="bg-brutal-white border-4 border-brutal-red shadow-[8px_8px_0px_0px_rgba(230,57,70,1)] p-8 max-w-lg w-full">
            <h2 className="font-sans font-black text-2xl uppercase text-brutal-red mb-4">Something went wrong</h2>
            <p className="font-mono text-sm text-brutal-black mb-6">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-brutal-yellow border-4 border-brutal-black px-6 py-3 font-sans font-black uppercase hover:bg-brutal-blue hover:text-brutal-white transition-colors"
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
