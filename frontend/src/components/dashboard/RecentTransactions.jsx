import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { TransactionList } from "../transactions/TransactionList";

export function RecentTransactions({ transactions, onViewAll }) {
  return (
    <Card className="rounded-xl border-border bg-card text-card-foreground shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Recent transactions</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Your latest financial activity
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="rounded-lg text-primary"
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
