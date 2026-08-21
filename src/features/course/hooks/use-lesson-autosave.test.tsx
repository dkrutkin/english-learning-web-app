import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pendingSessionKey } from '../api/lesson-runner-api'
import type { LessonSession } from '../types/course'
import { useLessonAutosave, type LessonSessionDraft } from './use-lesson-autosave'

const mocks = vi.hoisted(() => ({ save: vi.fn() }))

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: '00000000-0000-4000-8000-000000000001' } }),
}))
vi.mock('./use-lesson-runner', () => ({
  useSaveLessonSession: () => ({ mutateAsync: mocks.save }),
}))

const lessonId = '30000000-0000-4000-8000-000000000001'
const draft: LessonSessionDraft = {
  currentBlockId: '40000000-0000-4000-8000-000000000001',
  draftAnswers: {},
  attempts: {},
  feedback: {},
  usedHints: [],
  score: 0,
  possibleScore: 0,
  completionPercent: 25,
  activeSeconds: 30,
  startedAt: '2026-08-21T10:00:00.000Z',
  completedAt: null,
  revision: 0,
}

function savedSession(input: LessonSessionDraft): LessonSession {
  return {
    ...input,
    lessonId,
    revision: input.revision + 1,
    updatedAt: '2026-08-21T10:00:30.000Z',
  }
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
}

describe('useLessonAutosave', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.save.mockReset()
    setOnline(true)
  })

  afterEach(() => setOnline(true))

  it('queues changes offline and sends them when the network returns', async () => {
    setOnline(false)
    mocks.save.mockImplementation(async (input: LessonSessionDraft) => savedSession(input))
    const { result, unmount } = renderHook(() => useLessonAutosave(lessonId, draft))

    expect(result.current.status).toBe('offline')
    expect(
      localStorage.getItem(pendingSessionKey('00000000-0000-4000-8000-000000000001', lessonId)),
    ).toContain('completionPercent')

    setOnline(true)
    act(() => window.dispatchEvent(new Event('online')))
    await waitFor(() => expect(result.current.status).toBe('saved'))
    expect(mocks.save).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('retries a failed online save automatically', async () => {
    mocks.save
      .mockRejectedValueOnce(new Error('Temporary network error'))
      .mockImplementationOnce(async (input: LessonSessionDraft) => savedSession(input))
    const { result, unmount } = renderHook(() => useLessonAutosave(lessonId, draft))

    await waitFor(() => expect(result.current.status).toBe('retrying'), { timeout: 1_000 })
    await waitFor(() => expect(result.current.status).toBe('saved'), { timeout: 2_500 })
    expect(mocks.save).toHaveBeenCalledTimes(2)
    unmount()
  })
})
