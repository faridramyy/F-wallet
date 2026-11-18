import { ArrowUpRight, CreditCard, Landmark, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { accounts } from "../../data/mockData";
import { formatCurrency } from "../../lib/formatters";

const accountIcons = {
  Checking: Landmark,
  Savings: PiggyBank,
  "Credit card": CreditCard,
};

export function AccountsOverview({ onViewAll }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">My accounts</CardTitle>
          <p className="mt-1 text-xs text-slate-400">Your financial accounts</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-emerald-700"
          onClick={onViewAll}
        >
          View all <ArrowUpRight size={14} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {accounts.map((account) => {
          const Icon = accountIcons[account.type] || CreditCard;
          return (
            <div
              key={account.name}
              className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-slate-50"
            >
              <div
                className={`flex size-11 items-center justify-center rounded-xl ${account.color}`}
              >
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{account.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {account.institution} · {account.type}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {account.balance < 0 ? "-" : ""}
                {formatCurrency(account.balance)}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
