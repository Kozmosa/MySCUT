export type GlobalThemeMode = 'light' | 'dark' | 'system'

export type ResolvedGlobalThemeMode = 'light' | 'dark'

export type GlobalThemeFamily =
  | 'default'
  | 'bambooGrove'
  | 'palacePlum'
  | 'mistyJiangnan'
  | 'luoyangPeony'
  | 'dunhuangApsaras'
  | 'autumnOsmanthus'

export type GlobalThemePreset = {
  family: GlobalThemeFamily
  mode: ResolvedGlobalThemeMode
  cssVariables: Record<string, string>
}
