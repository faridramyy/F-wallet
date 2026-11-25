// Builds the prompt the user pastes into Siri / Apple Intelligence (or any AI
// assistant) to have it build an iPhone Shortcut that records every Apple Pay
// payment in F-Wallet through the API with a personal token.

import { getAccountType } from "./accounts";
import { buildCategoryTree } from "./categories";

function accountLines(accounts) {
  if (accounts.length === 0) return ["(no accounts yet)"];

  return accounts.map((account) => {
    const details = [
      getAccountType(account.account_type).label,
      account.institution_name,
      account.card_last_four && `card ending in ${account.card_last_four}`,
      account.currency,
    ].filter(Boolean);

    return `- "${account.account_name}" (${details.join(", ")}): ${account.account_id}`;
  });
}

// "Food" and "Food > Groceries" lines, in the user's order.
function categoryLines(categories, type) {
  const lines = [];

  const add = (nodes, path) => {
    for (const { category, children } of nodes) {
      const name = [...path, category.category_name].join(" > ");
      lines.push(`- "${name}": ${category.category_id}`);
      add(children, [...path, category.category_name]);
    }
  };

  add(buildCategoryTree(categories, type), []);
  return lines.length > 0 ? lines : ["(none)"];
}

const nameOf = (list, idKey, nameKey, id) =>
  list.find((item) => item[idKey] === id)?.[nameKey];

export function buildShortcutPrompt({
  url,
  token,
  accounts,
  categories,
  defaultAccountId,
  defaultCategoryId,
}) {
  const defaultAccount = nameOf(
    accounts,
    "account_id",
    "account_name",
    defaultAccountId,
  );
  const defaultCategory = nameOf(
    categories,
    "category_id",
    "category_name",
    defaultCategoryId,
  );

  return `Build me an iPhone Shortcut, set up as a personal automation, that records every Apple Pay payment in my budgeting app "F-Wallet" by sending it to the app's API. Give me exact step-by-step instructions for the Shortcuts app (automation trigger, every action in order, and every field value), and say which values to copy from below.

## 1. Trigger
- Shortcuts app > Automation > New Automation > "Transaction" (the Wallet / Apple Pay trigger).
- Cards: all of my cards. Categories: all.
- Set it to "Run Immediately" (no confirmation) and turn on "Notify When Run".
- The automation's Shortcut Input gives: Amount, Merchant, Name, and Card or Pass. Use those.

## 2. Values the shortcut must build
- account_id: pick the F-Wallet account that matches the card used. Make a Dictionary that maps the "Card or Pass" name (as it appears in Wallet) to an account ID from the list below, matching on the card name, bank and last four digits. Look up the card used; if it is not in the dictionary, use the default account${defaultAccount ? ` "${defaultAccount}" (${defaultAccountId})` : ""}.
- category_id: ${
    defaultCategory
      ? `use "${defaultCategory}" (${defaultCategoryId}) unless a merchant rule below matches.`
      : "optional. Leave it out unless a merchant rule below matches."
  } Add an "If Merchant contains ..." rule for common merchants (e.g. grocery stores, gas stations, restaurants, transit) that sets the matching expense category ID from the list below. Only ever use EXPENSE category IDs here.
- amount_cents: the payment amount as a whole number of cents. Amount is text like "$12.99", "CA$12.99" or "12,99 $": remove everything except digits and the decimal separator, treat a comma as the decimal point, multiply by 100 and round to a whole number. It must be greater than 0; if it is not, stop and show a notification.
- transaction_date: Current Date formatted with the custom format "yyyy-MM-dd" (local date).
- merchant: the Merchant from the trigger, at most 150 characters. If it is empty use Name.
- Idempotency-Key: make the text "applepay|" + Current Date formatted "yyyy-MM-dd'T'HH:mm:ss" + "|" + amount_cents + "|" + merchant, then use "Generate Hash" (SHA256) on it and use the hash. This stops a re-run of the same payment from being recorded twice.

## 3. Send it
Use "Get Contents of URL":
- URL: ${url}
- Method: POST
- Headers:
  - Authorization: Bearer ${token}
  - Content-Type: application/json
  - Idempotency-Key: (the hash from above)
- Request Body: JSON with exactly these fields (types matter):
  - transaction_type (Text): "expense"
  - account_id (Text): the account ID
  - category_id (Text): the category ID; leave the field out entirely when there is none
  - amount_cents (Number): e.g. 1299 for $12.99
  - transaction_date (Text): e.g. "2026-11-25"
  - merchant (Text)
  - notes (Text): "Added by the Apple Pay Shortcut"
  No other fields are allowed; extra fields are rejected.

Example body:
{
  "transaction_type": "expense",
  "account_id": "${defaultAccountId || accounts[0]?.account_id || "<account ID>"}",
  "amount_cents": 1299,
  "transaction_date": "2026-11-25",
  "merchant": "Coffee shop",
  "notes": "Added by the Apple Pay Shortcut"
}

## 4. Handle the response
- Success: HTTP 201 with {"success": true, "data": {"transaction": {...}}}. Show a notification like "F-Wallet: $12.99 at Coffee shop added".
- Failure: {"success": false, "message": "...", "code": "..."}. Show a notification "F-Wallet: " + message. Common cases:
  - 401 token_invalid / token_revoked / token_expired: the token no longer works; I need a new one.
  - 400: a field is missing or has the wrong type.
  - 404 "Account not found or archived": the account ID is wrong.
  - 409 idempotency_in_progress / 422 idempotency_key_reused: a duplicate; safe to ignore.
- A response with the header "Idempotent-Replayed: true" means this payment was already recorded; do not treat it as an error.

## My F-Wallet accounts (name, details: account_id)
${accountLines(accounts).join("\n")}

## Expense categories (use these for Apple Pay purchases; "Parent > Child" is a sub-category)
${categoryLines(categories, "expense").join("\n")}

## Income categories (for income only, never for Apple Pay purchases)
${categoryLines(categories, "income").join("\n")}

## Rules
- The token can only add transactions. It cannot read accounts or categories, so every ID must be typed into the shortcut from the lists above.
- Keep the token only inside the "Get Contents of URL" header. Don't log it or show it in notifications.
`;
}
