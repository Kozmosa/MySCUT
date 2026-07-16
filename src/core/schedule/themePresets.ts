export type ScheduleThemeId =
  | 'skyBlue'
  | 'bambooGrove'
  | 'palacePlum'
  | 'mistyJiangnan'
  | 'luoyangPeony'
  | 'dunhuangApsaras'
  | 'autumnOsmanthus'

type ScheduleThemeMode = 'wakeup' | 'preset'

export type ScheduleThemePreset = {
  id: ScheduleThemeId
  name: string
  primaryColor: string
  textColorPrimary: string
  textColorSecondary: string
  textColorBadge: string
  mode: ScheduleThemeMode
  fallbackColors: string[]
}

export const SCHEDULE_THEME_PRESETS: ScheduleThemePreset[] = [
  {
    id: 'skyBlue',
    name: '默认',
    primaryColor: '#63a9ff',
    textColorPrimary: '#ffffff',
    textColorSecondary: '#dfe4ee',
    textColorBadge: '#ffffff',
    mode: 'wakeup',
    fallbackColors: ['#d9e8ff', '#d8f3e7', '#ffe6cc', '#ffd9e6', '#e5ddff', '#d8f4ff', '#fff1bf'],
  },
  {
    id: 'bambooGrove',
    name: '清雅竹林',
    primaryColor: '#006442',
    textColorPrimary: '#1A3B32',
    textColorSecondary: '#4A6B62',
    textColorBadge: '#815C94',
    mode: 'preset',
    fallbackColors: ['#D6ECF0', '#E0F0E9', '#D2F0F4', '#BCE672', '#A4E2C6', '#C4D7D6', '#DDF7E3'],
  },
  {
    id: 'palacePlum',
    name: '宫墙红梅',
    primaryColor: '#C3272B',
    textColorPrimary: '#4C1F24',
    textColorSecondary: '#825257',
    textColorBadge: '#B02024',
    mode: 'preset',
    fallbackColors: ['#F9E9CD', '#FAD689', '#FEE3D4', '#F3A694', '#E9DDB6', '#F7E8AA', '#F0C9CF'],
  },
  {
    id: 'mistyJiangnan',
    name: '烟雨水乡',
    primaryColor: '#426666',
    textColorPrimary: '#2E3A3B',
    textColorSecondary: '#657778',
    textColorBadge: '#7D5284',
    mode: 'preset',
    fallbackColors: ['#BBC8E6', '#D4D6DA', '#E4C6D0', '#C4CBCF', '#B8CECF', '#CCA4E3', '#D1D9E0'],
  },
  {
    id: 'luoyangPeony',
    name: '洛都牡丹',
    primaryColor: '#9B1E64',
    textColorPrimary: '#3B1425',
    textColorSecondary: '#7A4B5F',
    textColorBadge: '#177CB0',
    mode: 'preset',
    fallbackColors: ['#FEE3D4', '#E4C6D0', '#CCA4E3', '#F0C9CF', '#E2E1E4', '#F3D3E7', '#D1C2D3'],
  },
  {
    id: 'dunhuangApsaras',
    name: '敦煌飞天',
    primaryColor: '#008792',
    textColorPrimary: '#383A3F',
    textColorSecondary: '#756C5C',
    textColorBadge: '#E29C45',
    mode: 'preset',
    fallbackColors: ['#FAD689', '#F5CECD', '#CAD4BA', '#E9DDB6', '#D6C5A4', '#F4C7BA', '#E5D3AA'],
  },
  {
    id: 'autumnOsmanthus',
    name: '金秋丹桂',
    primaryColor: '#FFA631',
    textColorPrimary: '#4D3A20',
    textColorSecondary: '#8C7154',
    textColorBadge: '#9D2933',
    mode: 'preset',
    fallbackColors: ['#F7E8AA', '#FFF143', '#F9E9CD', '#E8DCA1', '#F2CE73', '#EEDEB0', '#F0E5D0'],
  },
]

export function getScheduleThemePresetById(themeId: string) {
  return SCHEDULE_THEME_PRESETS.find((preset) => preset.id === themeId) ?? SCHEDULE_THEME_PRESETS[0]
}

export function resolveScheduleImportThemePreset(themeId: string | null | undefined) {
  return getScheduleThemePresetById(themeId ?? '')
}
