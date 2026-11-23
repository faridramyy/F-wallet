import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { useNotifications } from "../providers/useNotifications";
import { centsToInput, dollarsToCents } from "../../lib/formatters";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

const blankForm = (accounts) => ({
  transaction_type: "expense",
  amount: "",
  account_id: accounts[0]?.account_id ?? "",
  category_id: "",
  transaction_date: today(),
  description: "",
  merchant: "",
  notes: "",
});

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSave,
  transaction = null,
  accounts = [],
  categories = [],
}) {
  const { toast } = useNotifications();

  const [form, setForm] = useState(() => blankForm(accounts));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(transaction);

  useEffect(() => {
    if (!open) return;

    setForm(
      transaction
        ? {
            transaction_type: transaction.transaction_type,
            amount: centsToInput(transaction.amount_cents),
            account_id: transaction.account_id ?? "",
            category_id: transaction.category_id ?? "",
            transaction_date: transaction.transaction_date,
            description: transaction.description ?? "",
            merchant: transaction.merchant ?? "",
            notes: transaction.notes ?? "",
          }
        : blankForm(accounts),
    );
    setError("");
    // `accounts` is intentionally left out: it is only used to pick the
    // default account when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction]);

  if (!open) return null;

  // Income transactions can only use income categories, and vice versa.
  const categoryOptions = categories.filter(
    (category) => category.category_type === form.transaction_type,
  );

  // If the transaction's category was archived later, it is no longer in the
  // active list. Keep it visible so the select does not silently go blank.
  const hasCurrentCategory =
    !form.category_id ||
    categoryOptions.some(
      (category) => category.category_id === form.category_id,
    );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function handleClose() {
    onOpenChange(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const amountCents = dollarsToCents(form.amount);

    if (amountCents === null || amountCents <= 0) {
      setError("Enter a valid amount, for example 12.50.");
      return;
    }

    if (!form.account_id) {
      setError("Choose an account.");
      return;
    }

    const payload = {
      transaction_type: form.transaction_type,
      account_id: form.account_id,
      category_id: form.category_id || null,
      amount_cents: amountCents,
      transaction_date: form.transaction_date,
      description: form.description.trim() || null,
      merchant: form.merchant.trim() || null,
      notes: form.notes.trim() || null,
    };

    // When editing, send only what changed (this is what PATCH is for). It
    // also means an untouched archived category is never re-validated.
    let body = payload;

    if (isEditing) {
      const original = {
        transaction_type: transaction.transaction_type,
        account_id: transaction.account_id,
        category_id: transaction.category_id ?? null,
        amount_cents: transaction.amount_cents,
        transaction_date: transaction.transaction_date,
        description: transaction.description ?? null,
        merchant: transaction.merchant ?? null,
        notes: transaction.notes ?? null,
      };

      body = Object.fromEntries(
        Object.entries(payload).filter(
          ([key, value]) => value !== original[key],
        ),
      );

      if (Object.keys(body).length === 0) {
        handleClose();
        return;
      }
    }

    setSaving(true);
    setError("");

    try {
      await onSave(body);
      toast.success(isEditing ? "Transaction updated." : "Transaction added.");
      handleClose();
    } catch (err) {
      setError(err.message || "Unable to save transaction.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-5">
          <div>
            <h2 className="text-lg font-semibold">
              {isEditing ? "Edit transaction" : "Add transaction"}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {isEditing
                ? "Update your transaction information."
                : "Record income or an expense in your F-Wallet."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close dialog"
          >
            <X size={19} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {accounts.length === 0 && (
            <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
              You need an account before you can add a transaction. Create one
              on the Accounts page first.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="transaction_type" className={labelClass}>
                Transaction type
              </label>
              <select
                id="transaction_type"
                className={inputClass}
                value={form.transaction_type}
                onChange={(event) => {
                  updateField("transaction_type", event.target.value);
                  // The old category belongs to the other type.
                  updateField("category_id", "");
                }}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div>
              <label htmlFor="amount" className={labelClass}>
                Amount
              </label>
              <input
                id="amount"
                required
                inputMode="decimal"
                className={inputClass}
                value={form.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="account_id" className={labelClass}>
                Account
              </label>
              <select
                id="account_id"
                className={inputClass}
                value={form.account_id}
                onChange={(event) =>
                  updateField("account_id", event.target.value)
                }
              >
                {accounts.map((account) => (
                  <option key={account.account_id} value={account.account_id}>
                    {account.account_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="category_id" className={labelClass}>
                Category
              </label>
              <select
                id="category_id"
                className={inputClass}
                value={form.category_id}
                onChange={(event) =>
                  updateField("category_id", event.target.value)
                }
              >
                <option value="">Uncategorized</option>

                {!hasCurrentCategory && (
                  <option value={form.category_id}>
                    {transaction?.category_name ?? "Archived category"}
                  </option>
                )}

                {categoryOptions.map((category) => (
                  <option
                    key={category.category_id}
                    value={category.category_id}
                  >
                    {category.category_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="transaction_date" className={labelClass}>
                Transaction date
              </label>
              <input
                id="transaction_date"
                required
                type="date"
                className={inputClass}
                value={form.transaction_date}
                onChange={(event) =>
                  updateField("transaction_date", event.target.value)
                }
              />
            </div>

            <div>
              <label htmlFor="merchant" className={labelClass}>
                Merchant
              </label>
              <input
                id="merchant"
                maxLength={150}
                className={inputClass}
                value={form.merchant}
                onChange={(event) =>
                  updateField("merchant", event.target.value)
                }
                placeholder="e.g. Metro"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <input
              id="description"
              maxLength={255}
              className={inputClass}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="e.g. Grocery shopping"
            />
          </div>

          <div>
            <label htmlFor="notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="notes"
              rows={2}
              className={inputClass}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Optional notes"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || accounts.length === 0}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Add transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
