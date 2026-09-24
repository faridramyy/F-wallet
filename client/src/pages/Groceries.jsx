import { useMemo, useState } from "react";
import {
  Percent,
  ArrowDown,
  ListChecks,
  ShoppingCart,
  Plus,
  X,
  Store,
  HelpCircle,
  ShoppingBag,
  Pencil,
  Trash2,
} from "lucide-react";

import { useApp } from "../store";
import { money, formatDate, fold } from "../lib/format";
import { planTrip, knownItemSummaries, daysSince } from "../lib/shopping";
import { SuggestInput } from "../components/SuggestInput";
import { PageHeader } from "../components/PageHeader";
import GroceryModal from "../modals/GroceryModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "cn";

const dangerIconButton =
  "text-muted-foreground hover:bg-destructive/10 hover:text-destructive";

const PRICE_TAGS = {
  offer: {
    label: "Offer",
    icon: Percent,
    className: "bg-primary/10 text-primary",
  },
  reduced: {
    label: "Reduced",
    icon: ArrowDown,
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
};

function PriceTag({ type }) {
  const tag = PRICE_TAGS[type];

  if (!tag) return null;

  const Icon = tag.icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-3xs font-bold tracking-wide",
        tag.className,
      )}
    >
      <Icon className="size-3" />
      {tag.label}
    </span>
  );
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      {Icon && <Icon className="mb-3 size-8 text-muted-foreground/60" />}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {message && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

export default function Groceries() {
  const {
    groceries,
    shopping,
    currency,
    deleteGrocery,
    createShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    clearBoughtItems,
  } = useApp();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fmt = (value) => money(value, { currency });
  const pendingCount = shopping.filter((item) => !item.done).length;

  return (
    <>
      <div className="relative animate-in fade-in slide-in-from-bottom-1 space-y-5 duration-200">
        <PageHeader
          eyebrow="Shopping"
          title="Groceries"
          description="What you need to buy, and what it costs where."
          actions={
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setShowModal(true);
              }}
            >
              <Plus className="mr-1.5 size-4" />
              Log a price
            </Button>
          }
        />

        <PricesTab
          groceries={groceries}
          fmt={fmt}
          deleteGrocery={deleteGrocery}
        />
      </div>

      {/* Vertical Side-Tab Drawer Trigger. Rendered outside the space-y-5
          container above: its trigger is position:fixed, but it was still
          sitting in the DOM between PageHeader and PricesTab, so it counted
          as a sibling for space-y-5's margin and produced an extra gap. */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="fixed right-0 top-1/2 z-40 flex origin-bottom-right -translate-y-1/2 -rotate-90 items-center gap-2 rounded-t-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-lg transition-transform hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open shopping list"
          >
            <ListChecks className="size-4" />
            <span>To buy</span>
            {pendingCount > 0 && (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-background text-2xs font-bold text-foreground">
                {pendingCount}
              </span>
            )}
          </button>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5 text-primary" />
              Shopping List
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <ToBuyDrawerContent
              shopping={shopping}
              groceries={groceries}
              fmt={fmt}
              onCreate={createShoppingItem}
              onUpdate={updateShoppingItem}
              onDelete={deleteShoppingItem}
              onClearBought={clearBoughtItems}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ---------------------------------------------------------
   To Buy Drawer Content
--------------------------------------------------------- */

function ToBuyDrawerContent({
  shopping = [],
  groceries = [],
  fmt,
  onCreate,
  onUpdate,
  onDelete,
  onClearBought,
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [plan, setPlan] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const itemOptions = useMemo(
    () =>
      knownItemSummaries(groceries).map((entry) => ({
        name: entry.name,
        meta:
          entry.price !== null ? `${fmt(entry.price)} at ${entry.store}` : null,
      })),
    [groceries, fmt],
  );

  const pending = shopping.filter((item) => !item.done);
  const bought = shopping.filter((item) => item.done);

  const add = async () => {
    if (!name.trim()) return;

    await onCreate({ name: name.trim(), quantity: Number(quantity) || 1 });

    setName("");
    setQuantity("1");
    setPlan(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <SuggestInput
          className="flex-1"
          value={name}
          onChange={setName}
          options={itemOptions}
          onEnter={add}
          placeholder="Add an item"
        />

        <Input
          type="number"
          min="1"
          className="w-16 shrink-0 text-center"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          aria-label="Quantity"
        />

        <Button type="button" size="icon" onClick={add} disabled={!name.trim()}>
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
                onUpdate={onUpdate}
                onDelete={onDelete}
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
                    onUpdate={onUpdate}
                    onDelete={onDelete}
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
                onClearBought();
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
          className="relative size-5 shrink-0 appearance-none rounded-full border-2 border-input bg-transparent transition-colors after:absolute after:left-1.5 after:top-0.5 after:h-2 after:w-1.25 after:origin-center after:rotate-45 after:scale-0 after:border-2 after:border-b-white after:border-r-white after:border-l-0 after:border-t-0 after:transition-transform after:duration-150 after:content-[''] checked:border-primary checked:bg-primary checked:after:scale-100 hover:border-muted-foreground focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-foreground active:scale-90"
        />
      </label>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${item.done ? "line-through" : ""}`}
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
          Close
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

/* ---------------------------------------------------------
   Prices
--------------------------------------------------------- */

function PricesTab({ groceries, fmt, deleteGrocery }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirming, setConfirming] = useState(null);

  const filtered = useMemo(() => {
    const term = fold(search.trim());

    const rows = groceries.filter((entry) => {
      if (!term) return true;

      return fold(`${entry.item} ${entry.store} ${entry.description}`).includes(
        term,
      );
    });

    const sorters = {
      recent: (a, b) => b.date.localeCompare(a.date),
      oldest: (a, b) => a.date.localeCompare(b.date),
      cheapest: (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0),
      priciest: (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0),
      name: (a, b) =>
        a.item.localeCompare(b.item, undefined, { sensitivity: "base" }),
    };

    return [...rows].sort(sorters[sort] || sorters.recent);
  }, [groceries, search, sort]);

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 grid gap-3.5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="search"
                placeholder="Item, store or note"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sort">Sort by</Label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger id="sort" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="cheapest">Cheapest first</SelectItem>
                  <SelectItem value="priciest">Most expensive first</SelectItem>
                  <SelectItem value="name">Item name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title={
                groceries.length === 0
                  ? "No prices logged"
                  : "Nothing matches that search"
              }
              message={
                groceries.length === 0
                  ? "Log what you paid for an item and where, and the To buy list will tell you where it is cheapest."
                  : "Try a different search term."
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold">
                      <span className="truncate">{entry.item}</span>
                      <PriceTag type={entry.priceType} />
                    </p>

                    <p className="truncate text-2xs text-muted-foreground">
                      {entry.store} · {formatDate(entry.date)}
                      {entry.description ? ` · ${entry.description}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {fmt(entry.price)}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => {
                        setEditing(entry);
                        setShowModal(true);
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn("size-8", dangerIconButton)}
                      onClick={() => setConfirming(entry)}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <GroceryModal grocery={editing} onClose={() => setShowModal(false)} />
      )}

      <Dialog
        open={Boolean(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete price entry?</DialogTitle>
            {confirming && (
              <DialogDescription className="text-sm text-muted-foreground">
                This will remove <strong>{confirming.item}</strong> from{" "}
                {confirming.store} on {formatDate(confirming.date)}.
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (confirming) deleteGrocery(confirming.id);
                setConfirming(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
