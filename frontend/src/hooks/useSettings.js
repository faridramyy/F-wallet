import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import { apiRequest } from "../lib/api";

// Loads the signed-in user's settings (including the theme) from the API.
// `loading` stays true until the first request finishes.
export function useSettings() {
  const auth = useAuth();
  const { isAuthenticated } = auth;

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await apiRequest("/settings", auth);

      setSettings(response.data.settings);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchSettings();

    // Load once per sign-in. The `auth` object can change identity (for
    // example when the token is renewed), and re-fetching then would flash
    // the loading screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const reload = () => {
    setLoading(true);
    fetchSettings();
  };

  return { settings, setSettings, loading, reload };
}
