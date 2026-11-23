export function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
      {Icon && <Icon className="mx-auto size-8 text-muted-foreground" />}

      <h3 className="mt-3 text-sm font-medium text-card-foreground">{title}</h3>

      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
