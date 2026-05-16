import React, { createContext, useCallback, useContext, useState } from 'react';
import { lightColors, darkColors } from '../theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const toggle = useCallback(() => setIsDark(v => !v), []);
  const colors = isDark ? darkColors : lightColors;
  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme: toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
