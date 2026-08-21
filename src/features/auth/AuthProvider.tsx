import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  session: Session | null
  user: User | null
  status: AuthStatus
  isConfigured: boolean
  mockCredentials: { email: string; password: string } | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const mockSessionStorageKey = import.meta.env.DEV ? 'fluent-local-mock-session' : ''
const mockCredentials = import.meta.env.DEV
  ? {
      email: 'demo@fluent.local',
      password: 'FluentDemo2026!',
    }
  : null
const isMockAuthEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true'

function createMockSession(): Session {
  if (!mockCredentials) throw new Error('Local mock authentication is unavailable.')

  const timestamp = new Date().toISOString()
  const user: User = {
    id: '00000000-0000-4000-8000-000000000001',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { display_name: 'Demo Learner' },
    aud: 'authenticated',
    created_at: timestamp,
    updated_at: timestamp,
    email: mockCredentials.email,
    email_confirmed_at: timestamp,
    confirmed_at: timestamp,
    last_sign_in_at: timestamp,
    role: 'authenticated',
    identities: [],
    is_anonymous: false,
  }

  return {
    access_token: 'fluent-local-mock-access-token',
    refresh_token: 'fluent-local-mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  }
}

function hasStoredMockSession() {
  return isMockAuthEnabled && window.localStorage.getItem(mockSessionStorageKey) === 'true'
}

const redirectUrl = (path: string) => new URL(path, window.location.origin).toString()

function requireSupabase() {
  if (!supabase) {
    throw new Error('Authentication is not configured. Add the Supabase environment variables.')
  }
  return supabase
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [isUsingMock, setIsUsingMock] = useState(hasStoredMockSession)
  const [session, setSession] = useState<Session | null>(() =>
    hasStoredMockSession() ? createMockSession() : null,
  )
  const [status, setStatus] = useState<AuthStatus>(() => {
    if (hasStoredMockSession()) return 'authenticated'
    return isSupabaseConfigured ? 'loading' : 'unauthenticated'
  })

  useEffect(() => {
    if (isUsingMock || !supabase) return

    let isMounted = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      setSession(error ? null : data.session)
      setStatus(!error && data.session ? 'authenticated' : 'unauthenticated')
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setStatus(nextSession ? 'authenticated' : 'unauthenticated')
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [isUsingMock])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      isConfigured: isSupabaseConfigured || isMockAuthEnabled,
      mockCredentials: isMockAuthEnabled && mockCredentials ? mockCredentials : null,
      async signIn(email, password) {
        if (
          isMockAuthEnabled &&
          mockCredentials &&
          email === mockCredentials.email &&
          password === mockCredentials.password
        ) {
          window.localStorage.setItem(mockSessionStorageKey, 'true')
          setIsUsingMock(true)
          setSession(createMockSession())
          setStatus('authenticated')
          return
        }
        const { error } = await requireSupabase().auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      async signUp(email, password) {
        const { data, error } = await requireSupabase().auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl('/confirm-email') },
        })
        if (error) throw error
        return { needsEmailConfirmation: data.session === null }
      },
      async requestPasswordReset(email) {
        const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl('/reset-password'),
        })
        if (error) throw error
      },
      async updatePassword(password) {
        const client = requireSupabase()
        const { error } = await client.auth.updateUser({ password })
        if (error) throw error
        await client.auth.signOut({ scope: 'local' })
      },
      async signOut() {
        if (isUsingMock) {
          window.localStorage.removeItem(mockSessionStorageKey)
          setSession(null)
          setStatus('unauthenticated')
          setIsUsingMock(false)
          return
        }
        const { error } = await requireSupabase().auth.signOut({ scope: 'local' })
        if (error) throw error
      },
    }),
    [isUsingMock, session, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- Hook and provider intentionally share one context module.
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
