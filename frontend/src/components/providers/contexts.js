import { createContext } from "react";

// Kept apart from the provider components so React Fast Refresh keeps working
// (a component file should export only components).
export const AppDataContext = createContext(null);
export const NotificationContext = createContext(null);
