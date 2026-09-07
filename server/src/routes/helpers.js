const crypto = require("crypto");

function generateId(prefix) {
  const random = crypto.randomBytes(6).toString("hex");

  return `${prefix}_${Date.now().toString(36)}${random}`;
}

/*
  Express 4 does not forward rejected promises to the error handler, so
  every async route is wrapped.
*/

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function isValidDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/*
  Ported straight from the original app so pay maths behaves identically
  whether a transaction is created in the browser or over the API.
*/

function normalizePay(pay) {
  if (!pay || typeof pay !== "object") return null;

  const hours = Math.max(0, toNumber(pay.hours));
  const rate = Math.max(0, toNumber(pay.rate));
  const overtimeHours = Math.max(0, toNumber(pay.overtimeHours));
  const overtimeMultiplier = toNumber(pay.overtimeMultiplier) > 0 ? toNumber(pay.overtimeMultiplier) : 1.5;

  if (!hours && !overtimeHours) return null;

  return { hours, rate, overtimeHours, overtimeMultiplier };
}

function calculatePayTotal(pay) {
  const normalized = normalizePay(pay);

  if (!normalized) return 0;

  const { hours, rate, overtimeHours, overtimeMultiplier } = normalized;

  return round2(hours * rate + overtimeHours * rate * overtimeMultiplier);
}

module.exports = {
  generateId,
  wrap,
  badRequest,
  toNumber,
  round2,
  isValidDate,
  today,
  normalizePay,
  calculatePayTotal,
};
