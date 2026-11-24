// A page's toolbar card: its view switches on the left (`children`) and its
// main action on the right (`actions`). Stacks on phones, one row on wide
// screens.
export function PageToolbar({ children, actions }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 text-card-foreground lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
        {children}
      </div>

      {actions && (
        // Full-width buttons on phones, natural width beside the controls.
        <div className="flex shrink-0 gap-2 *:flex-1 lg:*:flex-none">
          {actions}
        </div>
      )}
    </div>
  );
}

// A muted count after a tab label: "Expenses 12".
export function CountLabel({ label, count }) {
  return (
    <>
      {label}
      <span className="text-xs text-muted-foreground tabular-nums">
        {count}
      </span>
    </>
  );
}

// A thin vertical line between groups of controls (wide screens only).
export function ToolbarDivider() {
  return (
    <div
      aria-hidden="true"
      className="hidden h-6 w-px shrink-0 bg-border lg:block"
    />
  );
}
