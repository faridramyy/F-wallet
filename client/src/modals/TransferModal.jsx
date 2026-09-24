import { useState } from "react";
import { toast } from "sonner";
import { ArrowUpDown } from "lucide-react";

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
import { money, today } from "../lib/format";

export default function TransferModal({ transfer, onClose }) {
  const {
    accounts,
    transactions,
    currency,
    createTransaction,
    updateTransaction,
  } = useApp();

  const isEditing = Boolean(transfer);

  const [form, setForm] = useState({
    fromAccountId: transfer?.fromAccountId || accounts[0]?.id || "",
    toAccountId: transfer?.toAccountId || accounts[1]?.id || "",
    amount: transfer?.amount ?? "",
    date: transfer?.date || today(),
    notes: transfer?.notes || "",
  });

  const [saving, setSaving] = useState(false);

  const fmt = (value) => money(value, { currency });

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const setValue = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const swap = () =>
    setForm((current) => ({
      ...current,
      fromAccountId: current.toAccountId,
      toAccountId: current.fromAccountId,
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amount = Number(form.amount || 0);

    if (!(amount > 0)) {
      toast.error("Amount must be greater than zero.");
      return;
    }

    if (!form.fromAccountId || !form.toAccountId) {
      toast.error("Choose both accounts.");
      return;
    }

    if (form.fromAccountId === form.toAccountId) {
      toast.error("Pick two different accounts.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        type: "transfer",
        amount,
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        date: form.date,
        notes: form.notes.trim(),
      };

      if (isEditing) {
        await updateTransaction(transfer.id, payload);
        toast.success("Transfer updated successfully.");
      } else {
        await createTransaction(payload);
        toast.success("Transfer completed successfully.");
      }

      onClose();
    } catch (submitError) {
      setSaving(false);
      toast.error("Failed to save transfer. Please try again.");
    }
  };

  const describe = (accountId) => {
    const account = accounts.find((item) => item.id === accountId);

    if (!account) return "";

    const balance = accountBalance(account, transactions);

    return account.type === "credit"
      ? `${fmt(balance)} owing`
      : `${fmt(balance)} available`;
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit transfer" : "Transfer money"}
          </DialogTitle>
          <DialogDescription>
            Move funds between your accounts or make a credit card payment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="from-account">From</Label>
              <Select
                value={form.fromAccountId}
                onValueChange={setValue("fromAccountId")}
              >
                <SelectTrigger id="from-account" className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>

                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-2xs text-muted-foreground">
                {describe(form.fromAccountId)}
              </p>
            </div>

            <div className="flex justify-center sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={swap}
                aria-label="Swap accounts"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="to-account">To</Label>
              <Select
                value={form.toAccountId}
                onValueChange={setValue("toAccountId")}
              >
                <SelectTrigger id="to-account" className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-2xs text-muted-foreground">
                {describe(form.toAccountId)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-amount">Amount</Label>
              <Input
                id="transfer-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={set("amount")}
                placeholder="0.00"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-date">Date</Label>
              <Input
                id="transfer-date"
                type="date"
                value={form.date}
                onChange={set("date")}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="transfer-notes">Note</Label>
              <Input
                id="transfer-notes"
                value={form.notes}
                onChange={set("notes")}
                placeholder="Optional"
              />
            </div>

            <p className="text-2xs leading-relaxed text-muted-foreground sm:col-span-2">
              Paying a credit card is a transfer from your chequing account to
              the card. The card balance goes down and your cash goes down with
              it.
            </p>
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
              {saving ? "Saving..." : isEditing ? "Save changes" : "Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
