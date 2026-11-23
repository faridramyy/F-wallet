import { useEffect, useState } from "react";
import { AppDataContext } from "./contexts";
import { useAuth } from "react-oidc-context";

import { apiRequest } from "../../lib/api";


const TRANSACTIONS_PAGE_SIZE = 50;

// Newest first. The API already sorts this way, but after a local add or edit
// the order has to be restored.
const sortTransactions = (list) =>
  [...list].sort(
    (a, b) =>
      b.transaction_date.localeCompare(a.transaction_date) ||
      b.created_at.localeCompare(a.created_at),
  );

// Loads everything the signed-in user owns (GET /bootstrap plus the first
// page of GET /transactions, in parallel) and keeps it in state for the
// whole app.
//
// Pages read the data with useAppData() instead of fetching it themselves.
// After a create/update/delete, a page calls the matching setter so the
// shared copy stays correct without another request.
//
// This provider is only mounted while the user is signed in, so signing out
// unmounts it and all of the data is discarded.
export function AppDataProvider({ children }) {
  const auth = useAuth();
  const { isAuthenticated } = auth;

  const [settings, setSettings] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [archivedAccounts, setArchivedAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [archivedCategories, setArchivedCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [loadingMoreTransactions, setLoadingMoreTransactions] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bumped by reload() to run the load effect again.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Ignore a response that arrives after this effect was cleaned up
    // (sign-out, a retry, or React StrictMode's extra dev-mode run).
    let cancelled = false;

    async function load() {
      try {
        const [bootstrap, transactionPage] = await Promise.all([
          apiRequest("/bootstrap", auth),
          apiRequest(
            `/transactions?limit=${TRANSACTIONS_PAGE_SIZE}&offset=0`,
            auth,
          ),
        ]);
        if (cancelled) return;

        const data = bootstrap.data;

        setSettings(data.settings);
        setAccounts(data.accounts);
        setArchivedAccounts(data.archived_accounts);
        setCategories(data.categories);
        setArchivedCategories(data.archived_categories);
        setBudgets(data.budgets);
        setTransactions(transactionPage.data.transactions ?? []);
        setHasMoreTransactions(
          Boolean(transactionPage.data.pagination?.has_more),
        );
      } catch (err) {
        if (cancelled) return;

        console.error("Failed to load app data:", err);
        setError(err.message || "Unable to load your data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };

    // Load once per sign-in (or per retry). The `auth` object changes identity
    // when the token is renewed, and re-fetching then would flash the loading
    // screen, so it is deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, reloadKey]);

  // Used by the "Try again" button after a failed load.
  const reload = () => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  };

  const loadMoreTransactions = async () => {
    setLoadingMoreTransactions(true);

    try {
      const response = await apiRequest(
        `/transactions?limit=${TRANSACTIONS_PAGE_SIZE}&offset=${transactions.length}`,
        auth,
      );

      setTransactions((current) => {
        const known = new Set(current.map((item) => item.transaction_id));
        const fresh = response.data.transactions.filter(
          (item) => !known.has(item.transaction_id),
        );

        return sortTransactions([...current, ...fresh]);
      });

      setHasMoreTransactions(Boolean(response.data.pagination?.has_more));
    } finally {
      setLoadingMoreTransactions(false);
    }
  };

  const createTransaction = async (body) => {
    const response = await apiRequest("/transactions", auth, {
      method: "POST",
      body: JSON.stringify(body),
    });

    setTransactions((current) =>
      sortTransactions([response.data.transaction, ...current]),
    );
  };

  const updateTransaction = async (transactionId, changes) => {
    const response = await apiRequest(`/transactions/${transactionId}`, auth, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });

    setTransactions((current) =>
      sortTransactions(
        current.map((item) =>
          item.transaction_id === transactionId
            ? response.data.transaction
            : item,
        ),
      ),
    );
  };

  const deleteTransaction = async (transactionId) => {
    await apiRequest(`/transactions/${transactionId}`, auth, {
      method: "DELETE",
    });

    setTransactions((current) =>
      current.filter((item) => item.transaction_id !== transactionId),
    );
  };

  const value = {
    settings,
    setSettings,
    accounts,
    setAccounts,
    archivedAccounts,
    setArchivedAccounts,
    categories,
    setCategories,
    archivedCategories,
    setArchivedCategories,
    budgets,
    setBudgets,
    transactions,
    hasMoreTransactions,
    loadingMoreTransactions,
    loadMoreTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    loading,
    error,
    reload,
  };

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}
