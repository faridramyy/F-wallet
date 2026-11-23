export function formatCurrency(amount, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(Number(amount) || 0);
}

// Safe BigInt-based dollar string to cents integer.
// Never use Math.round(Number(text) * 100) — in floating point
// 1.005 * 100 is 100.49999999999999, silently losing a cent.
// Returns null if the input is not a valid non-negative dollar amount.
export function dollarsToCents(value) {
  const normalized = String(value).trim();

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;

  const [dollars, fraction = ""] = normalized.split(".");
  const cents =
    BigInt(dollars) * 100n + BigInt(fraction.padEnd(2, "0") || "0");

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

// Returns the current calendar year, month (1-based), and a YYYY-MM prefix
// string for filtering transaction_date fields.
export function getCurrentYearMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return {
    year,
    month,
    prefix: `${year}-${String(month).padStart(2, "0")}`,
  };
}

// Human-readable title for a transaction, following the same priority used
// everywhere in the UI: description → merchant → category → fallback.
export function getTransactionTitle(transaction) {
  return (
    transaction.description ||
    transaction.merchant ||
    transaction.category_name ||
    "Transaction"
  );
}
