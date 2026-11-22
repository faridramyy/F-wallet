import { useEffect } from "react";

// Applies "light" | "dark" | "system" to the <html> element.
// "system" follows the OS preference and updates live when it changes.
export function useTheme(theme) {
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
    systemPreference.addEventListener("change", applyTheme);

    return () => systemPreference.removeEventListener("change", applyTheme);
  }, [theme]);
}
