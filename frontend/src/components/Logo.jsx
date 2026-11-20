export function BrandMark({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground ${className}`}
    >
      f.
    </div>
  );
}

export function Wordmark({ className = "" }) {
  return (
    <span
      className={`text-xl font-bold tracking-tight text-sidebar-foreground ${className}`}
    >
      f-wallet
    </span>
  );
}

export function Logo({ collapsed = false, className = "" }) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <BrandMark />
      {!collapsed && <Wordmark />}
    </div>
  );
}
