import { useEffect, useState } from "react";
import { X } from "lucide-react";

const createInitialForm = (currency) => ({
  account_name: "",
  account_type: "checking",
  institution_name: "",
  currency,
  opening_balance: "0.00",
  credit_limit: "",
  card_last_four: "",
  statement_closing_day: "",
  payment_due_day: "",
  include_in_net_worth: true,
  notes: "",
});

function centsToInput(value) {
  try {
    const cents = BigInt(value ?? 0);
    const sign = cents < 0 ? "-" : "";
    const absolute = cents < 0 ? -cents : cents;

    const dollars = absolute / 100n;
    const remainder = String(absolute % 100n).padStart(2, "0");

    return `${sign}${dollars}.${remainder}`;
  } catch {
    return "0.00";
  }
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

export function AccountDialog({
  open,
  onClose,
  onSave,
  currency = "CAD",
  account = null,
}) {
  const [form, setForm] = useState(() => createInitialForm(currency));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (account) {
      setForm({
        account_name: account.account_name || "",
        account_type: account.account_type || "checking",
        institution_name: account.institution_name || "",
        currency: account.currency || currency,
        opening_balance: centsToInput(account.opening_balance_cents),
        credit_limit:
          account.credit_limit_cents == null
            ? ""
            : centsToInput(account.credit_limit_cents),
        card_last_four: account.card_last_four || "",
        statement_closing_day:
          account.statement_closing_day == null
            ? ""
            : String(account.statement_closing_day),
        payment_due_day:
          account.payment_due_day == null
            ? ""
            : String(account.payment_due_day),
        include_in_net_worth: account.include_in_net_worth ?? true,
        notes: account.notes || "",
      });
    } else {
      setForm(createInitialForm(currency));
    }

    setSaveError("");
  }, [open, account, currency]);

  if (!open) return null;

  const isCreditCard = form.account_type === "credit_card";
  const isEditing = Boolean(account);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaveError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    const openingBalance = Number(form.opening_balance || 0);
    const creditLimit = Number(form.credit_limit);

    const openingBalanceCents = Math.round(openingBalance * 100);
    const creditLimitCents = Math.round(creditLimit * 100);

    if (
      !Number.isFinite(openingBalance) ||
      !Number.isSafeInteger(openingBalanceCents)
    ) {
      setSaveError("Please enter a valid opening balance.");
      return;
    }

    if (
      isCreditCard &&
      form.credit_limit !== "" &&
      (!Number.isFinite(creditLimit) ||
        creditLimit < 0 ||
        !Number.isSafeInteger(creditLimitCents))
    ) {
      setSaveError("Please enter a valid credit limit.");
      return;
    }

    if (!form.account_name.trim()) {
      setSaveError("Please enter an account name.");
      return;
    }

    const accountData = {
      account_name: form.account_name.trim(),
      account_type: form.account_type,
      institution_name: form.institution_name.trim() || null,
      currency: form.currency,
      opening_balance_cents: openingBalanceCents,
      credit_limit_cents:
        isCreditCard && form.credit_limit !== "" ? creditLimitCents : null,
      card_last_four: isCreditCard ? form.card_last_four.trim() || null : null,
      statement_closing_day:
        isCreditCard && form.statement_closing_day
          ? Number(form.statement_closing_day)
          : null,
      payment_due_day:
        isCreditCard && form.payment_due_day
          ? Number(form.payment_due_day)
          : null,
      include_in_net_worth: form.include_in_net_worth,
      notes: form.notes.trim() || null,
    };

    try {
      setSaving(true);
      setSaveError("");

      await onSave(accountData);

      setForm(createInitialForm(currency));
      onClose();
    } catch (error) {
      setSaveError(error.message || "Unable to save this account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card text-card-foreground shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {isEditing ? "Edit account" : "Add account"}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {isEditing
                ? "Update your account information."
                : "Add a bank account, savings account, cash account, or credit card."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 p-6">
            <div>
              <label className={labelClass}>Account name</label>
              <input
                required
                autoFocus
                maxLength={100}
                value={form.account_name}
                onChange={(event) =>
                  updateField("account_name", event.target.value)
                }
                placeholder="e.g. Everyday Checking"
                className={inputClass}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Account type</label>
                <select
                  value={form.account_type}
                  onChange={(event) =>
                    updateField("account_type", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit card</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Currency</label>
                <select
                  value={form.currency}
                  onChange={(event) =>
                    updateField("currency", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="CAD">CAD — Canadian Dollar</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Financial institution</label>
              <input
                maxLength={100}
                value={form.institution_name}
                onChange={(event) =>
                  updateField("institution_name", event.target.value)
                }
                placeholder="e.g. TD Canada Trust"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Opening balance</label>
              <input
                type="number"
                step="0.01"
                value={form.opening_balance}
                onChange={(event) =>
                  updateField("opening_balance", event.target.value)
                }
                placeholder="0.00"
                className={inputClass}
              />

              <p className="mt-1.5 text-xs text-muted-foreground">
                The balance of this account when you start tracking it. This is
                not its live current balance.
              </p>
            </div>

            {isCreditCard && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
                <div>
                  <p className="text-sm font-semibold">Credit card details</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add the card details used to track its credit limit and
                    billing cycle.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Credit limit</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.credit_limit}
                      onChange={(event) =>
                        updateField("credit_limit", event.target.value)
                      }
                      placeholder="15000.00"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Last four digits</label>
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      pattern="[0-9]{4}"
                      value={form.card_last_four}
                      onChange={(event) =>
                        updateField(
                          "card_last_four",
                          event.target.value.replace(/\D/g, "").slice(0, 4),
                        )
                      }
                      placeholder="1234"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Statement closing day</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.statement_closing_day}
                      onChange={(event) =>
                        updateField("statement_closing_day", event.target.value)
                      }
                      placeholder="18"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Payment due day</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.payment_due_day}
                      onChange={(event) =>
                        updateField("payment_due_day", event.target.value)
                      }
                      placeholder="9"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                rows={3}
                maxLength={2000}
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Add any additional details..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.include_in_net_worth}
                onChange={(event) =>
                  updateField("include_in_net_worth", event.target.checked)
                }
                className="mt-0.5 size-4 accent-primary"
              />

              <span>
                <span className="block text-sm font-medium">
                  Include in net worth
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Include this account when calculating your total net worth.
                </span>
              </span>
            </label>

            {saveError && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {saveError}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!form.account_name.trim() || saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Add account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
