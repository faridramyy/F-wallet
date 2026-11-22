import { useState } from "react";
import { useAuth } from "react-oidc-context";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Menu } from "lucide-react";

import { AppSidebar } from "./components/layout/AppSidebar";
import { AppHeader } from "./components/layout/AppHeader";
import { MobileNavigation } from "./components/layout/MobileNavigation";

import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { AccountsPage } from "./pages/AccountsPage";
import { CategoryPage } from "./pages/CategoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";

import { NotificationProvider } from "./components/providers/NotificationProvider";
import { AddTransactionDialog } from "./components/transactions/AddTransactionDialog";
import { initialTransactions } from "./data/mockData";
import { useSettings } from "./hooks/useSettings";
import { useTheme } from "./hooks/useTheme";
import { navigation } from "./lib/navigation";

function LoadingScreen({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />

        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default function App() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    settings,
    setSettings,
    loading: settingsLoading,
    reload: reloadSettings,
  } = useSettings();

  const [transactions, setTransactions] = useState(initialTransactions);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [themePreview, setThemePreview] = useState(null);

  // The theme comes from the database. An unsaved preview from the settings
  // page wins until it is saved or discarded. Before sign-in: system default.
  useTheme(themePreview ?? settings?.theme ?? "system");

  const title =
    navigation.find((item) => item.path === location.pathname)?.label ??
    "Dashboard";

  const handleAddTransaction = (transaction) => {
    setTransactions((current) => [transaction, ...current]);
    setAddDialogOpen(false);
  };

  if (auth.isLoading) {
    return <LoadingScreen message="Connecting to AWS Cognito..." />;
  }

  if (!auth.isAuthenticated) {
    return <LoginPage />;
  }

  if (settingsLoading) {
    return <LoadingScreen message="Loading your settings..." />;
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar sidebarOpen={sidebarOpen} />

        <MobileNavigation />

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
            title={title}
            onAddTransaction={() => setAddDialogOpen(true)}
          />

          <div className="mx-auto w-full max-w-[1600px] p-5 pb-28 sm:p-8 sm:pb-28 md:pb-8 lg:p-10">
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <DashboardPage
                    transactions={transactions}
                    onViewTransactions={() => navigate("/transactions")}
                    onViewAccounts={() => navigate("/accounts")}
                    onViewBudgets={() => navigate("/categories")}
                  />
                }
              />

              <Route
                path="/transactions"
                element={<TransactionsPage transactions={transactions} />}
              />

              <Route path="/accounts" element={<AccountsPage />} />

              <Route path="/categories" element={<CategoryPage />} />

              <Route
                path="/settings"
                element={
                  <SettingsPage
                    settings={settings}
                    onSaved={setSettings}
                    onThemePreview={setThemePreview}
                    onRetry={reloadSettings}
                  />
                }
              />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
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
