import { z } from 'zod'

export const emailSchema = z.string().trim().email('Enter a valid email address.')
export const passwordSchema = z.string().min(8, 'Password must contain at least 8 characters.')

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const passwordConfirmationSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export function authErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Something went wrong. Please try again.'
  const message = error.message.toLowerCase()
  if (message.includes('invalid login credentials')) return 'Email or password is incorrect.'
  if (message.includes('email not confirmed')) return 'Confirm your email before signing in.'
  if (message.includes('user already registered'))
    return 'An account with this email already exists.'
  if (message.includes('rate limit')) return 'Too many attempts. Please wait and try again.'
  if (message.includes('auth session missing')) {
    return 'Open the password reset link from your email and try again.'
  }
  if (message.includes('authentication is not configured')) return error.message
  return 'Something went wrong. Please try again.'
}
