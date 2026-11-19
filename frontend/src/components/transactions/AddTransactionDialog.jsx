import { useEffect, useState } from "react";
import { Landmark, ShoppingBag, X } from "lucide-react";

const blankForm = () => ({
  name: "",
  amount: "",
  type: "expense",
  category: "Groceries",
  account: "Everyday Checking",
  date: new Date().toISOString().slice(0, 10),
});

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSave,
  transaction = null,
}) {
  const [form, setForm] = useState(blankForm);

  const isEditing = Boolean(transaction);
  const isIncome = form.type === "income";

  useEffect(() => {
    if (!open) return;

    if (transaction) {
      setForm({
        name: transaction.name || "",
        amount: String(Math.abs(transaction.amount || 0)),
        type:
          transaction.type || (transaction.amount > 0 ? "income" : "expense"),
        category: transaction.category || "Groceries",
        account: transaction.account || "Everyday Checking",
        date: transaction.date || new Date().toISOString().slice(0, 10),
      });
    } else {
      setForm(blankForm());
    }
  }, [open, transaction]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    onSave({
      ...(transaction || {}),
      id: transaction?.id ?? Date.now(),
      name: form.name.trim(),
      category: isIncome ? "Income" : form.category,
      account: form.account,
      date: form.date,
      amount: isIncome ? amount : -amount,
      type: form.type,
      icon: isIncome ? Landmark : ShoppingBag,
    });

    handleClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-card text-card-foreground shadow-xl">
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
          <div>
            <label className={labelClass}>Description</label>
            <input
              required
              maxLength={150}
              className={inputClass}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="e.g. Grocery shopping"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Transaction type</label>
              <select
                className={inputClass}
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Amount (CAD)</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                className={inputClass}
                value={form.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {!isIncome && (
            <div>
              <label className={labelClass}>Category</label>
              <select
                className={inputClass}
                value={form.category}
                onChange={(event) =>
                  updateField("category", event.target.value)
                }
              >
                {[
                  "Groceries",
                  "Housing",
                  "Transportation",
                  "Dining",
                  "Shopping",
                  "Utilities",
                  "Entertainment",
                  "Other",
                ].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>Account</label>
            <select
              className={inputClass}
              value={form.account}
              onChange={(event) => updateField("account", event.target.value)}
            >
              <option value="Everyday Checking">Everyday Checking</option>
              <option value="High Interest Savings">
                High Interest Savings
              </option>
              <option value="Visa Credit Card">Visa Credit Card</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Transaction date</label>
            <input
              required
              type="date"
              className={inputClass}
              value={form.date}
              onChange={(event) => updateField("date", event.target.value)}
            />
          </div>

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
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {isEditing ? "Save changes" : "Add transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
