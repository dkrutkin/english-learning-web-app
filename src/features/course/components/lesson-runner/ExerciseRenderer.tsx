import { Check, Headphones, Mic } from 'lucide-react'
import type { ComponentType } from 'react'
import type { LessonAnswer, LessonBlock, LessonBlockType } from '../../types/course'
import { stringList, textValue } from './runner-utils'

type ExerciseProps = {
  answer: unknown
  block: LessonBlock
  onChange: (answer: LessonAnswer) => void
}

function ChoiceExercise({ answer, block, onChange }: ExerciseProps & { multiple?: boolean }) {
  const multiple = block.type === 'multiple_choice'
  const options = stringList(block.content, 'options')
  const selected = Array.isArray(answer) ? answer : []
  return (
    <fieldset className="lesson-options">
      <legend>{textValue(block.content, 'prompt')}</legend>
      {options.map((option) => {
        const isSelected = multiple ? selected.includes(option) : answer === option
        return (
          <label className={`lesson-option${isSelected ? 'is-selected' : ''}`} key={option}>
            <input
              checked={isSelected}
              name={block.id}
              onChange={() =>
                onChange(
                  multiple
                    ? isSelected
                      ? selected.filter((value) => value !== option)
                      : [...selected, option]
                    : option,
                )
              }
              type={multiple ? 'checkbox' : 'radio'}
            />
            <span>{option}</span>
            <i>{isSelected && <Check size={15} />}</i>
          </label>
        )
      })}
    </fieldset>
  )
}

function QuizExercise({ answer, block, onChange }: ExerciseProps) {
  const questions = Array.isArray(block.content.questions)
    ? block.content.questions.filter(
        (question): question is { prompt: string; options: string[] } =>
          Boolean(
            question &&
            typeof question === 'object' &&
            typeof question.prompt === 'string' &&
            Array.isArray(question.options),
          ),
      )
    : []
  const selected = Array.isArray(answer) ? answer : []
  return (
    <div className="quiz-list">
      <p>{textValue(block.content, 'prompt')}</p>
      {questions.map((question, questionIndex) => (
        <fieldset className="lesson-options" key={question.prompt}>
          <legend>
            <span>{questionIndex + 1}</span>
            {question.prompt}
          </legend>
          {question.options.map((option) => {
            const isSelected = selected[questionIndex] === option
            return (
              <label className={`lesson-option${isSelected ? 'is-selected' : ''}`} key={option}>
                <input
                  checked={isSelected}
                  name={`${block.id}-${questionIndex}`}
                  onChange={() => {
                    const next = [...selected]
                    next[questionIndex] = option
                    onChange(next)
                  }}
                  type="radio"
                />
                <span>{option}</span>
                <i>{isSelected && <Check size={15} />}</i>
              </label>
            )
          })}
        </fieldset>
      ))}
    </div>
  )
}

function FillGapExercise({ answer, block, onChange }: ExerciseProps) {
  return (
    <label className="fill-gap-field">
      <span>{textValue(block.content, 'prompt')}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={textValue(block.content, 'placeholder')}
        value={typeof answer === 'string' ? answer : ''}
      />
    </label>
  )
}

function VocabularyExercise({ block }: ExerciseProps) {
  const items = Array.isArray(block.content.items) ? block.content.items : []
  return (
    <div className="vocabulary-grid">
      {items.map((item, index) => {
        if (!item || typeof item !== 'object') return null
        return (
          <article key={`${String(item.term)}-${index}`}>
            <strong>{String(item.term ?? '')}</strong>
            <p>{String(item.definition ?? '')}</p>
            {item.example ? <small>{String(item.example)}</small> : null}
          </article>
        )
      })}
    </div>
  )
}

function GrammarExercise({ block }: ExerciseProps) {
  return (
    <div className="grammar-card">
      <p>{textValue(block.content, 'explanation')}</p>
      {textValue(block.content, 'formula') ? (
        <strong>{textValue(block.content, 'formula')}</strong>
      ) : null}
      {stringList(block.content, 'examples').map((example) => (
        <span key={example}>{example}</span>
      ))}
    </div>
  )
}

