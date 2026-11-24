import { useState } from "react";

import { FormDialog } from "../common/FormDialog";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";
import { Textarea } from "../ui/textarea";
import { useNotifications } from "../providers/useNotifications";
import { centsToInput, dollarsToCents } from "../../lib/formatters";
import { closeWithConfirm, hasChanges } from "../../lib/dialogs";
import { CATEGORY_TYPE_OPTIONS, renderOptions } from "../../lib/options";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

function getInitialForm(transaction, accounts) {
  if (!transaction) {
    return {
      transaction_type: "expense",
      amount: "",
      account_id: accounts[0]?.account_id ?? "",
      category_id: "",
      transaction_date: today(),
      description: "",
      merchant: "",
      notes: "",
    };
  }

  return {
    transaction_type: transaction.transaction_type,
    amount: centsToInput(transaction.amount_cents),
    account_id: transaction.account_id ?? "",
    category_id: transaction.category_id ?? "",
    transaction_date: transaction.transaction_date,
    description: transaction.description ?? "",
    merchant: transaction.merchant ?? "",
    notes: transaction.notes ?? "",
  };
}

// The request body for a form, in API shape.
function toPayload(form, amountCents) {
  return {
    transaction_type: form.transaction_type,
    account_id: form.account_id,
    category_id: form.category_id || null,
    amount_cents: amountCents,
    transaction_date: form.transaction_date,
    description: form.description.trim() || null,
    merchant: form.merchant.trim() || null,
    notes: form.notes.trim() || null,
  };
}

function AddTransactionDialogContent({
  onOpenChange,
  onSave,
  transaction = null,
  accounts = [],
  categories = [],
}) {
  const { toast, confirm } = useNotifications();

  const [initialForm] = useState(() => getInitialForm(transaction, accounts));
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(transaction);
  const close = () => onOpenChange(false);

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

  function updateField(changes) {
    setForm((current) => ({ ...current, ...changes }));
    setError("");
  }

  function handleClose() {
    if (saving) return;

    closeWithConfirm({
      isDirty: hasChanges(form, initialForm),
      confirm,
      onClose: close,
      noun: "transaction",
    });
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

    let body = toPayload(form, amountCents);

    // When editing, send only what changed (this is what PATCH is for). It
    // also means an untouched archived category is never re-validated.
    if (isEditing) {
      const original = toPayload(
        initialForm,
        Number(transaction.amount_cents),
      );

      body = Object.fromEntries(
        Object.entries(body).filter(([key, value]) => value !== original[key]),
      );

      if (Object.keys(body).length === 0) {
        close();
        return;
      }
    }

    setSaving(true);

    try {
      await onSave(body);
      toast.success(isEditing ? "Transaction updated." : "Transaction added.");
      close();
    } catch (err) {
      setError(err.message || "Unable to save transaction.");
      setSaving(false);
    }
  }

  return (
    <FormDialog
      size="lg"
      title={isEditing ? "Edit transaction" : "Add transaction"}
      description={
        isEditing
          ? "Update your transaction information."
          : "Record income or an expense in your F-Wallet."
      }
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Add transaction"}
      submitDisabled={accounts.length === 0}
      saving={saving}
      error={error}
    >
      {accounts.length === 0 && (
        <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
          You need an account before you can add a transaction. Create one on
          the Accounts page first.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Transaction type" htmlFor="transaction_type">
          <NativeSelect
            id="transaction_type"
            value={form.transaction_type}
            // The old category belongs to the other type.
            onChange={(event) =>
              updateField({
                transaction_type: event.target.value,
                category_id: "",
              })
            }
          >
            {renderOptions(CATEGORY_TYPE_OPTIONS)}
          </NativeSelect>
        </Field>

        <Field label="Amount" htmlFor="amount">
          <Input
            id="amount"
            required
            inputMode="decimal"
            value={form.amount}
            onChange={(event) => updateField({ amount: event.target.value })}
            placeholder="0.00"
            autoFocus
          />
        </Field>

        <Field label="Account" htmlFor="account_id">
          <NativeSelect
            id="account_id"
            value={form.account_id}
            onChange={(event) =>
              updateField({ account_id: event.target.value })
            }
          >
            {accounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.account_name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Category" htmlFor="category_id">
          <NativeSelect
            id="category_id"
            value={form.category_id}
            onChange={(event) =>
              updateField({ category_id: event.target.value })
            }
          >
            <option value="">Uncategorized</option>

            {!hasCurrentCategory && (
              <option value={form.category_id}>
                {transaction?.category_name ?? "Archived category"}
              </option>
            )}

            {categoryOptions.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.category_name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field label="Transaction date" htmlFor="transaction_date">
          <Input
            id="transaction_date"
            required
            type="date"
            value={form.transaction_date}
            onChange={(event) =>
              updateField({ transaction_date: event.target.value })
            }
          />
        </Field>

        <Field label="Merchant" htmlFor="merchant">
          <Input
            id="merchant"
            maxLength={150}
            value={form.merchant}
            onChange={(event) => updateField({ merchant: event.target.value })}
            placeholder="e.g. Metro"
          />
        </Field>
      </div>

      <Field label="Description" htmlFor="description">
        <Input
          id="description"
          maxLength={255}
          value={form.description}
          onChange={(event) => updateField({ description: event.target.value })}
          placeholder="e.g. Grocery shopping"
        />
      </Field>

      <Field label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          rows={2}
          value={form.notes}
          onChange={(event) => updateField({ notes: event.target.value })}
          placeholder="Optional notes"
        />
      </Field>
    </FormDialog>
  );
}

// Mounted only while open, so every opening starts from a fresh form built
// from the props.
export function AddTransactionDialog(props) {
  if (!props.open) return null;

  return (
    <AddTransactionDialogContent
      key={props.transaction?.transaction_id ?? "new"}
      {...props}
    />
  );
}
