import { describe, it, expect } from "vitest";

import {
  accountBalance,
  normalAccountTotal,
  creditCardDebt,
  availableCredit,
  calculatePay,
  monthlyIncome,
  monthlyExpenses,
  savingsRate,
} from "../calc";

const chequing = { id: "a1", type: "chequing", startingBalance: 1000 };
const savings = { id: "a2", type: "savings", startingBalance: 5000, includeInTotal: false };
const visa = { id: "a3", type: "credit", startingBalance: 0, creditLimit: 2000 };

describe("accountBalance", () => {
  it("subtracts expenses and adds income on a normal account", () => {
    const balance = accountBalance(chequing, [
      { type: "expense", accountId: "a1", amount: 200, date: "2026-09-01" },
      { type: "income", accountId: "a1", amount: 50, date: "2026-09-02" },
    ]);

    expect(balance).toBe(850);
  });

  it("inverts the sign on a credit card, so spending increases debt", () => {
    const balance = accountBalance(visa, [
      { type: "expense", accountId: "a3", amount: 300, date: "2026-09-01" },
    ]);

    expect(balance).toBe(300);
  });

  it("treats a transfer into a credit card as a payment", () => {
    const balance = accountBalance(visa, [
      { type: "expense", accountId: "a3", amount: 300, date: "2026-09-01" },
      { type: "transfer", fromAccountId: "a1", toAccountId: "a3", amount: 100, date: "2026-09-02" },
    ]);

    expect(balance).toBe(200);
  });

  it("ignores transactions belonging to other accounts", () => {
    expect(accountBalance(chequing, [
      { type: "expense", accountId: "a3", amount: 999, date: "2026-09-01" },
    ])).toBe(1000);
  });
});

describe("normalAccountTotal", () => {
  it("leaves out accounts excluded from the total", () => {
    expect(normalAccountTotal([chequing, savings], [])).toBe(1000);
  });

  it("leaves out credit cards, which are debt rather than money", () => {
    expect(normalAccountTotal([chequing, visa], [])).toBe(1000);
  });
});

describe("credit cards", () => {
  const spent = [{ type: "expense", accountId: "a3", amount: 500, date: "2026-09-01" }];

  it("reports debt as a positive number", () => {
    expect(creditCardDebt([visa], spent)).toBe(500);
  });

  it("never reports negative debt when a card is overpaid", () => {
    const overpaid = [
      { type: "transfer", fromAccountId: "a1", toAccountId: "a3", amount: 100, date: "2026-09-01" },
    ];

    expect(creditCardDebt([visa], overpaid)).toBe(0);
  });

  it("works out remaining credit from the limit", () => {
    expect(availableCredit(visa, spent)).toBe(1500);
  });
});

describe("calculatePay", () => {
  it("multiplies hours by rate", () => {
    expect(calculatePay({ hours: 10, rate: 20 }).total).toBe(200);
  });

  it("applies the multiplier to overtime only", () => {
    const result = calculatePay({ hours: 10, rate: 20, overtimeHours: 2, overtimeMultiplier: 1.5 });

    expect(result.total).toBe(260);
    expect(result.overtimePay).toBe(60);
  });

  it("returns zero when there are no hours", () => {
    expect(calculatePay({ hours: 0, rate: 20 }).total).toBe(0);
  });
});

describe("monthly totals", () => {
  const transactions = [
    { type: "income", amount: 1000, date: "2026-09-05" },
    { type: "expense", amount: 400, date: "2026-09-06" },
    { type: "expense", amount: 999, date: "2026-08-31" },
  ];

  it("counts only the month asked for", () => {
    expect(monthlyIncome(transactions, "2026-09")).toBe(1000);
    expect(monthlyExpenses(transactions, "2026-09")).toBe(400);
  });

  it("works out the savings rate", () => {
    expect(savingsRate(1000, 400)).toBe(60);
  });

  it("reports zero savings rate when there is no income", () => {
    expect(savingsRate(0, 400)).toBe(0);
  });
});