function ListeningExercise({ block }: ExerciseProps) {
  return (
    <div className="listening-card">
      <Headphones aria-hidden="true" />
      <p>{textValue(block.content, 'instructions')}</p>
      {textValue(block.content, 'transcript') ? (
        <blockquote>{textValue(block.content, 'transcript')}</blockquote>
      ) : null}
    </div>
  )
}

function PromptExercise({ answer, block, onChange }: ExerciseProps) {
  return (
    <label className="writing-field">
      {block.type === 'speaking_prompt' ? <Mic aria-hidden="true" /> : null}
      <span>{textValue(block.content, 'prompt')}</span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
        placeholder={
          block.type === 'speaking_prompt' ? 'Write speaking notes' : 'Write your response'
        }
        rows={5}
        value={typeof answer === 'string' ? answer : ''}
      />
    </label>
  )
}

function MatchingExercise({ answer, block, onChange }: ExerciseProps) {
  const pairs = Array.isArray(block.content.pairs)
    ? block.content.pairs.filter((pair): pair is { left: string; right: string } =>
        Boolean(
          pair &&
          typeof pair === 'object' &&
          typeof pair.left === 'string' &&
          typeof pair.right === 'string',
        ),
      )
    : []
  const selected: Record<string, string> =
    answer && typeof answer === 'object' && !Array.isArray(answer)
      ? (answer as Record<string, string>)
      : {}
  const choices = pairs.map((pair) => pair.right)
  return (
    <div className="matching-list">
      <p>{textValue(block.content, 'prompt')}</p>
      {pairs.map((pair) => (
        <label key={pair.left}>
          <span>{pair.left}</span>
          <select
            onChange={(event) => onChange({ ...selected, [pair.left]: event.target.value })}
            value={String(selected[pair.left] ?? '')}
          >
            <option value="">Choose a match</option>
            {choices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}

function SentenceBuilderExercise({ answer, block, onChange }: ExerciseProps) {
  const tokens = stringList(block.content, 'tokens')
  const selected = Array.isArray(answer) ? answer : []
  return (
    <div className="sentence-builder">
      <p>{textValue(block.content, 'prompt')}</p>
      <div className="sentence-builder__answer">{selected.join(' ') || 'Build your sentence'}</div>
      <div className="sentence-builder__tokens">
        {tokens.map((token, index) => {
          const key = `${token}-${index}`
          return (
            <button key={key} onClick={() => onChange([...selected, token])} type="button">
              {token}
            </button>
          )
        })}
        {selected.length ? (
          <button onClick={() => onChange(selected.slice(0, -1))} type="button">
            Undo
          </button>
        ) : null}
      </div>
    </div>
  )
}

function InformationalExercise({ block }: ExerciseProps) {
  return (
    <div className="lesson-body-copy">
      <p>
        {textValue(block.content, 'body') ||
          textValue(block.content, 'example') ||
          textValue(block.content, 'text')}
      </p>
    </div>
  )
}

const renderers: Record<LessonBlockType, ComponentType<ExerciseProps>> = {
  intro: InformationalExercise,
  text: InformationalExercise,
  grammar: GrammarExercise,
  vocabulary: VocabularyExercise,
  example: InformationalExercise,
  single_choice: ChoiceExercise,
  multiple_choice: ChoiceExercise,
  fill_gap: FillGapExercise,
  matching: MatchingExercise,
  sentence_builder: SentenceBuilderExercise,
  reading: InformationalExercise,
  reading_question: ChoiceExercise,
  listening: ListeningExercise,
  listening_question: ChoiceExercise,
  writing_prompt: PromptExercise,
  speaking_prompt: PromptExercise,
  info: InformationalExercise,
  summary: InformationalExercise,
  quiz: QuizExercise,
}

export function ExerciseRenderer(props: ExerciseProps) {
  const Renderer = renderers[props.block.type]
  return <Renderer {...props} />
}
