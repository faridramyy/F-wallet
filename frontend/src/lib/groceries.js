// Grocery price tracking: units, unit prices and "where is it cheapest".
//
// Each product is measured by weight, volume or count. Its prices are
// compared per kg, per L or per item, so a 4 L jug and a 2 L carton of the
// same milk can be compared directly.

import { formatCents } from "./formatters";

export const UNIT_KINDS = [
  { value: "weight", label: "Weight", base: "kg", per: "/kg" },
  { value: "volume", label: "Volume", base: "L", per: "/L" },
  { value: "count", label: "Count", base: "item", per: "/item" },
];

// toBase: how many base units (kg, L or items) one of this unit is.
export const PACKAGE_UNITS = [
  { value: "g", label: "g", kind: "weight", toBase: 0.001 },
  { value: "kg", label: "kg", kind: "weight", toBase: 1 },
  { value: "lb", label: "lb", kind: "weight", toBase: 0.45359237 },
  { value: "oz", label: "oz", kind: "weight", toBase: 0.028349523125 },
  { value: "ml", label: "ml", kind: "volume", toBase: 0.001 },
  { value: "l", label: "L", kind: "volume", toBase: 1 },
  { value: "each", label: "each", kind: "count", toBase: 1 },
];

export const getUnitKind = (value) =>
  UNIT_KINDS.find((kind) => kind.value === value) ?? UNIT_KINDS[2];

export const getPackageUnit = (value) =>
  PACKAGE_UNITS.find((unit) => unit.value === value) ?? PACKAGE_UNITS[6];

export const unitsForKind = (kind) =>
  PACKAGE_UNITS.filter((unit) => unit.kind === kind);

// The unit a new price starts with for a product of this kind.
export const defaultUnitForKind = (kind) =>
  ({ weight: "kg", volume: "l", count: "each" })[kind] ?? "each";

export const productLabel = (product) =>
  product
    ? [product.product_name, product.brand].filter(Boolean).join(" · ")
    : "Unknown product";

// Cents per kg / L / item, as a (fractional) number.
export function unitPriceCents(price) {
  const quantity = Number(price.package_quantity);
  const unit = getPackageUnit(price.package_unit);

  return Number(price.price_cents) / (quantity * unit.toBase);
}

// "$4.99 /kg"
export const formatUnitPrice = (cents, kind, currency) =>
  `${formatCents(Math.round(cents), currency)} ${getUnitKind(kind).per}`;

// "2 L", "500 g", "12 each"
export function formatPackage(price) {
  const quantity = Number(price.package_quantity);
  return `${quantity.toLocaleString("en-CA", { maximumFractionDigits: 3 })} ${getPackageUnit(price.package_unit).label}`;
}

// Newest first: by date seen, then by when it was entered.
const isNewer = (a, b) =>
  a.observed_on > b.observed_on ||
  (a.observed_on === b.observed_on && a.created_at > b.created_at);

// For each product: the latest regular price and the latest sale price at
// every store, and the cheapest of each per unit.
//
//   Map<product_id, {
//     stores: [{ store_id, regular?, sale? }],  each price with .unitCents
//     bestRegular?, bestSale?,                  a price with .unitCents
//     lastSeen?,                                newest price of any kind
//   }>
export function summarizePrices(prices) {
  const byProduct = new Map();

  for (const price of prices) {
    let entry = byProduct.get(price.product_id);

    if (!entry) {
      entry = { storeMap: new Map(), lastSeen: null };
      byProduct.set(price.product_id, entry);
    }

    if (!entry.lastSeen || isNewer(price, entry.lastSeen)) {
      entry.lastSeen = price;
    }

    let store = entry.storeMap.get(price.store_id);

    if (!store) {
      store = { store_id: price.store_id };
      entry.storeMap.set(price.store_id, store);
    }

    const slot = price.is_sale ? "sale" : "regular";

    if (!store[slot] || isNewer(price, store[slot])) {
      store[slot] = { ...price, unitCents: unitPriceCents(price) };
    }
  }

  const cheapest = (list) =>
    list.reduce(
      (best, item) =>
        item && (!best || item.unitCents < best.unitCents) ? item : best,
      null,
    );

  const summary = new Map();

  for (const [productId, entry] of byProduct) {
    const stores = [...entry.storeMap.values()];

    summary.set(productId, {
      stores,
      bestRegular: cheapest(stores.map((store) => store.regular)),
      bestSale: cheapest(stores.map((store) => store.sale)),
      lastSeen: entry.lastSeen,
    });
  }

  return summary;
}
