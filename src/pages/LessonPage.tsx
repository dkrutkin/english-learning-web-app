import { Link, useParams } from 'react-router-dom'
import { LessonRunner } from '../features/course/components/LessonRunner'
import {
  CourseEmptyState,
  CourseErrorState,
  CourseLoadingState,
} from '../features/course/components/CourseStates'
import { useCourseLesson, useLessonBlocks } from '../features/course/hooks/use-course'

export function LessonPage() {
  const { lessonSlug = '', levelSlug = '', moduleSlug = '' } = useParams()
  const lesson = useCourseLesson(levelSlug, moduleSlug, lessonSlug)
  const blocks = useLessonBlocks(levelSlug, moduleSlug, lessonSlug)

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
  if (lesson.isPending || blocks.isPending) {
    return (
      <main className="lesson-page lesson-page--state">
        <CourseLoadingState cards={2} />
      </main>
    )
  }
  if (lesson.isError || blocks.isError) {
    return (
      <main className="lesson-page lesson-page--state">
        <CourseErrorState onRetry={() => void Promise.all([lesson.refetch(), blocks.refetch()])} />
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
          lesson={lesson.data}
          levelSlug={levelSlug}
          moduleSlug={moduleSlug}
        />
      )}
    </main>
  )
}
