import { Component } from "react";

import { Button } from "@/components/ui/button";

/*
  Catches render errors so one broken component does not take the whole
  app down to a blank white screen. Has to be a class: componentDidCatch
  runs during a phase hooks cannot participate in.
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
    console.error("Render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <i className="fa-solid fa-triangle-exclamation text-2xl text-amber-500" />

        <p className="text-sm font-semibold">Something went wrong</p>

        <p className="max-w-xs text-xs text-muted-foreground">
          {this.state.error.message || "An unexpected error occurred."}
        </p>

        <Button type="button" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    );
  }
}
