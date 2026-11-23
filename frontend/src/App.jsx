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
import { AppDataProvider } from "./components/providers/AppDataProvider";
import { useAppData } from "./components/providers/useAppData";
import { AddTransactionDialog } from "./components/transactions/AddTransactionDialog";
import { Button } from "./components/ui/button";
import { useTransactions } from "./hooks/useTransactions";
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

function LoadErrorScreen({ message, onRetry }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          We couldn't load your data.
        </p>

        {message && (
          <p className="mt-1 text-xs text-muted-foreground">{message}</p>
        )}

        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

// Signed-out screens have no saved theme yet, so they follow the OS setting.
function SystemTheme({ children }) {
  useTheme("system");

  return children;
}

// Everything the user sees after signing in. It is rendered inside
// AppDataProvider, which has already started loading all of the user's data.
function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, setSettings, loading, error, reload } = useAppData();

  const {
    transactions,
    accounts,
    categories,
    loading: transactionsLoading,
    loadingMore,
    hasMore,
    error: transactionsError,
    reload: reloadTransactions,
    loadMore,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [themePreview, setThemePreview] = useState(null);

  // The theme comes from the database. An unsaved preview from the settings
  // page wins until it is saved or discarded. Before sign-in: system default.
  useTheme(themePreview ?? settings?.theme ?? "system");

  const title =
    navigation.find((item) => item.path === location.pathname)?.label ??
    "Dashboard";

  const handleOpenAddDialog = () => {
    setEditingTransaction(null);
    setAddDialogOpen(true);
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setAddDialogOpen(true);
  };

  const handleSaveTransaction = async (body) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.transaction_id, body);
    } else {
      await createTransaction(body);
    }
  };

  // Nothing renders until all of the user's data has arrived, so pages never
  // have to show their own loading states.
  if (loading) {
    return <LoadingScreen message="Loading your data..." />;
  }

  if (error) {
    return <LoadErrorScreen message={error} onRetry={reload} />;
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
            onAddTransaction={handleOpenAddDialog}
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
                element={
                  <TransactionsPage
                    transactions={transactions}
                    loading={transactionsLoading}
                    loadingMore={loadingMore}
                    hasMore={hasMore}
                    error={transactionsError}
                    onRetry={reloadTransactions}
                    onLoadMore={loadMore}
                    onEdit={handleEditTransaction}
                    onDelete={deleteTransaction}
                  />
                }
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
                    onRetry={reload}
                  />
                }
              />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>

        <AddTransactionDialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            setAddDialogOpen(open);
            if (!open) setEditingTransaction(null);
          }}
          onSave={handleSaveTransaction}
          transaction={editingTransaction}
          accounts={accounts}
          categories={categories}
        />
      </div>
    </NotificationProvider>
  );
}

export default function App() {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <SystemTheme>
        <LoadingScreen message="Connecting to AWS Cognito..." />
      </SystemTheme>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <SystemTheme>
        <LoginPage />
      </SystemTheme>
    );
  }

  // The provider is mounted only while signed in, so it fetches the user's
  // data once per sign-in and drops it on sign-out.
  return (
    <AppDataProvider>
      <AppShell />
    </AppDataProvider>
  );
}
