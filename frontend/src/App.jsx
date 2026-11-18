import { useState } from "react";
import { Menu } from "lucide-react";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    <div className="min-h-screen bg-[#f7f7f7] text-[#191919]">
      <AppSidebar
        activePage={activePage}
        onNavigate={setActivePage}
        sidebarOpen={sidebarOpen}
      />

      <MobileNavigation activePage={activePage} onNavigate={setActivePage} />

      {/* Sidebar toggle: tablet and desktop */}
      <button
        type="button"
        onClick={() => setSidebarOpen((current) => !current)}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={sidebarOpen}
        className={`fixed top-8 z-40 hidden size-8 -translate-x-1/2 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#666666] shadow-sm transition-all duration-200 hover:bg-[#f5f5f5] md:flex ${
          sidebarOpen ? "left-62" : "left-19"
        }`}
      >
        <Menu size={16} />
      </button>

      <main
        className={`min-h-screen transition-all duration-200 ${
          sidebarOpen ? "md:pl-62" : "md:pl-19"
        }`}
      >
        <AppHeader
          title={activePage}
          onAddTransaction={() => setAddDialogOpen(true)}
        />

        <div className="mx-auto w-full max-w-[1600px] p-5 pb-28 sm:p-8 sm:pb-28 md:pb-8 lg:p-10">
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
