import { createContext } from "react";

import type { ThemeProviderState } from "./theme-context";

export const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);
