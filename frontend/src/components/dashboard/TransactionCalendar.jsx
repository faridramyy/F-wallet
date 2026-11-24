import { useState } from "react";
import { cn } from "cn";

import { SectionCard } from "../common/SectionCard";
import { TransactionList } from "../transactions/TransactionList";
import { useAppData } from "../providers/useAppData";
import { monthGrid, toDateKey, todayKey } from "../../lib/date-ranges";
import {
  formatCents,
  formatFullDay,
  formatMonthYear,
  getTransactionTitle,
} from "../../lib/formatters";
import { getTransactionKind } from "../../lib/transaction-kinds";
import { monthKey, summarize } from "../../lib/analytics";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ENTRIES_PER_DAY = 3; // shown in a cell before "+N more"

// The month's transactions keyed by "YYYY-MM-DD" (newest first per day,
// as the list is already sorted).
function groupByDay(transactions, key) {
  const days = new Map();

  for (const t of transactions) {
    if (!t.transaction_date?.startsWith(key)) continue;
    if (!days.has(t.transaction_date)) days.set(t.transaction_date, []);
    days.get(t.transaction_date).push(t);
  }

  return days;
}

// One transaction inside a day cell: colored dot, title, amount.
function Entry({ transaction, currency }) {
  const { dot, text, sign } = getTransactionKind(transaction.transaction_type);

  return (
    <li className="flex items-center gap-1 text-2xs leading-tight">
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", dot)}
      />
      <span className="min-w-0 flex-1 truncate">
        {getTransactionTitle(transaction)}
      </span>
      <span className={cn("shrink-0 tabular-nums", text)}>
        {sign}
        {formatCents(transaction.amount_cents, currency)}
      </span>
    </li>
  );
}

// A month calendar, like Google or Apple Calendar, with each day's
// transactions. Selecting a day lists its transactions underneath.
export function TransactionCalendar({ year, month }) {
  const { transactions, currency } = useAppData();
  const key = monthKey(year, month);
  const today = todayKey();

  const days = groupByDay(transactions, key);
  const [selected, setSelected] = useState(
    today.startsWith(key) ? today : null,
  );

  // Only as many weeks as the month needs (4 to 6).
  const first = new Date(year, month - 1, 1);
  const weeks = Math.ceil(
    (first.getDay() + new Date(year, month, 0).getDate()) / 7,
  );
  const cells = monthGrid(year, month).slice(0, weeks * 7);

  const selectedTransactions = (selected && days.get(selected)) || [];
  const selectedTotals = summarize(selectedTransactions);

  return (
    <SectionCard
      title="Calendar"
      description={`Every day's transactions in ${formatMonthYear(year, month)}`}
    >
      <div className="grid grid-cols-7 text-center text-2xs font-medium text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <span key={day} className="pb-2">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border bg-border gap-px">
        {cells.map((date) => {
          const dateKey = toDateKey(date);
          const inMonth = dateKey.startsWith(key);
          const entries = (inMonth && days.get(dateKey)) || [];
          const extra = entries.length - ENTRIES_PER_DAY;
          const isSelected = dateKey === selected;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={!inMonth}
              aria-pressed={isSelected}
              aria-label={`${formatFullDay(date)}: ${entries.length} transaction${entries.length === 1 ? "" : "s"}`}
              onClick={() => setSelected(isSelected ? null : dateKey)}
              className={cn(
                "flex min-h-14 min-w-0 flex-col gap-1 bg-card p-1 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset md:min-h-24 md:p-1.5",
                inMonth ? "hover:bg-muted/50" : "bg-muted/30",
                isSelected && "bg-accent hover:bg-accent",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                  !inMonth && "text-muted-foreground/40",
                  dateKey === today &&
                    "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {date.getDate()}
              </span>

              {entries.length > 0 && (
                <>
                  {/* Phones: one dot per transaction. */}
                  <span className="flex flex-wrap gap-0.5 px-0.5 md:hidden">
                    {entries.slice(0, 6).map((t) => (
                      <span
                        key={t.transaction_id}
                        aria-hidden="true"
                        className={cn(
                          "size-1.5 rounded-full",
                          getTransactionKind(t.transaction_type).dot,
                        )}
                      />
                    ))}
                  </span>

                  {/* Wider screens: the first few, then "+N more". */}
                  <ul className="hidden w-full space-y-0.5 md:block">
                    {entries.slice(0, ENTRIES_PER_DAY).map((t) => (
                      <Entry
                        key={t.transaction_id}
                        transaction={t}
                        currency={currency}
                      />
                    ))}
                    {extra > 0 && (
                      <li className="text-2xs text-muted-foreground">
                        +{extra} more
                      </li>
                    )}
                  </ul>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5" aria-live="polite">
        {!selected ? (
          <p className="text-center text-sm text-muted-foreground">
            Select a day to see its transactions.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {formatFullDay(new Date(`${selected}T00:00`))}
              </h3>
              {selectedTransactions.length > 0 && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  In {formatCents(selectedTotals.income, currency)} · Out{" "}
                  {formatCents(selectedTotals.expense, currency)}
                </p>
              )}
            </div>

            {selectedTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions on this day.
              </p>
            ) : (
              <TransactionList
                transactions={selectedTransactions}
                showDayHeaders={false}
              />
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}
