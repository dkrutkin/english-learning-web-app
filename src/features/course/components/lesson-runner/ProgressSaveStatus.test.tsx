import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { LessonSaveStatus } from '../../hooks/use-lesson-autosave'
import { ProgressSaveStatus } from './ProgressSaveStatus'

afterEach(cleanup)

describe('ProgressSaveStatus', () => {
  it.each<[LessonSaveStatus, string]>([
    ['saving', 'Saving…'],
    ['saved', 'Progress saved'],
    ['offline', 'Offline · saved on this device'],
    ['retrying', "Progress couldn't be saved · retrying…"],
    ['conflict', 'Newer progress found'],
  ])('renders the %s state', (status, label) => {
    render(<ProgressSaveStatus status={status} />)
    expect(screen.getByRole('status')).toHaveTextContent(label)
  })
})
