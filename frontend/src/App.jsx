import { Suspense, lazy, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "cn";

import { AppSidebar } from "./components/layout/AppSidebar";
import { AppHeader } from "./components/layout/AppHeader";
import { MobileNavigation } from "./components/layout/MobileNavigation";
import { NotificationProvider } from "./components/providers/NotificationProvider";
import { AppDataProvider } from "./components/providers/AppDataProvider";
import { useAppData } from "./components/providers/useAppData";
import { AddTransactionDialog } from "./components/transactions/AddTransactionDialog";
import { Button } from "./components/ui/button";
import { FullScreenMessage, Spinner } from "./components/ui/spinner";
import { getStoredTheme, useTheme } from "./hooks/useTheme";
import { navigation } from "./lib/navigation";

// Each page is its own chunk, downloaded the first time it is opened. The
// drag-and-drop library, for example, is only loaded by Accounts/Categories.
const lazyNamed = (load, name) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

const DashboardPage = lazyNamed(() => import("./pages/DashboardPage"), "DashboardPage");
const TransactionsPage = lazyNamed(() => import("./pages/TransactionsPage"), "TransactionsPage");
const AccountsPage = lazyNamed(() => import("./pages/AccountsPage"), "AccountsPage");
const CategoryPage = lazyNamed(() => import("./pages/CategoryPage"), "CategoryPage");
const SettingsPage = lazyNamed(() => import("./pages/SettingsPage"), "SettingsPage");
const LoginPage = lazy(() => import("./pages/LoginPage"));

// Screens shown before the user's settings are known use the last theme
// chosen on this device.
function StoredTheme({ children }) {
  useTheme(getStoredTheme());
  return children;
}

// Everything the user sees after signing in. It is rendered inside
// AppDataProvider, which has already started loading all of the user's data.
function AppShell() {
  const location = useLocation();
  const {
    settings,
    setSettings,
    accounts,
    categories,
    createTransaction,
    updateTransaction,
    loading,
    error,
    reload,
  } = useAppData();

  // null = closed, {} = adding, { transaction } = editing
  const [transactionDialog, setTransactionDialog] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [themePreview, setThemePreview] = useState(null);

  // The theme comes from the database. An unsaved preview from the settings
  // page wins until it is saved or discarded, and is not remembered.
  useTheme(
    themePreview ?? settings?.theme ?? getStoredTheme(),
    themePreview === null,
  );

  const title =
    navigation.find((item) => item.path === location.pathname)?.label ??
    "Dashboard";

  const editingTransaction = transactionDialog?.transaction ?? null;

  const handleSaveTransaction = (body) =>
    editingTransaction
      ? updateTransaction(editingTransaction.transaction_id, body)
      : createTransaction(body);

  // Nothing renders until all of the user's data has arrived, so pages never
  // have to show their own loading states.
  if (loading) {
    return <FullScreenMessage spinner message="Loading your data..." />;
  }

  if (error) {
    return (
      <FullScreenMessage message="We couldn't load your data." detail={error}>
        <Button variant="outline" onClick={reload}>
          Try again
        </Button>
      </FullScreenMessage>
    );
  }

  const contentOffset = sidebarOpen ? "md:pl-62" : "md:pl-19";

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar sidebarOpen={sidebarOpen} />
        <MobileNavigation />

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={sidebarOpen}
          className={cn(
            "fixed top-8 z-40 hidden -translate-x-1/2 rounded-full bg-card text-muted-foreground shadow-sm transition-all duration-200 md:inline-flex",
            sidebarOpen ? "left-62" : "left-19",
          )}
        >
          <Menu />
        </Button>

        <main
          className={cn(
            "min-h-screen transition-all duration-200",
            contentOffset,
          )}
        >
          <AppHeader
            title={title}
            onAddTransaction={() => setTransactionDialog({})}
          />

          <div className="mx-auto w-full max-w-400 p-5 pb-28 sm:p-8 sm:pb-28 md:pb-8 lg:p-10">
            <Suspense
              fallback={
                <div className="flex justify-center py-24">
                  <Spinner />
                </div>
              }
            >
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route
                  path="/transactions"
                  element={
                    <TransactionsPage
                      onEdit={(transaction) =>
                        setTransactionDialog({ transaction })
                      }
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
            </Suspense>
          </div>
        </main>

        <AddTransactionDialog
          open={transactionDialog !== null}
          onOpenChange={(open) => !open && setTransactionDialog(null)}
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
      <StoredTheme>
        <FullScreenMessage spinner message="Signing you in..." />
      </StoredTheme>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <StoredTheme>
        <Suspense fallback={<FullScreenMessage spinner message="Loading..." />}>
          <LoginPage />
        </Suspense>
      </StoredTheme>
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
