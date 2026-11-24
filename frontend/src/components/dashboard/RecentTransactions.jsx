import { SectionCard } from "../common/SectionCard";
import { TransactionList } from "../transactions/TransactionList";
import { useAppData } from "../providers/useAppData";

export function RecentTransactions() {
  const { transactions } = useAppData();

  return (
    <SectionCard
      title="Recent transactions"
      description="Your latest financial activity"
      viewAllTo="/transactions"
    >
      <TransactionList transactions={transactions.slice(0, 5)} />
    </SectionCard>
  );
}
