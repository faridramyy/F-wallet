import { Component } from "react";

/*
  Catches render errors so one broken component does not take the whole
  app down to a blank white screen.

  This has to be a class. Error boundaries are the one thing React still
  has no hook for, because componentDidCatch runs during a phase hooks
  cannot participate in.

  It deliberately does not try to recover automatically. If a component
  throws on every render, retrying just loops.
*/

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Goes to the browser console rather than anywhere clever. With one
    // user, the console is the error reporting system.
    console.error("Render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="loading-screen">
        <i className="fa-solid fa-triangle-exclamation text-2xl text-amber-500" />

        <p className="text-sm font-semibold">Something went wrong</p>

        <p className="max-w-xs text-center text-xs text-slate-400">
          {this.state.error.message || "An unexpected error occurred."}
        </p>

        <button
          type="button"
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}
