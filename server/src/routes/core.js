const express = require("express");

const { Account, Category, Transaction, Grocery, Settings } = require("../models");
const { generateId, wrap, badRequest, toNumber } = require("./helpers");

const router = express.Router();

/* ---------------------------------------------------------
   Whole state in one request.

   The client renders every page off the full dataset, same as the
   original app did with localStorage. One round trip on load beats five,
   which matters when the Lambda is cold.
--------------------------------------------------------- */

router.get(
  "/state",
  wrap(async (req, res) => {
    const [accounts, categories, transactions, groceries, settings] = await Promise.all([
      Account.find().sort({ createdAt: 1 }).lean({ virtuals: false }),
      Category.find().sort({ createdAt: 1 }).lean(),
      Transaction.find().sort({ date: -1 }).lean(),
      Grocery.find().sort({ date: -1 }).lean(),
      Settings.findOne({ key: "settings" }).lean(),
    ]);

    const strip = (docs) =>
      docs.map(({ _id, __v, updatedAt, ...rest }) => rest);

    res.json({
      accounts: strip(accounts),
      categories: strip(categories),
      transactions: strip(transactions),
      groceries: strip(groceries),
      settings: settings
        ? { currency: settings.currency, theme: settings.theme }
        : { currency: "CAD", theme: "light" },
    });
  }),
);

/* ---------------------------------------------------------
   Accounts
--------------------------------------------------------- */

