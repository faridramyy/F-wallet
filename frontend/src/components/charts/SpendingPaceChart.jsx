import { useState } from "react";

import { ChartCard, LegendItem } from "./ChartCard";
import { ChartTooltip, Gridlines } from "./ChartTooltip";
import { formatCents, formatCompactCents } from "../../lib/formatters";
import { niceScale } from "../../lib/analytics";

// SVG coordinates are 0-100 on both axes, stretched to the box; strokes keep
// their 2px width thanks to vector-effect.
const toPoints = (values, days, max) =>
  values
    .map((value, index) => {
      const x = days > 1 ? (index / (days - 1)) * 100 : 0;
      return `${x},${100 - (value / max) * 100}`;
    })
    .join(" ");

// Cumulative spending this month (emphasis) against last month (context).
//   current / previous: running totals in cents, index 0 = day 1
export function SpendingPaceChart({
  current,
  previous,
  currentLabel,
  previousLabel,
  currency,
}) {
  const days = Math.max(current.length, previous.length);
  const [active, setActive] = useState(null);

  const highest = Math.max(...current, ...previous, 0);
  const { max, ticks } = niceScale(highest);
  const money = (cents) => formatCents(cents, currency);
  const xOf = (index) => (days > 1 ? (index / (days - 1)) * 100 : 0);

  const lastIndex = current.length - 1;
  const lastValue = current[lastIndex] ?? 0;

  function pick(event) {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    setActive(Math.min(days - 1, Math.max(0, Math.round(ratio * (days - 1)))));
  }

  function handleKey(event) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    setActive((index) =>
      Math.min(days - 1, Math.max(0, (index ?? lastIndex) + step)),
    );
  }

  const valueAt = (series, index) =>
    index < series.length ? money(series[index]) : "—";

  return (
    <ChartCard
      title="Spending pace"
      description="Total spent so far, day by day"
      empty={highest === 0 && "No spending in either month."}
      legend={
        <>
          <LegendItem
            shape="line"
            label={currentLabel}
            swatchClassName="bg-chart-expense"
          />
          <LegendItem
            shape="line"
            label={previousLabel}
            swatchClassName="bg-muted-foreground"
          />
        </>
      }
      table={{
        columns: ["Day", currentLabel, previousLabel],
        rows: Array.from({ length: days }, (_, index) => [
          String(index + 1),
          valueAt(current, index),
          valueAt(previous, index),
        ]),
      }}
    >
      <div className="pl-12">
        <div
          className="relative h-56 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          tabIndex={0}
          role="img"
          aria-label={`${currentLabel}: ${money(lastValue)} spent so far. ${previousLabel}: ${money(previous.at(-1) ?? 0)} in total.`}
          onPointerMove={pick}
          onPointerLeave={() => setActive(null)}
          onKeyDown={handleKey}
          onBlur={() => setActive(null)}
        >
          <Gridlines
            ticks={ticks}
            max={max}
            format={(tick) => formatCompactCents(tick, currency)}
          />

          <svg
            className="absolute inset-0 size-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={toPoints(previous, days, max)}
              fill="none"
              className="stroke-muted-foreground"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {current.length > 0 && (
              <>
                <polygon
                  points={`0,100 ${toPoints(current, days, max)} ${xOf(lastIndex)},100`}
                  className="fill-chart-expense/10"
                />
                <polyline
                  points={toPoints(current, days, max)}
                  fill="none"
                  className="stroke-chart-expense"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
          </svg>

          {/* End marker for this month, with a surface ring. */}
          {current.length > 0 && (
            <span
              aria-hidden="true"
              className="absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-chart-expense ring-2 ring-card"
              style={{
                left: `${xOf(lastIndex)}%`,
                bottom: `${(lastValue / max) * 100}%`,
              }}
            />
          )}

          {active !== null && (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-y-0 border-l border-foreground/30"
                style={{ left: `${xOf(active)}%` }}
              />
              <ChartTooltip
                x={xOf(active)}
                title={`Day ${active + 1}`}
                rows={[
                  {
                    label: currentLabel,
                    value: valueAt(current, active),
                    swatchClassName: "bg-chart-expense",
                  },
                  {
                    label: previousLabel,
                    value: valueAt(previous, active),
                    swatchClassName: "bg-muted-foreground",
                  },
                ]}
              />
            </>
          )}
        </div>

        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Day 1</span>
          <span>Day {Math.ceil(days / 2)}</span>
          <span>Day {days}</span>
        </div>
      </div>
    </ChartCard>
  );
}
