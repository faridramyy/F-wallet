import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "cn";

import { Button } from "./button";
import { IconButton } from "./icon-button";
import {
  DATE_PRESETS,
  describeRange,
  fromDateKey,
  matchingPreset,
  monthGrid,
  toDateKey,
  todayKey,
} from "../../lib/date-ranges";
import { formatFullDay, formatMonthYear } from "../../lib/formatters";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// One month of days. Click a start day, then an end day (in either order);
// while choosing the end, hovering previews the range.
function Calendar({ value, onSelect }) {
  const today = todayKey();
  const initial = value.from ? fromDateKey(value.from) : new Date();

  const [shown, setShown] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth() + 1,
  });
  // The first click of a new range, waiting for its end.
  const [anchor, setAnchor] = useState(null);
  const [hovered, setHovered] = useState(null);

  // The range to paint: the one being chosen, else the current value.
  const [rangeFrom, rangeTo] = anchor
    ? [anchor, hovered ?? anchor].sort()
    : [value.from, value.to];

  function step(offset) {
    const date = new Date(shown.year, shown.month - 1 + offset, 1);
    setShown({ year: date.getFullYear(), month: date.getMonth() + 1 });
  }

  function pick(key) {
    if (!anchor) {
      setAnchor(key);
      return;
    }

    const [from, to] = [anchor, key].sort();
    setAnchor(null);
    setHovered(null);
    onSelect({ from, to });
  }

  return (
    <div className="w-64">
      <div className="mb-2 flex items-center justify-between">
        <IconButton
          icon={ChevronLeft}
          label="Previous month"
          onClick={() => step(-1)}
        />
        <p className="text-sm font-semibold" aria-live="polite">
          {formatMonthYear(shown.year, shown.month)}
        </p>
        <IconButton
          icon={ChevronRight}
          label="Next month"
          onClick={() => step(1)}
        />
      </div>

      <div
        role="grid"
        className="grid grid-cols-7 gap-y-1 text-center text-sm"
        onPointerLeave={() => setHovered(null)}
      >
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            role="columnheader"
            className="pb-1 text-2xs font-medium text-muted-foreground"
          >
            {day}
          </span>
        ))}

        {monthGrid(shown.year, shown.month).map((date) => {
          const key = toDateKey(date);
          const inMonth = date.getMonth() + 1 === shown.month;
          const isEdge = key === rangeFrom || key === rangeTo;
          const inRange =
            rangeFrom && rangeTo && key > rangeFrom && key < rangeTo;

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-label={formatFullDay(date)}
              aria-selected={isEdge || Boolean(inRange)}
              onClick={() => pick(key)}
              onPointerEnter={() => anchor && setHovered(key)}
              onFocus={() => anchor && setHovered(key)}
              className={cn(
                "mx-auto flex size-8 items-center justify-center rounded-md tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                !inMonth && "text-muted-foreground/50",
                inRange && "rounded-none bg-accent text-accent-foreground",
                isEdge
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "hover:bg-muted",
                key === today && !isEdge && "ring-1 ring-ring",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-2 h-4 text-center text-xs text-muted-foreground">
        {anchor ? "Now choose the end date" : "Click a start date"}
      </p>
    </div>
  );
}

// A single field for choosing a date range: presets ("Last 30 days", "This
// month", …) or any custom range on the calendar.
//   value: { from, to } as "YYYY-MM-DD" keys; "" means open-ended
//   onChange({ from, to }) — both "" means any date
function DateRangePicker({ id, value, onChange, className }) {
  const [open, setOpen] = useState(false);

  const preset = matchingPreset(value);
  const isEmpty = !value.from && !value.to;
  const label = preset?.label ?? describeRange(value);

  function choose(range) {
    onChange(range);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        className={cn(
          "flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:border-ring md:text-sm dark:bg-input/30",
          className,
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            isEmpty && "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          className="z-50 outline-none"
          sideOffset={4}
          align="end"
        >
          <Popover.Popup className="flex flex-col gap-3 rounded-lg bg-popover p-3 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 sm:flex-row">
            <Popover.Title className="sr-only">
              Choose a date range
            </Popover.Title>

            {/* Presets as rows; the selected one carries a check. */}
            <ul className="flex flex-wrap gap-1 sm:w-36 sm:flex-col sm:flex-nowrap sm:border-r sm:border-border sm:pr-3">
              {[{ id: "any", label: "Any date" }, ...DATE_PRESETS].map(
                (item) => {
                  const selected =
                    item.id === "any" ? isEmpty : preset?.id === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          choose(
                            item.id === "any"
                              ? { from: "", to: "" }
                              : item.keys(),
                          )
                        }
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                          selected && "font-semibold",
                        )}
                      >
                        {item.label}
                        {selected && <Check className="size-4" />}
                      </button>
                    </li>
                  );
                },
              )}
            </ul>

            <div>
              <Calendar value={value} onSelect={choose} />

              {!isEmpty && (
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                  <span className="text-muted-foreground">
                    {describeRange(value)}
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => choose({ from: "", to: "" })}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export { DateRangePicker };