router.post(
  "/accounts",
  wrap(async (req, res) => {
    const { name, type, institution, lastFour, startingBalance, creditLimit } = req.body || {};

    if (!name || !String(name).trim()) {
      return badRequest(res, "Account name is required.");
    }

    if (lastFour && !/^\d{4}$/.test(String(lastFour))) {
      return badRequest(res, "Last four digits must be exactly four numbers.");
    }

    const account = await Account.create({
      id: generateId("acc"),
      name: String(name).trim(),
      type: type || "chequing",
      institution: institution ? String(institution).trim() : "",
      lastFour: lastFour ? String(lastFour) : "",
      startingBalance: toNumber(startingBalance),
      ...(type === "credit" ? { creditLimit: Math.max(0, toNumber(creditLimit)) } : {}),
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(account.toJSON());
  }),
);

router.put(
  "/accounts/:id",
  wrap(async (req, res) => {
    const account = await Account.findOne({ id: req.params.id });

    if (!account) return res.status(404).json({ error: "Account not found." });

    const { name, type, institution, lastFour, startingBalance, creditLimit } = req.body || {};

    if (name !== undefined) account.name = String(name).trim();
    if (type !== undefined) account.type = type;
    if (institution !== undefined) account.institution = String(institution).trim();
    if (lastFour !== undefined) account.lastFour = String(lastFour);
    if (startingBalance !== undefined) account.startingBalance = toNumber(startingBalance);

    if (account.type === "credit") {
      if (creditLimit !== undefined) account.creditLimit = Math.max(0, toNumber(creditLimit));
    } else {
      account.creditLimit = undefined;
    }

    await account.save();

    res.json(account.toJSON());
  }),
);

/*
  Deleting an account also deletes anything that touched it, including
  transfers on either side. Matches the warning the original UI showed.
*/

router.delete(
  "/accounts/:id",
  wrap(async (req, res) => {
    const { id } = req.params;

    await Transaction.deleteMany({
      $or: [{ accountId: id }, { fromAccountId: id }, { toAccountId: id }],
    });

    await Account.deleteOne({ id });

    res.json({ ok: true });
  }),
);

/* ---------------------------------------------------------
   Categories
--------------------------------------------------------- */

router.post(
  "/categories",
  wrap(async (req, res) => {
    const { name, type, monthlyBudget, expectedIncome } = req.body || {};

    if (!name || !String(name).trim()) {
      return badRequest(res, "Category name is required.");
    }

    if (type !== "expense" && type !== "income") {
      return badRequest(res, "Category type must be expense or income.");
    }

    const category = await Category.create({
      id: generateId("cat"),
      name: String(name).trim(),
      type,
      monthlyBudget: type === "expense" ? Math.max(0, toNumber(monthlyBudget)) : 0,
      expectedIncome: type === "income" ? Math.max(0, toNumber(expectedIncome)) : 0,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(category.toJSON());
  }),
);

router.put(
  "/categories/:id",
  wrap(async (req, res) => {
    const category = await Category.findOne({ id: req.params.id });

    if (!category) return res.status(404).json({ error: "Category not found." });

    const { name, type, monthlyBudget, expectedIncome } = req.body || {};

    if (name !== undefined) category.name = String(name).trim();
    if (type !== undefined) category.type = type;

    category.monthlyBudget =
      category.type === "expense" ? Math.max(0, toNumber(monthlyBudget ?? category.monthlyBudget)) : 0;

    category.expectedIncome =
      category.type === "income" ? Math.max(0, toNumber(expectedIncome ?? category.expectedIncome)) : 0;

    await category.save();

    res.json(category.toJSON());
  }),
);

/*
  Transactions using a deleted category become uncategorized rather than
  disappearing, which is what the original did.
*/

router.delete(
  "/categories/:id",
  wrap(async (req, res) => {
    const { id } = req.params;

    await Transaction.updateMany({ categoryId: id }, { $set: { categoryId: "" } });

    await Category.deleteOne({ id });

    res.json({ ok: true });
  }),
);

/* ---------------------------------------------------------
   Groceries
--------------------------------------------------------- */

router.post(
  "/groceries",
  wrap(async (req, res) => {
    const { item, price, store, date, description } = req.body || {};

    if (!item || !String(item).trim()) {
      return badRequest(res, "Item name is required.");
    }

    const grocery = await Grocery.create({
      id: generateId("grocery"),
      item: String(item).trim(),
      price: Math.max(0, toNumber(price)),
      store: store ? String(store).trim() : "Unknown store",
      date: date || new Date().toISOString().slice(0, 10),
      description: description ? String(description).trim() : "",
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(grocery.toJSON());
  }),
);

router.put(
  "/groceries/:id",
  wrap(async (req, res) => {
    const grocery = await Grocery.findOne({ id: req.params.id });

    if (!grocery) return res.status(404).json({ error: "Price entry not found." });

    const { item, price, store, date, description } = req.body || {};

    if (item !== undefined) grocery.item = String(item).trim();
    if (price !== undefined) grocery.price = Math.max(0, toNumber(price));
    if (store !== undefined) grocery.store = String(store).trim() || "Unknown store";
    if (date !== undefined) grocery.date = date;
    if (description !== undefined) grocery.description = String(description).trim();

    await grocery.save();

    res.json(grocery.toJSON());
  }),
);

router.delete(
  "/groceries/:id",
  wrap(async (req, res) => {
    await Grocery.deleteOne({ id: req.params.id });

    res.json({ ok: true });
  }),
);

/* ---------------------------------------------------------
   Settings
--------------------------------------------------------- */

router.put(
  "/settings",
  wrap(async (req, res) => {
    const { currency, theme } = req.body || {};

    const settings = await Settings.findOneAndUpdate(
      { key: "settings" },
      {
        $set: {
          ...(currency ? { currency } : {}),
          ...(theme ? { theme } : {}),
        },
      },
      { new: true, upsert: true },
    );

    res.json({ currency: settings.currency, theme: settings.theme });
  }),
);

/*
  Full export, mainly so there is an easy backup path that does not depend
  on Atlas tooling.
*/

router.get(
  "/export",
  wrap(async (req, res) => {
    const [accounts, categories, transactions, groceries, settings] = await Promise.all([
      Account.find().lean(),
      Category.find().lean(),
      Transaction.find().lean(),
      Grocery.find().lean(),
      Settings.findOne({ key: "settings" }).lean(),
    ]);

    const strip = (docs) => docs.map(({ _id, __v, updatedAt, ...rest }) => rest);

    res.setHeader("Content-Disposition", 'attachment; filename="f-wallet-backup.json"');

    res.json({
      version: 1,
      savedAt: new Date().toISOString(),
      accounts: strip(accounts),
      categories: strip(categories),
      transactions: strip(transactions),
      groceries: strip(groceries),
      settings: settings
        ? { currency: settings.currency, theme: settings.theme }
        : { currency: "CAD", theme: "light" },
    });
  }),
);

module.exports = router;
