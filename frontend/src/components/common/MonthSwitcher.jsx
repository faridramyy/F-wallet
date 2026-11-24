import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "../ui/button";
import { IconButton } from "../ui/icon-button";
import { formatMonthYear } from "../../lib/formatters";

// Right-aligned ‹ November 2026 › with a jump back to the current month.
//   value / min / max: { year, month }
//   onChange(offset) is called with -1 or +1; onReset returns to `max`.
export function MonthSwitcher({ value, min, max, onChange, onReset }) {
  const index = (m) => m.year * 12 + m.month;
  const atMin = index(value) <= index(min);
  const atMax = index(value) >= index(max);
  const label = formatMonthYear(value.year, value.month);

  return (
    <div className="flex items-center justify-end gap-2">
      {/* Left of the month box, so the box stays put when it appears. */}
      {!atMax && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          This month
        </Button>
      )}

      <div
        role="group"
        aria-label="Month"
        className="flex items-center rounded-lg border border-border bg-card p-0.5"
      >
        <IconButton
          icon={ChevronLeft}
          label="Previous month"
          disabled={atMin}
          onClick={() => onChange(-1)}
        />

        <span
          aria-live="polite"
          className="min-w-36 px-2 text-center text-sm font-semibold"
        >
          {label}
        </span>

        <IconButton
          icon={ChevronRight}
          label="Next month"
          disabled={atMax}
          onClick={() => onChange(1)}
        />
      </div>

    </div>
  );
}
