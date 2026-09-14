const express = require("express");

const {
  Account,
  Category,
  Transaction,
  Grocery,
  ShoppingItem,
  Settings,
} = require("../models");
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
    const [accounts, categories, transactions, groceries, shopping, settings] =
      await Promise.all([
        Account.find().sort({ order: 1, createdAt: 1 }).lean(),
        Category.find().sort({ order: 1, createdAt: 1 }).lean(),
        Transaction.find().sort({ date: -1 }).lean(),
        Grocery.find().sort({ date: -1 }).lean(),
        ShoppingItem.find().sort({ done: 1, order: 1, createdAt: 1 }).lean(),
        Settings.findOne({ key: "settings" }).lean(),
      ]);

    const strip = (docs) => docs.map(({ _id, __v, ...rest }) => rest);

    res.json({
      accounts: strip(accounts),
      categories: strip(categories),
      transactions: strip(transactions),
      groceries: strip(groceries),
      shopping: strip(shopping),
      settings: settings
        ? { currency: settings.currency, theme: settings.theme }
        : { currency: "CAD", theme: "system" },
    });
  }),
);

/* ---------------------------------------------------------
   Accounts
--------------------------------------------------------- */

router.post(
  "/accounts",
  wrap(async (req, res) => {
    const {
      name,
      type,
      institution,
      lastFour,
      startingBalance,
      creditLimit,
      includeInTotal,
    } = req.body || {};

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
      ...(type === "credit"
        ? { creditLimit: Math.max(0, toNumber(creditLimit)) }
        : {}),
      includeInTotal: includeInTotal !== false,
      // New accounts go to the bottom of the list.
      order: await Account.countDocuments(),
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(account.toJSON());
  }),
);

/* ---------------------------------------------------------
   Reordering

   Declared before the /:id routes on purpose. Express matches in
   registration order, so if PUT /accounts/:id came first it would treat
   "reorder" as an account id and return a 404.
--------------------------------------------------------- */

function reorderHandler(Model, label) {
  return wrap(async (req, res) => {
    const { ids } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest(
        res,
        `Send an array of ${label} ids in the order you want them.`,
      );
    }

    // bulkWrite sends every update in a single round trip, which matters
    // on Lambda where each database call adds latency.
    await Model.bulkWrite(
      ids.map((id, index) => ({
        updateOne: { filter: { id }, update: { $set: { order: index } } },
      })),
    );

    res.json({ ok: true });
  });
}

router.put("/accounts/reorder", reorderHandler(Account, "account"));
router.put("/categories/reorder", reorderHandler(Category, "category"));

