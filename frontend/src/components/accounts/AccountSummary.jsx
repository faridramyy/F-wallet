// Stat tile. Same look as the tiles on the categories page.
export function AccountSummary({
  label,
  value,
  description,
  icon: Icon,
  valueClassName = "text-foreground",
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="size-4" />}
        <span className="text-xs">{label}</span>
      </div>

      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${valueClassName}`}
      >
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
