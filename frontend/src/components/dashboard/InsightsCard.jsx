import {
  CalendarClock,
  Gauge,
  Receipt,
  ShoppingBag,
  Store,
  Tag,
} from "lucide-react";

import { SectionCard } from "../common/SectionCard";
import { formatCents, getTransactionTitle } from "../../lib/formatters";

function Insight({ icon: Icon, label, value, detail }) {
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
        {detail && (
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        )}
      </div>
    </li>
  );
}

// Plain-language facts about the chosen month's spending.
export function InsightsCard({
  title,
  isCurrent,
  thisMonth,
  today,
  daysInMonth,
  topCategory,
  largest,
  merchant,
  currency,
}) {
  const money = (cents) => formatCents(cents, currency);
  const dailyAverage = Math.round(thisMonth.expense / today);

  return (
    <SectionCard
      title={title}
      description={isCurrent ? `Day ${today} of ${daysInMonth}` : "Full month"}
    >
      <ul className="divide-y divide-border">
        <Insight
          icon={Gauge}
          label="Average daily spending"
          value={money(dailyAverage)}
        />
        {isCurrent ? (
          <Insight
            icon={CalendarClock}
            label="Projected month-end spending"
            value={money(dailyAverage * daysInMonth)}
            detail="If you keep spending at this pace"
          />
        ) : (
          <Insight
            icon={CalendarClock}
            label="Total spent"
            value={money(thisMonth.expense)}
          />
        )}
        <Insight
          icon={Tag}
          label="Top category"
          value={topCategory ? topCategory.name : "—"}
          detail={topCategory && money(topCategory.cents)}
        />
        <Insight
          icon={ShoppingBag}
          label="Largest expense"
          value={largest ? money(largest.amount_cents) : "—"}
          detail={largest && getTransactionTitle(largest)}
        />
        <Insight
          icon={Store}
          label="Top merchant"
          value={merchant ? merchant.name : "—"}
          detail={merchant && money(merchant.cents)}
        />
        <Insight
          icon={Receipt}
          label="Transactions recorded"
          value={thisMonth.count}
        />
      </ul>
    </SectionCard>
  );
}
