import { useState } from "react";
import { cn } from "cn";

import { ChartCard, LegendItem } from "./ChartCard";
import { ChartTooltip, Gridlines } from "./ChartTooltip";
import {
  formatCents,
  formatCompactCents,
} from "../../lib/formatters";
import { niceScale } from "../../lib/analytics";

const SERIES = [
  { key: "income", label: "Income", className: "bg-chart-income" },
  { key: "expense", label: "Expenses", className: "bg-chart-expense" },
];

// Income vs expenses per month as grouped columns.
//   months: [{ key, label, year, income, expense, net }] oldest first
export function CashFlowChart({ months, currency }) {
  const [active, setActive] = useState(null);

  const highest = Math.max(...months.flatMap((m) => [m.income, m.expense]));
  const { max, ticks } = niceScale(highest);
  const money = (cents) => formatCents(cents, currency);
  const activeMonth = active === null ? null : months[active];

  return (
    <ChartCard
      title="Cash flow"
      description={`Income and expenses, last ${months.length} months`}
      empty={
        highest === 0 &&
        `No income or expenses in the last ${months.length} months.`
      }
      legend={SERIES.map((series) => (
        <LegendItem
          key={series.key}
          label={series.label}
          swatchClassName={series.className}
        />
      ))}
      table={{
        columns: ["Month", "Income", "Expenses", "Net"],
        rows: months.map((m) => [
          `${m.label} ${m.year}`,
          money(m.income),
          money(m.expense),
          money(m.net),
        ]),
      }}
    >
      <div className="pl-12">
        <div
          className="relative h-56"
          onPointerLeave={() => setActive(null)}
        >
          <Gridlines
            ticks={ticks}
            max={max}
            format={(tick) => formatCompactCents(tick, currency)}
          />

          <div className="relative flex h-full items-end">
            {months.map((month, index) => (
              <div
                key={month.key}
                tabIndex={0}
                role="img"
                aria-label={`${month.label} ${month.year}: income ${money(month.income)}, expenses ${money(month.expense)}`}
                onPointerEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className={cn(
                  "flex h-full flex-1 items-end justify-center gap-0.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active === index && "bg-muted/60",
                )}
              >
                {SERIES.map((series) => (
                  <div
                    key={series.key}
                    className={cn(
                      "w-full max-w-6 rounded-t-sm transition-[height] duration-300",
                      series.className,
                    )}
                    style={{ height: `${(month[series.key] / max) * 100}%` }}
                  />
                ))}
              </div>
            ))}
          </div>

          {activeMonth && (
            <ChartTooltip
              x={((active + 0.5) / months.length) * 100}
              title={`${activeMonth.label} ${activeMonth.year}`}
              rows={[
                ...SERIES.map((series) => ({
                  label: series.label,
                  value: money(activeMonth[series.key]),
                  swatchClassName: series.className,
                })),
                {
                  label: "Net",
                  value: money(activeMonth.net),
                  swatchClassName: "bg-muted-foreground",
                },
              ]}
            />
          )}
        </div>

        <div className="mt-2 flex">
          {months.map((month) => (
            <span
              key={month.key}
              className="flex-1 text-center text-xs text-muted-foreground"
            >
              {month.label}
            </span>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
