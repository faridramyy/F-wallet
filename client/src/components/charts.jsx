// src/components/charts.jsx
//
// Dashboard charts, drawn with Recharts. Each component receives plain
// rows (built by the helpers in lib/calc.js) and only handles drawing,
// so none of them knows how a balance or a budget is calculated.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  money,
  moneyCompact,
  formatMonth,
  formatMonthLong,
} from "../lib/format";

// Colours come from the theme tokens where one exists, so the charts
// follow light/dark mode automatically. Income green and warning amber
// have no token, so they are fixed values (same as the donut palette).
const INCOME = "#10b981";
const WARNING = "#f59e0b";
const EXPENSE = "var(--destructive)";
// The theme's --primary is a dark green in dark mode, too dim for thin lines
// and bars on a dark card. emerald-600 keeps 3:1+ contrast on both surfaces.
const PRIMARY = "#059669";
const MUTED = "var(--muted-foreground)";
const GRID = "var(--border)";

const AXIS_TICK = { fontSize: 11, fill: MUTED };
const CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 };
const CURSOR = { fill: "var(--muted)", opacity: 0.5 };

function ChartEmpty({ message, height = "h-44" }) {
  return (
    <div
      className={`flex ${height} items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground`}
    >
      {message}
    </div>
  );
}

