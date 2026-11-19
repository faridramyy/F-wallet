import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Landmark, ShoppingBag } from "lucide-react";

const blankForm = () => ({
  name: "",
  amount: "",
  type: "expense",
  category: "Groceries",
  account: "Everyday Checking",
  date: new Date().toISOString().slice(0, 10),
});

export function AddTransactionDialog({ open, onOpenChange, onSave }) {
  const [form, setForm] = useState(blankForm);

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) setForm(blankForm());
    onOpenChange(nextOpen);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) return;

    onSave({
      id: Date.now(),
      name: form.name.trim(),
      category: form.type === "income" ? "Income" : form.category,
      account: form.account,
      date: form.date,
      amount: form.type === "income" ? amount : -amount,
      type: form.type,
      icon: form.type === "income" ? Landmark : ShoppingBag,
    });

    setForm(blankForm());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-xl border-border bg-card text-card-foreground sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">
            Add transaction
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Record income or an expense in your F-Wallet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transaction-name">Description</Label>
            <Input
              id="transaction-name"
              className="rounded-lg border-input bg-background text-foreground placeholder:text-muted-foreground"
              placeholder="e.g. Grocery shopping"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Transaction type</Label>
              <Select
                value={form.type}
                onValueChange={(value) => update("type", value)}
              >
                <SelectTrigger className="w-full rounded-lg border-input bg-background text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-amount">Amount (CAD)</Label>
              <Input
                id="transaction-amount"
                className="rounded-lg border-input bg-background text-foreground placeholder:text-muted-foreground"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                required
              />
            </div>
          </div>

          {form.type === "expense" && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => update("category", value)}
              >
                <SelectTrigger className="w-full rounded-lg border-input bg-background text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Groceries",
                    "Housing",
                    "Transportation",
                    "Dining",
                    "Shopping",
                    "Utilities",
                    "Entertainment",
                    "Other",
                  ].map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Account</Label>
            <Select
              value={form.account}
              onValueChange={(value) => update("account", value)}
            >
              <SelectTrigger className="w-full rounded-lg border-input bg-background text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Everyday Checking">
                  Everyday Checking
                </SelectItem>
                <SelectItem value="High Interest Savings">
                  High Interest Savings
                </SelectItem>
                <SelectItem value="Visa Credit Card">
                  Visa Credit Card
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-date">Date</Label>
            <Input
              id="transaction-date"
              className="rounded-lg border-input bg-background text-foreground"
              type="date"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              required
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-lg">
              Save transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
