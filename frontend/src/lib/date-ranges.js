import { formatShortDate, formatShortDateRange } from "./formatters";

// Date helpers for "YYYY-MM-DD" keys (local time, never UTC) and the
// preset ranges offered by the date range picker.

const pad = (value) => String(value).padStart(2, "0");

export const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Today as "YYYY-MM-DD", in local time.
export const todayKey = () => toDateKey(new Date());

export function fromDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const addDays = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// Quick ranges, relative to today. `range()` returns { from, to }.
export const DATE_PRESETS = [
  { id: "today", label: "Today", range: (t) => ({ from: t, to: t }) },
  {
    id: "7d",
    label: "Last 7 days",
    range: (t) => ({ from: addDays(t, -6), to: t }),
  },
  {
    id: "30d",
    label: "Last 30 days",
    range: (t) => ({ from: addDays(t, -29), to: t }),
  },
  {
    id: "this-month",
    label: "This month",
    range: (t) => ({
      from: new Date(t.getFullYear(), t.getMonth(), 1),
      to: new Date(t.getFullYear(), t.getMonth() + 1, 0),
    }),
  },
  {
    id: "last-month",
    label: "Last month",
    range: (t) => ({
      from: new Date(t.getFullYear(), t.getMonth() - 1, 1),
      to: new Date(t.getFullYear(), t.getMonth(), 0),
    }),
  },
  {
    id: "90d",
    label: "Last 3 months",
    range: (t) => ({ from: addDays(t, -89), to: t }),
  },
  {
    id: "this-year",
    label: "This year",
    range: (t) => ({
      from: new Date(t.getFullYear(), 0, 1),
      to: new Date(t.getFullYear(), 11, 31),
    }),
  },
].map((preset) => ({
  ...preset,
  // As "YYYY-MM-DD" keys, for comparing with a filter value.
  keys: (today = new Date()) => {
    const { from, to } = preset.range(today);
    return { from: toDateKey(from), to: toDateKey(to) };
  },
}));

// The preset a range equals, if any.
export const matchingPreset = (value) =>
  DATE_PRESETS.find((preset) => {
    const keys = preset.keys();
    return keys.from === value.from && keys.to === value.to;
  });

// "Nov 1 – 19, 2026", "Nov 3, 2026", "From Nov 1, 2026", or "Any date".
export function describeRange({ from, to }) {
  if (!from && !to) return "Any date";
  if (from && !to) return `From ${formatShortDate(fromDateKey(from))}`;
  if (!from && to) return `Until ${formatShortDate(fromDateKey(to))}`;
  if (from === to) return formatShortDate(fromDateKey(from));
  return formatShortDateRange(fromDateKey(from), fromDateKey(to));
}

// The 6×7 grid of days shown for a month, starting on Sunday; days from
// the neighbouring months fill the first and last weeks.
export function monthGrid(year, month) {
  const first = new Date(year, month - 1, 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
