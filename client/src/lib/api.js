const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const TOKEN_KEY = "fwallet_token";
const ROLE_KEY = "fwallet_role";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/*
  The role is cached alongside the token purely so the UI knows what to
  say before the first request comes back. It is never trusted for
  access control, which happens on the server.
*/

export function getRole() {
  return localStorage.getItem(ROLE_KEY) || "owner";
}

export function setRole(role) {
  if (role) {
    localStorage.setItem(ROLE_KEY, role);
  } else {
    localStorage.removeItem(ROLE_KEY);
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);

    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  if (!BASE_URL) {
    throw new ApiError(
      "VITE_API_URL is not set. Check the client build configuration.",
      0,
    );
  }

  const headers = {};

  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();

    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    // A cold Lambda plus a cold Atlas connection can take a few seconds.
    // A genuine network failure looks the same from here, so keep the
    // message honest rather than guessing.

    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
    );
  }

  if (response.status === 204) return null;

  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401 && auth) setToken("");

    throw new ApiError(
      payload?.error || `Request failed (${response.status}).`,
      response.status,
    );
  }

  return payload;
}

export const api = {
  login: (password) =>
    request("/auth/login", { method: "POST", body: { password }, auth: false }),
  check: () => request("/auth/check"),
  createShareLink: (days = 7) =>
    request("/auth/share-link", { method: "POST", body: { days } }),

  getState: () => request("/api/state"),

  createAccount: (data) =>
    request("/api/accounts", { method: "POST", body: data }),
  reorderAccounts: (ids) =>
    request("/api/accounts/reorder", { method: "PUT", body: { ids } }),
  updateAccount: (id, data) =>
    request(`/api/accounts/${id}`, { method: "PUT", body: data }),
  deleteAccount: (id) => request(`/api/accounts/${id}`, { method: "DELETE" }),

  createCategory: (data) =>
    request("/api/categories", { method: "POST", body: data }),
  reorderCategories: (ids) =>
    request("/api/categories/reorder", { method: "PUT", body: { ids } }),
  updateCategory: (id, data) =>
    request(`/api/categories/${id}`, { method: "PUT", body: data }),
  deleteCategory: (id) =>
    request(`/api/categories/${id}`, { method: "DELETE" }),

  createTransaction: (data) =>
    request("/api/transactions", { method: "POST", body: data }),
  updateTransaction: (id, data) =>
    request(`/api/transactions/${id}`, { method: "PUT", body: data }),
  deleteTransaction: (id) =>
    request(`/api/transactions/${id}`, { method: "DELETE" }),

  createGrocery: (data) =>
    request("/api/groceries", { method: "POST", body: data }),
  updateGrocery: (id, data) =>
    request(`/api/groceries/${id}`, { method: "PUT", body: data }),
  deleteGrocery: (id) => request(`/api/groceries/${id}`, { method: "DELETE" }),

  updateSettings: (data) =>
    request("/api/settings", { method: "PUT", body: data }),

  exportData: () => request("/api/export"),
  // ============================================================
  // ADD to client/src/lib/api.js
  // Inside the `export const api = { ... }` object
  // ============================================================

  createShoppingItem: (data) =>
    request("/api/shopping", { method: "POST", body: data }),
  updateShoppingItem: (id, data) =>
    request(`/api/shopping/${id}`, { method: "PUT", body: data }),
  deleteShoppingItem: (id) =>
    request(`/api/shopping/${id}`, { method: "DELETE" }),
  clearBoughtItems: () => request("/api/shopping/done", { method: "DELETE" }),
  reorderShopping: (ids) =>
    request("/api/shopping/reorder", { method: "PUT", body: { ids } }),
};
