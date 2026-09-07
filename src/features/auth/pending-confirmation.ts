const storageKey = 'fluent-pending-email-confirmation'
const cooldownSeconds = 60

type PendingConfirmation = {
  email: string
  resendAvailableAt: number
}

function readPendingConfirmation(): PendingConfirmation | null {
  try {
    const stored = window.sessionStorage.getItem(storageKey)
    if (!stored) return null
    const value = JSON.parse(stored) as Partial<PendingConfirmation>
    if (typeof value.email !== 'string' || typeof value.resendAvailableAt !== 'number') return null
    return { email: value.email, resendAvailableAt: value.resendAvailableAt }
  } catch {
    return null
  }
}

function writePendingConfirmation(value: PendingConfirmation) {
  window.sessionStorage.setItem(storageKey, JSON.stringify(value))
}

export function savePendingConfirmation(email: string) {
  writePendingConfirmation({ email, resendAvailableAt: Date.now() + cooldownSeconds * 1000 })
}

export function restartConfirmationCooldown(email: string) {
  savePendingConfirmation(email)
}

export function getPendingConfirmation() {
  return readPendingConfirmation()
}

export function clearPendingConfirmation() {
  window.sessionStorage.removeItem(storageKey)
}

export function confirmationSecondsRemaining(resendAvailableAt: number) {
  return Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000))
}
