import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { TransactionList } from "../transactions/TransactionList";
import { useAppData } from "../providers/useAppData";

export function RecentTransactions() {
  const navigate = useNavigate();
  const { transactions } = useAppData();
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
          onClick={() => navigate("/transactions")}
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
