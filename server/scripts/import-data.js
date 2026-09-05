/*
  One time migration from the old app.

  Export data.json from the original F-Wallet (Settings, or just grab the
  file you were syncing to GitHub), drop it next to this script, then run:

    node scripts/import-data.js ./data.json

  Existing records with the same id are skipped, so running it twice is
  safe.
*/

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const { Account, Category, Transaction, Grocery, Settings } = require("../src/models");

async function main() {
  const file = process.argv[2] || path.join(__dirname, "data.json");

  if (!fs.existsSync(file)) {
    console.error(`No file at ${file}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(file, "utf8"));

  await mongoose.connect(process.env.MONGODB_URI);

  const importCollection = async (Model, records, label) => {
    if (!Array.isArray(records) || records.length === 0) {
      console.log(`${label}: nothing to import`);
      return;
    }

    let inserted = 0;
    let skipped = 0;

    for (const record of records) {
      const exists = await Model.exists({ id: record.id });

      if (exists) {
        skipped += 1;
        continue;
      }

      await Model.create(record);
      inserted += 1;
    }

    console.log(`${label}: ${inserted} imported, ${skipped} already present`);
  };

  await importCollection(Account, raw.accounts, "Accounts");
  await importCollection(Category, raw.categories, "Categories");
  await importCollection(Transaction, raw.transactions, "Transactions");
  await importCollection(Grocery, raw.groceries, "Groceries");

  if (raw.settings) {
    await Settings.findOneAndUpdate(
      { key: "settings" },
      { $set: { currency: raw.settings.currency || "CAD", theme: raw.settings.theme || "light" } },
      { upsert: true },
    );

    console.log("Settings: imported");
  }

  await mongoose.disconnect();

  console.log("\nDone. Open the app and check your balances match the old one.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
