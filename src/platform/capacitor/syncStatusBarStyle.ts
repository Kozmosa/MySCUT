import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import type { ResolvedGlobalThemeMode } from '../../core/theme/types'

export async function syncStatusBarStyleForTheme(resolvedMode: ResolvedGlobalThemeMode) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return
  }

  try {
    await StatusBar.setStyle({
      style: resolvedMode === 'light' ? Style.Light : Style.Dark,
    })
  } catch {
    // Ignore plugin errors to avoid blocking theme updates
  }
}
