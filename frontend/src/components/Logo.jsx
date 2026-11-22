export function BrandMark() {
  return (
    <div
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground"
    >
      f.
    </div>
  );
}

export function Logo({ collapsed = false }) {
  return (
    <div className="inline-flex items-center gap-3">
      <BrandMark />

      {!collapsed && (
        <span className="text-xl font-bold tracking-tight text-sidebar-foreground">
          f-wallet
        </span>
      )}
    </div>
  );
}
