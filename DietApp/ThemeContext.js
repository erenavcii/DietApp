import React, { createContext, useState, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(false);

    const colors = {
        light: {
            background: '#f8f9fa',
            cardBg: '#fff',
            text: '#2c3e50',
            textSecondary: '#7f8c8d',
            primary: '#e74c3c',
            border: '#ecf0f1',
            inputBg: '#f5f6fa',
        },
        dark: {
            background: '#1a1a2e',
            cardBg: '#16213e',
            text: '#eee',
            textSecondary: '#bbb',
            primary: '#e74c3c',
            border: '#2a3f5f',
            inputBg: '#0f3460',
        }
    };

    const theme = isDark ? colors.dark : colors.light;

    const toggleTheme = () => setIsDark(!isDark);

    return (
        <ThemeContext.Provider value={{ isDark, theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
