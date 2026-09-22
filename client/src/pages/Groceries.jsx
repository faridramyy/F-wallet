import { useMemo, useState } from "react";

import { useApp } from "../store";
import { Panel, EmptyState, ConfirmModal, Field } from "../components/ui";
import { money, formatDate, fold } from "../lib/format";
import { planTrip, knownItemSummaries, daysSince } from "../lib/shopping";
import { SuggestInput } from "../components/SuggestInput";
import GroceryModal from "../modals/GroceryModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "cn";

const dangerIconButton =
  "text-muted-foreground hover:bg-destructive/10 hover:text-destructive";

const PRICE_TAGS = {
  offer: {
    label: "Offer",
    icon: "fa-percent",
    className: "bg-primary/10 text-primary",
  },
  reduced: {
    label: "Reduced",
    icon: "fa-arrow-down",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
};

function PriceTag({ type }) {
  // Regular prices get no tag. Marking the common case adds noise to
  // every row without telling you anything. A missing type means the
  // entry predates price types, which means it was a regular price.
  const tag = PRICE_TAGS[type];

  if (!tag) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide",
        tag.className,
      )}
    >
      <i className={`fa-solid ${tag.icon}`} />
      {tag.label}
    </span>
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

  const [tab, setTab] = useState("buy");

  const fmt = (value) => money(value, { currency });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 space-y-5 duration-200">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Shopping
        </p>
        <h2 className="text-2xl font-bold tracking-tight">Groceries</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What you need to buy, and what it costs where.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-muted p-1">
        <button
          type="button"
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold text-muted-foreground transition-colors",
            tab === "buy" && "bg-card text-foreground shadow-sm",
          )}
          onClick={() => setTab("buy")}
        >
          <i className="fa-solid fa-list-check" />
          To buy
        </button>

        <button
          type="button"
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold text-muted-foreground transition-colors",
            tab === "prices" && "bg-card text-foreground shadow-sm",
          )}
          onClick={() => setTab("prices")}
        >
          <i className="fa-solid fa-tags" />
          Prices
        </button>
      </div>

      {tab === "buy" ? (
        <ToBuyTab
          shopping={shopping}
          groceries={groceries}
          fmt={fmt}
          onCreate={createShoppingItem}
          onUpdate={updateShoppingItem}
          onDelete={deleteShoppingItem}
          onClearBought={clearBoughtItems}
        />
      ) : (
        <PricesTab
          groceries={groceries}
          fmt={fmt}
          deleteGrocery={deleteGrocery}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   To buy
--------------------------------------------------------- */

function ToBuyTab({
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

  /*
    Suggesting names already used is what makes the trip planner work.
    "Milk 4L" and "milk" are different items as far as matching goes, so
    keeping spelling consistent matters more than it looks.

    The cheapest known price rides along as meta, so picking a name also
    tells you roughly what it costs and where.
  */

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
    // The plan is now out of date, so drop it rather than showing a
    // result that does not include what was just added.
    setPlan(null);
  };

  return (
    <>
      <Panel title="Shopping list" subtitle={`${pending.length} to buy`}>
        <div className="mb-3.5 flex items-start gap-2">
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
            className="w-[68px] shrink-0 text-center"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-label="Quantity"
          />

          <Button type="button" size="icon" onClick={add} disabled={!name.trim()}>
            <i className="fa-solid fa-plus" />
          </Button>
        </div>

        {shopping.length === 0 ? (
          <EmptyState
            icon="fa-list-check"
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
                <div className="mt-4.5 flex items-center justify-between border-t border-border pt-3 text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
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
            className="mt-4 w-full"
            onClick={() => setPlan(planTrip(shopping, groceries))}
          >
            <i className="fa-solid fa-store" />
            Where should I buy these?
          </Button>
        )}
      </Panel>

      {plan && <TripPlan plan={plan} fmt={fmt} onClose={() => setPlan(null)} />}

      {confirmClear && (
        <ConfirmModal
          title="Clear bought items?"
          message={`This removes ${bought.length} item${bought.length === 1 ? "" : "s"} from the list.`}
          confirmLabel="Clear"
          onConfirm={onClearBought}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </>
  );
}

function BuyRow({ item, onUpdate, onDelete }) {
  return (
    <div className="flex items-center gap-3 py-2.75">
      <label className="-m-2.5 flex cursor-pointer p-2.5">
        <input
          type="checkbox"
          checked={Boolean(item.done)}
          onChange={(event) =>
            onUpdate(item.id, { done: event.target.checked })
          }
          className="relative size-6 shrink-0 appearance-none rounded-full border-2 border-input bg-transparent transition-colors after:absolute after:left-[7px] after:top-1 after:h-2.5 after:w-[5px] after:origin-center after:rotate-45 after:scale-0 after:border-2 after:border-b-white after:border-r-white after:border-l-0 after:border-t-0 after:transition-transform after:duration-150 after:content-[''] checked:border-primary checked:bg-primary checked:after:scale-100 hover:border-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:scale-90"
        />
      </label>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${item.done ? "line-through" : ""}`}
        >
          {item.name}
          {Number(item.quantity) > 1 && (
            <span className="ml-1.5 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">
              x{item.quantity}
            </span>
          )}
        </p>

        {item.note && (
          <p className="truncate text-[11px] text-muted-foreground">
            {item.note}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={dangerIconButton}
        onClick={() => onDelete(item.id)}
        aria-label="Remove"
      >
        <i className="fa-solid fa-xmark" />
      </Button>
    </div>
  );
}

function TripPlan({ plan, fmt, onClose }) {
  return (
    <Panel
      title="Where to buy"
      subtitle="Based on the regular prices you have logged"
      action={
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          <i className="fa-solid fa-xmark" />
          Close
        </Button>
      }
    >
      {plan.matched.length === 0 ? (
        <EmptyState
          icon="fa-circle-question"
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
                    className="flex items-center justify-between gap-3 py-1.75 text-[12.5px]"
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
                        <span className="ml-1 text-[10px]">
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
            <div className="mt-4.5 border-t border-border pt-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                No price logged
              </p>

              <p className="mt-1.5 text-xs text-muted-foreground">
                {plan.unknown.map((item) => item.name).join(", ")}
              </p>
            </div>
          )}
        </>
      )}
    </Panel>
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
      // sensitivity "base" ignores case and accents, so "apples" and
      // "Apples" sort together instead of in separate blocks.
      name: (a, b) =>
        a.item.localeCompare(b.item, undefined, { sensitivity: "base" }),
    };

    return [...rows].sort(sorters[sort] || sorters.recent);
  }, [groceries, search, sort]);

  return (
    <>
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
        >
          <i className="fa-solid fa-plus" />
          Log a price
        </Button>
      </div>

      <Panel>
        <div className="mb-4 grid gap-3.5 sm:grid-cols-2">
          <Field label="Search" className="sm:col-span-2">
            <Input
              type="search"
              placeholder="Item, store or note"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>

          <Field label="Sort by">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full">
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
          </Field>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="fa-basket-shopping"
            title={
              groceries.length === 0
                ? "No prices logged"
                : "Nothing matches that search"
            }
            message={
              groceries.length === 0
                ? "Log what you paid for an item and where, and the To buy tab will tell you where it is cheapest."
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

                  <p className="truncate text-[11px] text-muted-foreground">
                    {entry.store} · {formatDate(entry.date)}
                    {entry.description ? ` · ${entry.description}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{fmt(entry.price)}</span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setEditing(entry);
                      setShowModal(true);
                    }}
                    aria-label="Edit"
                  >
                    <i className="fa-solid fa-pen" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={dangerIconButton}
                    onClick={() => setConfirming(entry)}
                    aria-label="Delete"
                  >
                    <i className="fa-solid fa-trash" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {showModal && (
        <GroceryModal grocery={editing} onClose={() => setShowModal(false)} />
      )}

      {confirming && (
        <ConfirmModal
          title="Delete price entry?"
          message={
            <>
              This will remove <strong>{confirming.item}</strong> from{" "}
              {confirming.store} on {formatDate(confirming.date)}.
            </>
          }
          onConfirm={() => deleteGrocery(confirming.id)}
          onClose={() => setConfirming(null)}
        />
      )}
    </>
  );
}
