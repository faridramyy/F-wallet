import { useState } from "react";

import { FormDialog } from "../common/FormDialog";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useNotifications } from "../providers/useNotifications";
import {
  centsToInput,
  dollarsToCents,
  formatCents,
  getTransactionTitle,
} from "../../lib/formatters";
import { closeWithConfirm, hasChanges } from "../../lib/dialogs";
import { accountOptions } from "../../lib/select-options";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

// Most this refund can be: what is left on the expense, plus this refund's
// own amount when editing it. null when the expense is not loaded.
function maxRefundCents(expense, refund) {
  if (!expense) return null;
  return (
    expense.amount_cents -
    Number(expense.refunded_cents ?? 0) +
    (refund?.amount_cents ?? 0)
  );
}

// Record money returned for an expense, or edit such a refund.
//   expense: the expense being refunded (may be missing when editing a
//            refund whose expense is not loaded)
//   refund:  the refund to edit; omit to create one
//   onSave(body) saves it
function RefundDialogContent({ expense, refund, accounts, onClose, onSave }) {
  const { toast, confirm } = useNotifications();

  const isEditing = Boolean(refund);
  const maxCents = maxRefundCents(expense, refund);

  const [initialForm] = useState(() => ({
    amount: centsToInput(refund?.amount_cents ?? maxCents ?? 0),
    account_id: refund?.account_id ?? expense?.account_id ?? "",
    transaction_date: refund?.transaction_date ?? today(),
    description: refund?.description ?? "",
    notes: refund?.notes ?? "",
  }));
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateField = (changes) => {
    setForm((current) => ({ ...current, ...changes }));
    setError("");
  };

  function handleClose() {
    if (saving) return;

    closeWithConfirm({
      isDirty: hasChanges(form, initialForm),
      confirm,
      onClose,
      noun: "refund",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const amountCents = dollarsToCents(form.amount);

    if (amountCents === null || amountCents <= 0) {
      return setError("Enter a valid amount, for example 12.50.");
    }
    if (maxCents !== null && amountCents > maxCents) {
      return setError(`You can refund at most ${formatCents(maxCents)}.`);
    }
    if (!form.account_id) {
      return setError("Choose the account the money went back to.");
    }

    const payload = {
      amount_cents: amountCents,
      account_id: form.account_id,
      transaction_date: form.transaction_date,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
    };

    // When editing, send only what changed.
    let body = payload;
    if (isEditing) {
      const original = {
        amount_cents: refund.amount_cents,
        account_id: refund.account_id,
        transaction_date: refund.transaction_date,
        description: refund.description ?? null,
        notes: refund.notes ?? null,
      };

      body = Object.fromEntries(
        Object.entries(payload).filter(
          ([key, value]) => value !== original[key],
        ),
      );

      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }
    }

    setSaving(true);

    try {
      await onSave(body);
      toast.success(isEditing ? "Refund updated." : "Refund recorded.");
      onClose();
    } catch (err) {
      setError(err.message || "Unable to save refund.");
      setSaving(false);
    }
  }

  const expenseTitle = expense
    ? getTransactionTitle(expense)
    : refund?.original_title || "the expense";

  return (
    <FormDialog
      title={isEditing ? "Edit refund" : "Record a refund"}
      description={`Money returned for ${expenseTitle}.`}
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Record refund"}
      saving={saving}
      error={error}
    >
      {expense && (
        <dl className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Expense</dt>
            <dd className="font-medium tabular-nums">
              {formatCents(expense.amount_cents)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Already refunded</dt>
            <dd className="font-medium tabular-nums">
              {formatCents(
                Number(expense.refunded_cents ?? 0) -
                  (refund?.amount_cents ?? 0),
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Can refund</dt>
            <dd className="font-medium tabular-nums">
              {formatCents(maxCents)}
            </dd>
          </div>
        </dl>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount refunded" htmlFor="refund_amount">
          <Input
            id="refund_amount"
            required
            inputMode="decimal"
            value={form.amount}
            onChange={(event) => updateField({ amount: event.target.value })}
            placeholder="0.00"
            autoFocus
          />
        </Field>

        <Field label="Date" htmlFor="refund_date">
          <Input
            id="refund_date"
            required
            type="date"
            value={form.transaction_date}
            onChange={(event) =>
              updateField({ transaction_date: event.target.value })
            }
          />
        </Field>
      </div>

      <Field
        label="Refunded to"
        htmlFor="refund_account"
        hint="Usually the account or card that paid for the expense."
      >
        <Select
          id="refund_account"
          value={form.account_id}
          options={accountOptions(accounts)}
          placeholder="Choose an account"
          onValueChange={(value) => updateField({ account_id: value })}
        />
      </Field>

      <Field label="Description" htmlFor="refund_description">
        <Input
          id="refund_description"
          maxLength={255}
          value={form.description}
          onChange={(event) => updateField({ description: event.target.value })}
          placeholder="e.g. Returned the shoes"
        />
      </Field>

      <Field label="Notes" htmlFor="refund_notes">
        <Textarea
          id="refund_notes"
          rows={2}
          value={form.notes}
          onChange={(event) => updateField({ notes: event.target.value })}
          placeholder="Optional notes"
        />
      </Field>
    </FormDialog>
  );
}

// Mounted only while open, so every opening starts from a fresh form.
export function RefundDialog(props) {
  if (!props.open) return null;

  return (
    <RefundDialogContent
      key={props.refund?.transaction_id ?? props.expense?.transaction_id}
      {...props}
    />
  );
}
