import { Pencil, Receipt, Tag, Trash2 } from "lucide-react";

import { EmptyState } from "../ui/empty-state";
import { IconButton } from "../ui/icon-button";
import { formatCents, formatDateKey } from "../../lib/formatters";
import {
  formatPackage,
  formatUnitPrice,
  productLabel,
  unitPriceCents,
} from "../../lib/groceries";

// Every logged price, newest first.
export function PriceLog({
  prices,
  productById,
  storeName,
  currency,
  onEdit,
  onDelete,
}) {
  if (prices.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No prices logged"
        description="Prices you log will appear here, newest first."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card text-card-foreground">
      {prices.map((price) => {
        const product = productById.get(price.product_id);
        const label = productLabel(product);

        return (
          <li key={price.price_id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-sm font-medium">
                {label}
                {price.is_sale && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-1.5 py-0.5 text-2xs font-semibold text-warning">
                    <Tag className="size-3" aria-hidden="true" />
                    Sale
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {storeName(price.store_id)} · {formatDateKey(price.observed_on)}
                {price.notes && ` · ${price.notes}`}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">
                {formatCents(price.price_cents, currency)}
              </p>
              <p className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                {formatPackage(price)}
                {product &&
                  ` · ${formatUnitPrice(unitPriceCents(price), product.unit_kind, currency)}`}
              </p>
            </div>

            <div className="flex shrink-0">
              <IconButton
                icon={Pencil}
                label={`Edit price of ${label}`}
                onClick={() => onEdit(price)}
              />
              <IconButton
                icon={Trash2}
                tone="destructive"
                label={`Delete price of ${label}`}
                onClick={() => onDelete(price)}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
