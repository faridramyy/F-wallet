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
import { Toasts } from "./components/ui";
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

/*
  Shared by every "waiting on the network" state below: first load, the
  share-link handoff, and the loading spinner used while refreshing.
  Pulling it out once avoids repeating the same markup three times.
*/

function LoadingScreen({ message }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <div className="size-[26px] animate-spin rounded-full border-[2.5px] border-border border-t-foreground" />
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

  /*
    Share links look like /#/share/<token>. The token is swapped for a
    session and stripped from the URL straight away, so it does not sit
    in the address bar or get saved in history as a working credential.
  */

  const shareToken = location.pathname.startsWith("/share/")
    ? location.pathname.slice("/share/".length)
    : null;

  useEffect(() => {
    if (!shareToken) return;

    loginWithToken(shareToken);
    navigate("/dashboard", { replace: true });
  }, [shareToken, loginWithToken, navigate]);

  // Editing a transaction can start from the dashboard or the transactions
  // page, so the selection lives above both of them.

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
            <p className="text-sm font-semibold text-destructive">{loadError}</p>

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

      <Toasts />
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
