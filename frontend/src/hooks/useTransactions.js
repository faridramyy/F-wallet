import { useCallback, useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import { apiRequest } from "../lib/api";

const PAGE_SIZE = 50;

// Newest first. The API already sorts this way, but after we add or edit a
// row locally we must restore the order ourselves.
function sortTransactions(list) {
  return [...list].sort(
    (a, b) =>
      b.transaction_date.localeCompare(a.transaction_date) ||
      b.created_at.localeCompare(a.created_at),
  );
}

// Owns the transactions list: fetching, pagination, and CRUD.
// Accounts and categories come from AppDataProvider (bootstrap) — no need to
// fetch them again here.
export function useTransactions() {
  const auth = useAuth();
  const { isAuthenticated } = auth;

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest(
        `/transactions?limit=${PAGE_SIZE}&offset=0`,
        auth,
      );

      setTransactions(response.data.transactions || []);
      setHasMore(Boolean(response.data.pagination?.has_more));
    } catch (err) {
      setError(err.message || "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (isAuthenticated) load();

    // Load once per sign-in. `auth` changes identity on token renewal and
    // re-fetching then would flash the UI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadMore = async () => {
    setLoadingMore(true);

    try {
      const response = await apiRequest(
        `/transactions?limit=${PAGE_SIZE}&offset=${transactions.length}`,
        auth,
      );

      setTransactions((current) => {
        const known = new Set(current.map((item) => item.transaction_id));
        const fresh = response.data.transactions.filter(
          (item) => !known.has(item.transaction_id),
        );

        return sortTransactions([...current, ...fresh]);
      });

      setHasMore(Boolean(response.data.pagination?.has_more));
    } finally {
      setLoadingMore(false);
    }
  };

  const createTransaction = async (data) => {
    const response = await apiRequest("/transactions", auth, {
      method: "POST",
      body: JSON.stringify(data),
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

  return {
    transactions,
    loading,
    loadingMore,
    hasMore,
    error,
    reload: load,
    loadMore,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
