// oxlint-disable react/only-export-components -- Lazy route components are intentionally colocated with the router.
import { lazy, type ReactNode, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { RouteFallback } from '../components/layout/RouteFallback'
import { ProtectedRoute, PublicOnlyRoute } from '../features/auth/AuthGate'

const page = <T extends Record<string, unknown>, K extends keyof T>(
  loader: () => Promise<T>,
  name: K,
) =>
  lazy(async () => {
    const module = await loader()
    return { default: module[name] as React.ComponentType }
  })

const LandingPage = page(() => import('../pages/LandingPage'), 'LandingPage')
const AuthPage = lazy(() =>
  import('../pages/AuthPage').then(({ AuthPage }) => ({ default: AuthPage })),
)
const EmailConfirmationPage = page(
  () => import('../pages/EmailConfirmationPage'),
  'EmailConfirmationPage',
)
const OnboardingPage = page(() => import('../pages/OnboardingPage'), 'OnboardingPage')
const DashboardPage = page(() => import('../pages/DashboardPage'), 'DashboardPage')
const LearnPage = page(() => import('../pages/LearnPage'), 'LearnPage')
const ProgressPage = page(() => import('../pages/ProgressPage'), 'ProgressPage')
const AchievementsPage = page(() => import('../pages/AchievementsPage'), 'AchievementsPage')
const ProfilePage = page(() => import('../pages/ProfilePage'), 'ProfilePage')
const SettingsPage = page(() => import('../pages/SettingsPage'), 'SettingsPage')
const LessonPage = page(() => import('../pages/LessonPage'), 'LessonPage')
const NotFoundPage = page(() => import('../pages/NotFoundPage'), 'NotFoundPage')

const loading = (element: ReactNode) => <Suspense fallback={<RouteFallback />}>{element}</Suspense>

const routes = [
  { path: '/', element: loading(<LandingPage />) },
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: loading(<AuthPage mode="login" />) },
      { path: '/signup', element: loading(<AuthPage mode="signup" />) },
      {
        path: '/forgot-password',
        element: loading(<AuthPage mode="forgot-password" />),
      },
    ],
  },
  { path: '/confirm-email', element: loading(<EmailConfirmationPage />) },
  {
    path: '/reset-password',
    element: loading(<AuthPage mode="reset-password" />),
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/onboarding', element: loading(<OnboardingPage />) },
      {
        path: '/app',
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate replace to="/app/home" /> },
          { path: 'home', element: loading(<DashboardPage />) },
          { path: 'learn', element: loading(<LearnPage />) },
          { path: 'learn/:levelSlug', element: loading(<LearnPage />) },
          { path: 'learn/:levelSlug/:moduleSlug', element: loading(<LearnPage />) },
          { path: 'progress', element: loading(<ProgressPage />) },
          { path: 'achievements', element: loading(<AchievementsPage />) },
          { path: 'profile', element: loading(<ProfilePage />) },
          { path: 'settings', element: loading(<SettingsPage />) },
        ],
      },
      { path: '/app/lesson/:lessonSlug', element: loading(<LessonPage />) },
    ],
  },
  { path: '*', element: loading(<NotFoundPage />) },
]

export const router = createBrowserRouter([
  {
    HydrateFallback: RouteFallback,
    children: routes,
  },
])
