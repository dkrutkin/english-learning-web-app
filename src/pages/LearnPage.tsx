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
  useProgressSummary,
  useLevelModules,
  useModuleLessons,
} from '../features/course/hooks/use-course'
import {
  defaultLessonProgress,
  mergeLevelsWithProgress,
  mergeModulesWithProgress,
  progressLabels,
} from '../features/course/utils/course'

function CourseRoadmap() {
  const levels = useCourseLevels()
  const summary = useProgressSummary()
  if (levels.isPending || summary.isPending) return <CourseLoadingState />
  if (levels.isError || summary.isError) {
    return (
      <CourseErrorState onRetry={() => void Promise.all([levels.refetch(), summary.refetch()])} />
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

  const courseLevels = mergeLevelsWithProgress(levels.data, summary.data.courseProgress)
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Course roadmap</p>
          <h1>Learn</h1>
          <p>Follow your path from A2 to C1</p>
        </div>
      </header>
      <section className="roadmap-overview" aria-label="Current course progress">
        <div>
          <span>Current level</span>
          <strong>{summary.data.currentLevel?.cefr ?? 'A2'}</strong>
          <small>{summary.data.currentLevel?.title ?? 'Choose your starting level'}</small>
        </div>
        <div>
          <span>Course progress</span>
          <strong>{Math.round(summary.data.overallProgress)}%</strong>
          <div className="progress-line">
            <span style={{ width: `${summary.data.overallProgress}%` }} />
          </div>
        </div>
        <div>
          <span>Lessons completed</span>
          <strong>{summary.data.lessonsCompleted}</strong>
          <small>of {summary.data.lessonsTotal} published lessons</small>
        </div>
      </section>
      <section className="level-grid">
        {courseLevels.map((level) => (
          <LevelCard
            current={summary.data.currentLevel?.id === level.id}
            key={level.id}
            level={level}
          />
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

  const currentLevel = level.data
  const courseModules = mergeModulesWithProgress(modules.data, progress.data)
  const levelProgress = progress.data.levels.find((entry) => entry.entityId === currentLevel.id)
  return (
    <>
      <nav aria-label="Course breadcrumbs" className="course-breadcrumbs">
        <Link to="/app/learn">Learn</Link>
        <span>/</span>
        <span>{currentLevel.cefr}</span>
      </nav>
      <header className="page-header course-page-header">
        <div>
          <p className="eyebrow">{currentLevel.cefr} level</p>
          <h1>{currentLevel.title}</h1>
          <p>{currentLevel.description}</p>
          <div className="course-page-progress">
            <span>{progressLabels[levelProgress?.status ?? 'available']}</span>
            <strong>{Math.round(levelProgress?.completionPercent ?? 0)}% complete</strong>
          </div>
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
  const currentModuleProgress = moduleProgress.get(module.data.id)
  const lessonsWithAccess = [...courseLessons]
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((lesson, index, orderedLessons) => {
      const completed = lesson.progress.status === 'completed'
      const previousRequiredComplete = orderedLessons
        .slice(0, index)
        .filter((entry) => entry.isRequired)
        .every((entry) => entry.progress.status === 'completed')
      const locked =
        currentModuleProgress?.status === 'locked' || (!completed && !previousRequiredComplete)
      return { lesson, locked }
    })
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
          <div className="course-page-progress">
            <span>{progressLabels[currentModuleProgress?.status ?? 'available']}</span>
            <strong>{Math.round(currentModuleProgress?.completionPercent ?? 0)}% complete</strong>
          </div>
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
          {lessonsWithAccess.map(({ lesson, locked }) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              levelSlug={levelSlug}
              locked={locked || (lesson.slug === 'level-assessment' && !levelCourseworkComplete)}
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
