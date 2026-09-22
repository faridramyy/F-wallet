import { useMemo, useState } from "react";

import { useApp } from "../store";
import { Modal, Field } from "../components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { calculatePay, DEFAULT_OVERTIME_MULTIPLIER } from "../lib/calc";
import { money, today, formatHours } from "../lib/format";

const LAST_ENTRY_MODE_KEY = "fwallet_last_entry_mode";

export default function TransactionModal({ transaction, onClose }) {
  const {
    accounts,
    categories,
    currency,
    createTransaction,
    updateTransaction,
  } = useApp();

  const isEditing = Boolean(transaction);

  const [form, setForm] = useState({
    type: transaction?.type || "expense",
    amount: transaction?.amount ?? "",
    accountId: transaction?.accountId || accounts[0]?.id || "",
    categoryId: transaction?.categoryId || "",
    date: transaction?.date || today(),
    notes: transaction?.notes || "",
  });

  /*
    Entry mode for income.

    New transactions open in whichever mode was used last, defaulting to
    fixed. Editing an existing one opens in the mode it was saved with;
    records created before entryMode existed are read from whether they
    have pay data, which is more reliable than assuming.
  */

  const [entryMode, setEntryMode] = useState(() => {
    if (transaction) {
      return transaction.entryMode || (transaction.pay ? "hourly" : "fixed");
    }

    return localStorage.getItem(LAST_ENTRY_MODE_KEY) === "hourly"
      ? "hourly"
      : "fixed";
  });

  const [pay, setPay] = useState({
    hours: transaction?.pay?.hours ?? "",
    rate: transaction?.pay?.rate ?? "",
    overtimeHours: transaction?.pay?.overtimeHours ?? "",
    overtimeMultiplier:
      transaction?.pay?.overtimeMultiplier ?? DEFAULT_OVERTIME_MULTIPLIER,
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fmt = (value) => money(value, { currency });

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const setValue = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const setPayField = (key) => (event) =>
    setPay((current) => ({ ...current, [key]: event.target.value }));

  const availableCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );

  /*
    Picking an income category fills in its saved pay rates.

    Categories store an absolute overtime rate, which is the number people
    actually know off the top of their head. The transaction stores a
    multiplier, which is what the maths uses. Converting here keeps both
    sides in the form they are easiest to think about, and leaves every
    transaction already saved working unchanged.

    Anything typed manually afterwards wins. This only ever fills blanks.
  */

  const applyCategoryDefaults = (categoryId) => {
    const category = categories.find((item) => item.id === categoryId);

    if (!category || category.type !== "income") return;

    // The category decides how the form opens. Categories saved before
    // entryMode existed fall back to whether they have an hourly rate.
    const mode =
      category.entryMode ||
      (Number(category.hourlyRate) > 0 ? "hourly" : "fixed");

    setEntryMode(mode);

    if (mode === "fixed") {
      const usual = Number(category.defaultAmount) || 0;

      if (usual > 0) {
        setForm((current) =>
          current.amount === "" ? { ...current, amount: usual } : current,
        );
      }

      return;
    }

    const hourly = Number(category.hourlyRate) || 0;
    const overtime = Number(category.overtimeRate) || 0;

    if (hourly <= 0) return;

    setPay((current) => ({
      ...current,
      rate: current.rate === "" ? hourly : current.rate,
      overtimeMultiplier:
        overtime > 0
          ? Number((overtime / hourly).toFixed(4))
          : current.overtimeMultiplier,
    }));
  };

  const usePayCalculator = form.type === "income" && entryMode === "hourly";

  const payResult = useMemo(() => calculatePay(pay), [pay]);

  const effectiveAmount = usePayCalculator
    ? payResult.total
    : Number(form.amount || 0);

  /*
    Switching type invalidates the selected category, since an expense
    cannot sit in an income category. Clearing it here avoids a confusing
    server error later.
  */

  const changeType = (nextType) => {
    setForm((current) => ({ ...current, type: nextType, categoryId: "" }));

    // Only income can be hourly, so switching away resets the mode.
    if (nextType !== "income") setEntryMode("fixed");
  };

  const submit = async () => {
    setError("");

    if (
      !usePayCalculator &&
      form.amount !== "" &&
      !/^\d*\.?\d{0,2}$/.test(String(form.amount).trim())
    ) {
      setError("Amount can have at most two decimal places.");
      return;
    }

    if (!(effectiveAmount > 0)) {
      setError(
        usePayCalculator
          ? "Enter hours and an hourly rate greater than zero."
          : "Amount must be greater than zero.",
      );

      return;
    }

    if (!form.accountId) {
      setError("Select an account.");
      return;
    }

    if (!form.categoryId) {
      setError("Select a category. Create one first if the list is empty.");
      return;
    }

    if (!form.date) {
      setError("Select a date.");
      return;
    }

    const payload = {
      type: form.type,
      amount: effectiveAmount,
      accountId: form.accountId,
      categoryId: form.categoryId,
      date: form.date,
      notes: form.notes.trim(),
      entryMode: usePayCalculator ? "hourly" : "fixed",
      pay: usePayCalculator
        ? {
            hours: Number(pay.hours || 0),
            rate: Number(pay.rate || 0),
            overtimeHours: Number(pay.overtimeHours || 0),
            overtimeMultiplier: Number(
              pay.overtimeMultiplier || DEFAULT_OVERTIME_MULTIPLIER,
            ),
          }
        : null,
    };

    localStorage.setItem(
      LAST_ENTRY_MODE_KEY,
      usePayCalculator ? "hourly" : "fixed",
    );

    setSaving(true);

    try {
      if (isEditing) {
        await updateTransaction(transaction.id, payload);
      } else {
        await createTransaction(payload);
      }

      onClose();
    } catch (submitError) {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit transaction" : "Add transaction"}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button type="button" onClick={submit} disabled={saving}>
            {saving
              ? "Saving..."
              : isEditing
                ? "Save changes"
                : "Add transaction"}
          </Button>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={form.type === "expense" ? "destructive" : "outline"}
          onClick={() => changeType("expense")}
        >
          <i className="fa-solid fa-arrow-up" />
          Expense
        </Button>

        <Button
          type="button"
          variant={form.type === "income" ? "default" : "outline"}
          onClick={() => changeType("income")}
        >
          <i className="fa-solid fa-arrow-down" />
          Income
        </Button>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        {form.type === "income" && (
          <div className="flex gap-2 sm:col-span-2">
            <Button
              type="button"
              variant={entryMode === "fixed" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setEntryMode("fixed")}
            >
              <i className="fa-solid fa-money-bill" />
              Fixed amount
            </Button>

            <Button
              type="button"
              variant={entryMode === "hourly" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setEntryMode("hourly")}
            >
              <i className="fa-solid fa-clock" />
              Hourly
            </Button>
          </div>
        )}

        {usePayCalculator ? (
          <>
            <Field label="Hours worked">
              <Input
                type="number"
                step="0.25"
                min="0"
                value={pay.hours}
                onChange={setPayField("hours")}
                placeholder="0"
              />
            </Field>

            <Field label="Hourly rate">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={pay.rate}
                onChange={setPayField("rate")}
                placeholder="17.20"
              />
            </Field>

            <Field label="Overtime hours">
              <Input
                type="number"
                step="0.25"
                min="0"
                value={pay.overtimeHours}
                onChange={setPayField("overtimeHours")}
                placeholder="0"
              />
            </Field>

            <Field label="Overtime multiplier">
              <Input
                type="number"
                step="0.1"
                min="1"
                value={pay.overtimeMultiplier}
                onChange={setPayField("overtimeMultiplier")}
              />
            </Field>

            <div className="rounded-2xl bg-muted p-3 sm:col-span-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatHours(payResult.totalHours)} hours
                  {payResult.overtimePay > 0
                    ? ` · OT at ${fmt(payResult.overtimeRate)}`
                    : ""}
                </span>

                <span className="text-base font-bold">
                  {fmt(payResult.total)}
                </span>
              </div>

              {payResult.overtimePay > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {fmt(payResult.regularPay)} regular +{" "}
                  {fmt(payResult.overtimePay)} overtime
                </p>
              )}
            </div>
          </>
        ) : (
          <Field label="Amount" className="sm:col-span-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={set("amount")}
              placeholder="0.00"
              autoFocus
            />
          </Field>
        )}

        <Field label="Account">
          <Select value={form.accountId} onValueChange={setValue("accountId")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Category">
          <Select
            value={form.categoryId}
            onValueChange={(value) => {
              setValue("categoryId")(value);
              applyCategoryDefaults(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  availableCategories.length === 0
                    ? `No ${form.type} categories yet`
                    : "Select a category"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Date">
          <Input type="date" value={form.date} onChange={set("date")} />
        </Field>

        <Field label="Note">
          <Input
            value={form.notes}
            onChange={set("notes")}
            placeholder="Optional"
          />
        </Field>

        {error && (
          <div className="sm:col-span-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
