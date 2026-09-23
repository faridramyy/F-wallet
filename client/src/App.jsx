import { useEffect, useState } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { AppProvider, useApp } from "./store";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Categories from "./pages/Categories";
import TransactionsPage from "./pages/Transactions";
import Groceries from "./pages/Groceries";
import Settings from "./pages/Settings";
import TransactionModal from "./modals/TransactionModal";
import TransferModal from "./modals/TransferModal";

function LoadingScreen({ message }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <div className="size-6.5 animate-spin rounded-full border-[2.5px] border-border border-t-foreground" />
      <p>{message}</p>
    </div>
  );
}

function Shell() {
  const {
    authenticated,
    loading,
    loadError,
    accounts,
    transactions,
    refresh,
    loginWithToken,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();

  const shareToken = location.pathname.startsWith("/share/")
    ? location.pathname.slice("/share/".length)
    : null;

  useEffect(() => {
    if (!shareToken) return;

    loginWithToken(shareToken);
    navigate("/dashboard", { replace: true });
  }, [shareToken, loginWithToken, navigate]);

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [quickAdd, setQuickAdd] = useState(false);

  if (shareToken) {
    return <LoadingScreen message="Opening shared view..." />;
  }

  if (!authenticated) return <Login />;

  const firstLoad =
    loading && accounts.length === 0 && transactions.length === 0;

  return (
    <>
      <Layout onQuickAdd={() => setQuickAdd(true)}>
        {firstLoad ? (
          <LoadingScreen message="Loading your data..." />
        ) : loadError ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm font-semibold text-destructive">
              {loadError}
            </p>

            <Button type="button" onClick={refresh}>
              Try again
            </Button>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route
              path="/dashboard"
              element={<Dashboard onEditTransaction={setEditingTransaction} />}
            />

            <Route path="/accounts" element={<Accounts />} />

            <Route path="/categories" element={<Categories />} />

            <Route
              path="/transactions"
              element={<TransactionsPage onEdit={setEditingTransaction} />}
            />

            <Route path="/groceries" element={<Groceries />} />

            <Route path="/settings" element={<Settings />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        )}
      </Layout>

      {quickAdd && <TransactionModal onClose={() => setQuickAdd(false)} />}

      {editingTransaction &&
        (editingTransaction.type === "transfer" ? (
          <TransferModal
            transfer={editingTransaction}
            onClose={() => setEditingTransaction(null)}
          />
        ) : (
          <TransactionModal
            transaction={editingTransaction}
            onClose={() => setEditingTransaction(null)}
          />
        ))}

      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <Shell />
        </HashRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
