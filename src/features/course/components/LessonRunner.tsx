import { useEffect, useMemo, useReducer } from 'react'
import {
  useCompleteLesson,
  useLessonSession,
  useSubmitLessonAnswer,
} from '../hooks/use-lesson-runner'
import { useLessonAutosave } from '../hooks/use-lesson-autosave'
import type { CourseLesson, LessonAnswer, LessonBlock, LessonSession } from '../types/course'
import { ExerciseRenderer } from './lesson-runner/ExerciseRenderer'
import { FeedbackPanel } from './lesson-runner/FeedbackPanel'
import { LessonFooter } from './lesson-runner/LessonFooter'
import { LessonHeader } from './lesson-runner/LessonHeader'
import { LessonProgress } from './lesson-runner/LessonProgress'
import { LessonResult } from './lesson-runner/LessonResult'
import {
  createInitialRunnerState,
  hasAnswer,
  lessonRunnerReducer,
  MAX_ATTEMPTS,
  requiresAnswer,
  textValue,
} from './lesson-runner/runner-utils'

type RunnerProps = {
  blocks: LessonBlock[]
  lesson: CourseLesson
  levelSlug: string
  moduleSlug: string
}

function LessonRunnerExperience({
  blocks,
  initialSession,
  lesson,
  levelSlug,
  moduleSlug,
}: RunnerProps & { initialSession: LessonSession | null }) {
  const submitAnswer = useSubmitLessonAnswer(lesson.id)
  const complete = useCompleteLesson(lesson.id)
  const [state, dispatch] = useReducer(
    lessonRunnerReducer,
    createInitialRunnerState(blocks, initialSession),
  )
  const block = blocks[state.currentIndex]
  const answer = state.answers[block.id]
  const blockFeedback = state.feedback[block.id]
  const attemptCount = state.attempts[block.id] ?? 0
  const hint = textValue(block.content, 'hint')
  const hintVisible = state.usedHints.includes(block.id)
  const isLast = state.currentIndex === blocks.length - 1

  const sessionSnapshot = useMemo(
    () => ({
      currentBlockId: block.id,
      draftAnswers: state.answers,
      attempts: state.attempts,
      feedback: state.feedback,
      usedHints: state.usedHints,
      score: state.score,
      possibleScore: state.possibleScore,
      completionPercent: Math.round((state.currentIndex / blocks.length) * 100),
      activeSeconds: state.activeSeconds,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      revision: state.revision,
    }),
    [
      block.id,
      blocks.length,
      state.activeSeconds,
      state.answers,
      state.attempts,
      state.completedAt,
      state.currentIndex,
      state.feedback,
      state.possibleScore,
      state.revision,
      state.score,
      state.startedAt,
      state.usedHints,
    ],
  )
  const autosave = useLessonAutosave(lesson.id, sessionSnapshot)

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        dispatch({ type: 'activity', seconds: 5 })
      }
    }, 5_000)
    return () => window.clearInterval(interval)
  }, [])

  const updateAnswer = (nextAnswer: LessonAnswer) => {
    dispatch({ type: 'answer', blockId: block.id, answer: nextAnswer })
  }

  const handlePrimaryAction = async () => {
    if (blockFeedback && !blockFeedback.isCorrect && attemptCount < MAX_ATTEMPTS) {
      dispatch({ type: 'retry', blockId: block.id })
      return
    }
    if (block.isGraded && !blockFeedback) {
      const checked = await submitAnswer.mutateAsync({
        blockId: block.id,
        answer: answer as LessonAnswer,
        usedHint: hintVisible,
      })
      dispatch({ type: 'feedback', blockId: block.id, feedback: checked })
      return
    }
    if (isLast) {
      const result = await complete.mutateAsync()
      await autosave.flush({
        completionPercent: 100,
        completedAt: new Date().toISOString(),
      })
      dispatch({ type: 'complete', result })
      return
    }
    dispatch({ type: 'next' })
  }

  if (state.result) {
    return <LessonResult levelSlug={levelSlug} moduleSlug={moduleSlug} result={state.result} />
  }

  const actionDisabled =
    submitAnswer.isPending ||
    complete.isPending ||
    (!blockFeedback && requiresAnswer(block) && !hasAnswer(answer, block))
  const primaryLabel =
    blockFeedback && !blockFeedback.isCorrect && attemptCount < MAX_ATTEMPTS
      ? 'Try again'
      : block.isGraded && !blockFeedback
        ? 'Check answer'
        : isLast
          ? 'Finish lesson'
          : 'Continue'
  return (
    <>
      <LessonHeader
        exitTo={`/app/learn/${levelSlug}/${moduleSlug}`}
        possibleScore={state.possibleScore}
        saveStatus={autosave.status}
        score={state.score}
      />
      <LessonProgress current={state.currentIndex + 1} total={blocks.length} />
      <section className="lesson-content lesson-runner">
        <p className="eyebrow">{block.type.replaceAll('_', ' ')}</p>
        <h1>{block.title ?? lesson.title}</h1>
        <ExerciseRenderer answer={answer} block={block} onChange={updateAnswer} />
        {blockFeedback ? <FeedbackPanel feedback={blockFeedback} /> : null}
        {(submitAnswer.isError || complete.isError) && (
          <p className="lesson-runner-error">We could not process this step. Try again.</p>
        )}
        {autosave.status === 'conflict' && (
          <div className="lesson-sync-conflict" role="alert">
            <span>Newer progress was found on another device</span>
            <button
              className="button button--secondary"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload progress
            </button>
          </div>
        )}
        <LessonFooter
          canUseHint={Boolean(hint) && !hintVisible && block.isGraded && !blockFeedback}
          disabled={actionDisabled}
          hint={hint}
          hintVisible={hintVisible}
          label={primaryLabel}
          onHint={() => dispatch({ type: 'hint', blockId: block.id })}
          onPrimary={() => void handlePrimaryAction()}
          step={state.currentIndex + 1}
          total={blocks.length}
        />
      </section>
    </>
  )
}

export function LessonRunner(props: RunnerProps) {
  const session = useLessonSession(props.lesson.id)
  if (session.isPending) return <div className="lesson-runner-loading">Restoring your lesson</div>
  if (session.isError) {
    return (
      <div className="lesson-runner-loading">
        <button
          className="button button--secondary"
          onClick={() => void session.refetch()}
          type="button"
        >
          Try loading the lesson again
        </button>
      </div>
    )
  }
  return <LessonRunnerExperience {...props} initialSession={session.data} />
}
