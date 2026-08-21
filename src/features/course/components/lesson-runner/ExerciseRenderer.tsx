import { BookOpen, Check, Headphones, Info, Mic, Sparkles } from 'lucide-react'
import { useState, type ComponentType } from 'react'
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
          <label
            className={isSelected ? 'lesson-option is-selected' : 'lesson-option'}
            key={option}
          >
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
              <label
                className={isSelected ? 'lesson-option is-selected' : 'lesson-option'}
                key={option}
              >
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
  const [showTranslations, setShowTranslations] = useState(false)
  const hasTranslations = items.some(
    (item) => item && typeof item === 'object' && typeof item.translation === 'string',
  )
  return (
    <div className="vocabulary-block">
      {hasTranslations ? (
        <button
          aria-pressed={showTranslations}
          className="button button--secondary vocabulary-translation-toggle"
          onClick={() => setShowTranslations((visible) => !visible)}
          type="button"
        >
          {showTranslations ? 'Hide translations' : 'Show translations'}
        </button>
      ) : null}
      <div className="vocabulary-grid">
        {items.map((item, index) => {
          if (!item || typeof item !== 'object') return null
          return (
            <article key={`${String(item.term)}-${index}`}>
              <strong>{String(item.term ?? '')}</strong>
              <p>{String(item.definition ?? '')}</p>
              {showTranslations && item.translation ? (
                <mark>{String(item.translation)}</mark>
              ) : null}
              {item.example ? <small>{String(item.example)}</small> : null}
            </article>
          )
        })}
      </div>
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
  const audioUrl = textValue(block.content, 'audioUrl')
  return (
    <div className="listening-card">
      <Headphones aria-hidden="true" />
      <p>{textValue(block.content, 'instructions')}</p>
      {audioUrl ? <audio controls preload="metadata" src={audioUrl} /> : null}
      {textValue(block.content, 'transcript') ? (
        <details>
          <summary>Show transcript</summary>
          <blockquote>{textValue(block.content, 'transcript')}</blockquote>
        </details>
      ) : null}
    </div>
  )
}

function PromptExercise({ answer, block, onChange }: ExerciseProps) {
  const value = typeof answer === 'string' ? answer : ''
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const minWords = typeof block.content.minWords === 'number' ? block.content.minWords : null
  const suggestedSeconds =
    typeof block.content.suggestedSeconds === 'number' ? block.content.suggestedSeconds : null
  const tips = stringList(block.content, 'tips')
  return (
    <div className="writing-field">
      <label htmlFor={`${block.id}-response`}>
        {block.type === 'speaking_prompt' ? <Mic aria-hidden="true" /> : null}
        <span>{textValue(block.content, 'prompt')}</span>
      </label>
      {suggestedSeconds ? <small>Suggested speaking time: {suggestedSeconds} seconds</small> : null}
      {tips.length ? (
        <ul>
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : null}
      <textarea
        id={`${block.id}-response`}
        onChange={(event) => onChange(event.target.value)}
        placeholder={
          textValue(block.content, 'placeholder') ||
          (block.type === 'speaking_prompt' ? 'Write speaking notes' : 'Write your response')
        }
        rows={5}
        value={value}
      />
      <span aria-live="polite" className="response-counter">
        {wordCount} words{minWords ? ` · ${Math.max(0, minWords - wordCount)} to minimum` : ''}
      </span>
      {value.trim() ? (
        <small className="practice-save-note">Practice response · no automatic score</small>
      ) : null}
    </div>
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
  const usedChoices = Object.values(selected)
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
              <option
                disabled={usedChoices.includes(choice) && selected[pair.left] !== choice}
                key={choice}
                value={choice}
              >
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
  const available = tokens.filter((token, index) => {
    const previousOccurrences = tokens.slice(0, index).filter((item) => item === token).length
    const usedOccurrences = selected.filter((item) => item === token).length
    return previousOccurrences >= usedOccurrences
  })
  return (
    <div className="sentence-builder">
      <p>{textValue(block.content, 'prompt')}</p>
      <div aria-live="polite" className="sentence-builder__answer">
        {selected.length
          ? selected.map((token, index) => (
              <button
                aria-label={`Remove ${token}`}
                key={`${token}-${index}`}
                onClick={() => onChange(selected.filter((_, itemIndex) => itemIndex !== index))}
                type="button"
              >
                {token}
              </button>
            ))
          : 'Build your sentence'}
      </div>
      <div className="sentence-builder__tokens">
        {available.map((token, index) => {
          const key = `${token}-${index}`
          return (
            <button key={key} onClick={() => onChange([...selected, token])} type="button">
              {token}
            </button>
          )
        })}
        {selected.length ? (
          <button onClick={() => onChange([])} type="button">
            Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}

function InformationalExercise({ block }: ExerciseProps) {
  const Icon = block.type === 'info' ? Info : block.type === 'reading' ? BookOpen : Sparkles
  const mainText =
    textValue(block.content, 'body') ||
    textValue(block.content, 'example') ||
    textValue(block.content, 'text')
  return (
    <div className={`lesson-body-copy lesson-body-copy--${block.type}`}>
      {['info', 'summary', 'intro', 'reading'].includes(block.type) ? (
        <Icon aria-hidden="true" />
      ) : null}
      <p>{mainText}</p>
      {textValue(block.content, 'note') ? <small>{textValue(block.content, 'note')}</small> : null}
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