router.put(
  "/accounts/:id",
  wrap(async (req, res) => {
    const account = await Account.findOne({ id: req.params.id });

    if (!account) return res.status(404).json({ error: "Account not found." });

    const {
      name,
      type,
      institution,
      lastFour,
      startingBalance,
      creditLimit,
      includeInTotal,
    } = req.body || {};

    if (includeInTotal !== undefined)
      account.includeInTotal = Boolean(includeInTotal);
    if (name !== undefined) account.name = String(name).trim();
    if (type !== undefined) account.type = type;
    if (institution !== undefined)
      account.institution = String(institution).trim();
    if (lastFour !== undefined) account.lastFour = String(lastFour);
    if (startingBalance !== undefined)
      account.startingBalance = toNumber(startingBalance);

    if (account.type === "credit") {
      if (creditLimit !== undefined)
        account.creditLimit = Math.max(0, toNumber(creditLimit));
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
    const {
      name,
      type,
      monthlyBudget,
      hourlyRate,
      overtimeRate,
      entryMode,
      defaultAmount,
    } = req.body || {};

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
      monthlyBudget:
        type === "expense" ? Math.max(0, toNumber(monthlyBudget)) : 0,
      entryMode:
        type === "income" && entryMode === "hourly" ? "hourly" : "fixed",
      defaultAmount:
        type === "income" ? Math.max(0, toNumber(defaultAmount)) : 0,
      hourlyRate: type === "income" ? Math.max(0, toNumber(hourlyRate)) : 0,
      overtimeRate: type === "income" ? Math.max(0, toNumber(overtimeRate)) : 0,
      order: await Category.countDocuments(),
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(category.toJSON());
  }),
);

router.put(
  "/categories/:id",
  wrap(async (req, res) => {
    const category = await Category.findOne({ id: req.params.id });

    if (!category)
      return res.status(404).json({ error: "Category not found." });

    const {
      name,
      type,
      monthlyBudget,
      hourlyRate,
      overtimeRate,
      entryMode,
      defaultAmount,
    } = req.body || {};

    if (name !== undefined) category.name = String(name).trim();
    if (type !== undefined) category.type = type;

    category.monthlyBudget =
      category.type === "expense"
        ? Math.max(0, toNumber(monthlyBudget ?? category.monthlyBudget))
        : 0;

    if (category.type === "income") {
      if (entryMode !== undefined) {
        category.entryMode = entryMode === "hourly" ? "hourly" : "fixed";
      }

      if (defaultAmount !== undefined) {
        category.defaultAmount = Math.max(0, toNumber(defaultAmount));
      }
    } else {
      category.entryMode = "fixed";
      category.defaultAmount = 0;
    }

    category.hourlyRate =
      category.type === "income"
        ? Math.max(0, toNumber(hourlyRate ?? category.hourlyRate))
        : 0;

    category.overtimeRate =
      category.type === "income"
        ? Math.max(0, toNumber(overtimeRate ?? category.overtimeRate))
        : 0;

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

    await Transaction.updateMany(
      { categoryId: id },
      { $set: { categoryId: "" } },
    );

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
    const { item, price, store, date, description, priceType } = req.body || {};

    if (!item || !String(item).trim()) {
      return badRequest(res, "Item name is required.");
    }

    const grocery = await Grocery.create({
      id: generateId("grocery"),
      item: String(item).trim(),
      price: Math.max(0, toNumber(price)),
      priceType: ["offer", "reduced"].includes(priceType)
        ? priceType
        : "normal",
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

    if (!grocery)
      return res.status(404).json({ error: "Price entry not found." });

    // priceType has to be destructured here or the assignment below
    // throws a ReferenceError and the request comes back as a 500.
    const { item, price, store, date, description, priceType } = req.body || {};

    if (item !== undefined) grocery.item = String(item).trim();
    if (price !== undefined) grocery.price = Math.max(0, toNumber(price));
    if (store !== undefined)
      grocery.store = String(store).trim() || "Unknown store";
    if (date !== undefined) grocery.date = date;
    if (description !== undefined)
      grocery.description = String(description).trim();
    if (priceType !== undefined) {
      grocery.priceType = ["offer", "reduced"].includes(priceType)
        ? priceType
        : "normal";
    }

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
   Shopping list
--------------------------------------------------------- */

// Declared before /shopping/:id for the same reason as the reorder
// routes: Express matches in registration order.
router.put("/shopping/reorder", reorderHandler(ShoppingItem, "shopping item"));

/*
  Clearing bought items. A single delete rather than looping from the
  client, which would fire one request per item.
*/

router.delete(
  "/shopping/done",
  wrap(async (req, res) => {
    const result = await ShoppingItem.deleteMany({ done: true });

    res.json({ ok: true, removed: result.deletedCount || 0 });
  }),
);

router.post(
  "/shopping",
  wrap(async (req, res) => {
    const { name, quantity, note } = req.body || {};

    if (!name || !String(name).trim()) {
      return badRequest(res, "Item name is required.");
    }

    const item = await ShoppingItem.create({
      id: generateId("buy"),
      name: String(name).trim(),
      quantity: Math.max(0, toNumber(quantity, 1)) || 1,
      note: note ? String(note).trim() : "",
      done: false,
      order: await ShoppingItem.countDocuments(),
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(item.toJSON());
  }),
);

router.put(
  "/shopping/:id",
  wrap(async (req, res) => {
    const item = await ShoppingItem.findOne({ id: req.params.id });

    if (!item) return res.status(404).json({ error: "Item not found." });

    const { name, quantity, note, done } = req.body || {};

    if (name !== undefined) item.name = String(name).trim();
    if (quantity !== undefined)
      item.quantity = Math.max(0, toNumber(quantity, 1)) || 1;
    if (note !== undefined) item.note = String(note).trim();
    if (done !== undefined) item.done = Boolean(done);

    await item.save();

    res.json(item.toJSON());
  }),
);

router.delete(
  "/shopping/:id",
  wrap(async (req, res) => {
    await ShoppingItem.deleteOne({ id: req.params.id });

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

    if (theme && !["light", "dark", "system"].includes(theme)) {
      return badRequest(res, "Theme must be light, dark or system.");
    }

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
    const [accounts, categories, transactions, groceries, shopping, settings] =
      await Promise.all([
        Account.find().sort({ order: 1 }).lean(),
        Category.find().sort({ order: 1 }).lean(),
        Transaction.find().lean(),
        Grocery.find().lean(),
        ShoppingItem.find().sort({ order: 1 }).lean(),
        Settings.findOne({ key: "settings" }).lean(),
      ]);

    const strip = (docs) => docs.map(({ _id, __v, ...rest }) => rest);

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="f-wallet-backup.json"',
    );

    res.json({
      version: 1,
      savedAt: new Date().toISOString(),
      accounts: strip(accounts),
      categories: strip(categories),
      transactions: strip(transactions),
      groceries: strip(groceries),
      shopping: strip(shopping),
      settings: settings
        ? { currency: settings.currency, theme: settings.theme }
        : { currency: "CAD", theme: "system" },
    });
  }),
);

module.exports = router;
