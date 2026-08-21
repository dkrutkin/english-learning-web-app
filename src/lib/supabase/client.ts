import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})
const parsedEnv = envSchema.safeParse(import.meta.env)
export const supabase: SupabaseClient | null = parsedEnv.success
  ? createClient(parsedEnv.data.VITE_SUPABASE_URL, parsedEnv.data.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
export const isSupabaseConfigured = parsedEnv.success
