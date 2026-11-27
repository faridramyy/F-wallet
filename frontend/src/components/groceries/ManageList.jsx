import { Archive, Pencil } from "lucide-react";

import { EmptyState } from "../ui/empty-state";
import { IconButton } from "../ui/icon-button";
import { ArchivedList } from "../common/ArchivedList";

// The Products and Stores tabs: active items with edit/archive, and the
// archived ones underneath with restore.
//   items: [{ id, title, subtitle, archived, archivedAt, source }]
export function ManageList({
  noun,
  items,
  emptyIcon,
  emptyText,
  onEdit,
  onArchive,
  onRestore,
}) {
  const active = items.filter((item) => !item.archived);
  const archived = items.filter((item) => item.archived);

  return (
    <div className="space-y-6">
      {active.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={`No ${noun}s yet`}
          description={emptyText}
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card text-card-foreground">
          {active.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.subtitle && (
                  <p className="truncate text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                )}
              </div>
              <IconButton
                icon={Pencil}
                label={`Edit ${item.title}`}
                onClick={() => onEdit(item.source)}
              />
              <IconButton
                icon={Archive}
                tone="destructive"
                label={`Archive ${item.title}`}
                onClick={() => onArchive(item.source)}
              />
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <ArchivedList noun={noun} items={archived} onRestore={onRestore} />
      )}
    </div>
  );
}
