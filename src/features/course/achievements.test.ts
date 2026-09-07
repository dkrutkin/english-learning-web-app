import { beforeEach, describe, expect, it } from 'vitest'
import { evaluateAchievements, getAchievementsOverview } from './api/achievements-api'

const context = { userId: 'mock-achievements-user', isMock: true }

describe('achievements', () => {
  beforeEach(() => window.localStorage.clear())

  it('awards every eligible achievement only once', async () => {
    const firstEvaluation = await evaluateAchievements(context)
    const secondEvaluation = await evaluateAchievements(context)

    expect(firstEvaluation.length).toBeGreaterThan(0)
    expect(new Set(firstEvaluation.map(({ slug }) => slug)).size).toBe(firstEvaluation.length)
    expect(secondEvaluation).toEqual([])
  })

  it('builds achievements, completion awards and a dated timeline', async () => {
    const overview = await getAchievementsOverview(context)

    expect(overview.achievements).toHaveLength(6)
    expect(overview.achievements.some(({ progressPercent }) => progressPercent < 100)).toBe(true)
    expect(overview.timeline.every(({ occurredAt }) => !Number.isNaN(Date.parse(occurredAt)))).toBe(
      true,
    )
  })
})
