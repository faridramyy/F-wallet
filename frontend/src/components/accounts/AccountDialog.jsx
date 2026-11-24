import { useState } from "react";

import { FormDialog } from "../common/FormDialog";
import { Field } from "../ui/field";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";
import { Textarea } from "../ui/textarea";
import { useNotifications } from "../providers/useNotifications";
import { centsToInput, dollarsToCents } from "../../lib/formatters";
import { closeWithConfirm, hasChanges } from "../../lib/dialogs";
import { ACCOUNT_TYPES } from "../../lib/accounts";
import { CURRENCY_OPTIONS, renderOptions } from "../../lib/options";

const optionalNumber = (value) => (value == null ? "" : String(value));

function getInitialForm(account, currency) {
  return {
    account_name: account?.account_name ?? "",
    account_type: account?.account_type ?? "checking",
    institution_name: account?.institution_name ?? "",
    currency: account?.currency ?? currency,
    opening_balance: account
      ? centsToInput(account.opening_balance_cents)
      : "0.00",
    credit_limit:
      account?.credit_limit_cents == null
        ? ""
        : centsToInput(account.credit_limit_cents),
    card_last_four: account?.card_last_four ?? "",
    statement_closing_day: optionalNumber(account?.statement_closing_day),
    payment_due_day: optionalNumber(account?.payment_due_day),
    include_in_net_worth: account?.include_in_net_worth ?? true,
    notes: account?.notes ?? "",
  };
}

// Signed dollar text ("-12.50") to cents, or null when invalid.
function signedDollarsToCents(value) {
  const text = value.trim();
  const cents = dollarsToCents(text.replace(/^-/, ""));

  if (cents === null) return null;

  return text.startsWith("-") ? -cents : cents;
}

function AccountDialogContent({ onClose, onSave, currency = "CAD", account }) {
  const { toast, confirm } = useNotifications();

  const [initialForm] = useState(() => getInitialForm(account, currency));
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isCreditCard = form.account_type === "credit_card";
  const isEditing = Boolean(account);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  // Props for a text input bound to form[name].
  const bind = (name) => ({
    id: name,
    value: form[name],
    onChange: (event) => updateField(name, event.target.value),
  });

  function handleClose() {
    if (saving) return;

    closeWithConfirm({
      isDirty: hasChanges(form, initialForm),
      confirm,
      onClose,
      noun: "account",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const accountName = form.account_name.trim();
    const openingBalanceCents = signedDollarsToCents(form.opening_balance);
    const creditLimitCents =
      isCreditCard && form.credit_limit !== ""
        ? dollarsToCents(form.credit_limit)
        : null;

    if (!accountName) return setError("Enter an account name.");
    if (openingBalanceCents === null) {
      return setError("Enter a valid opening balance.");
    }
    if (isCreditCard && form.credit_limit !== "" && creditLimitCents === null) {
      return setError("Enter a valid credit limit.");
    }

    const creditCardValue = (value) => (isCreditCard && value ? value : null);

    setSaving(true);

    try {
      await onSave({
        account_name: accountName,
        account_type: form.account_type,
        institution_name: form.institution_name.trim() || null,
        currency: form.currency,
        opening_balance_cents: openingBalanceCents,
        credit_limit_cents: creditLimitCents,
        card_last_four: creditCardValue(form.card_last_four.trim()),
        statement_closing_day: creditCardValue(
          Number(form.statement_closing_day),
        ),
        payment_due_day: creditCardValue(Number(form.payment_due_day)),
        include_in_net_worth: form.include_in_net_worth,
        notes: form.notes.trim() || null,
      });

      toast.success(isEditing ? "Account updated." : "Account created.");
      onClose();
    } catch (err) {
      setError(err.message || "Unable to save account.");
      setSaving(false);
    }
  }

  return (
    <FormDialog
      title={isEditing ? "Edit account" : "New account"}
      description="Add a bank account, savings account, cash account, or credit card."
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Save changes" : "Create account"}
      submitDisabled={!form.account_name.trim()}
      saving={saving}
      error={error}
    >
      <Field label="Account name" htmlFor="account_name">
        <Input
          {...bind("account_name")}
          maxLength={100}
          placeholder="e.g. Everyday Checking"
          autoFocus
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account type" htmlFor="account_type">
          <NativeSelect {...bind("account_type")}>
            {renderOptions(ACCOUNT_TYPES)}
          </NativeSelect>
        </Field>

        <Field label="Currency" htmlFor="currency">
          <NativeSelect {...bind("currency")}>
            {renderOptions(CURRENCY_OPTIONS)}
          </NativeSelect>
        </Field>
      </div>

      <Field label="Financial institution" htmlFor="institution_name">
        <Input
          {...bind("institution_name")}
          maxLength={100}
          placeholder="e.g. TD Canada Trust"
        />
      </Field>

      <Field
        label="Opening balance"
        htmlFor="opening_balance"
        hint="The balance of this account when you start tracking it. This is not its live current balance."
      >
        <Input
          {...bind("opening_balance")}
          type="number"
          step="0.01"
          placeholder="0.00"
        />
      </Field>

      {isCreditCard && (
        <fieldset className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
          <legend className="sr-only">Credit card details</legend>

          <div>
            <p className="text-sm font-semibold">Credit card details</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Used to track the credit limit and billing cycle.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Credit limit" htmlFor="credit_limit">
              <Input
                {...bind("credit_limit")}
                type="number"
                min="0"
                step="0.01"
                placeholder="15000.00"
              />
            </Field>

            <Field label="Last four digits" htmlFor="card_last_four">
              <Input
                {...bind("card_last_four")}
                onChange={(event) =>
                  updateField(
                    "card_last_four",
                    event.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                placeholder="1234"
              />
            </Field>

            <Field label="Statement closing day" htmlFor="statement_closing_day">
              <Input
                {...bind("statement_closing_day")}
                type="number"
                min="1"
                max="31"
                placeholder="18"
              />
            </Field>

            <Field label="Payment due day" htmlFor="payment_due_day">
              <Input
                {...bind("payment_due_day")}
                type="number"
                min="1"
                max="31"
                placeholder="9"
              />
            </Field>
          </div>
        </fieldset>
      )}

      <Field label="Notes" htmlFor="notes">
        <Textarea
          {...bind("notes")}
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
          <span className="block text-sm font-medium">Include in net worth</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Include this account when calculating your total net worth.
          </span>
        </span>
      </label>
    </FormDialog>
  );
}

// Mounted only while open, so every opening starts from a fresh form built
// from the props.
export function AccountDialog(props) {
  if (!props.open) return null;

  return <AccountDialogContent key={props.account?.account_id} {...props} />;
}
