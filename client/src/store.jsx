import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { api, getToken, setToken, ApiError } from "./lib/api";

const AppContext = createContext(null);

const EMPTY_STATE = {
  accounts: [],
  categories: [],
  transactions: [],
  groceries: [],
  settings: { currency: "CAD", theme: "light" },
};

export function AppProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [data, setData] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [toasts, setToasts] = useState([]);

  const toastId = useRef(0);

  const showToast = useCallback((message, tone = "success") => {
    toastId.current += 1;

    const id = toastId.current;

    setToasts((current) => [...current, { id, message, tone }]);

    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const next = await api.getState();

      setData({ ...EMPTY_STATE, ...next });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAuthenticated(false);
      } else {
        setLoadError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) refresh();
  }, [authenticated, refresh]);

  // Theme is a data field, so it applies on whatever device you sign in on.

  useEffect(() => {
    const isDark = data.settings?.theme === "dark";

    document.documentElement.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("dark-mode", isDark);
  }, [data.settings?.theme]);

  const login = useCallback(
    async (password) => {
      const result = await api.login(password);

      setToken(result.token);
      setAuthenticated(true);
    },
    [],
  );

  const logout = useCallback(() => {
    setToken("");
    setAuthenticated(false);
    setData(EMPTY_STATE);
  }, []);

  /*
    Mutations refetch the whole state afterwards rather than patching it
    locally. With a dataset this size the extra request costs nothing, and
    it removes a whole class of bug where the screen and the database
    quietly disagree.
  */

  const run = useCallback(
    async (action, successMessage) => {
      try {
        const result = await action();

        await refresh();

        if (successMessage) showToast(successMessage, "success");

        return result;
      } catch (error) {
        showToast(error.message || "Something went wrong.", "error");

        throw error;
      }
    },
    [refresh, showToast],
  );

  const actions = useMemo(
    () => ({
      createAccount: (payload) => run(() => api.createAccount(payload), "Account added."),
      updateAccount: (id, payload) => run(() => api.updateAccount(id, payload), "Account updated."),
      deleteAccount: (id) => run(() => api.deleteAccount(id), "Account deleted."),

      createCategory: (payload) => run(() => api.createCategory(payload), "Category added."),
      updateCategory: (id, payload) => run(() => api.updateCategory(id, payload), "Category updated."),
      deleteCategory: (id) => run(() => api.deleteCategory(id), "Category deleted."),

      createTransaction: (payload) => run(() => api.createTransaction(payload), "Transaction added."),
      updateTransaction: (id, payload) => run(() => api.updateTransaction(id, payload), "Transaction updated."),
      deleteTransaction: (id) => run(() => api.deleteTransaction(id), "Transaction deleted."),

      createGrocery: (payload) => run(() => api.createGrocery(payload), "Price entry added."),
      updateGrocery: (id, payload) => run(() => api.updateGrocery(id, payload), "Price entry updated."),
      deleteGrocery: (id) => run(() => api.deleteGrocery(id), "Price entry deleted."),

      updateSettings: (payload) => run(() => api.updateSettings(payload), "Settings saved."),
    }),
    [run],
  );

  const lookups = useMemo(() => {
    const accountsById = new Map(data.accounts.map((account) => [account.id, account]));
    const categoriesById = new Map(data.categories.map((category) => [category.id, category]));

    return {
      getAccount: (id) => accountsById.get(id) || null,
      getCategory: (id) => categoriesById.get(id) || null,
      getAccountName: (id) => accountsById.get(id)?.name || "Unknown account",
      getCategoryName: (id) => categoriesById.get(id)?.name || "Uncategorized",
    };
  }, [data.accounts, data.categories]);

  const value = useMemo(
    () => ({
      ...data,
      currency: data.settings?.currency || "CAD",
      authenticated,
      loading,
      loadError,
      toasts,
      showToast,
      refresh,
      login,
      logout,
      ...actions,
      ...lookups,
    }),
    [data, authenticated, loading, loadError, toasts, showToast, refresh, login, logout, actions, lookups],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider.");
  }

  return context;
}
