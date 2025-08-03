'use client'

import React, { createContext, useContext, ReactNode } from 'react'

interface ThemeColors {
  primary: string
  primaryRgb: string
}

interface Theme {
  colors: ThemeColors
}

const theme: Theme = {
  colors: {
    primary: '#6366F1',
    primaryRgb: '99, 102, 241'
  }
}

const ThemeContext = createContext<Theme | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): Theme {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}