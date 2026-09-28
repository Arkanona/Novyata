import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, loginUser, registerUser } from '../services/authService'

const AuthContext = createContext(null)
const TOKEN_KEY = 'novyata_auth_token'
const THEME_KEY = 'novyata_theme'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [theme, setThemePreference] = useState(() => localStorage.getItem(THEME_KEY) || 'light')

  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setIsLoading(false)
      return
    }

    getCurrentUser(token)
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoading(false))
  }, [])

  function saveSession(data) {
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
  }

  async function login(credentials) {
    const data = await loginUser(credentials)
    saveSession(data)
    return data.user
  }

  async function register(payload) {
    const data = await registerUser(payload)
    saveSession(data)
    return data.user
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, setUser, theme, setTheme: setThemePreference, isLoading, login, register, logout, isAuthenticated: Boolean(user) }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.')
  return context
}
