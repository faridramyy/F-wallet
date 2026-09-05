const express = require("express");

const { Account, Category, Transaction } = require("../models");
const {
  generateId,
  wrap,
  badRequest,
  toNumber,
  isValidDate,
  today,
  normalizePay,
  calculatePayTotal,
} = require("./helpers");

const router = express.Router();

async function resolveAccount(value) {
  if (!value) return null;

  const byId = await Account.findOne({ id: value }).lean();

  if (byId) return byId;

  // Automation sends names, not ids. Case-insensitive exact match only,
  // because a fuzzy match that silently picks the wrong account is worse
  // than an error.

  return Account.findOne({ name: new RegExp(`^${escapeRegex(value)}$`, "i") }).lean();
}

async function resolveCategory(value, type) {
  if (!value) return null;

  const byId = await Category.findOne({ id: value }).lean();

  if (byId) return byId;

  return Category.findOne({
    name: new RegExp(`^${escapeRegex(value)}$`, "i"),
    ...(type ? { type } : {}),
  }).lean();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ---------------------------------------------------------
   List with filters. The client pulls everything through
   /state, but this exists for scripts and for the day the
   dataset outgrows a single payload.
--------------------------------------------------------- */

router.get(
  "/transactions",
  wrap(async (req, res) => {
    const { type, accountId, categoryId, month, from, to, limit } = req.query;

    const query = {};

    if (type) query.type = type;
    if (accountId) query.accountId = accountId;
    if (categoryId) query.categoryId = categoryId;

    if (month) {
      query.date = { $regex: `^${escapeRegex(month)}` };
    } else if (from || to) {
      query.date = {};

      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(Math.min(toNumber(limit, 500), 2000))
      .lean();

    res.json(transactions.map(({ _id, __v, updatedAt, ...rest }) => rest));
  }),
);

/* ---------------------------------------------------------
   Create.

   Accepts ids or names for account and category so a phone
   shortcut can post {"amount": 12.5, "account": "Visa",
   "category": "Groceries"} without knowing internal ids.
--------------------------------------------------------- */

router.post(
  "/transactions",
  wrap(async (req, res) => {
    const body = req.body || {};

    const type = body.type || "expense";

    if (!["income", "expense", "transfer"].includes(type)) {
      return badRequest(res, "Type must be income, expense or transfer.");
    }

    const date = body.date || today();

    if (!isValidDate(date)) {
      return badRequest(res, "Date must be in YYYY-MM-DD format.");
    }

    if (type === "transfer") {
      const fromAccount = await resolveAccount(body.fromAccount || body.fromAccountId);
      const toAccount = await resolveAccount(body.toAccount || body.toAccountId);

      if (!fromAccount) return badRequest(res, "Source account not found.");
      if (!toAccount) return badRequest(res, "Destination account not found.");

      if (fromAccount.id === toAccount.id) {
        return badRequest(res, "Source and destination must be different accounts.");
      }

      const amount = toNumber(body.amount);

      if (!(amount > 0)) return badRequest(res, "Amount must be greater than zero.");

      const transfer = await Transaction.create({
        id: generateId("transfer"),
        type: "transfer",
        amount,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        date,
        notes: body.notes ? String(body.notes).trim() : "",
        createdAt: new Date().toISOString(),
        source: req.authMethod === "apikey" ? "api" : "app",
      });

      return res.status(201).json(transfer.toJSON());
    }

    const account = await resolveAccount(body.account || body.accountId);

    if (!account) {
      return badRequest(res, "Account not found. Send an account id or an exact account name.");
    }

    const category = await resolveCategory(body.category || body.categoryId, type);

    if (!category) {
      return badRequest(res, "Category not found. Send a category id or an exact category name.");
    }

    if (category.type !== type) {
      return badRequest(res, `Category "${category.name}" is an ${category.type} category, not ${type}.`);
    }

    const pay = type === "income" ? normalizePay(body.pay) : null;

    const amount = pay ? calculatePayTotal(pay) : toNumber(body.amount);

    if (!(amount > 0)) {
      return badRequest(res, "Amount must be greater than zero.");
    }

    const transaction = await Transaction.create({
      id: generateId("txn"),
      type,
      amount,
      accountId: account.id,
      categoryId: category.id,
      date,
      notes: body.notes ? String(body.notes).trim() : "",
      ...(pay ? { pay } : {}),
      createdAt: new Date().toISOString(),
      source: req.authMethod === "apikey" ? "api" : "app",
    });

    res.status(201).json(transaction.toJSON());
  }),
);

router.put(
  "/transactions/:id",
  wrap(async (req, res) => {
    const transaction = await Transaction.findOne({ id: req.params.id });

    if (!transaction) return res.status(404).json({ error: "Transaction not found." });

    const body = req.body || {};

    if (transaction.type === "transfer") {
      if (body.amount !== undefined) transaction.amount = toNumber(body.amount);
      if (body.date !== undefined) transaction.date = body.date;
      if (body.notes !== undefined) transaction.notes = String(body.notes).trim();

      if (body.fromAccountId) transaction.fromAccountId = body.fromAccountId;
      if (body.toAccountId) transaction.toAccountId = body.toAccountId;

      await transaction.save();

      return res.json(transaction.toJSON());
    }

    const type = body.type || transaction.type;

    if (body.accountId) {
      const account = await Account.findOne({ id: body.accountId }).lean();

      if (!account) return badRequest(res, "Account not found.");

      transaction.accountId = account.id;
    }

    if (body.categoryId) {
      const category = await Category.findOne({ id: body.categoryId }).lean();

      if (!category) return badRequest(res, "Category not found.");

      if (category.type !== type) {
        return badRequest(res, "The selected category does not match the transaction type.");
      }

      transaction.categoryId = category.id;
    }

    const pay = type === "income" ? normalizePay(body.pay) : null;

    transaction.type = type;
    transaction.pay = pay || undefined;

    const amount = pay ? calculatePayTotal(pay) : toNumber(body.amount, transaction.amount);

    if (!(amount > 0)) return badRequest(res, "Amount must be greater than zero.");

    transaction.amount = amount;

    if (body.date !== undefined) transaction.date = body.date;
    if (body.notes !== undefined) transaction.notes = String(body.notes).trim();

    await transaction.save();

    res.json(transaction.toJSON());
  }),
);

router.delete(
  "/transactions/:id",
  wrap(async (req, res) => {
    await Transaction.deleteOne({ id: req.params.id });

    res.json({ ok: true });
  }),
);

module.exports = router;
