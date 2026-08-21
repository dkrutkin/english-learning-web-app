import { describe, expect, it } from 'vitest'
import { credentialsSchema, passwordConfirmationSchema } from './validation'

describe('auth validation', () => {
  it('accepts valid credentials', () => {
    expect(
      credentialsSchema.safeParse({ email: 'learner@example.com', password: 'secure-pass' })
        .success,
    ).toBe(true)
  })

  it('rejects a short password', () => {
    const result = credentialsSchema.safeParse({ email: 'learner@example.com', password: 'short' })
    expect(result.success).toBe(false)
  })

  it('rejects passwords that do not match', () => {
    const result = passwordConfirmationSchema.safeParse({
      password: 'secure-pass',
      confirmPassword: 'different-pass',
    })
    expect(result.success).toBe(false)
  })
})
