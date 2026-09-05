const mongoose = require("mongoose");

/*
  The original app stored string ids like "acc_lk3j2", and every record
  referenced those. Keeping that id scheme means the existing data.json
  imports cleanly and nothing has to be remapped.

  toJSON is configured to drop _id and __v so the API returns exactly the
  object shape the frontend already expects.
*/

const baseOptions = {
  timestamps: true,
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
    id: { type: String, required: true, unique: true, index: true },
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
    createdAt: { type: String },
  },
  baseOptions,
);

const categorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ["expense", "income"] },
    monthlyBudget: { type: Number, default: 0 },
    expectedIncome: { type: Number, default: 0 },
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
    id: { type: String, required: true, unique: true, index: true },
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
    pay: { type: paySchema, default: undefined },

    // transfer
    fromAccountId: { type: String },
    toAccountId: { type: String },

    createdAt: { type: String },
    source: { type: String, default: "app" },
  },
  baseOptions,
);

const grocerySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    item: { type: String, required: true, trim: true },
    price: { type: Number, default: 0, min: 0 },
    store: { type: String, default: "Unknown store" },
    date: { type: String, required: true },
    description: { type: String, default: "" },
    createdAt: { type: String },
  },
  baseOptions,
);

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "settings", unique: true },
    currency: { type: String, default: "CAD" },
    theme: { type: String, default: "light" },
  },
  baseOptions,
);

const Account = mongoose.models.Account || mongoose.model("Account", accountSchema);
const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
const Grocery = mongoose.models.Grocery || mongoose.model("Grocery", grocerySchema);
const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

module.exports = { Account, Category, Transaction, Grocery, Settings };
