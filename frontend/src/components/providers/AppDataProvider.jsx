import { createContext, useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import { apiRequest } from "../../lib/api";

export const AppDataContext = createContext(null);

// Loads everything the signed-in user owns with ONE request
// (GET /bootstrap) and keeps it in state for the whole app.
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
        const response = await apiRequest("/bootstrap", auth);
        if (cancelled) return;

        const data = response.data;

        setSettings(data.settings);
        setAccounts(data.accounts);
        setArchivedAccounts(data.archived_accounts);
        setCategories(data.categories);
        setArchivedCategories(data.archived_categories);
        setBudgets(data.budgets);
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
    loading,
    error,
    reload,
  };

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}
