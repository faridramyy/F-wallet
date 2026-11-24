import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import { AppDataContext } from "./contexts";
import { createApi } from "../../lib/api";
import { removeById, replaceById } from "../../lib/collections";
import {
  HISTORY_MONTHS,
  getMonthContext,
  shiftMonth,
} from "../../lib/analytics";

const TRANSACTIONS_PAGE_SIZE = 50;

// The dashboard can analyse any of the last 12 months (with a 6-month cash
// flow chart), so the first load fetches that much history (in pages of 200,
// the API maximum). Older history is paged in with "Load more".
const WINDOW_PAGE_SIZE = 200;
const MAX_WINDOW_PAGES = 25;

async function loadTransactionWindow(api) {
  const { current } = getMonthContext();
  const since = `${shiftMonth(current.year, current.month, 1 - HISTORY_MONTHS).key}-01`;

  let transactions = [];
  let hasMore = true;

  for (let page = 0; page < MAX_WINDOW_PAGES && hasMore; page += 1) {
    const { data } = await api.get(
      `/transactions?limit=${WINDOW_PAGE_SIZE}&offset=${transactions.length}`,
    );

    transactions = transactions.concat(data.transactions);
    hasMore = Boolean(data.pagination?.has_more);

    // Newest first, so once a page reaches past the window we have it all.
    if (transactions.at(-1)?.transaction_date < since) break;
  }

  return { transactions, hasMore };
}

// Newest first. The API already sorts this way, but after a local add or edit
// the order has to be restored.
const sortTransactions = (list) =>
  [...list].sort(
    (a, b) =>
      b.transaction_date.localeCompare(a.transaction_date) ||
      b.created_at.localeCompare(a.created_at),
  );

// Loads everything the signed-in user owns (GET /bootstrap plus at least the
// last 6 months of transactions, in parallel) and keeps it in state for the
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
  const api = createApi(auth);

  const [settings, setSettings] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [archivedAccounts, setArchivedAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [archivedCategories, setArchivedCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);

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
        const [bootstrap, transactionWindow] = await Promise.all([
          api.get("/bootstrap"),
          loadTransactionWindow(api),
        ]);
        if (cancelled) return;

        const data = bootstrap.data;

        setSettings(data.settings);
        setAccounts(data.accounts);
        setArchivedAccounts(data.archived_accounts);
        setCategories(data.categories);
        setArchivedCategories(data.archived_categories);
        setBudgets(data.budgets);
        setTransactions(transactionWindow.transactions);
        setHasMoreTransactions(transactionWindow.hasMore);
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
      const { data } = await api.get(
        `/transactions?limit=${TRANSACTIONS_PAGE_SIZE}&offset=${transactions.length}`,
      );

      setTransactions((current) => {
        const known = new Set(current.map((item) => item.transaction_id));
        const fresh = data.transactions.filter(
          (item) => !known.has(item.transaction_id),
        );

        return sortTransactions([...current, ...fresh]);
      });

      setHasMoreTransactions(Boolean(data.pagination?.has_more));
    } finally {
      setLoadingMoreTransactions(false);
    }
  };

  const createTransaction = async (body) => {
    const { data } = await api.post("/transactions", body);

    setTransactions((current) =>
      sortTransactions([data.transaction, ...current]),
    );
  };

  const updateTransaction = async (transactionId, changes) => {
    const { data } = await api.patch(`/transactions/${transactionId}`, changes);

    setTransactions((current) =>
      sortTransactions(
        replaceById(current, "transaction_id", data.transaction),
      ),
    );
  };

  const deleteTransaction = async (transactionId) => {
    await api.delete(`/transactions/${transactionId}`);

    setTransactions((current) =>
      removeById(current, "transaction_id", transactionId),
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
