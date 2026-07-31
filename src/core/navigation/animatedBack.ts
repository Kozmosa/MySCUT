export const ANIMATED_BACK_EVENT = "app:request-animated-back";

export type AnimatedBackRequestDetail = {
  handled: boolean;
};

/**
 * Requests a custom animated back navigation.
 * Dispatches ANIMATED_BACK_EVENT; registered pages mark event.detail.handled = true when they intercept.
 * Multiple listeners are called synchronously in registration order, sharing the same detail object
 * (no race condition in JS single-threaded event dispatch).
 *
 * @returns true if a page intercepted and executed a custom back animation
 */
export function requestAnimatedBack() {
  if (typeof window === "undefined") {
    return false;
  }

  const detail: AnimatedBackRequestDetail = {
    handled: false,
  };

  window.dispatchEvent(
    new CustomEvent<AnimatedBackRequestDetail>(ANIMATED_BACK_EVENT, {
      detail,
    })
  );

  return detail.handled;
}
