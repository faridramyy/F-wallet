import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Menu } from "lucide-react";

import { AppSidebar } from "./components/layout/AppSidebar";
import { AppHeader } from "./components/layout/AppHeader";
import { MobileNavigation } from "./components/layout/MobileNavigation";

import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { AccountsPage } from "./pages/AccountsPage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { SettingsPage } from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";

import { NotificationProvider } from "./components/providers/NotificationProvider";
import { AddTransactionDialog } from "./components/transactions/AddTransactionDialog";
import { initialTransactions } from "./data/mockData";

const VALID_THEMES = ["light", "dark", "system"];

function getInitialTheme() {
  try {
    const savedTheme = localStorage.getItem("fwallet-theme");

    return VALID_THEMES.includes(savedTheme) ? savedTheme : "system";
  } catch {
    return "system";
  }
}

export default function App() {
  const auth = useAuth();

  const [activePage, setActivePage] = useState("Dashboard");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const isDark =
        theme === "dark" || (theme === "system" && systemPreference.matches);

      root.classList.toggle("dark", isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
    };

    applyTheme();

    try {
      localStorage.setItem("fwallet-theme", theme);
    } catch {
      // Theme still works for the current session if storage is unavailable.
    }

    if (theme === "system") {
      systemPreference.addEventListener("change", applyTheme);

      return () => {
        systemPreference.removeEventListener("change", applyTheme);
      };
    }
  }, [theme]);

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
        return <SettingsPage theme={theme} onThemeChange={setTheme} />;

      default:
        return (
          <DashboardPage
            transactions={transactions}
            onViewTransactions={() => setActivePage("Transactions")}
            onViewAccounts={() => setActivePage("Accounts")}
            onViewBudgets={() => setActivePage("Budgets")}
          />
        );
    }
  };

  // Wait for Cognito to finish checking the authentication session.
  if (auth.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />

          <p className="text-sm text-muted-foreground">
            connecting F-Wallet with AWS cognito...
          </p>
        </div>
      </div>
    );
  }

  // Show the login page when the user is not authenticated.
  if (!auth.isAuthenticated) {
    return <LoginPage />;
  }

  // Existing authenticated F-Wallet application.
  return (
    <NotificationProvider>
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar
          activePage={activePage}
          onNavigate={setActivePage}
          sidebarOpen={sidebarOpen}
        />

        <MobileNavigation activePage={activePage} onNavigate={setActivePage} />

        <button
          type="button"
          onClick={() => setSidebarOpen((current) => !current)}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={sidebarOpen}
          className={`fixed top-8 z-40 hidden size-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all duration-200 hover:bg-muted hover:text-foreground md:flex ${
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
    </NotificationProvider>
  );
}
