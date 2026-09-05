import { useMemo, useState } from "react";

import { useApp } from "../store";
import { Panel, StatCard, EmptyState, ConfirmModal, Field } from "../components/ui";
import { money, formatDate } from "../lib/format";
import GroceryModal from "../modals/GroceryModal";

export default function Groceries() {
  const { groceries, currency, deleteGrocery } = useApp();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirming, setConfirming] = useState(null);

  const fmt = (value) => money(value, { currency });

  const stores = useMemo(() => new Set(groceries.map((entry) => entry.store)).size, [groceries]);

  const average = useMemo(() => {
    if (groceries.length === 0) return 0;

    return groceries.reduce((sum, entry) => sum + (Number(entry.price) || 0), 0) / groceries.length;
  }, [groceries]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    const rows = groceries.filter((entry) => {
      if (!term) return true;

      return `${entry.item} ${entry.store} ${entry.description}`.toLowerCase().includes(term);
    });

    const sorters = {
      recent: (a, b) => b.date.localeCompare(a.date),
      oldest: (a, b) => a.date.localeCompare(b.date),
      cheapest: (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0),
      priciest: (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0),
      name: (a, b) => a.item.localeCompare(b.item),
    };

    return [...rows].sort(sorters[sort] || sorters.recent);
  }, [groceries, search, sort]);

  /*
    Groups every price entry by item name so you can see which store was
    cheapest. Only items logged at more than one store are worth showing,
    since a single entry has nothing to compare against.
  */

  const bestPrices = useMemo(() => {
    const groups = new Map();

    for (const entry of groceries) {
      const key = entry.item.trim().toLowerCase();

      if (!groups.has(key)) groups.set(key, []);

      groups.get(key).push(entry);
    }

    return [...groups.entries()]
      .map(([, entries]) => {
        const sorted = [...entries].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));

        const cheapest = sorted[0];
        const priciest = sorted[sorted.length - 1];

        return {
          item: cheapest.item,
          cheapest,
          priciest,
          storeCount: new Set(entries.map((entry) => entry.store)).size,
          saving: (Number(priciest.price) || 0) - (Number(cheapest.price) || 0),
        };
      })
      .filter((group) => group.storeCount > 1 && group.saving > 0)
      .sort((a, b) => b.saving - a.saving)
      .slice(0, 6);
  }, [groceries]);

  return (
    <div className="page space-y-5">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Shopping</p>
          <h2 className="page-title">Grocery prices</h2>
          <p className="page-description">Track what things cost so you know where to buy them.</p>
        </div>

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

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Prices logged" value={groceries.length} />
        <StatCard label="Stores" value={stores} />
        <StatCard label="Average price" value={fmt(average)} />
      </div>

      {bestPrices.length > 0 && (
        <Panel title="Where to buy" subtitle="Items you have priced at more than one store">
          <div className="grid gap-3 sm:grid-cols-2">
            {bestPrices.map((group) => (
              <div key={group.item} className="grocery-best-item">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{group.item}</p>
                  <span className="badge">Save {fmt(group.saving)}</span>
                </div>

                <p className="mt-1.5 text-xs text-emerald-600">
                  Cheapest at {group.cheapest.store} for {fmt(group.cheapest.price)}
                </p>

                <p className="text-[11px] text-slate-400">
                  Most expensive at {group.priciest.store} for {fmt(group.priciest.price)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

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
            <select className="input" value={sort} onChange={(event) => setSort(event.target.value)}>
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
            title={groceries.length === 0 ? "No prices logged" : "Nothing matches that search"}
            message={
              groceries.length === 0
                ? "Log what you paid for an item and where, and this page will tell you where it is cheapest."
                : "Try a different search term."
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((entry) => (
              <div key={entry.id} className="grocery-item">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{entry.item}</p>

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

      {showModal && <GroceryModal grocery={editing} onClose={() => setShowModal(false)} />}

      {confirming && (
        <ConfirmModal
          title="Delete price entry?"
          message={
            <>
              This will remove <strong>{confirming.item}</strong> from {confirming.store} on{" "}
              {formatDate(confirming.date)}.
            </>
          }
          onConfirm={() => deleteGrocery(confirming.id)}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
