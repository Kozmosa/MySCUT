export type GlobalThemeMode = 'light' | 'dark' | 'system'

export type ResolvedGlobalThemeMode = 'light' | 'dark'

export type GlobalThemeFamily = 'default' | 'palacePlum'

export type GlobalThemePreset = {
  family: GlobalThemeFamily
  mode: ResolvedGlobalThemeMode
  cssVariables: Record<string, string>
}
