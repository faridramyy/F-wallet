import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownLeft, Banknote, Clock } from "lucide-react";

import { useApp } from "../store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const applyCategoryDefaults = (categoryId) => {
    const category = categories.find((item) => item.id === categoryId);

    if (!category || category.type !== "income") return;

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

  const changeType = (nextType) => {
    setForm((current) => ({ ...current, type: nextType, categoryId: "" }));

    if (nextType !== "income") setEntryMode("fixed");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !usePayCalculator &&
      form.amount !== "" &&
      !/^\d*\.?\d{0,2}$/.test(String(form.amount).trim())
    ) {
      toast.error("Amount can have at most two decimal places.");
      return;
    }

    if (!(effectiveAmount > 0)) {
      toast.error(
        usePayCalculator
          ? "Enter hours and an hourly rate greater than zero."
          : "Amount must be greater than zero.",
      );
      return;
    }

    if (!form.accountId) {
      toast.error("Select an account.");
      return;
    }

    if (!form.categoryId) {
      toast.error("Select a category. Create one first if the list is empty.");
      return;
    }

    if (!form.date) {
      toast.error("Select a date.");
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
        toast.success("Transaction updated successfully.");
      } else {
        await createTransaction(payload);
        toast.success("Transaction added successfully.");
      }

      onClose();
    } catch (submitError) {
      setSaving(false);
      toast.error("Failed to save transaction. Please try again.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit transaction" : "Add transaction"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update transaction details, accounts, or amounts."
              : "Log a new income or expense transaction."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={form.type === "expense" ? "destructive" : "outline"}
              className="gap-2"
              onClick={() => changeType("expense")}
            >
              <ArrowUpRight className="h-4 w-4" />
              Expense
            </Button>

            <Button
              type="button"
              variant={form.type === "income" ? "default" : "outline"}
              className="gap-2"
              onClick={() => changeType("income")}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Income
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {form.type === "income" && (
              <div className="flex gap-2 sm:col-span-2">
                <Button
                  type="button"
                  variant={entryMode === "fixed" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setEntryMode("fixed")}
                >
                  <Banknote className="h-4 w-4" />
                  Fixed amount
                </Button>

                <Button
                  type="button"
                  variant={entryMode === "hourly" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setEntryMode("hourly")}
                >
                  <Clock className="h-4 w-4" />
                  Hourly
                </Button>
              </div>
            )}

            {usePayCalculator ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pay-hours">Hours worked</Label>
                  <Input
                    id="pay-hours"
                    type="number"
                    step="0.25"
                    min="0"
                    value={pay.hours}
                    onChange={setPayField("hours")}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay-rate">Hourly rate</Label>
                  <Input
                    id="pay-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={pay.rate}
                    onChange={setPayField("rate")}
                    placeholder="17.20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay-ot-hours">Overtime hours</Label>
                  <Input
                    id="pay-ot-hours"
                    type="number"
                    step="0.25"
                    min="0"
                    value={pay.overtimeHours}
                    onChange={setPayField("overtimeHours")}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay-ot-multiplier">Overtime multiplier</Label>
                  <Input
                    id="pay-ot-multiplier"
                    type="number"
                    step="0.1"
                    min="1"
                    value={pay.overtimeMultiplier}
                    onChange={setPayField("overtimeMultiplier")}
                  />
                </div>

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
                    <p className="mt-1 text-2xs text-muted-foreground">
                      {fmt(payResult.regularPay)} regular +{" "}
                      {fmt(payResult.overtimePay)} overtime
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={set("amount")}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="account-select">Account</Label>
              <Select
                value={form.accountId}
                onValueChange={setValue("accountId")}
              >
                <SelectTrigger id="account-select" className="w-full">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-select">Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(value) => {
                  setValue("categoryId")(value);
                  applyCategoryDefaults(value);
                }}
              >
                <SelectTrigger id="category-select" className="w-full">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={form.date}
                onChange={set("date")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-note">Note</Label>
              <Input
                id="tx-note"
                value={form.notes}
                onChange={set("notes")}
                placeholder="Optional"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
