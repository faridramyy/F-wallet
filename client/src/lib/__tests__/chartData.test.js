import { describe, it, expect } from "vitest";

import {
  OTHER_CATEGORY_ID,
  cumulativeSpendingByDay,
  daysInMonth,
  groupTopWithOther,
  netWorthAtMonthEnd,
} from "../calc";

describe("groupTopWithOther", () => {
  const rows = [
    { categoryId: "a", amount: 100 },
    { categoryId: "b", amount: 80 },
    { categoryId: "c", amount: 60 },
    { categoryId: "d", amount: 40 },
    { categoryId: "e", amount: 20 },
  ];

  it("returns the rows untouched when they already fit", () => {
    expect(groupTopWithOther(rows, 5)).toEqual(rows);
    expect(groupTopWithOther(rows, 10)).toEqual(rows);
  });

  it("folds the tail into one Other row, keeping `limit` rows in total", () => {
    const result = groupTopWithOther(rows, 3);

    expect(result).toHaveLength(3);
    expect(result.slice(0, 2).map((row) => row.categoryId)).toEqual(["a", "b"]);
    expect(result[2]).toEqual({
      categoryId: OTHER_CATEGORY_ID,
      amount: 60 + 40 + 20,
    });
  });

  it("never changes the total (the donut bug: slices must add up)", () => {
    const sum = (list) => list.reduce((total, row) => total + row.amount, 0);

    expect(sum(groupTopWithOther(rows, 3))).toBe(sum(rows));
  });
});

describe("daysInMonth", () => {
  it("handles 30 and 31 day months", () => {
    expect(daysInMonth("2026-09")).toBe(30);
    expect(daysInMonth("2026-10")).toBe(31);
  });

  it("handles February in normal and leap years", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
  });

  it("handles the December to January boundary", () => {
    expect(daysInMonth("2026-12")).toBe(31);
  });
});

describe("cumulativeSpendingByDay", () => {
  const transactions = [
    { type: "expense", amount: 10, date: "2026-09-01" },
    { type: "expense", amount: 5.5, date: "2026-09-01" },
    { type: "expense", amount: 20, date: "2026-09-03" },
    { type: "income", amount: 999, date: "2026-09-02" },
    { type: "expense", amount: 70, date: "2026-08-31" },
  ];

  it("returns one running total per day of the month", () => {
    const result = cumulativeSpendingByDay(transactions, "2026-09");

    expect(result).toHaveLength(30);
    expect(result[0]).toBe(15.5);
    // No expense on the 2nd: the total carries over. Income is ignored.
    expect(result[1]).toBe(15.5);
    expect(result[2]).toBe(35.5);
    expect(result[29]).toBe(35.5);
  });

  it("ignores other months", () => {
    const result = cumulativeSpendingByDay(transactions, "2026-09");

    expect(result.every((value) => value <= 35.5)).toBe(true);
  });

  it("returns null after lastDay so the line stops at today", () => {
    const result = cumulativeSpendingByDay(transactions, "2026-09", 2);

    expect(result[0]).toBe(15.5);
    expect(result[1]).toBe(15.5);
    expect(result[2]).toBeNull();
    expect(result[29]).toBeNull();
  });

  it("gives zeros for a month with no spending", () => {
    const result = cumulativeSpendingByDay([], "2026-09");

    expect(result.every((value) => value === 0)).toBe(true);
  });
});

describe("netWorthAtMonthEnd", () => {
  const accounts = [
    { id: "a1", type: "chequing", startingBalance: 1000 },
    { id: "a2", type: "credit", startingBalance: 0, creditLimit: 2000 },
  ];

  const transactions = [
    { type: "income", accountId: "a1", amount: 500, date: "2026-08-15" },
    { type: "expense", accountId: "a2", amount: 200, date: "2026-09-10" },
    { type: "expense", accountId: "a1", amount: 100, date: "2026-10-02" },
  ];

  it("only counts transactions up to the end of that month", () => {
    // Aug: 1000 + 500 cash, no card debt yet.
    expect(netWorthAtMonthEnd(accounts, transactions, "2026-08")).toBe(1500);
    // Sep: the card now owes 200.
    expect(netWorthAtMonthEnd(accounts, transactions, "2026-09")).toBe(1300);
    // Oct: 100 more leaves the chequing account.
    expect(netWorthAtMonthEnd(accounts, transactions, "2026-10")).toBe(1200);
  });

  it("counts the starting balance even before any transaction", () => {
    expect(netWorthAtMonthEnd(accounts, transactions, "2026-01")).toBe(1000);
  });

  it("matches the headline number when asked for the latest month", () => {
    expect(netWorthAtMonthEnd(accounts, transactions, "2026-12")).toBe(1200);
  });
});
