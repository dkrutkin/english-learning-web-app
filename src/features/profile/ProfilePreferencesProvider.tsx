import { createContext, type PropsWithChildren, useContext, useEffect, useMemo } from 'react'
import { useTheme } from '../theme/ThemeProvider'
import { useAccountProfile } from './hooks'

type ProfilePreferencesContextValue = {
  showTranslations: boolean
}

const ProfilePreferencesContext = createContext<ProfilePreferencesContextValue>({
  showTranslations: false,
})

export function ProfilePreferencesProvider({ children }: PropsWithChildren) {
  const profile = useAccountProfile()
  const { setTheme } = useTheme()

  useEffect(() => {
    if (profile.data?.theme) setTheme(profile.data.theme)
  }, [profile.data?.theme, setTheme])

  const value = useMemo(
    () => ({ showTranslations: profile.data?.showTranslations ?? false }),
    [profile.data?.showTranslations],
  )

  return (
    <ProfilePreferencesContext.Provider value={value}>
      {children}
    </ProfilePreferencesContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components -- Provider and its hook intentionally share one context module.
export function useProfilePreferences() {
  return useContext(ProfilePreferencesContext)
}
