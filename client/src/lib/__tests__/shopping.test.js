import { describe, it, expect } from "vitest";

import { normalizeName, buildPriceIndex, planTrip, knownItemSummaries } from "../shopping";

const today = new Date().toISOString().slice(0, 10);
const longAgo = "2020-01-01";

describe("normalizeName", () => {
  it("ignores case, punctuation and spacing", () => {
    expect(normalizeName("Milk, 4L")).toBe(normalizeName("milk 4l"));
  });

  it("does not treat a shorter name as the same item", () => {
    expect(normalizeName("milk")).not.toBe(normalizeName("milk 4l"));
  });
});

describe("buildPriceIndex", () => {
  it("keeps the most recent price per shop, not the cheapest", () => {
    const index = buildPriceIndex([
      { item: "Milk", price: 4.99, store: "Food Basics", date: longAgo, priceType: "normal" },
      { item: "Milk", price: 5.99, store: "Food Basics", date: today, priceType: "normal" },
    ]);

    expect(index.get("milk").get("Food Basics").price).toBe(5.99);
  });

  it("leaves out offers and markdowns", () => {
    const index = buildPriceIndex([
      { item: "Eggs", price: 3.99, store: "No Frills", date: today, priceType: "offer" },
      { item: "Eggs", price: 2.99, store: "No Frills", date: today, priceType: "reduced" },
    ]);

    expect(index.has("eggs")).toBe(false);
  });

  it("treats a missing price type as a regular price", () => {
    const index = buildPriceIndex([
      { item: "Bread", price: 2.99, store: "No Frills", date: today },
    ]);

    expect(index.get("bread").get("No Frills").price).toBe(2.99);
  });
});

describe("planTrip", () => {
  const groceries = [
    { item: "Milk", price: 6.49, store: "No Frills", date: today, priceType: "normal" },
    { item: "Milk", price: 5.99, store: "Food Basics", date: today, priceType: "normal" },
    { item: "Bread", price: 2.99, store: "No Frills", date: today, priceType: "normal" },
  ];

  it("sends you to the cheaper shop for each item", () => {
    const plan = planTrip([{ id: "1", name: "Milk", quantity: 1, done: false }], groceries);

    expect(plan.matched[0].best.store).toBe("Food Basics");
  });

  it("multiplies by quantity", () => {
    const plan = planTrip([{ id: "1", name: "Milk", quantity: 3, done: false }], groceries);

    expect(plan.stops[0].total).toBeCloseTo(17.97, 2);
  });

  it("lists items with no logged price separately", () => {
    const plan = planTrip([{ id: "1", name: "Saffron", quantity: 1, done: false }], groceries);

    expect(plan.matched).toHaveLength(0);
    expect(plan.unknown[0].name).toBe("Saffron");
  });

  it("skips items already ticked off", () => {
    const plan = planTrip([{ id: "1", name: "Milk", quantity: 1, done: true }], groceries);

    expect(plan.matched).toHaveLength(0);
  });

  it("groups several items under one shop", () => {
    const plan = planTrip(
      [
        { id: "1", name: "Bread", quantity: 1, done: false },
        { id: "2", name: "Milk", quantity: 1, done: false },
      ],
      groceries,
    );

    const stores = plan.stops.map((stop) => stop.store).sort();

    expect(stores).toEqual(["Food Basics", "No Frills"]);
  });

  it("flags prices that are too old to trust", () => {
    const stale = [{ item: "Rice", price: 3.5, store: "No Frills", date: longAgo, priceType: "normal" }];
    const plan = planTrip([{ id: "1", name: "Rice", quantity: 1, done: false }], stale);

    expect(plan.matched[0].best.stale).toBe(true);
  });
});

describe("knownItemSummaries", () => {
  it("returns each item once with its cheapest shop", () => {
    const summaries = knownItemSummaries([
      { item: "Milk", price: 6.49, store: "No Frills", date: today, priceType: "normal" },
      { item: "milk", price: 5.99, store: "Food Basics", date: today, priceType: "normal" },
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0].store).toBe("Food Basics");
  });
});