// Legend as plain HTML under the chart. Shown whenever a chart has two or
// more series, so colour is never the only way to tell them apart.
function ChartLegend({ items }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-6 border-t pt-3 text-2xs text-muted-foreground">
      {items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 font-medium"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{
              background: item.color,
              opacity: item.opacity ?? 1,
              ...(item.dashed
                ? {
                    background: "transparent",
                    border: `2px dashed ${item.color}`,
                  }
                : {}),
            }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// One tooltip for every chart. `title` turns the hovered row into a heading;
// `footer` can add a line underneath (used for "left / over budget").
function ChartTooltip({ active, payload, title, formatValue, footer }) {
  if (!active || !payload?.length) return null;

  const rows = payload.filter((entry) => entry.value != null);

  if (rows.length === 0) return null;

  const source = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-semibold">{title(source)}</p>

      {rows.map((entry) => (
        <div
          key={entry.dataKey}
          className="flex items-center justify-between gap-4"
        >
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: entry.color ?? entry.stroke ?? entry.fill }}
            />
            {entry.name}
          </span>

          <span className="font-semibold tabular-nums">
            {formatValue(entry.value)}
          </span>
        </div>
      ))}

      {footer && (
        <p className="mt-1 border-t pt-1 text-muted-foreground">
          {footer(source)}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cash flow: income vs expenses for each of the last months           */
/* ------------------------------------------------------------------ */

export function CashFlowChart({ trend, currency }) {
  const hasData = trend.some((item) => item.income > 0 || item.expenses > 0);

  if (!hasData) {
    return <ChartEmpty message="No income or expenses in this period yet." />;
  }

  const data = trend.map((item) => ({
    ...item,
    label: formatMonth(item.month).split(" ")[0],
  }));

  return (
    <div>
      <div className="h-52 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={CHART_MARGIN} barGap={2}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
              width={56}
              tickFormatter={(value) => moneyCompact(value, { currency })}
            />
            <Tooltip
              cursor={CURSOR}
              content={
                <ChartTooltip
                  title={(row) => formatMonthLong(row.month)}
                  formatValue={(value) => money(value, { currency })}
                />
              }
            />
            <Bar
              dataKey="income"
              name="Income"
              fill={INCOME}
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill={EXPENSE}
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ChartLegend
        items={[
          { label: "Income", color: INCOME },
          { label: "Expenses", color: EXPENSE },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Net worth over time                                                 */
/* ------------------------------------------------------------------ */

export function NetWorthChart({ data, currency }) {
  if (data.length === 0) {
    return (
      <ChartEmpty message="Add an account to see your net worth over time." />
    );
  }

  const values = data.map((item) => item.netWorth);
  const crossesZero = Math.min(...values) < 0 && Math.max(...values) > 0;

  const rows = data.map((item) => ({
    ...item,
    label: formatMonth(item.month).split(" ")[0],
  }));

  return (
    <div className="h-52 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={CHART_MARGIN}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            width={56}
            domain={["auto", "auto"]}
            tickFormatter={(value) => moneyCompact(value, { currency })}
          />
          {crossesZero && (
            <ReferenceLine y={0} stroke={MUTED} strokeOpacity={0.6} />
          )}
          <Tooltip
            cursor={{ stroke: GRID }}
            content={
              <ChartTooltip
                title={(row) => formatMonthLong(row.month)}
                formatValue={(value) => money(value, { currency })}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="netWorth"
            name="Net worth"
            stroke={PRIMARY}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spending pace: cumulative spend this month vs the month before      */
/* ------------------------------------------------------------------ */

export function SpendingPaceChart({
  data,
  currentLabel,
  previousLabel,
  currency,
}) {
  const hasData = data.some((row) => row.current > 0 || row.previous > 0);

  if (!hasData) {
    return <ChartEmpty message="No expenses logged for these two months." />;
  }

  // A label every 5 days is enough; the 1st is always shown.
  const ticks = data
    .map((row) => row.day)
    .filter((day) => day === 1 || day % 5 === 0);

  return (
    <div>
      <div className="h-52 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="day"
              ticks={ticks}
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
              width={56}
              tickFormatter={(value) => moneyCompact(value, { currency })}
            />
            <Tooltip
              cursor={{ stroke: GRID }}
              content={
                <ChartTooltip
                  title={(row) => `Day ${row.day}`}
                  formatValue={(value) => money(value, { currency })}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="previous"
              name={previousLabel}
              stroke={MUTED}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="current"
              name={currentLabel}
              stroke={PRIMARY}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ChartLegend
        items={[
          { label: currentLabel, color: PRIMARY },
          { label: previousLabel, color: MUTED, dashed: true },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Budget vs actual, one pair of bars per category                     */
/* ------------------------------------------------------------------ */

// Green normally, amber from 85% of the budget, red once it is exceeded.
// The same thresholds the old progress bars used.
function budgetColor(spent, budget) {
  const percent = budget > 0 ? (spent / budget) * 100 : 0;

  if (percent > 100) return EXPENSE;
  if (percent >= 85) return WARNING;

  return PRIMARY;
}

export function BudgetChart({ data, currency }) {
  const rows = data.map((item) => ({
    name: item.name,
    budget: item.budget,
    spent: item.spent,
  }));

  // Two bars per category plus breathing room.
  const height = Math.max(160, rows.length * 56 + 24);

  return (
    <div>
      <div className="w-full min-w-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="22%"
          >
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
              tickFormatter={(value) => moneyCompact(value, { currency })}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={88}
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
              tickFormatter={(name) =>
                name.length > 12 ? `${name.slice(0, 11)}…` : name
              }
            />
            <Tooltip
              cursor={CURSOR}
              content={
                <ChartTooltip
                  title={(row) => row.name}
                  formatValue={(value) => money(value, { currency })}
                  footer={(row) => {
                    const remaining = row.budget - row.spent;

                    return remaining >= 0
                      ? `${money(remaining, { currency })} left`
                      : `${money(Math.abs(remaining), { currency })} over budget`;
                  }}
                />
              }
            />
            <Bar
              dataKey="budget"
              name="Budget"
              fill={MUTED}
              fillOpacity={0.35}
              radius={[0, 4, 4, 0]}
              maxBarSize={14}
            />
            <Bar
              dataKey="spent"
              name="Spent"
              fill={PRIMARY}
              radius={[0, 4, 4, 0]}
              maxBarSize={14}
            >
              {rows.map((row) => (
                <Cell
                  key={row.name}
                  fill={budgetColor(row.spent, row.budget)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ChartLegend
        items={[
          { label: "Budget", color: MUTED, opacity: 0.35 },
          { label: "Spent", color: PRIMARY },
          { label: "Near limit", color: WARNING },
          { label: "Over", color: EXPENSE },
        ]}
      />
    </div>
  );
}
