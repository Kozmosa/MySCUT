export type GlobalThemeMode = 'light' | 'dark' | 'system'

export type ResolvedGlobalThemeMode = 'light' | 'dark'

export type GlobalThemePreset = {
  mode: ResolvedGlobalThemeMode
  cssVariables: Record<string, string>
}
