import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestAnimatedBack } from '../../core/navigation/animatedBack'

export function useHardwareBackButton() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return
    }

    const listenerPromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        const handled = requestAnimatedBack()
        if (!handled) {
          navigate(-1)
        }

        return
      }

      CapacitorApp.exitApp()
    })

    return () => {
      listenerPromise
        .then((listener) => listener.remove())
        .catch(() => undefined)
    }
  }, [navigate])
}
