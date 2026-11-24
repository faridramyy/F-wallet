import { Archive, ArchiveRestore } from "lucide-react";

import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { formatTimestamp } from "../../lib/formatters";

// The "Archived" tab used by accounts and categories.
// items: [{ id, title, subtitle, archivedAt, source }]
export function ArchivedList({ noun, items, onRestore }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Archived {noun}s can be restored here.
      </p>

      {items.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={`No archived ${noun}s`}
          description={`${noun[0].toUpperCase()}${noun.slice(1)}s you archive will appear here.`}
        />
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-card-foreground">
                {item.title}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {item.subtitle}
                {item.archivedAt &&
                  ` · Archived ${formatTimestamp(item.archivedAt)}`}
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onRestore(item.source)}
            >
              <ArchiveRestore />
              Restore
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
