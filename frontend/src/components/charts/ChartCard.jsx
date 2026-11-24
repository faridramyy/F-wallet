import { useState } from "react";
import { cn } from "cn";

import { TabBar } from "../ui/tab-bar";
import { SectionCard } from "../common/SectionCard";

const VIEWS = [
  { value: "chart", label: "Chart" },
  { value: "table", label: "Table" },
];

// A legend entry: a swatch shaped like the mark (bar or line) plus a name.
export function LegendItem({ label, swatchClassName, shape = "bar" }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn(
          shape === "line" ? "h-0.5 w-3 rounded-full" : "size-2.5 rounded-sm",
          swatchClassName,
        )}
      />
      {label}
    </span>
  );
}

// Card for a chart, with a Chart / Table switch so every value can be read
// without hovering (and without relying on color).
//   table: { columns: ["Month", "Income"], rows: [["Jun", "$1,200.00"]] }
//   empty: message shown instead of the chart when there is nothing to plot
export function ChartCard({
  title,
  description,
  legend,
  table,
  empty,
  children,
}) {
  const [view, setView] = useState("chart");

  if (empty) {
    return (
      <SectionCard title={title} description={description}>
        <p className="py-16 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={title}
      description={description}
      action={
        <TabBar
          variant="pill"
          aria-label={`${title} view`}
          value={view}
          onValueChange={setView}
          items={VIEWS}
        />
      }
    >
      {view === "chart" ? (
        <div className="space-y-4">
          {legend && <div className="flex flex-wrap gap-4">{legend}</div>}
          {children}
        </div>
      ) : (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                {table.columns.map((column, index) => (
                  <th
                    key={column}
                    scope="col"
                    className={cn(
                      "py-2 font-medium",
                      index > 0 && "text-right",
                    )}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr
                  key={row[0]}
                  className="border-b border-border last:border-0"
                >
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      className={cn(
                        "py-2",
                        index > 0 && "text-right tabular-nums",
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
