export const ANIMATED_BACK_EVENT = 'app:request-animated-back'

export type AnimatedBackRequestDetail = {
  handled: boolean
}

export function requestAnimatedBack() {
  if (typeof window === 'undefined') {
    return false
  }

  const detail: AnimatedBackRequestDetail = {
    handled: false,
  }

  window.dispatchEvent(
    new CustomEvent<AnimatedBackRequestDetail>(ANIMATED_BACK_EVENT, {
      detail,
    }),
  )

  return detail.handled
}
