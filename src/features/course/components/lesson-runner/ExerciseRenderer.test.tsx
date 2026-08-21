import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lessonBlockRowSchema, lessonBlockTypeSchema } from '../../schemas/course'
import type { LessonBlock, LessonBlockType } from '../../types/course'
import { ExerciseRenderer } from './ExerciseRenderer'

afterEach(cleanup)

const contentByType: Record<LessonBlockType, Record<string, unknown>> = {
  intro: { body: 'Introduction' },
  text: { body: 'Explanation' },
  info: { body: 'Useful information' },
  example: { example: 'I have visited Rome', note: 'Present perfect' },
  vocabulary: {
    items: [
      {
        term: 'memorable',
        definition: 'worth remembering',
        example: 'A memorable day',
        translation: 'памятный',
      },
    ],
  },
  grammar: { explanation: 'Use have or has', examples: ['I have travelled'] },
  single_choice: { prompt: 'Choose one', options: ['First', 'Second'] },
  multiple_choice: { prompt: 'Choose several', options: ['First', 'Second'] },
  fill_gap: { prompt: 'She ___ travelled', placeholder: 'One word' },
  sentence_builder: { prompt: 'Build a sentence', tokens: ['I', 'have', 'travelled'] },
  matching: {
    prompt: 'Match the words',
    pairs: [
      { left: 'memorable', right: 'worth remembering' },
      { left: 'challenging', right: 'difficult' },
    ],
  },
  reading: { body: 'Maya has travelled to Costa Rica' },
  reading_question: { prompt: 'Where did Maya travel', options: ['Costa Rica', 'Italy'] },
  listening: { instructions: 'Listen carefully', transcript: 'I have travelled twice' },
  listening_question: { prompt: 'How many times', options: ['Once', 'Twice'] },
  writing_prompt: { prompt: 'Describe an experience', minWords: 3 },
  speaking_prompt: {
    prompt: 'Talk about a journey',
    suggestedSeconds: 30,
    tips: ['Use the present perfect'],
  },
  summary: { body: 'Review the key ideas' },
  quiz: {
    prompt: 'Complete the quiz',
    questions: [{ prompt: 'Choose one', options: ['First', 'Second'] }],
  },
}

function createBlock(type: LessonBlockType): LessonBlock {
  const index = lessonBlockTypeSchema.options.indexOf(type)
  return lessonBlockRowSchema.parse({
    id: `40000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`,
    lesson_id: '30000000-0000-4000-8000-000000000001',
    type,
    title: type,
    content: contentByType[type],
    order_index: index + 1,
    is_required: true,
    is_graded: !['writing_prompt', 'speaking_prompt'].includes(type),
  })
}

describe('ExerciseRenderer', () => {
  it('validates and renders every supported lesson block type', () => {
    for (const type of lessonBlockTypeSchema.options) {
      const view = render(
        <ExerciseRenderer answer={undefined} block={createBlock(type)} onChange={vi.fn()} />,
      )
      expect(view.container).not.toBeEmptyDOMElement()
      view.unmount()
    }
  })

  it('supports keyboard selection in choice exercises', async () => {
    const onChange = vi.fn()
    render(
      <ExerciseRenderer
        answer={undefined}
        block={createBlock('single_choice')}
        onChange={onChange}
      />,
    )
    const option = screen.getByRole('radio', { name: 'First' })
    option.focus()
    await userEvent.keyboard('[Space]')
    expect(onChange).toHaveBeenCalledWith('First')
  })

  it('visually marks a selected choice', () => {
    render(
      <ExerciseRenderer answer="First" block={createBlock('single_choice')} onChange={vi.fn()} />,
    )
    expect(screen.getByRole('radio', { name: 'First' }).closest('label')).toHaveClass('is-selected')
  })

  it('builds and edits a sentence using buttons', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <ExerciseRenderer answer={[]} block={createBlock('sentence_builder')} onChange={onChange} />,
    )
    await user.click(screen.getByRole('button', { name: 'I' }))
    expect(onChange).toHaveBeenLastCalledWith(['I'])
    rerender(
      <ExerciseRenderer
        answer={['I']}
        block={createBlock('sentence_builder')}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Remove I' }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('saves matching selections and reports writing word count', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <ExerciseRenderer answer={{}} block={createBlock('matching')} onChange={onChange} />,
    )
    await user.selectOptions(screen.getByLabelText('memorable'), 'worth remembering')
    expect(onChange).toHaveBeenCalledWith({ memorable: 'worth remembering' })

    rerender(
      <ExerciseRenderer
        answer="A memorable journey"
        block={createBlock('writing_prompt')}
        onChange={onChange}
      />,
    )
    expect(screen.getByText('3 words · 0 to minimum')).toBeVisible()
  })
})
