const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

const send = (path, user, options) => {
  const headers = {
    Authorization: `Bearer ${user.access_token}`,
    "X-ID-Token": user.id_token,
    ...options.headers,
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
};

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export async function apiRequest(path, auth, options = {}) {
  if (!auth?.user?.access_token || !auth?.user?.id_token) {
    throw new Error("You must be signed in to make this request.");
  }

  let response = await send(path, auth.user, options);
  let result = await readJson(response);

  // The backend answers 401 "token_expired" when the tokens have run out.
  // Renew them with the refresh token and retry the request once.
  if (response.status === 401 && result.code === "token_expired") {
    let renewed = null;

    try {
      renewed = await auth.signinSilent();
    } catch (error) {
      console.error("Token renewal failed:", error);
    }

    if (!renewed?.access_token || !renewed?.id_token) {
      // The refresh token is gone or expired: send the user back to sign in.
      await auth.removeUser();
      throw new Error("Your session has expired. Please sign in again.");
    }

    response = await send(path, renewed, options);
    result = await readJson(response);
  }

  if (!response.ok) {
    throw new Error(result.message || "An API request failed.");
  }

  return result;
}
