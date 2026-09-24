// src/components/ui/donut-chart.jsx

// A fixed palette for category colour-coding, independent of the
// light/dark theme tokens — it needs many distinguishable hues, which
// the semantic token set intentionally doesn't provide.
export const DONUT_COLORS = [
  "#6366f1",
  "#f97316",
  "#10b981",
  "#e11d48",
  "#0ea5e9",
  "#a855f7",
  "#f59e0b",
  "#14b8a6",
  "#ec4899",
  "#64748b",
];

export function donutColor(index) {
  return DONUT_COLORS[index % DONUT_COLORS.length];
}

export function DonutChart({
  data,
  size = 176,
  thickness = 20,
  label,
  value,
  className = "",
}) {
  const slices = data.filter((slice) => slice.value > 0);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const center = size / 2;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={
          slices.length === 0
            ? "No data"
            : slices
                .map(
                  (slice) =>
                    `${slice.label}: ${Math.round((slice.value / total) * 100)}%`,
                )
                .join(", ")
        }
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="stroke-border"
            strokeWidth={thickness}
          />

          {slices.map((slice, index) => {
            const length = (slice.value / total) * circumference;

            const dash =
              index === slices.length - 1
                ? length
                : Math.min(circumference, length + 0.75);

            const arc = (
              <circle
                key={slice.id ?? index}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={slice.color ?? donutColor(index)}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );

            offset += length;

            return arc;
          })}
        </g>
      </svg>

      {(label || value) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {value && <div className="text-lg font-semibold">{value}</div>}
          {label && (
            <div className="text-xs text-muted-foreground">{label}</div>
          )}
        </div>
      )}
    </div>
  );
}
