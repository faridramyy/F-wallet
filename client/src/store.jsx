import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { api, getToken, setToken, getRole, setRole, ApiError } from "./lib/api";

const AppContext = createContext(null);

const READ_ONLY_MESSAGE =
  "This is a read only user. You do not have permission to make changes.";

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

  /*
    Ends the session and forgets everything loaded for it. Used for a
    manual sign out and, via expireSession, when the server says 401.
  */

  const logout = useCallback(() => {
    setToken("");
    setRole("");
    setRoleState("owner");
    setAuthenticated(false);
    setData(EMPTY_STATE);
  }, []);

  const expireSession = useCallback(() => {
    logout();
    toast.error("Your session expired. Please sign in again.");
  }, [logout]);

  /*
    Every refresh gets a number. If a newer refresh has started by the time
    an older one finishes, the older answer is dropped. Without this, two
    quick changes start two requests, and whichever response arrives last
    wins even when it is the older data.
  */

  const latestRefresh = useRef(0);

  const refresh = useCallback(async () => {
    latestRefresh.current += 1;

    const requestId = latestRefresh.current;
    const isLatest = () => requestId === latestRefresh.current;

    setLoading(true);
    setLoadError("");

    try {
      const next = await api.getState();

      if (isLatest()) setData({ ...EMPTY_STATE, ...next });
    } catch (error) {
      if (!isLatest()) return;

      if (error instanceof ApiError && error.status === 401) {
        expireSession();
      } else {
        setLoadError(error.message);
      }
    } finally {
      if (isLatest()) setLoading(false);
    }
  }, [expireSession]);

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

      document.documentElement.classList.toggle("dark", isDark);
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

  /*
    Signing in from a share link. The token is already minted by the
    server, so there is no password step.
  */

  const loginWithToken = useCallback((token) => {
    // Opening a share link in a browser where the owner is signed in would
    // overwrite the owner's token and lock them out of their own account.
    if (getToken() && getRole() !== "viewer") {
      toast.info(
        "You are already signed in, so the share link was not applied. Open it in a private window to preview the read-only view.",
      );

      return;
    }

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

  /*
    Viewers are stopped here as well as on the server. Not for security,
    which the server handles, but so the error is instant instead of
    arriving after a round trip to a cold Lambda.

    run() is the one place that reports results to the user. It never
    throws: it shows a toast and returns true or false, so callers that do
    not care (a delete button) cannot cause an unhandled rejection, and
    callers that do care (a form) just check the result.
  */

  const run = useCallback(
    async (action, successMessage) => {
      if (role === "viewer") {
        toast.error(READ_ONLY_MESSAGE);

        return false;
      }

      try {
        await action();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          expireSession();
        } else {
          toast.error(error.message || "Something went wrong.");
        }

        return false;
      }

      if (successMessage) toast.success(successMessage);

      await refresh();

      return true;
    },
    [refresh, expireSession, role],
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
