const LOCALE = "en-CA";

// Intl formatters are expensive to build, so each one is created once and
// reused (formatCurrency runs for every row on every render).
const currencyFormatters = new Map();

function getCurrencyFormatter(currency) {
  let formatter = currencyFormatters.get(currency);

  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency });
    currencyFormatters.set(currency, formatter);
  }

  return formatter;
}

const monthYearFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "long",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const fullDayFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const monthNameFormatter = new Intl.DateTimeFormat(LOCALE, { month: "long" });
const monthShortFormatter = new Intl.DateTimeFormat(LOCALE, { month: "short" });
const monthShortYearFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  year: "numeric",
});

const firstOfMonth = (year, month) => new Date(year, month - 1, 1);

const compactFormatters = new Map();

// Short money for chart axes: "$1.2K", "$15K", "$0".
export function formatCompactCents(cents, currency = "CAD") {
  let formatter = compactFormatters.get(currency);

  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    });
    compactFormatters.set(currency, formatter);
  }

  return formatter.format(Number(cents ?? 0) / 100);
}

// A 0-1 ratio as "42%".
export const formatPercent = (ratio) => `${Math.round(ratio * 100)}%`;

export function formatCurrency(amount, currency = "CAD") {
  return getCurrencyFormatter(currency).format(Number(amount) || 0);
}

// Cents (number or numeric string from the API) formatted as money.
export function formatCents(cents, currency) {
  return formatCurrency(Number(cents ?? 0) / 100, currency);
}

// Months (1-based) as "November 2026", "Nov 2026", "November" and "Nov".
export const formatMonthYear = (year, month) =>
  monthYearFormatter.format(firstOfMonth(year, month));

export const formatMonthShortYear = (year, month) =>
  monthShortYearFormatter.format(firstOfMonth(year, month));

export const formatMonthName = (year, month) =>
  monthNameFormatter.format(firstOfMonth(year, month));

export const formatMonthShort = (year, month) =>
  monthShortFormatter.format(firstOfMonth(year, month));

// A Date as "Nov 3, 2026", or a range as "Nov 1–19, 2026".
export const formatShortDate = (date) => shortDateFormatter.format(date);

export const formatShortDateRange = (from, to) =>
  shortDateFormatter.formatRange(from, to);

// A Date as "Monday, November 2, 2026" (e.g. for screen readers).
export const formatFullDay = (date) => fullDayFormatter.format(date);

// The symbol shown before an amount: "$", "€", "£"...
export const currencySymbol = (currency = "CAD") =>
  getCurrencyFormatter(currency)
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value ?? "$";

// A "YYYY-MM-DD" string from the API, shown as "November 22, 2026".
// Built from its parts in LOCAL time: new Date("2026-11-22") would be parsed
// as UTC midnight and show as Nov 21 for anyone west of UTC.
export function formatDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return longDateFormatter.format(new Date(year, month - 1, day));
}

// An ISO timestamp shown as "Nov 22, 2026".
export function formatTimestamp(value) {
  return shortDateFormatter.format(new Date(value));
}

// Safe BigInt-based dollar string to cents integer.
// Never use Math.round(Number(text) * 100) — in floating point
// 1.005 * 100 is 100.49999999999999, silently losing a cent.
// Returns null if the input is not a valid non-negative dollar amount.
export function dollarsToCents(value) {
  const normalized = String(value).trim();

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;

  const [dollars, fraction = ""] = normalized.split(".");
  const cents = BigInt(dollars) * 100n + BigInt(fraction.padEnd(2, "0") || "0");

  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;

  return Number(cents);
}

// Safe BigInt-based cents integer to dollar input string.
// Handles negatives (e.g. opening balance on a credit card).
export function centsToInput(value) {
  try {
    const cents = BigInt(value ?? 0);
    const sign = cents < 0n ? "-" : "";
    const absolute = cents < 0n ? -cents : cents;
    const dollars = absolute / 100n;
    const remainder = String(absolute % 100n).padStart(2, "0");

    return `${sign}${dollars}.${remainder}`;
  } catch {
    return "0.00";
  }
}

// Human-readable title for a transaction, following the same priority used
// everywhere in the UI: description → merchant → category → fallback.
// Transfers and refunds without a description get a title of their own.
export function getTransactionTitle(transaction) {
  if (transaction.description) return transaction.description;

  if (transaction.transaction_type === "transfer") return "Transfer";

  if (transaction.transaction_type === "refund") {
    return `Refund · ${transaction.original_title || transaction.merchant || "expense"}`;
  }

  return transaction.merchant || transaction.category_name || "Transaction";
}
