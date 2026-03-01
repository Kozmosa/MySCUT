import type { CSSProperties } from 'react'

export type HorizontalSlideSelectorOption<T extends string> = {
  value: T
  label: string
}

type HorizontalSlideSelectorProps<T extends string> = {
  value: T
  options: HorizontalSlideSelectorOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

export function HorizontalSlideSelector<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: HorizontalSlideSelectorProps<T>) {
  const activeIndex = options.findIndex((option) => option.value === value)

  const indicatorStyle = {
    '--horizontal-slide-index': activeIndex < 0 ? 0 : activeIndex,
    '--horizontal-slide-count': options.length > 0 ? options.length : 1,
  } as CSSProperties

  return (
    <div
      className={`horizontal-slide-selector${className ? ` ${className}` : ''}`}
      role='group'
      aria-label={ariaLabel}
      style={indicatorStyle}
    >
      <span className='horizontal-slide-selector-indicator' aria-hidden='true' />
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          className={`horizontal-slide-selector-button ${option.value === value ? 'is-active' : ''}`}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
