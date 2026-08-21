import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { clearPendingLessonSession, writePendingLessonSession } from '../api/lesson-runner-api'
import type { LessonSession } from '../types/course'
import { useSaveLessonSession } from './use-lesson-runner'

export type LessonSaveStatus = 'saving' | 'saved' | 'offline' | 'retrying' | 'conflict'
export type LessonSessionDraft = Omit<LessonSession, 'lessonId' | 'updatedAt'>

const RETRY_DELAYS = [1_000, 2_000, 4_000, 8_000, 15_000]

function isRevisionConflict(error: unknown) {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.toLowerCase().includes('revision conflict'),
  )
}

export function useLessonAutosave(lessonId: string, draft: LessonSessionDraft) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const saveMutation = useSaveLessonSession(lessonId)
  const revisionRef = useRef(draft.revision)
  const latestRef = useRef(draft)
  const saveNowRef = useRef<
    ((override?: Partial<LessonSessionDraft>) => Promise<LessonSession | null>) | undefined
  >(undefined)
  const debounceRef = useRef<number | null>(null)
  const retryRef = useRef<number | null>(null)
  const inFlightRef = useRef<Promise<LessonSession> | null>(null)
  const retryCountRef = useRef(0)
  const [status, setStatus] = useState<LessonSaveStatus>(() =>
    navigator.onLine ? 'saved' : 'offline',
  )

  const clearTimers = useCallback(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    if (retryRef.current !== null) window.clearTimeout(retryRef.current)
    debounceRef.current = null
    retryRef.current = null
  }, [])

  const queueLocally = useCallback(
    (next: LessonSessionDraft) => {
      if (!userId) return
      writePendingLessonSession(userId, {
        ...next,
        lessonId,
        revision: revisionRef.current,
        updatedAt: new Date().toISOString(),
      })
    },
    [lessonId, userId],
  )

  const saveNow = useCallback(
    async (override: Partial<LessonSessionDraft> = {}) => {
      const next = { ...latestRef.current, ...override, revision: revisionRef.current }
      latestRef.current = next
      queueLocally(next)
      if (!navigator.onLine) {
        setStatus('offline')
        return null
      }

      if (inFlightRef.current) {
        await inFlightRef.current.catch(() => null)
        return saveNowRef.current?.(override) ?? null
      }
      if (retryRef.current !== null) window.clearTimeout(retryRef.current)
      retryRef.current = null

      setStatus(retryCountRef.current > 0 ? 'retrying' : 'saving')
      try {
        const request = saveMutation.mutateAsync(next)
        inFlightRef.current = request
        const saved = await request
        revisionRef.current = saved.revision
        latestRef.current = { ...next, revision: saved.revision }
        retryCountRef.current = 0
        if (retryRef.current !== null) window.clearTimeout(retryRef.current)
        retryRef.current = null
        setStatus('saved')
        return saved
      } catch (error) {
        if (isRevisionConflict(error)) {
          if (userId) clearPendingLessonSession(userId, lessonId)
          setStatus('conflict')
          return null
        }
        setStatus(navigator.onLine ? 'retrying' : 'offline')
        if (navigator.onLine) {
          const delay = RETRY_DELAYS[Math.min(retryCountRef.current, RETRY_DELAYS.length - 1)]
          retryCountRef.current += 1
          retryRef.current = window.setTimeout(() => void saveNowRef.current?.(), delay)
        }
        return null
      } finally {
        inFlightRef.current = null
      }
    },
    [lessonId, queueLocally, saveMutation, userId],
  )
  useEffect(() => {
    saveNowRef.current = saveNow
  }, [saveNow])

  useEffect(() => {
    latestRef.current = { ...draft, revision: revisionRef.current }
    queueLocally(latestRef.current)
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    if (!navigator.onLine) return
    debounceRef.current = window.setTimeout(() => void saveNowRef.current?.(), 500)
  }, [draft, queueLocally])

  useEffect(() => {
    const handleOffline = () => {
      clearTimers()
      queueLocally(latestRef.current)
      setStatus('offline')
    }
    const handleOnline = () => {
      retryCountRef.current = 1
      setStatus('retrying')
      void saveNowRef.current?.()
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') void saveNowRef.current?.()
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearTimers()
      if (navigator.onLine) void saveNowRef.current?.()
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [clearTimers, queueLocally])

  return { flush: saveNow, status }
}
