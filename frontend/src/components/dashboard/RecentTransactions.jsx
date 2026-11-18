import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { TransactionList } from "../transactions/TransactionList";

export function RecentTransactions({ transactions, onViewAll }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Recent transactions</CardTitle>
          <p className="mt-1 text-xs text-slate-400">
            Your latest financial activity
          </p>
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
      <CardContent>
        <TransactionList transactions={transactions.slice(0, 5)} />
      </CardContent>
    </Card>
  );
}
