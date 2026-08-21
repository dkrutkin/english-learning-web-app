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
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const redirectUrl = (path: string) => new URL(path, window.location.origin).toString()

function requireSupabase() {
  if (!supabase) {
    throw new Error('Authentication is not configured. Add the Supabase environment variables.')
  }
  return supabase
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? 'loading' : 'unauthenticated',
  )

  useEffect(() => {
    if (!supabase) return

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
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      isConfigured: isSupabaseConfigured,
      async signIn(email, password) {
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
        const { error } = await requireSupabase().auth.signOut({ scope: 'local' })
        if (error) throw error
      },
    }),
    [session, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- Hook and provider intentionally share one context module.
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
