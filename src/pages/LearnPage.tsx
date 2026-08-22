import { Link, useParams } from 'react-router-dom'
import { LevelCard, LessonCard, ModuleCard } from '../features/course/components/CourseCards'
import {
  CourseEmptyState,
  CourseErrorState,
  CourseLoadingState,
} from '../features/course/components/CourseStates'
import {
  useCourseLevel,
  useCourseLevels,
  useCourseModule,
  useCourseProgress,
  useLevelModules,
  useModuleLessons,
} from '../features/course/hooks/use-course'
import {
  defaultLessonProgress,
  mergeLevelsWithProgress,
  mergeModulesWithProgress,
} from '../features/course/utils/course'

function CourseRoadmap() {
  const levels = useCourseLevels()
  const progress = useCourseProgress()
  if (levels.isPending || progress.isPending) return <CourseLoadingState />
  if (levels.isError || progress.isError) {
    return (
      <CourseErrorState onRetry={() => void Promise.all([levels.refetch(), progress.refetch()])} />
    )
  }
  if (levels.data.length === 0) {
    return (
      <CourseEmptyState
        description="Published course levels will appear here as soon as they are ready"
        title="Course content is coming soon"
      />
    )
  }

  const courseLevels = mergeLevelsWithProgress(levels.data, progress.data)
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Course roadmap</p>
          <h1>Learn</h1>
          <p>Follow your path from A2 to C1</p>
        </div>
      </header>
      <section className="level-grid">
        {courseLevels.map((level) => (
          <LevelCard key={level.id} level={level} />
        ))}
      </section>
    </>
  )
}

function LevelOverview({ levelSlug }: { levelSlug: string }) {
  const level = useCourseLevel(levelSlug)
  const modules = useLevelModules(levelSlug)
  const progress = useCourseProgress()
  if (level.isPending || modules.isPending || progress.isPending) return <CourseLoadingState />
  if (level.isError || modules.isError || progress.isError) {
    return (
      <CourseErrorState
        onRetry={() => void Promise.all([level.refetch(), modules.refetch(), progress.refetch()])}
      />
    )
  }
  if (!level.data) {
    return (
      <CourseEmptyState
        action={
          <Link className="button button--secondary" to="/app/learn">
            Back to Learn
          </Link>
        }
        description="This level is unavailable or has not been published"
        title="Level unavailable"
      />
    )
  }

  const courseModules = mergeModulesWithProgress(modules.data, progress.data)
  return (
    <>
      <nav aria-label="Course breadcrumbs" className="course-breadcrumbs">
        <Link to="/app/learn">Learn</Link>
        <span>/</span>
        <span>{level.data.cefr}</span>
      </nav>
      <header className="page-header course-page-header">
        <div>
          <p className="eyebrow">{level.data.cefr} level</p>
          <h1>{level.data.title}</h1>
          <p>{level.data.description}</p>
        </div>
      </header>
      {courseModules.length === 0 ? (
        <CourseEmptyState
          description="Published modules for this level will appear here soon"
          title="No modules yet"
        />
      ) : (
        <section className="course-grid">
          {courseModules.map((module) => (
            <ModuleCard key={module.id} levelSlug={levelSlug} module={module} />
          ))}
        </section>
      )}
    </>
  )
}

function ModuleOverview({ levelSlug, moduleSlug }: { levelSlug: string; moduleSlug: string }) {
  const level = useCourseLevel(levelSlug)
  const module = useCourseModule(levelSlug, moduleSlug)
  const levelModules = useLevelModules(levelSlug)
  const lessons = useModuleLessons(levelSlug, moduleSlug)
  const progress = useCourseProgress()
  if (
    level.isPending ||
    module.isPending ||
    levelModules.isPending ||
    lessons.isPending ||
    progress.isPending
  ) {
    return <CourseLoadingState cards={3} />
  }
  if (
    level.isError ||
    module.isError ||
    levelModules.isError ||
    lessons.isError ||
    progress.isError
  ) {
    return (
      <CourseErrorState
        onRetry={() =>
          void Promise.all([
            level.refetch(),
            module.refetch(),
            levelModules.refetch(),
            lessons.refetch(),
            progress.refetch(),
          ])
        }
      />
    )
  }
  if (!level.data || !module.data) {
    return (
      <CourseEmptyState
        action={
          <Link className="button button--secondary" to="/app/learn">
            Back to Learn
          </Link>
        }
        description="This module is unavailable or has not been published"
        title="Module unavailable"
      />
    )
  }

  const lessonProgress = new Map(progress.data.lessons.map((entry) => [entry.entityId, entry]))
  const moduleProgress = new Map(progress.data.modules.map((entry) => [entry.entityId, entry]))
  const requiredModules = levelModules.data.filter((entry) => entry.isRequired)
  const levelCourseworkComplete =
    requiredModules.length > 0 &&
    requiredModules.every((entry) => {
      const status = moduleProgress.get(entry.id)?.status
      return status === 'completed' || status === 'mastered'
    })
  const courseLessons = lessons.data.map((lesson) => ({
    ...lesson,
    progress: lessonProgress.get(lesson.id) ?? defaultLessonProgress(lesson.id),
  }))
  return (
    <>
      <nav aria-label="Course breadcrumbs" className="course-breadcrumbs">
        <Link to="/app/learn">Learn</Link>
        <span>/</span>
        <Link to={`/app/learn/${levelSlug}`}>{level.data.cefr}</Link>
        <span>/</span>
        <span>{module.data.title}</span>
      </nav>
      <header className="page-header course-page-header">
        <div>
          <p className="eyebrow">Module {module.data.orderIndex}</p>
          <h1>{module.data.title}</h1>
          <p>{module.data.description}</p>
          {module.data.learningOutcome && (
            <div className="learning-outcome">
              <strong>After this module</strong>
              {module.data.learningOutcome}
            </div>
          )}
        </div>
      </header>
      {courseLessons.length === 0 ? (
        <CourseEmptyState
          description="Published lessons for this module will appear here soon"
          title="No lessons yet"
        />
      ) : (
        <section className="lesson-list">
          {courseLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              levelSlug={levelSlug}
              locked={lesson.slug === 'level-assessment' && !levelCourseworkComplete}
              moduleSlug={moduleSlug}
            />
          ))}
        </section>
      )}
    </>
  )
}

export function LearnPage() {
  const { levelSlug, moduleSlug } = useParams()
  return (
    <div className="page-container">
      {levelSlug && moduleSlug ? (
        <ModuleOverview levelSlug={levelSlug} moduleSlug={moduleSlug} />
      ) : levelSlug ? (
        <LevelOverview levelSlug={levelSlug} />
      ) : (
        <CourseRoadmap />
      )}
    </div>
  )
}
