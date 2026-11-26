import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Plus,
} from "lucide-react";

import { FormDialog } from "../common/FormDialog";
import { Button } from "../ui/button";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { TabBar } from "../ui/tab-bar";
import { Textarea } from "../ui/textarea";
import { useNotifications } from "../providers/useNotifications";
import {
  centsToInput,
  currencySymbol,
  dollarsToCents,
} from "../../lib/formatters";
import { closeWithConfirm, hasChanges } from "../../lib/dialogs";
import { todayKey } from "../../lib/date-ranges";
import { accountOptions, categoryOptions } from "../../lib/select-options";

const TYPE_TABS = {
  expense: { value: "expense", label: "Expense", icon: ArrowUpRight },
  income: { value: "income", label: "Income", icon: ArrowDownLeft },
  transfer: { value: "transfer", label: "Transfer", icon: ArrowLeftRight },
};

// Income and expense can switch into each other; a transfer stays a transfer.
function typeTabsFor(transaction) {
  if (transaction?.transaction_type === "transfer") return [TYPE_TABS.transfer];
  if (transaction) return [TYPE_TABS.expense, TYPE_TABS.income];
  return Object.values(TYPE_TABS);
}

function getInitialForm(transaction, accounts) {
  if (!transaction) {
    return {
      transaction_type: "expense",
      amount: "",
      account_id: accounts[0]?.account_id ?? "",
      to_account_id: accounts[1]?.account_id ?? "",
      category_id: "",
      transaction_date: todayKey(),
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

// The request body for a form, in API shape. Only the fields that belong to
// the type are sent: income has no merchant, a transfer no category.
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
    merchant:
      form.transaction_type === "expense" ? form.merchant.trim() || null : null,
    ...shared,
  };
}

const NOUNS = { expense: "expense", income: "income", transfer: "transfer" };

const DESCRIPTIONS = {
  expense: "Money you spent.",
  income: "Money you received.",
  transfer: "Money moved between your own accounts, like paying a credit card.",
};

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
  const [showNotes, setShowNotes] = useState(Boolean(initialForm.notes));
  const [saving, setSaving] = useState(false);

  const type = form.transaction_type;
  const isEditing = Boolean(transaction);
  const isTransfer = type === "transfer";
  const tabs = typeTabsFor(transaction);
  const close = () => onOpenChange(false);

  const account = accounts.find((a) => a.account_id === form.account_id);
  const symbol = currencySymbol(account?.currency);

  // Categories of the chosen type, parents with their sub-categories. If the
  // transaction's category was archived later it is no longer listed, so it
  // is kept as an extra option rather than the field silently going blank.
  const categorySelectOptions = isTransfer
    ? []
    : categoryOptions(categories, type, {
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
    accounts.filter((a) => a.account_id !== form.account_id),
  );

  function updateField(changes) {
    setForm((current) => ({ ...current, ...changes }));
  }

  function changeType(nextType) {
    // A category belongs to one type, so it is cleared on every switch.
    const changes = { transaction_type: nextType, category_id: "" };

    // Make sure "to" differs from "from" when switching to a transfer.
    if (nextType === "transfer" && form.to_account_id === form.account_id) {
      changes.to_account_id =
        accounts.find((a) => a.account_id !== form.account_id)?.account_id ??
        "";
    }

    updateField(changes);
  }

  // Picking a category also picks its default account, when it has one that
  // is still active. The account can still be changed afterwards.
  function changeCategory(categoryId) {
    const category = categories.find((c) => c.category_id === categoryId);
    const defaultAccount = accounts.find(
      (a) => a.account_id === category?.default_account_id,
    );

    updateField({
      category_id: categoryId,
      ...(defaultAccount && { account_id: defaultAccount.account_id }),
    });
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
      noun: NOUNS[type],
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const amountCents = dollarsToCents(form.amount);

    if (amountCents === null || amountCents <= 0) {
      return toast.error("Enter a valid amount, for example 12.50.");
    }
    if (!form.account_id) {
      return toast.error(
        isTransfer
          ? "Choose the account to move money from."
          : "Choose an account.",
      );
    }
    if (isTransfer && !form.to_account_id) {
      return toast.error("Choose the account to move money to.");
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
      const label = isTransfer
        ? "Transfer"
        : type === "income"
          ? "Income"
          : "Expense";
      toast.success(`${label} ${isEditing ? "updated" : "added"}.`);
      close();
    } catch (err) {
      toast.error(err.message || "Unable to save transaction.");
      setSaving(false);
    }
  }

  const noun = NOUNS[type];
  const needsAccounts = isTransfer
    ? accounts.length < 2
    : accounts.length === 0;

  return (
    <FormDialog
      size="lg"
      title={isEditing ? `Edit ${noun}` : "Add transaction"}
      description={DESCRIPTIONS[type]}
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : `Add ${noun}`}
      submitDisabled={needsAccounts}
      saving={saving}
    >
      {tabs.length > 1 && (
        <TabBar
          variant="segmented"
          aria-label="Transaction type"
          value={type}
          onValueChange={changeType}
          items={tabs}
        />
      )}

      {needsAccounts && (
        <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
          {isTransfer
            ? "A transfer needs two accounts. Create another one on the Accounts page first."
            : "You need an account first. Create one on the Accounts page."}
        </p>
      )}

      {/* The amount leads, large, with the account's currency symbol. */}
      <Field label="Amount" htmlFor="amount">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lg text-muted-foreground">
            {symbol}
          </span>
          <Input
            id="amount"
            required
            inputMode="decimal"
            value={form.amount}
            onChange={(event) => updateField({ amount: event.target.value })}
            placeholder="0.00"
            autoFocus
            className="h-12 pl-9 text-2xl font-semibold tabular-nums md:text-2xl"
          />
        </div>
      </Field>

      {isTransfer ? (
        <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Field label="From" htmlFor="account_id">
            <Select
              id="account_id"
              value={form.account_id}
              options={accountOptions(accounts)}
              placeholder="Choose an account"
              onValueChange={changeFromAccount}
            />
          </Field>

          <ArrowRight
            aria-hidden="true"
            className="mx-auto mb-2 hidden size-4 text-muted-foreground sm:block"
          />

          <Field label="To" htmlFor="to_account_id">
            <Select
              id="to_account_id"
              value={form.to_account_id}
              options={toAccountOptions}
              placeholder="Choose an account"
              onValueChange={(value) => updateField({ to_account_id: value })}
            />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="category_id">
            <Select
              id="category_id"
              value={form.category_id}
              options={categorySelectOptions}
              onValueChange={changeCategory}
            />
          </Field>

          <Field
            label={type === "income" ? "Received in" : "Paid from"}
            htmlFor="account_id"
          >
            <Select
              id="account_id"
              value={form.account_id}
              options={accountOptions(accounts)}
              placeholder="Choose an account"
              onValueChange={(value) => updateField({ account_id: value })}
            />
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
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

        {type === "expense" ? (
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
        ) : (
          <Field label="Description" htmlFor="description">
            <Input
              id="description"
              maxLength={255}
              value={form.description}
              onChange={(event) =>
                updateField({ description: event.target.value })
              }
              placeholder={isTransfer ? "e.g. Card payment" : "e.g. Salary"}
            />
          </Field>
        )}
      </div>

      {type === "expense" && (
        <Field label="Description" htmlFor="description">
          <Input
            id="description"
            maxLength={255}
            value={form.description}
            onChange={(event) =>
              updateField({ description: event.target.value })
            }
            placeholder="e.g. Weekly groceries"
          />
        </Field>
      )}

      {showNotes ? (
        <Field label="Notes" htmlFor="notes">
          <Textarea
            id="notes"
            rows={2}
            value={form.notes}
            onChange={(event) => updateField({ notes: event.target.value })}
            placeholder="Anything else to remember"
            autoFocus={!initialForm.notes}
          />
        </Field>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          onClick={() => setShowNotes(true)}
        >
          <Plus />
          Add a note
        </Button>
      )}
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
