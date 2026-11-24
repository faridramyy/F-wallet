import { cn } from "cn";

// Floating readout above a chart position. `x` is a 0-100 percentage of the
// plot width; the box flips its anchor near the edges so it stays inside.
//   rows: [{ label, value, swatchClassName }]
export function ChartTooltip({ x, title, rows }) {
  const anchor =
    x < 20
      ? "translate-x-0"
      : x > 80
        ? "-translate-x-full"
        : "-translate-x-1/2";

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none absolute top-0 z-10 min-w-36 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md",
        anchor,
      )}
      style={{ left: `${x}%` }}
    >
      <p className="mb-1 text-muted-foreground">{title}</p>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2 py-0.5">
          <span
            aria-hidden="true"
            className={cn("h-0.5 w-3 rounded-full", row.swatchClassName)}
          />
          <span className="font-semibold tabular-nums">{row.value}</span>
          <span className="text-muted-foreground">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

// Horizontal hairline gridlines with value labels for a 0..max scale.
// Rendered behind the marks; `format` turns a tick into its label.
export function Gridlines({ ticks, max, format }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {ticks.map((tick) => (
        <div
          key={tick}
          className="absolute inset-x-0 border-t border-border"
          style={{ bottom: `${(tick / max) * 100}%` }}
        >
          <span className="absolute -top-2 left-0 -translate-x-full pr-2 text-2xs text-muted-foreground tabular-nums">
            {format(tick)}
          </span>
        </div>
      ))}
    </div>
  );
}
