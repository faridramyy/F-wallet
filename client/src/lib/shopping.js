/*
  Turning a shopping list into a shopping plan, using only the prices you
  have logged yourself.

  Two rules shape everything here:

  1. Per store, the most recent price wins, not the cheapest ever seen.
     What a thing costs now is what matters for a trip today. The lowest
     price you ever paid at a shop tells you about one lucky Tuesday.

  2. Only regular prices count. An offer or a markdown says nothing about
     where an item is usually cheaper, and planning a trip around a sale
     that ended last week is worse than having no plan.
*/

const STALE_AFTER_DAYS = 60;

export function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    // Punctuation varies more than people think: "Milk, 4L" and
    // "Milk 4L" should be the same thing.
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function daysSince(dateString) {
  if (!dateString) return Infinity;

  const then = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(then.getTime())) return Infinity;

  return Math.floor((Date.now() - then.getTime()) / 86400000);
}

export function isStale(dateString) {
  return daysSince(dateString) > STALE_AFTER_DAYS;
}

/*
  name -> store -> most recent regular price entry
*/

export function buildPriceIndex(groceries) {
  const index = new Map();

  for (const entry of groceries) {
    if ((entry.priceType || "normal") !== "normal") continue;

    const key = normalizeName(entry.item);

    if (!key) continue;

    if (!index.has(key)) index.set(key, new Map());

    const byStore = index.get(key);
    const store = String(entry.store || "Unknown store").trim() || "Unknown store";
    const existing = byStore.get(store);

    if (!existing || String(entry.date) > String(existing.date)) {
      byStore.set(store, entry);
    }
  }

  return index;
}

/*
  Every store where an item has a known price, cheapest first.
*/

function optionsFor(index, name) {
  const byStore = index.get(normalizeName(name));

  if (!byStore) return [];

  return [...byStore.values()]
    .map((entry) => ({
      store: entry.store || "Unknown store",
      price: Number(entry.price) || 0,
      date: entry.date,
      stale: isStale(entry.date),
    }))
    .sort((a, b) => a.price - b.price);
}

/*
  The plan.

  "stops" answers "where do I go for what", grouping each item under the
  shop that sells it cheapest.

  "singleStore" answers the more useful question in practice: if I only
  make one trip, which shop costs least? A plan spread over four shops
  saves pennies and costs an afternoon.
*/

export function planTrip(shopping, groceries) {
  const index = buildPriceIndex(groceries);

  const pending = shopping.filter((item) => !item.done);

  const matched = [];
  const unknown = [];

  for (const item of pending) {
    const options = optionsFor(index, item.name);

    if (options.length === 0) {
      unknown.push(item);
      continue;
    }

    const quantity = Math.max(1, Number(item.quantity) || 1);

    matched.push({
      item,
      quantity,
      best: options[0],
      options,
      // Only meaningful with two or more shops to compare.
      saving: options.length > 1 ? (options[options.length - 1].price - options[0].price) * quantity : 0,
    });
  }

  const stops = new Map();

  for (const row of matched) {
    const store = row.best.store;

    if (!stops.has(store)) {
      stops.set(store, { store, items: [], total: 0 });
    }

    const stop = stops.get(store);

    stop.items.push(row);
    stop.total += row.best.price * row.quantity;
  }

  const allStores = new Set();

  for (const row of matched) {
    for (const option of row.options) allStores.add(option.store);
  }

  const singleStore = [...allStores]
    .map((store) => {
      let total = 0;
      let covered = 0;
      let anyStale = false;

      for (const row of matched) {
        const option = row.options.find((candidate) => candidate.store === store);

        if (!option) continue;

        covered += 1;
        total += option.price * row.quantity;

        if (option.stale) anyStale = true;
      }

      return { store, total, covered, anyStale };
    })
    // Covering more of your list matters more than a small price edge,
    // since a second trip costs more than the difference.
    .sort((a, b) => (b.covered - a.covered) || (a.total - b.total));

  const splitTotal = [...stops.values()].reduce((sum, stop) => sum + stop.total, 0);

  const bestSingle = singleStore[0] || null;

  return {
    matched,
    unknown,
    stops: [...stops.values()].sort((a, b) => b.items.length - a.items.length),
    singleStore: singleStore.slice(0, 4),
    splitTotal,
    // What splitting the trip actually buys you, compared with going to
    // the one shop that covers the most of your list.
    splitSaving:
      bestSingle && bestSingle.covered === matched.length ? bestSingle.total - splitTotal : 0,
  };
}

/*
  Items you have logged prices for, most recently seen first, each with
  its cheapest known shop.

  Feeds the autosuggest on the add form. Carrying the price along means
  picking a name also tells you roughly what it costs and where, which
  turns a spelling aid into something worth reading.
*/

export function knownItemSummaries(groceries) {
  const index = buildPriceIndex(groceries);

  const seen = new Map();

  for (const entry of groceries) {
    const key = normalizeName(entry.item);

    if (!key) continue;

    const existing = seen.get(key);

    if (!existing || String(entry.date) > String(existing.date)) {
      seen.set(key, entry);
    }
  }

  return [...seen.values()]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((entry) => {
      const options = optionsFor(index, entry.item);
      const cheapest = options[0] || null;

      return {
        name: entry.item,
        store: cheapest ? cheapest.store : "",
        price: cheapest ? cheapest.price : null,
      };
    });
}
