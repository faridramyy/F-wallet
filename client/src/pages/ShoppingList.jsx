import { useMemo, useState } from "react";
import { Plus, X, Store, HelpCircle, ListChecks } from "lucide-react";

import { useApp } from "../store";
import { money } from "../lib/format";
import { planTrip, knownItemSummaries, daysSince } from "../lib/shopping";
import { SuggestInput } from "../components/SuggestInput";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "cn";

const dangerIconButton =
  "text-muted-foreground hover:bg-destructive/10 hover:text-destructive";

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="mb-3 size-10 text-muted-foreground/40" />}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {message && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

export default function ShoppingListDrawer({ fmt: fmtProp }) {
  const {
    groceries,
    shopping,
    currency,
    createShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    clearBoughtItems,
  } = useApp();

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [plan, setPlan] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const fmt = fmtProp || ((value) => money(value, { currency }));

  const itemOptions = useMemo(
    () =>
      knownItemSummaries(groceries).map((entry) => ({
        name: entry.name,
        meta: entry.price !== null ? `${fmt(entry.price)}` : null,
      })),
    [groceries, fmt],
  );

  const pending = shopping.filter((item) => !item.done);
  const bought = shopping.filter((item) => item.done);

  const add = async () => {
    if (!name.trim()) return;

    await createShoppingItem({
      name: name.trim(),
      quantity: Number(quantity) || 1,
    });

    setName("");
    setQuantity("1");
    setPlan(null);
  };

  return (
    <div className="w-full space-y-4">
      {/* Full width search & item creation row */}
      <div className="flex w-full items-center gap-2">
        <div className="min-w-0 flex-1">
          <SuggestInput
            className="w-full"
            value={name}
            onChange={setName}
            options={itemOptions}
            onEnter={add}
            placeholder="Add an item"
          />
        </div>

        <Input
          type="number"
          min="1"
          className="w-16 shrink-0 text-center"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          aria-label="Quantity"
        />

        <Button
          type="button"
          size="icon"
          className="shrink-0"
          onClick={add}
          disabled={!name.trim()}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {shopping.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing on the list"
          message="Add what you need and the app will work out where to buy it."
        />
      ) : (
        <>
          <div className="divide-y divide-border">
            {pending.map((item) => (
              <BuyRow
                key={item.id}
                item={item}
                onUpdate={updateShoppingItem}
                onDelete={deleteShoppingItem}
              />
            ))}
          </div>

          {bought.length > 0 && (
            <>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
                <span>Bought ({bought.length})</span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmClear(true)}
                >
                  Clear
                </Button>
              </div>

              <div className="divide-y divide-border opacity-60">
                {bought.map((item) => (
                  <BuyRow
                    key={item.id}
                    item={item}
                    onUpdate={updateShoppingItem}
                    onDelete={deleteShoppingItem}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {pending.length > 0 && (
        <Button
          type="button"
          className="w-full"
          onClick={() => setPlan(planTrip(shopping, groceries))}
        >
          <Store className="mr-1.5 size-4" />
          Where should I buy these?
        </Button>
      )}

      {plan && <TripPlan plan={plan} fmt={fmt} onClose={() => setPlan(null)} />}

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear bought items?</DialogTitle>
            <DialogDescription>
              This removes {bought.length} item{bought.length === 1 ? "" : "s"}{" "}
              from the list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmClear(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                clearBoughtItems();
                setConfirmClear(false);
              }}
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BuyRow({ item, onUpdate, onDelete }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <label className="-m-2 flex cursor-pointer p-2">
        <input
          type="checkbox"
          checked={Boolean(item.done)}
          onChange={(event) =>
            onUpdate(item.id, { done: event.target.checked })
          }
          className="relative size-5 shrink-0 appearance-none rounded-full border-2 border-input bg-transparent transition-colors after:absolute after:left-1.5 after:top-0.5 after:h-2 after:w-1.25 after:origin-center after:rotate-45 after:scale-0 after:border-2 after:border-b-white after:border-l-0 after:border-r-white after:border-t-0 after:transition-transform after:duration-150 after:content-[''] checked:border-primary checked:bg-primary checked:after:scale-100 hover:border-muted-foreground focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-foreground active:scale-90"
        />
      </label>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${
            item.done ? "line-through text-muted-foreground" : ""
          }`}
        >
          {item.name}
          {Number(item.quantity) > 1 && (
            <span className="ml-1.5 inline-flex rounded-full bg-muted px-2 py-0.5 text-3xs font-bold text-muted-foreground">
              x{item.quantity}
            </span>
          )}
        </p>

        {item.note && (
          <p className="truncate text-2xs text-muted-foreground">{item.note}</p>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("size-8", dangerIconButton)}
        onClick={() => onDelete(item.id)}
        aria-label="Remove"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

function TripPlan({ plan, fmt, onClose }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-bold">Where to buy</CardTitle>
          <CardDescription className="text-xs">
            Based on the regular prices you have logged
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          <X className="mr-1 size-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="pt-2">
        {plan.matched.length === 0 ? (
          <EmptyState
            icon={HelpCircle}
            title="No prices logged for these items"
            message="Log what you pay on the Prices tab and this will start working."
          />
        ) : (
          <>
            <div className="space-y-4">
              {plan.stops.map((stop) => (
                <div key={stop.store}>
                  <div className="flex items-center justify-between border-b border-border pb-1 text-xs font-bold">
                    <span>{stop.store}</span>
                    <span>{fmt(stop.total)}</span>
                  </div>

                  {stop.items.map((row) => (
                    <div
                      key={row.item.id}
                      className="flex items-center justify-between gap-3 py-1.5 text-xs"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {row.item.name}
                        {row.quantity > 1 ? ` x${row.quantity}` : ""}
                      </span>

                      <span
                        className={
                          row.best.stale
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                        }
                      >
                        {fmt(row.best.price)}
                        {row.best.stale && (
                          <span className="ml-1 text-3xs">
                            ({Math.round(daysSince(row.best.date) / 30)}mo old)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {plan.unknown.length > 0 && (
              <div className="mt-4 border-t border-border pt-3.5">
                <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  No price logged
                </p>

                <p className="mt-1.5 text-xs text-muted-foreground">
                  {plan.unknown.map((item) => item.name).join(", ")}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
