import { useState } from "react";

import { FormDialog } from "../common/FormDialog";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useNotifications } from "../providers/useNotifications";
import { centsToInput, dollarsToCents } from "../../lib/formatters";
import { closeWithConfirm, hasChanges } from "../../lib/dialogs";
import { accountOptions, categoryOptions } from "../../lib/select-options";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

const TYPE_OPTIONS = {
  expense: { value: "expense", label: "Expense" },
  income: { value: "income", label: "Income" },
  transfer: { value: "transfer", label: "Transfer between accounts" },
};

// Income and expense can switch into each other; a transfer stays a transfer.
function typeOptionsFor(transaction) {
  if (transaction?.transaction_type === "transfer")
    return [TYPE_OPTIONS.transfer];
  if (transaction) return [TYPE_OPTIONS.expense, TYPE_OPTIONS.income];
  return Object.values(TYPE_OPTIONS);
}

function getInitialForm(transaction, accounts) {
  if (!transaction) {
    return {
      transaction_type: "expense",
      amount: "",
      account_id: accounts[0]?.account_id ?? "",
      to_account_id: accounts[1]?.account_id ?? "",
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
    // For a transfer this is the "from" account.
    account_id: transaction.account_id ?? "",
    to_account_id: transaction.to_account_id ?? "",
    category_id: transaction.category_id ?? "",
    transaction_date: transaction.transaction_date,
    description: transaction.description ?? "",
    merchant: transaction.merchant ?? "",
    notes: transaction.notes ?? "",
  };
}

// The request body for a form, in API shape.
function toPayload(form, amountCents) {
  const shared = {
    amount_cents: amountCents,
    transaction_date: form.transaction_date,
    description: form.description.trim() || null,
    notes: form.notes.trim() || null,
  };

  if (form.transaction_type === "transfer") {
    return {
      from_account_id: form.account_id,
      to_account_id: form.to_account_id,
      ...shared,
    };
  }

  return {
    transaction_type: form.transaction_type,
    account_id: form.account_id,
    category_id: form.category_id || null,
    merchant: form.merchant.trim() || null,
    ...shared,
  };
}

//   onSave(body, { isTransfer }) saves a new or changed transaction
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
  const isTransfer = form.transaction_type === "transfer";
  const typeOptions = typeOptionsFor(transaction);
  const close = () => onOpenChange(false);

  // Categories of the chosen type, parents with their sub-categories. If the
  // transaction's category was archived later it is no longer listed, so it
  // is kept as an extra option rather than the field silently going blank.
  const categorySelectOptions = isTransfer
    ? []
    : categoryOptions(categories, form.transaction_type, {
        none: "Uncategorized",
        extra: form.category_id
          ? {
              value: form.category_id,
              label: transaction?.category_name ?? "Archived category",
            }
          : undefined,
      });

  // A transfer cannot go to the account it comes from.
  const toAccountOptions = accountOptions(
    accounts.filter((account) => account.account_id !== form.account_id),
  );

  function updateField(changes) {
    setForm((current) => ({ ...current, ...changes }));
    setError("");
  }

  function changeType(type) {
    const changes = { transaction_type: type, category_id: "" };

    // Make sure "to" differs from "from" when switching to a transfer.
    if (type === "transfer" && form.to_account_id === form.account_id) {
      changes.to_account_id =
        accounts.find((a) => a.account_id !== form.account_id)?.account_id ??
        "";
    }

    updateField(changes);
  }

  function changeFromAccount(accountId) {
    updateField({
      account_id: accountId,
      ...(accountId === form.to_account_id && { to_account_id: "" }),
    });
  }

  function handleClose() {
    if (saving) return;

    closeWithConfirm({
      isDirty: hasChanges(form, initialForm),
      confirm,
      onClose: close,
      noun: isTransfer ? "transfer" : "transaction",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const amountCents = dollarsToCents(form.amount);

    if (amountCents === null || amountCents <= 0) {
      return setError("Enter a valid amount, for example 12.50.");
    }
    if (!form.account_id) {
      return setError(
        isTransfer
          ? "Choose the account to move money from."
          : "Choose an account.",
      );
    }
    if (isTransfer && !form.to_account_id) {
      return setError("Choose the account to move money to.");
    }

    let body = toPayload(form, amountCents);

    // When editing, send only what changed (this is what PATCH is for). It
    // also means an untouched archived category is never re-validated.
    if (isEditing) {
      const original = toPayload(initialForm, Number(transaction.amount_cents));

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
      await onSave(body, { isTransfer });
      toast.success(
        `${isTransfer ? "Transfer" : "Transaction"} ${isEditing ? "updated" : "added"}.`,
      );
      close();
    } catch (err) {
      setError(err.message || "Unable to save transaction.");
      setSaving(false);
    }
  }

  const noun = isTransfer ? "transfer" : "transaction";

  return (
    <FormDialog
      size="lg"
      title={isEditing ? `Edit ${noun}` : `Add ${noun}`}
      description={
        isTransfer
          ? "Move money between your own accounts, like paying a credit card."
          : isEditing
            ? "Update your transaction information."
            : "Record income, an expense or a transfer in your F-Wallet."
      }
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : `Add ${noun}`}
      submitDisabled={
        accounts.length === 0 || (isTransfer && accounts.length < 2)
      }
      saving={saving}
      error={error}
    >
      {accounts.length === 0 && (
        <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
          You need an account before you can add a transaction. Create one on
          the Accounts page first.
        </p>
      )}

      {isTransfer && accounts.length === 1 && (
        <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
          A transfer needs two accounts. Create another one on the Accounts page
          first.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="transaction_type">
          <Select
            id="transaction_type"
            value={form.transaction_type}
            options={typeOptions}
            disabled={typeOptions.length === 1}
            onValueChange={changeType}
          />
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

        {isTransfer ? (
          <>
            <Field label="From account" htmlFor="account_id">
              <Select
                id="account_id"
                value={form.account_id}
                options={accountOptions(accounts)}
                placeholder="Choose an account"
                onValueChange={changeFromAccount}
              />
            </Field>

            <Field label="To account" htmlFor="to_account_id">
              <Select
                id="to_account_id"
                value={form.to_account_id}
                options={toAccountOptions}
                placeholder="Choose an account"
                onValueChange={(value) => updateField({ to_account_id: value })}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Account" htmlFor="account_id">
              <Select
                id="account_id"
                value={form.account_id}
                options={accountOptions(accounts)}
                placeholder="Choose an account"
                onValueChange={(value) => updateField({ account_id: value })}
              />
            </Field>

            <Field label="Category" htmlFor="category_id">
              <Select
                id="category_id"
                value={form.category_id}
                options={categorySelectOptions}
                onValueChange={(value) => updateField({ category_id: value })}
              />
            </Field>
          </>
        )}

        <Field label="Date" htmlFor="transaction_date">
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

        {!isTransfer && (
          <Field label="Merchant" htmlFor="merchant">
            <Input
              id="merchant"
              maxLength={150}
              value={form.merchant}
              onChange={(event) =>
                updateField({ merchant: event.target.value })
              }
              placeholder="e.g. Metro"
            />
          </Field>
        )}
      </div>

      <Field label="Description" htmlFor="description">
        <Input
          id="description"
          maxLength={255}
          value={form.description}
          onChange={(event) => updateField({ description: event.target.value })}
          placeholder={
            isTransfer ? "e.g. Credit card payment" : "e.g. Grocery shopping"
          }
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
