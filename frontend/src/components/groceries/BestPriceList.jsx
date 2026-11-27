import { useState } from "react";
import { ChevronDown, Plus, ShoppingBasket, Tag } from "lucide-react";
import { cn } from "cn";

import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { IconButton } from "../ui/icon-button";
import { formatCents, formatDateKey } from "../../lib/formatters";
import {
  formatPackage,
  formatUnitPrice,
  getUnitKind,
} from "../../lib/groceries";

// One price line: "$4.99 /kg · No Frills · $9.98 for 2 kg · Nov 22, 2026"
function PriceLine({ price, kind, storeName, currency, highlight }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span
        className={cn("font-semibold tabular-nums", highlight && "text-income")}
      >
        {formatUnitPrice(price.unitCents, kind, currency)}
      </span>
      <span className="text-sm">{storeName}</span>
      <span className="text-xs text-muted-foreground">
        {formatCents(price.price_cents, currency)} for {formatPackage(price)}
        {" · "}
        {formatDateKey(price.observed_on)}
      </span>
    </div>
  );
}

function BestPriceCard({ product, summary, storeName, currency, onLogPrice }) {
  const [open, setOpen] = useState(false);
  const kind = product.unit_kind;

  const rows = (summary?.stores ?? [])
    .map((store) => ({
      ...store,
      sortCents: store.regular?.unitCents ?? store.sale?.unitCents,
    }))
    .sort((a, b) => a.sortCents - b.sortCents);

  return (
    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{product.product_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[product.brand, `per ${getUnitKind(kind).base}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <IconButton
          icon={Plus}
          label={`Log a price for ${product.product_name}`}
          onClick={() => onLogPrice(product)}
        />
      </div>

      {!summary ? (
        <p className="mt-3 text-sm text-muted-foreground">No prices yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {summary.bestRegular && (
            <div>
              <p className="text-2xs font-semibold tracking-widest text-muted-foreground uppercase">
                Best regular price
              </p>
              <PriceLine
                price={summary.bestRegular}
                kind={kind}
                storeName={storeName(summary.bestRegular.store_id)}
                currency={currency}
                highlight
              />
            </div>
          )}

          {summary.bestSale && (
            <div>
              <p className="flex items-center gap-1 text-2xs font-semibold tracking-widest text-warning uppercase">
                <Tag className="size-3" aria-hidden="true" />
                Best sale price
              </p>
              <PriceLine
                price={summary.bestSale}
                kind={kind}
                storeName={storeName(summary.bestSale.store_id)}
                currency={currency}
              />
            </div>
          )}

          {rows.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-muted-foreground"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
              >
                <ChevronDown
                  className={cn("transition-transform", open && "rotate-180")}
                />
                {open ? "Hide stores" : `Compare ${rows.length} stores`}
              </Button>

              {open && (
                <ul className="space-y-2 border-t border-border pt-2">
                  {rows.map((row) => (
                    <li key={row.store_id} className="text-sm">
                      <p className="font-medium">{storeName(row.store_id)}</p>
                      {row.regular && (
                        <p className="text-xs text-muted-foreground">
                          Regular{" "}
                          {formatUnitPrice(
                            row.regular.unitCents,
                            kind,
                            currency,
                          )}{" "}
                          · {formatDateKey(row.regular.observed_on)}
                        </p>
                      )}
                      {row.sale && (
                        <p className="text-xs text-muted-foreground">
                          Sale{" "}
                          {formatUnitPrice(row.sale.unitCents, kind, currency)}{" "}
                          · {formatDateKey(row.sale.observed_on)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// "Where is it cheapest": one card per active product.
export function BestPriceList({
  products,
  summaries,
  storeName,
  currency,
  onLogPrice,
  onAddProduct,
}) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBasket}
        title="No products yet"
        description="Add the things you buy, then log what they cost at each store."
      >
        <Button onClick={onAddProduct}>
          <Plus />
          Add product
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <BestPriceCard
          key={product.product_id}
          product={product}
          summary={summaries.get(product.product_id)}
          storeName={storeName}
          currency={currency}
          onLogPrice={onLogPrice}
        />
      ))}
    </div>
  );
}
