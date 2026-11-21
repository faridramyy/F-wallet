const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

export async function apiRequest(path, auth, options = {}) {
  if (!auth?.user?.access_token || !auth?.user?.id_token) {
    throw new Error("You must be authenticated to make this request.");
  }

  const headers = {
    Authorization: `Bearer ${auth.user.access_token}`,
    "X-ID-Token": auth.user.id_token,
    ...options.headers,
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "An API request failed.");
  }

  return result;
}
