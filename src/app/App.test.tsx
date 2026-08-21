import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LevelOrbit } from '../components/progress/LevelOrbit'
import { ThemeProvider } from '../features/theme/ThemeProvider'

describe('Fluent foundation', () => {
  it('renders an accessible level progress summary', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LevelOrbit completed={4} level="B1" total={10} />
        </ThemeProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('img', { name: 'B1 level, 40% complete' })).toBeInTheDocument()
  })
})
