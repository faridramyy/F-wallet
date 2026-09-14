import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { api, getToken, setToken, getRole, setRole, ApiError } from "./lib/api";

const AppContext = createContext(null);

const EMPTY_STATE = {
  accounts: [],
  categories: [],
  transactions: [],
  groceries: [],
  shopping: [],
  settings: { currency: "CAD", theme: "system" },
};

export function AppProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [role, setRoleState] = useState(getRole());
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

  /*
    Theme.

    "system" follows whatever the phone or laptop is set to, and keeps
    following it. The listener matters: if you leave the app open while
    the device flips to dark at sunset, this switches with it rather than
    waiting for a reload.
  */

  useEffect(() => {
    const theme = data.settings?.theme || "system";

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && media.matches);

      document.documentElement.classList.toggle("dark-mode", isDark);
      document.body.classList.toggle("dark-mode", isDark);
    };

    apply();

    if (theme !== "system") return undefined;

    media.addEventListener("change", apply);

    return () => media.removeEventListener("change", apply);
  }, [data.settings?.theme]);

  const login = useCallback(async (password) => {
    const result = await api.login(password);

    setToken(result.token);
    setRole(result.role || "owner");
    setRoleState(result.role || "owner");
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setRole("");
    setRoleState("owner");
    setAuthenticated(false);
    setData(EMPTY_STATE);
  }, []);

  /*
    Signing in from a share link. The token is already minted by the
    server, so there is no password step.
  */

  const loginWithToken = useCallback((token) => {
    setToken(token);
    setRole("viewer");
    setRoleState("viewer");
    setAuthenticated(true);
  }, []);

  /*
    Mutations refetch the whole state afterwards rather than patching it
    locally. With a dataset this size the extra request costs nothing, and
    it removes a whole class of bug where the screen and the database
    quietly disagree.
  */

  const READ_ONLY_MESSAGE =
    "This is a read only user. You do not have permission to make changes.";

  /*
    Viewers are stopped here as well as on the server. Not for security,
    which the server handles, but so the error is instant instead of
    arriving after a round trip to a cold Lambda.
  */

  const run = useCallback(
    async (action, successMessage) => {
      if (role === "viewer") {
        showToast(READ_ONLY_MESSAGE, "error");

        throw new ApiError(READ_ONLY_MESSAGE, 403);
      }

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
    [refresh, showToast, role],
  );

  const actions = useMemo(
    () => ({
      createAccount: (payload) =>
        run(() => api.createAccount(payload), "Account added."),
      updateAccount: (id, payload) =>
        run(() => api.updateAccount(id, payload), "Account updated."),
      deleteAccount: (id) =>
        run(() => api.deleteAccount(id), "Account deleted."),
      reorderAccounts: (ids) => run(() => api.reorderAccounts(ids)),

      createCategory: (payload) =>
        run(() => api.createCategory(payload), "Category added."),
      updateCategory: (id, payload) =>
        run(() => api.updateCategory(id, payload), "Category updated."),
      deleteCategory: (id) =>
        run(() => api.deleteCategory(id), "Category deleted."),
      reorderCategories: (ids) => run(() => api.reorderCategories(ids)),

      createTransaction: (payload) =>
        run(() => api.createTransaction(payload), "Transaction added."),
      updateTransaction: (id, payload) =>
        run(() => api.updateTransaction(id, payload), "Transaction updated."),
      deleteTransaction: (id) =>
        run(() => api.deleteTransaction(id), "Transaction deleted."),

      createGrocery: (payload) =>
        run(() => api.createGrocery(payload), "Price entry added."),
      updateGrocery: (id, payload) =>
        run(() => api.updateGrocery(id, payload), "Price entry updated."),
      deleteGrocery: (id) =>
        run(() => api.deleteGrocery(id), "Price entry deleted."),

      updateSettings: (payload) =>
        run(() => api.updateSettings(payload), "Settings saved."),
      createShoppingItem: (payload) =>
        run(() => api.createShoppingItem(payload)),
      updateShoppingItem: (id, payload) =>
        run(() => api.updateShoppingItem(id, payload)),
      deleteShoppingItem: (id) => run(() => api.deleteShoppingItem(id)),
      clearBoughtItems: () =>
        run(() => api.clearBoughtItems(), "List cleared."),
    }),
    [run],
  );

  const lookups = useMemo(() => {
    const accountsById = new Map(
      data.accounts.map((account) => [account.id, account]),
    );
    const categoriesById = new Map(
      data.categories.map((category) => [category.id, category]),
    );

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
      role,
      isViewer: role === "viewer",
      loginWithToken,
      createShareLink: api.createShareLink,
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
    [
      data,
      authenticated,
      role,
      loginWithToken,
      loading,
      loadError,
      toasts,
      showToast,
      refresh,
      login,
      logout,
      actions,
      lookups,
    ],
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
