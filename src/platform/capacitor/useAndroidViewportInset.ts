import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'

const CSS_VAR_ANDROID_SYSTEM_BOTTOM_INSET = '--android-system-bottom-inset'

function readAndroidSystemBottomInset() {
  const viewport = window.visualViewport
  if (!viewport) {
    return 0
  }

  const inset = window.innerHeight - (viewport.height + viewport.offsetTop)
  return Math.max(0, Math.round(inset))
}

export function useAndroidViewportInset() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return
    }

    const rootStyle = document.documentElement.style
    const viewport = window.visualViewport

    const syncBottomInset = () => {
      const bottomInset = readAndroidSystemBottomInset()
      rootStyle.setProperty(CSS_VAR_ANDROID_SYSTEM_BOTTOM_INSET, `${bottomInset}px`)
    }

    syncBottomInset()

    window.addEventListener('resize', syncBottomInset)
    viewport?.addEventListener('resize', syncBottomInset)
    viewport?.addEventListener('scroll', syncBottomInset)

    return () => {
      window.removeEventListener('resize', syncBottomInset)
      viewport?.removeEventListener('resize', syncBottomInset)
      viewport?.removeEventListener('scroll', syncBottomInset)
      rootStyle.removeProperty(CSS_VAR_ANDROID_SYSTEM_BOTTOM_INSET)
    }
  }, [])
}
