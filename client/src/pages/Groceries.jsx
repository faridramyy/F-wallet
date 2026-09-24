import { useMemo, useState } from "react";
import {
  Percent,
  ArrowDown,
  Plus,
  X,
  Store,
  ShoppingBag,
  Pencil,
  Trash2,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Calendar,
  ListChecks,
  ShoppingCart,
} from "lucide-react";

import { useApp } from "../store";
import { money, formatDate, fold } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import GroceryModal from "../modals/GroceryModal";
import ShoppingListDrawer from "./ShoppingList";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
    className: "bg-primary/10 text-primary border-primary/20",
  },
  reduced: {
    label: "Reduced",
    icon: ArrowDown,
    className:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
};

function PriceTag({ type }) {
  const tag = PRICE_TAGS[type];
  if (!tag) return null;

  const Icon = tag.icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-3xs font-bold tracking-wide",
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
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="mb-3 size-10 text-muted-foreground/40" />}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {message && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

export default function Groceries() {
  const { groceries, shopping, currency, deleteGrocery } = useApp();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fmt = (value) => money(value, { currency });
  const pendingCount = shopping.filter((item) => !item.done).length;

  const openNewPrice = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEditPrice = (entry) => {
    setEditing(entry);
    setShowModal(true);
  };

  return (
    <>
      <div className="relative animate-in fade-in slide-in-from-bottom-1 space-y-5 duration-200">
        <PageHeader
          eyebrow="Shopping"
          title="Groceries"
          description="What you need to buy, and what it costs where."
          actions={
            <Button type="button" onClick={openNewPrice}>
              <Plus className="mr-1.5 size-4" />
              Log a price
            </Button>
          }
        />

        <PricesTab
          groceries={groceries}
          fmt={fmt}
          deleteGrocery={deleteGrocery}
          editing={editing}
          showModal={showModal}
          onEdit={openEditPrice}
          onCloseModal={() => setShowModal(false)}
        />
      </div>

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
            <ShoppingListDrawer fmt={fmt} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function PricesTab({
  groceries,
  fmt,
  deleteGrocery,
  editing,
  showModal,
  onEdit,
  onCloseModal,
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [viewMode, setViewMode] = useState("list");
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
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search items, stores or notes..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48 sm:flex-initial">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2 truncate">
                    <SlidersHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="recent">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="cheapest">Cheapest first</SelectItem>
                  <SelectItem value="priciest">Most expensive first</SelectItem>
                  <SelectItem value="name">Item name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center rounded-lg border border-input bg-background p-1">
              <Button
                type="button"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="size-7"
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <List className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="size-7"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {search && (
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>
              Found <strong>{filtered.length}</strong>{" "}
              {filtered.length === 1 ? "result" : "results"} for "{search}"
            </span>
            <button
              type="button"
              onClick={() => setSearch("")}
              className="font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
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
                    : "Try adjusting your search terms or filters."
                }
              />
            </CardContent>
          </Card>
        ) : viewMode === "list" ? (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {entry.item}
                      </span>
                      <PriceTag type={entry.priceType} />
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        {entry.store}
                      </span>
                      <span>·</span>
                      <span>{formatDate(entry.date)}</span>
                      {entry.description && (
                        <>
                          <span>·</span>
                          <span className="italic">{entry.description}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-base font-bold text-foreground">
                      {fmt(entry.price)}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => onEdit(entry)}
                        aria-label="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn("size-8", dangerIconButton)}
                        onClick={() => setConfirming(entry)}
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((entry) => (
              <Card key={entry.id} className="relative overflow-hidden">
                <CardContent className="flex h-full flex-col justify-between space-y-3 p-4">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="truncate text-sm font-semibold leading-snug">
                        {entry.item}
                      </h4>
                      <PriceTag type={entry.priceType} />
                    </div>

                    <div className="flex items-center justify-between text-2xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                        <Store className="size-3" />
                        {entry.store}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(entry.date)}
                      </span>
                    </div>

                    {entry.description && (
                      <p className="line-clamp-2 pt-1 text-2xs text-muted-foreground">
                        {entry.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-lg font-bold text-foreground">
                      {fmt(entry.price)}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => onEdit(entry)}
                        aria-label="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn("size-8", dangerIconButton)}
                        onClick={() => setConfirming(entry)}
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showModal && <GroceryModal grocery={editing} onClose={onCloseModal} />}

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
