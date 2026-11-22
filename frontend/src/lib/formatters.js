export function formatCurrency(amount, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(Number(amount) || 0);
}
