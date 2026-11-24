import { useEffect } from "react";

const STORAGE_KEY = "f-wallet-theme";

// The last theme used on this device. index.html applies it before the first
// paint, so a dark-theme user never sees a flash of the light theme.
export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "system";
  } catch {
    return "system";
  }
}

// Applies "light" | "dark" | "system" to the <html> element.
// "system" follows the OS preference and updates live when it changes.
// With remember=true it also becomes the device's stored theme.
export function useTheme(theme, remember = true) {
  useEffect(() => {
    const root = document.documentElement;
    const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const isDark =
        theme === "dark" || (theme === "system" && systemPreference.matches);

      root.classList.toggle("dark", isDark);
      root.style.colorScheme = isDark ? "dark" : "light";
    };

    applyTheme();

    if (remember) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // Storage can be unavailable (private mode); the theme still applies.
      }
    }

    systemPreference.addEventListener("change", applyTheme);

    return () => systemPreference.removeEventListener("change", applyTheme);
  }, [theme, remember]);
}
