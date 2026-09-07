import { useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppProvider, useApp } from "./store";
import Layout from "./components/Layout";
import { Toasts } from "./components/ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Categories from "./pages/Categories";
import TransactionsPage from "./pages/Transactions";
import Groceries from "./pages/Groceries";
import Settings from "./pages/Settings";
import TransactionModal from "./modals/TransactionModal";
import TransferModal from "./modals/TransferModal";

function Shell() {
  const { authenticated, loading, loadError, accounts, transactions, refresh } = useApp();

  // Editing a transaction can start from the dashboard or the transactions
  // page, so the selection lives above both of them.

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [quickAdd, setQuickAdd] = useState(false);

  if (!authenticated) return <Login />;

  const firstLoad = loading && accounts.length === 0 && transactions.length === 0;

  return (
    <>
      <Layout onQuickAdd={() => setQuickAdd(true)}>
        {firstLoad ? (
          <div className="loading-screen">
            <div className="spinner" />
            <p>Loading your data...</p>
          </div>
        ) : loadError ? (
          <div className="loading-screen">
            <p className="text-sm font-semibold text-red-500">{loadError}</p>

            <button type="button" className="primary-button" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<Dashboard onEditTransaction={setEditingTransaction} />} />

            <Route path="/accounts" element={<Accounts />} />

            <Route path="/categories" element={<Categories />} />

            <Route
              path="/transactions"
              element={
                <TransactionsPage onEdit={setEditingTransaction} />
              }
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
          <TransferModal transfer={editingTransaction} onClose={() => setEditingTransaction(null)} />
        ) : (
          <TransactionModal transaction={editingTransaction} onClose={() => setEditingTransaction(null)} />
        ))}

      <Toasts />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppProvider>
  );
}
