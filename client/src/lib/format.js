/*
  Formatting helpers, ported from the original script.js so numbers and
  dates render exactly the same as before.
*/

export function money(amount, { currency = "CAD", showSign = false } = {}) {
  const value = Number(amount) || 0;

  const formatted = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  if (showSign && value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;

  return formatted;
}

export function moneySigned(amount, currency) {
  return money(amount, { currency, showSign: true });
}

export function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonth(month) {
  if (!month) return "";

  const date = new Date(`${month}-01T00:00:00`);

  if (Number.isNaN(date.getTime())) return month;

  return date.toLocaleDateString("en-CA", { month: "short", year: "numeric" });
}

export function formatMonthLong(month) {
  if (!month) return "";

  const date = new Date(`${month}-01T00:00:00`);

  if (Number.isNaN(date.getTime())) return month;

  return date.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
}

export function formatHours(value) {
  const number = Number(value) || 0;

  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

export function today() {
  const now = new Date();

  const offset = now.getTimezoneOffset();

  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function currentMonth() {
  return today().slice(0, 7);
}

export function shiftMonth(month, delta) {
  const [year, monthNumber] = month.split("-").map(Number);

  const date = new Date(year, monthNumber - 1 + delta, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function lastMonths(count, endMonth = currentMonth()) {
  const months = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    months.push(shiftMonth(endMonth, -i));
  }

  return months;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
