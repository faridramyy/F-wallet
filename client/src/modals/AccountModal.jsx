import { useState } from "react";
import { toast } from "sonner";

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
import { accountBalance } from "../lib/calc";
import { round2 } from "../lib/format";

const TYPES = [
  { value: "chequing", label: "Chequing" },
  { value: "credit", label: "Credit card" },
  { value: "savings", label: "Savings" },
  { value: "cash", label: "Cash" },
];

export default function AccountModal({ account, onClose }) {
  const { transactions, createAccount, updateAccount } = useApp();

  const isEditing = Boolean(account);

  const existingBalance = isEditing
    ? round2(accountBalance(account, transactions))
    : 0;

  const [form, setForm] = useState({
    name: account?.name || "",
    type: account?.type || "chequing",
    institution: account?.institution || "",
    lastFour: account?.lastFour || "",
    startingBalance: account?.startingBalance ?? "",
    creditLimit: account?.creditLimit ?? "",
    currentBalance:
      isEditing && account.type === "credit" ? String(existingBalance) : "",
  });

  const [saving, setSaving] = useState(false);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const setValue = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Account name is required.");
      return;
    }

    const startingBalanceInput = Number(form.startingBalance || 0);

    if (!Number.isFinite(startingBalanceInput) || startingBalanceInput < 0) {
      toast.error("Starting balance must be a valid number.");
      return;
    }

    if (form.lastFour && !/^\d{4}$/.test(form.lastFour)) {
      toast.error("Last four digits must be exactly four numbers.");
      return;
    }

    const creditLimit = Number(form.creditLimit || 0);

    if (
      form.type === "credit" &&
      (!Number.isFinite(creditLimit) || creditLimit < 0)
    ) {
      toast.error("Credit limit cannot be negative.");
      return;
    }

    let startingBalance = startingBalanceInput;

    if (isEditing && form.type === "credit" && form.currentBalance !== "") {
      const desired = Number(form.currentBalance);

      if (!Number.isFinite(desired)) {
        toast.error("Current balance must be a valid number.");
        return;
      }

      if (round2(desired) !== existingBalance) {
        const transactionEffect =
          accountBalance(account, transactions) -
          (Number(account.startingBalance) || 0);

        startingBalance = round2(desired - transactionEffect);
      }
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      institution: form.institution.trim(),
      lastFour: form.lastFour.trim(),
      startingBalance,
      ...(form.type === "credit" ? { creditLimit } : {}),
    };

    setSaving(true);

    try {
      if (isEditing) {
        await updateAccount(account.id, payload);
        toast.success("Account updated successfully.");
      } else {
        await createAccount(payload);
        toast.success("Account created successfully.");
      }

      onClose();
    } catch (submitError) {
      setSaving(false);
      toast.error("Failed to save account. Please try again.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit account" : "Add account"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your account details and balance settings."
              : "Add a new account to keep track of your transactions."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="account-name">Account name</Label>
              <Input
                id="account-name"
                value={form.name}
                onChange={set("name")}
                placeholder="Everyday chequing"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-type">Type</Label>
              <Select value={form.type} onValueChange={setValue("type")}>
                <SelectTrigger id="account-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                value={form.institution}
                onChange={set("institution")}
                placeholder="TD"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-four">Last 4 digits</Label>
              <Input
                id="last-four"
                value={form.lastFour}
                onChange={set("lastFour")}
                inputMode="numeric"
                maxLength={4}
                placeholder="4321"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="starting-balance">
                {form.type === "credit" ? "Starting debt" : "Starting balance"}
              </Label>
              <Input
                id="starting-balance"
                type="number"
                step="0.01"
                min="0"
                value={form.startingBalance}
                onChange={set("startingBalance")}
                placeholder="0.00"
              />
            </div>

            {form.type === "credit" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="credit-limit">Credit limit</Label>
                  <Input
                    id="credit-limit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.creditLimit}
                    onChange={set("creditLimit")}
                    placeholder="5000.00"
                  />
                </div>

                {isEditing && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="current-balance">
                      Current balance owing
                    </Label>
                    <Input
                      id="current-balance"
                      type="number"
                      step="0.01"
                      value={form.currentBalance}
                      onChange={set("currentBalance")}
                    />
                    <p className="text-2xs text-muted-foreground">
                      Set this to match your statement. Your transactions are
                      kept and the starting debt is adjusted to fit.
                    </p>
                  </div>
                )}
              </>
            )}
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
                  : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
