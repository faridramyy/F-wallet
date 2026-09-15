const mongoose = require("mongoose");

/*
  The original app stored string ids like "acc_lk3j2", and every record
  referenced those. Keeping that id scheme means the existing data.json
  imports cleanly and nothing has to be remapped.

  toJSON is configured to drop _id and __v so the API returns exactly the
  object shape the frontend already expects.
*/

const baseOptions = {
  // updatedAt only. createdAt is set by the routes as an ISO string and
  // declared on each schema, so letting Mongoose also manage it would
  // mean two systems writing one field.
  timestamps: { createdAt: false, updatedAt: true },
  toJSON: {
    virtuals: false,
    versionKey: false,
    transform(doc, ret) {
      delete ret._id;
      delete ret.updatedAt;

      return ret;
    },
  },
};

const accountSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["chequing", "savings", "cash", "credit"],
      default: "chequing",
    },
    institution: { type: String, default: "" },
    lastFour: { type: String, default: "" },
    startingBalance: { type: Number, default: 0 },
    creditLimit: { type: Number },
    // Position in the list. Everything reads accounts in this order, so
    // reordering here also reorders every dropdown in the app.
    order: { type: Number, default: 0 },
    // Lets you keep an account visible but out of the headline total,
    // for savings or investments you would rather not count as spendable.
    includeInTotal: { type: Boolean, default: true },
    createdAt: { type: String },
  },
  baseOptions,
);

const categorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ["expense", "income"] },
    monthlyBudget: { type: Number, default: 0 },

    /*
      How income in this category is usually entered. A fixed category
      (bonuses, gifts, refunds) opens the transaction form with a single
      amount field; an hourly one opens the hours calculator.

      This is only a default for the form. Any individual transaction can
      still be entered the other way.
    */
    entryMode: { type: String, enum: ["hourly", "fixed"], default: "fixed" },

    // Optional prefill for fixed categories, when the amount is usually
    // the same. Zero means no prefill.
    defaultAmount: { type: Number, default: 0 },

    // Income categories carry the pay rates for that job, so the
    // transaction form can fill them in for you.
    hourlyRate: { type: Number, default: 0 },
    overtimeRate: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    createdAt: { type: String },
  },
  baseOptions,
);

const paySchema = new mongoose.Schema(
  {
    hours: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimeMultiplier: { type: Number, default: 1.5 },
  },
  { _id: false },
);

const transactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    type: {
      type: String,
      required: true,
      enum: ["income", "expense", "transfer"],
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true, index: true },
    notes: { type: String, default: "" },

    // income and expense
    accountId: { type: String },
    categoryId: { type: String },

    /*
      How the amount was arrived at. "fixed" means it was typed straight
      in; "hourly" means it was computed from the pay fields below.

      amount is always the source of truth either way, so anything that
      reads a transaction can ignore this entirely. It exists so the edit
      form can reopen in the mode the record was created with.
    */
    entryMode: { type: String, enum: ["hourly", "fixed"], default: "fixed" },

    pay: { type: paySchema, default: undefined },

    // transfer
    fromAccountId: { type: String },
    toAccountId: { type: String },

    source: { type: String, default: "app" },
    createdAt: { type: String },
  },
  baseOptions,
);

const grocerySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    item: { type: String, required: true, trim: true },
    price: { type: Number, default: 0, min: 0 },

    /*
      Whether this was the shelf price or a temporary one.

      "offer"   a promotion or sale
      "reduced" marked down, usually near its date
      "normal"  the regular price

      It matters for the store comparison: a clearance price tells you
      nothing about where an item is usually cheapest.
    */
    priceType: {
      type: String,
      enum: ["normal", "offer", "reduced"],
      default: "normal",
    },

    store: { type: String, default: "Unknown store" },
    date: { type: String, required: true },
    description: { type: String, default: "" },
    createdAt: { type: String },
  },
  baseOptions,
);

/*
  The shopping list. Deliberately separate from groceries: a grocery
  record is something you observed a price for, a shopping item is
  something you intend to buy. They happen to share a name field and
  nothing else.
*/

const shoppingItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },

    // How many units. Used to work out a trip total.
    quantity: { type: Number, default: 1, min: 0 },

    note: { type: String, default: "" },
    done: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    createdAt: { type: String },
  },
  baseOptions,
);

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "settings", unique: true },
    currency: { type: String, default: "CAD" },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
  },
  baseOptions,
);

const Account =
  mongoose.models.Account || mongoose.model("Account", accountSchema);
const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);
const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);
const Grocery =
  mongoose.models.Grocery || mongoose.model("Grocery", grocerySchema);
const ShoppingItem =
  mongoose.models.ShoppingItem ||
  mongoose.model("ShoppingItem", shoppingItemSchema);
const Settings =
  mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

module.exports = {
  Account,
  Category,
  Transaction,
  Grocery,
  ShoppingItem,
  Settings,
};
