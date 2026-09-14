import { useMemo, useState } from "react";

import { useApp } from "../store";
import {
  Panel,
  StatCard,
  EmptyState,
  ConfirmModal,
  Field,
} from "../components/ui";
import { money, formatDate } from "../lib/format";
import { planTrip, knownItemSummaries, daysSince } from "../lib/shopping";
import GroceryModal from "../modals/GroceryModal";

/*
  Search folding.

  toLowerCase alone misses accents: "cafe" would not match "Café",
  because those are different characters rather than different cases.
  NFD splits an accented letter into the plain letter plus a combining
  mark, and the replace strips the marks, so both sides compare equal.
*/

function fold(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const PRICE_TAGS = {
  normal: { label: "Regular", icon: "fa-tag" },
  offer: { label: "Offer", icon: "fa-percent" },
  reduced: { label: "Reduced", icon: "fa-arrow-down" },
};

function PriceTag({ type }) {
  // Entries saved before price types existed have no value, and a
  // missing type means it was a regular price.
  const tag = PRICE_TAGS[type] || PRICE_TAGS.normal;

  return (
    <span className={`price-tag ${type || "normal"}`}>
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
    <div className="page space-y-5">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Shopping</p>
          <h2 className="page-title">Groceries</h2>
          <p className="page-description">
            What you need to buy, and what it costs where.
          </p>
        </div>
      </div>

      <div className="segmented">
        <button
          type="button"
          className={`segmented-option ${tab === "buy" ? "active" : ""}`}
          onClick={() => setTab("buy")}
        >
          <i className="fa-solid fa-list-check" />
          To buy
        </button>

        <button
          type="button"
          className={`segmented-option ${tab === "prices" ? "active" : ""}`}
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
  const [nameFocused, setNameFocused] = useState(false);
  const [plan, setPlan] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  /*
    Suggesting names you have already used is not a convenience, it is
    what makes the matching work. "Milk 4L" and "milk" are different
    items as far as the price history is concerned.
  */

  const knownItems = useMemo(() => knownItemSummaries(groceries), [groceries]);

  const suggestions = useMemo(() => {
    const term = fold(name.trim());

    /*
      Nothing until two characters. Dropping a list over the page the
      instant the field is focused hides the list you are adding to, and
      a single letter matches too much to be worth reading.
    */

    if (term.length < 2) return [];

    const starts = [];
    const contains = [];

    for (const candidate of knownItems) {
      const lower = fold(candidate.name);

      if (lower === term) continue;

      if (lower.startsWith(term)) starts.push(candidate);
      else if (lower.includes(term)) contains.push(candidate);
    }

    return [...starts, ...contains].slice(0, 5);
  }, [knownItems, name]);

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
        <div className="buy-add-row">
          <div className="suggest-field flex-1">
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              onKeyDown={(event) => event.key === "Enter" && add()}
              placeholder="Add an item"
              autoComplete="off"
            />

            {nameFocused && suggestions.length > 0 && (
              <ul className="suggest-list">
                {suggestions.map((candidate) => (
                  <li key={candidate.name}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();

                        setName(candidate.name);
                        setNameFocused(false);
                      }}
                    >
                      <span className="suggest-name">{candidate.name}</span>

                      {candidate.price !== null && (
                        <span className="suggest-meta">
                          {fmt(candidate.price)} at {candidate.store}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <input
            className="input buy-qty"
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-label="Quantity"
          />

          <button
            type="button"
            className="primary-button"
            onClick={add}
            disabled={!name.trim()}
          >
            <i className="fa-solid fa-plus" />
          </button>
        </div>

        {shopping.length === 0 ? (
          <EmptyState
            icon="fa-list-check"
            title="Nothing on the list"
            message="Add what you need and the app will work out where to buy it."
          />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
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
                <div className="buy-done-header">
                  <span>Bought ({bought.length})</span>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setConfirmClear(true)}
                  >
                    Clear
                  </button>
                </div>

                <div className="divide-y divide-slate-100 opacity-60">
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
          <button
            type="button"
            className="primary-button full-button mt-4"
            onClick={() => setPlan(planTrip(shopping, groceries))}
          >
            <i className="fa-solid fa-store" />
            Where should I buy these?
          </button>
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
    <div className="buy-item">
      <label className="buy-check">
        <input
          type="checkbox"
          checked={Boolean(item.done)}
          onChange={(event) =>
            onUpdate(item.id, { done: event.target.checked })
          }
        />
      </label>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${item.done ? "line-through" : ""}`}
        >
          {item.name}
          {Number(item.quantity) > 1 && (
            <span className="buy-qty-tag">x{item.quantity}</span>
          )}
        </p>

        {item.note && (
          <p className="truncate text-[11px] text-slate-400">{item.note}</p>
        )}
      </div>

      <button
        type="button"
        className="icon-button danger"
        onClick={() => onDelete(item.id)}
        aria-label="Remove"
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
}

function TripPlan({ plan, fmt, onClose }) {
  return (
    <Panel
      title="Where to buy"
      subtitle="Based on the regular prices you have logged"
      action={
        <button type="button" className="secondary-button" onClick={onClose}>
          <i className="fa-solid fa-xmark" />
          Close
        </button>
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
                <div className="plan-stop-header">
                  <span>{stop.store}</span>
                  <span>{fmt(stop.total)}</span>
                </div>

                {stop.items.map((row) => (
                  <div key={row.item.id} className="plan-item">
                    <span className="min-w-0 flex-1 truncate">
                      {row.item.name}
                      {row.quantity > 1 ? ` x${row.quantity}` : ""}
                    </span>

                    <span
                      className={
                        row.best.stale ? "text-amber-600" : "text-slate-500"
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
            <div className="plan-unknown">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                No price logged
              </p>

              <p className="mt-1.5 text-xs text-slate-500">
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

  const stores = useMemo(
    () => new Set(groceries.map((entry) => entry.store)).size,
    [groceries],
  );

  const average = useMemo(() => {
    if (groceries.length === 0) return 0;

    return (
      groceries.reduce((sum, entry) => sum + (Number(entry.price) || 0), 0) /
      groceries.length
    );
  }, [groceries]);

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
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
        >
          <i className="fa-solid fa-plus" />
          Log a price
        </button>
      </div>

      <Panel>
        <div className="form-grid mb-4">
          <Field label="Search" className="sm:col-span-2">
            <input
              type="search"
              className="input"
              placeholder="Item, store or note"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>

          <Field label="Sort by">
            <select
              className="input"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recent">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="cheapest">Cheapest first</option>
              <option value="priciest">Most expensive first</option>
              <option value="name">Item name</option>
            </select>
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
          <div className="divide-y divide-slate-100">
            {filtered.map((entry) => (
              <div key={entry.id} className="grocery-item">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold">
                    <span className="truncate">{entry.item}</span>
                    <PriceTag type={entry.priceType} />
                  </p>

                  <p className="truncate text-[11px] text-slate-400">
                    {entry.store} · {formatDate(entry.date)}
                    {entry.description ? ` · ${entry.description}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{fmt(entry.price)}</span>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      setEditing(entry);
                      setShowModal(true);
                    }}
                    aria-label="Edit"
                  >
                    <i className="fa-solid fa-pen" />
                  </button>

                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => setConfirming(entry)}
                    aria-label="Delete"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
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
