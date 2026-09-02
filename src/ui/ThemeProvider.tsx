import type { ReactNode } from 'react';
import { ThemeContext, useResolvedTheme } from './theme';

/**
 * Resolves the theme once for the whole app. Every card would otherwise need its own media-query
 * listener, and each of them would write the theme back onto the document on every render.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useResolvedTheme();
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
