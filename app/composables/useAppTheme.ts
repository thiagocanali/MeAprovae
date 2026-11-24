export function useAppTheme() {
  const theme = useCookie<'light' | 'dark'>('meaprovae-theme', {
    default: () => 'light',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const isDark = computed(() => theme.value === 'dark')

  function toggleTheme() {
    theme.value = isDark.value ? 'light' : 'dark'
  }

  return { theme, isDark, toggleTheme }
}
