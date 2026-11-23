import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

import { useNotifications } from "../providers/useNotifications";

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
    const absolute = cents < 0n ? -cents : cents;

    const dollars = absolute / 100n;
    const remainder = String(absolute % 100n).padStart(2, "0");

    return `${sign}${dollars}.${remainder}`;
  } catch {
    return "0.00";
  }
}

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground";

function Field({ id, label, hint, children }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function getAccountForm(account, currency) {
  return account
    ? {
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
      }
    : createInitialForm(currency);
}

export function AccountDialog({
  open,
  onClose,
  onSave,
  currency = "CAD",
  account = null,
}) {
  const { toast, confirm } = useNotifications();

  const [form, setForm] = useState(() => createInitialForm(currency));

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm(getAccountForm(account, currency));
  }, [open, account, currency]);

  if (!open) return null;

  const isCreditCard = form.account_type === "credit_card";
  const isEditing = Boolean(account);

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleClose = async () => {
    if (saving) return;

    const initialForm = getAccountForm(account, currency);

    const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);

    if (!hasChanges) {
      onClose();
      return;
    }

    const confirmed = await confirm({
      title: "Discard changes?",
      description: "You have unsaved changes. Are you sure you want to close?",
      confirmText: "Discard changes",
      cancelText: "Keep editing",
      variant: "destructive",
    });

    if (confirmed) {
      onClose();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!form.account_name.trim()) {
      toast.error("Enter an account name.");
      return;
    }

    const openingBalance = Number(form.opening_balance || 0);
    const openingBalanceCents = Math.round(openingBalance * 100);

    if (
      !Number.isFinite(openingBalance) ||
      !Number.isSafeInteger(openingBalanceCents)
    ) {
      toast.error("Enter a valid opening balance.");
      return;
    }

    const creditLimit = Number(form.credit_limit);
    const creditLimitCents = Math.round(creditLimit * 100);

    if (
      isCreditCard &&
      form.credit_limit !== "" &&
      (!Number.isFinite(creditLimit) ||
        creditLimit < 0 ||
        !Number.isSafeInteger(creditLimitCents))
    ) {
      toast.error("Enter a valid credit limit.");
      return;
    }

    setSaving(true);

    try {
      await onSave({
        account_name: form.account_name.trim(),
        account_type: form.account_type,
        institution_name: form.institution_name.trim() || null,
        currency: form.currency,
        opening_balance_cents: openingBalanceCents,

        credit_limit_cents:
          isCreditCard && form.credit_limit !== "" ? creditLimitCents : null,

        card_last_four: isCreditCard
          ? form.card_last_four.trim() || null
          : null,

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
      });

      toast.success(
        isEditing
          ? "Account updated successfully."
          : "Account created successfully.",
      );

      onClose();
    } catch (err) {
      toast.error(err.message || "Unable to save account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          handleClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isEditing ? "Edit account" : "New account"}
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Add a bank account, savings account, cash account, or credit card.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <Field id="account_name" label="Account name">
            <Input
              id="account_name"
              value={form.account_name}
              onChange={(event) =>
                updateField("account_name", event.target.value)
              }
              maxLength={100}
              placeholder="e.g. Everyday Checking"
              autoFocus
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="account_type" label="Account type">
              <select
                id="account_type"
                value={form.account_type}
                onChange={(event) =>
                  updateField("account_type", event.target.value)
                }
                className={selectClass}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit card</option>
              </select>
            </Field>

            <Field id="account_currency" label="Currency">
              <select
                id="account_currency"
                value={form.currency}
                onChange={(event) =>
                  updateField("currency", event.target.value)
                }
                className={selectClass}
              >
                <option value="CAD">CAD — Canadian Dollar</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </Field>
          </div>

          <Field id="institution_name" label="Financial institution">
            <Input
              id="institution_name"
              value={form.institution_name}
              onChange={(event) =>
                updateField("institution_name", event.target.value)
              }
              maxLength={100}
              placeholder="e.g. TD Canada Trust"
            />
          </Field>

          <Field
            id="opening_balance"
            label="Opening balance"
            hint="The balance of this account when you start tracking it. This is not its live current balance."
          >
            <Input
              id="opening_balance"
              type="number"
              step="0.01"
              value={form.opening_balance}
              onChange={(event) =>
                updateField("opening_balance", event.target.value)
              }
              placeholder="0.00"
            />
          </Field>

          {isCreditCard && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Credit card details
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Add the card details used to track its credit limit and
                  billing cycle.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="credit_limit" label="Credit limit">
                  <Input
                    id="credit_limit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.credit_limit}
                    onChange={(event) =>
                      updateField("credit_limit", event.target.value)
                    }
                    placeholder="15000.00"
                  />
                </Field>

                <Field id="card_last_four" label="Last four digits">
                  <Input
                    id="card_last_four"
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
                  />
                </Field>

                <Field id="statement_closing_day" label="Statement closing day">
                  <Input
                    id="statement_closing_day"
                    type="number"
                    min="1"
                    max="31"
                    value={form.statement_closing_day}
                    onChange={(event) =>
                      updateField("statement_closing_day", event.target.value)
                    }
                    placeholder="18"
                  />
                </Field>

                <Field id="payment_due_day" label="Payment due day">
                  <Input
                    id="payment_due_day"
                    type="number"
                    min="1"
                    max="31"
                    value={form.payment_due_day}
                    onChange={(event) =>
                      updateField("payment_due_day", event.target.value)
                    }
                    placeholder="9"
                  />
                </Field>
              </div>
            </div>
          )}

          <Field id="account_notes" label="Notes">
            <Textarea
              id="account_notes"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              maxLength={2000}
              placeholder="Optional notes"
              rows={3}
            />
          </Field>

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
              <span className="block text-sm font-medium text-foreground">
                Include in net worth
              </span>

              <span className="mt-1 block text-xs text-muted-foreground">
                Include this account when calculating your total net worth.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={!form.account_name.trim() || saving}
            >
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Create account"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
