import { Link, useParams, useSearchParams } from 'react-router-dom'
import { LessonRunner } from '../features/course/components/LessonRunner'
import { LessonReview } from '../features/course/components/lesson-runner/LessonReview'
import {
  CourseEmptyState,
  CourseErrorState,
  CourseLoadingState,
} from '../features/course/components/CourseStates'
import {
  useCourseLesson,
  useCourseProgress,
  useLessonBlocks,
  useLevelModules,
  useModuleLessons,
} from '../features/course/hooks/use-course'

export function LessonPage() {
  const { lessonSlug = '', levelSlug = '', moduleSlug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const isMistakeReview = searchParams.get('review') === 'mistakes'
  const lesson = useCourseLesson(levelSlug, moduleSlug, lessonSlug)
  const blocks = useLessonBlocks(levelSlug, moduleSlug, lessonSlug)
  const modules = useLevelModules(levelSlug)
  const moduleLessons = useModuleLessons(levelSlug, moduleSlug)
  const progress = useCourseProgress()

  if (!levelSlug || !moduleSlug || !lessonSlug) {
    return (
      <main className="lesson-page lesson-page--state">
        <CourseEmptyState
          action={
            <Link className="button button--secondary" to="/app/learn">
              Back to Learn
            </Link>
          }
          description="Open a published lesson from its module page"
          title="Lesson unavailable"
        />
      </main>
    )
  }
  if (
    lesson.isPending ||
    blocks.isPending ||
    modules.isPending ||
    moduleLessons.isPending ||
    progress.isPending
  ) {
    return (
      <main className="lesson-page lesson-page--state">
        <CourseLoadingState cards={2} />
      </main>
    )
  }
  if (
    lesson.isError ||
    blocks.isError ||
    modules.isError ||
    moduleLessons.isError ||
    progress.isError
  ) {
    return (
      <main className="lesson-page lesson-page--state">
        <CourseErrorState
          onRetry={() =>
            void Promise.all([
              lesson.refetch(),
              blocks.refetch(),
              modules.refetch(),
              moduleLessons.refetch(),
              progress.refetch(),
            ])
          }
        />
      </main>
    )
  }
  if (!lesson.data) {
    return (
      <main className="lesson-page lesson-page--state">
        <CourseEmptyState
          action={
            <Link className="button button--secondary" to="/app/learn">
              Back to Learn
            </Link>
          }
          description="This lesson is unavailable or has not been published"
          title="Lesson unavailable"
        />
      </main>
    )
  }

  const currentLesson = lesson.data
  const moduleProgress = new Map(progress.data.modules.map((entry) => [entry.entityId, entry]))
  const lessonProgress = new Map(progress.data.lessons.map((entry) => [entry.entityId, entry]))
  const parentModule = modules.data.find((entry) => entry.id === currentLesson.moduleId)
  const currentLessonProgress = lessonProgress.get(currentLesson.id)
  const orderedLessons = [...moduleLessons.data].sort(
    (left, right) => left.orderIndex - right.orderIndex,
  )
  const lessonIndex = orderedLessons.findIndex((entry) => entry.id === currentLesson.id)
  const priorRequiredIncomplete = orderedLessons
    .slice(0, Math.max(0, lessonIndex))
    .filter((entry) => entry.isRequired)
    .some((entry) => lessonProgress.get(entry.id)?.status !== 'completed')
  const lessonLocked =
    moduleProgress.get(parentModule?.id ?? '')?.status === 'locked' ||
    (currentLessonProgress?.status !== 'completed' && priorRequiredIncomplete)
  const levelCourseworkComplete =
    modules.data.filter((entry) => entry.isRequired).length > 0 &&
    modules.data
      .filter((entry) => entry.isRequired)
      .every((entry) => {
        const status = moduleProgress.get(entry.id)?.status
        return status === 'completed' || status === 'mastered'
      })

  if (currentLesson.slug === 'level-assessment' && !levelCourseworkComplete) {
    return (
      <main className="lesson-page lesson-page--state">
        <CourseEmptyState
          action={
            <Link className="button button--secondary" to={`/app/learn/${levelSlug}`}>
              Back to level
            </Link>
          }
          description="Complete every required module before taking the level assessment"
          title="Assessment locked"
        />
      </main>
    )
  }

  if (lessonLocked) {
    return (
      <main className="lesson-page lesson-page--state">
        <CourseEmptyState
          action={
            <Link className="button button--secondary" to={`/app/learn/${levelSlug}/${moduleSlug}`}>
              Back to module
            </Link>
          }
          description="Complete the previous required lesson to continue"
          title="Lesson locked"
        />
      </main>
    )
  }

  if (isMistakeReview) {
    if (currentLessonProgress?.status !== 'completed') {
      return (
        <main className="lesson-page lesson-page--state">
          <CourseEmptyState
            action={
              <Link
                className="button button--secondary"
                to={`/app/learn/${levelSlug}/${moduleSlug}`}
              >
                Back to module
              </Link>
            }
            description="Complete this lesson before reviewing its mistakes"
            title="Review unavailable"
          />
        </main>
      )
    }
    return (
      <main className="lesson-page">
        <LessonReview
          lessonId={currentLesson.id}
          lessonTitle={currentLesson.title}
          levelSlug={levelSlug}
          moduleSlug={moduleSlug}
        />
      </main>
    )
  }

  return (
    <main className="lesson-page">
      {blocks.data.length === 0 ? (
        <section className="lesson-content">
          <CourseEmptyState
            description="The lesson structure is ready, but its blocks have not been published"
            title="Lesson content is coming soon"
          />
        </section>
      ) : (
        <LessonRunner
          blocks={blocks.data}
          lesson={currentLesson}
          levelSlug={levelSlug}
          moduleSlug={moduleSlug}
        />
      )}
    </main>
  )
}
