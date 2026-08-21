import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lessonBlockTypeSchema } from '../../schemas/course'
import type { LessonBlock } from '../../types/course'
import { ExerciseRenderer } from './ExerciseRenderer'

afterEach(cleanup)

describe('ExerciseRenderer', () => {
  it('renders every supported lesson block type from data', () => {
    for (const [index, type] of lessonBlockTypeSchema.options.entries()) {
      const block: LessonBlock = {
        id: `40000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`,
        lessonId: '30000000-0000-4000-8000-000000000001',
        type,
        title: type,
        content: {},
        orderIndex: index + 1,
        isRequired: false,
        isGraded: false,
      }
      const view = render(<ExerciseRenderer answer={undefined} block={block} onChange={vi.fn()} />)
      expect(view.container).toBeTruthy()
      view.unmount()
    }
  })
})
