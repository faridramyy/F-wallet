import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Tag, Percent, ArrowDown } from "lucide-react";

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
import { SuggestInput, distinctValues } from "../components/SuggestInput";
import { today } from "../lib/format";

const PRICE_TYPES = [
  { value: "normal", label: "Regular", icon: Tag },
  { value: "offer", label: "Offer", icon: Percent },
  { value: "reduced", label: "Reduced", icon: ArrowDown },
];

export default function GroceryModal({ grocery, onClose }) {
  const { groceries, createGrocery, updateGrocery } = useApp();

  const isEditing = Boolean(grocery);

  const [form, setForm] = useState({
    item: grocery?.item || "",
    price: grocery?.price ?? "",
    store: grocery?.store === "Unknown store" ? "" : grocery?.store || "",
    date: grocery?.date || today(),
    description: grocery?.description || "",
    priceType: grocery?.priceType || "normal",
  });

  const [saving, setSaving] = useState(false);

  const knownItems = useMemo(
    () => distinctValues(groceries, "item"),
    [groceries],
  );
  const knownStores = useMemo(
    () => distinctValues(groceries, "store", ["Unknown store"]),
    [groceries],
  );

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.item.trim()) {
      toast.error("Item name is required.");
      return;
    }

    const price = Number(form.price || 0);

    if (!Number.isFinite(price) || price < 0) {
      toast.error("Price must be a valid number.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        item: form.item.trim(),
        price,
        store: form.store.trim() || "Unknown store",
        priceType: form.priceType,
        date: form.date || today(),
        description: form.description.trim(),
      };

      if (isEditing) {
        await updateGrocery(grocery.id, payload);
        toast.success("Grocery price entry updated successfully.");
      } else {
        await createGrocery(payload);
        toast.success("Grocery price entry logged successfully.");
      }

      onClose();
    } catch (submitError) {
      setSaving(false);
      toast.error("Failed to save price entry. Please try again.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit price entry" : "Log a price"}
          </DialogTitle>
          <DialogDescription>
            Record grocery item pricing to track trends and compare stores.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="grocery-item">Item</Label>
              <SuggestInput
                id="grocery-item"
                value={form.item}
                onChange={(value) =>
                  setForm((current) => ({ ...current, item: value }))
                }
                options={knownItems}
                placeholder="Milk, 4L"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grocery-price">Price</Label>
              <Input
                id="grocery-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={set("price")}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Price type</Label>
              <div className="flex gap-2">
                {PRICE_TYPES.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={
                        form.priceType === option.value ? "default" : "outline"
                      }
                      className="flex-1 gap-2"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          priceType: option.value,
                        }))
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Only regular prices are compared across stores. Offers and
                markdowns are still logged and searchable.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grocery-store">Store</Label>
              <SuggestInput
                id="grocery-store"
                value={form.store}
                onChange={(value) =>
                  setForm((current) => ({ ...current, store: value }))
                }
                options={knownStores}
                placeholder="No Frills"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grocery-date">Date</Label>
              <Input
                id="grocery-date"
                type="date"
                value={form.date}
                onChange={set("date")}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="grocery-description">Note</Label>
              <Input
                id="grocery-description"
                value={form.description}
                onChange={set("description")}
                placeholder="On sale until Sunday"
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
              {saving ? "Saving..." : isEditing ? "Save changes" : "Add price"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
