import { useState } from "react";
import { AppSidebar } from "./components/layout/AppSidebar";
import { AppHeader } from "./components/layout/AppHeader";
import { MobileNavigation } from "./components/layout/MobileNavigation";
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { AccountsPage } from "./pages/AccountsPage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AddTransactionDialog } from "./components/transactions/AddTransactionDialog";
import { initialTransactions } from "./data/mockData";

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleAddTransaction = (transaction) => {
    setTransactions((current) => [transaction, ...current]);
    setAddDialogOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case "Transactions":
        return <TransactionsPage transactions={transactions} />;
      case "Accounts":
        return <AccountsPage />;
      case "Budgets":
        return <BudgetsPage />;
      case "Settings":
        return <SettingsPage />;
      default:
        return (
          <DashboardPage
            transactions={transactions}
            onViewTransactions={() => setActivePage("Transactions")}
            onViewAccounts={() => setActivePage("Accounts")}
            onViewBudgets={() => setActivePage("Budgets")}
            onAddTransaction={() => setAddDialogOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppSidebar activePage={activePage} onNavigate={setActivePage} />
      <MobileNavigation activePage={activePage} onNavigate={setActivePage} />
      <main className="lg:pl-64">
        <AppHeader
          title={activePage}
          onAddTransaction={() => setAddDialogOpen(true)}
          onOpenMobileNavigation={() =>
            window.dispatchEvent(new Event("fwallet:open-navigation"))
          }
        />
        <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-9">
          {renderPage()}
        </div>
      </main>
      <AddTransactionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleAddTransaction}
      />
    </div>
  );
}
