import type { CSSProperties } from 'react'

export type VerticalSlideSelectorOption<T extends string> = {
  value: T
  label: string
}

type VerticalSlideSelectorProps<T extends string> = {
  value: T
  options: VerticalSlideSelectorOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

export function VerticalSlideSelector<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: VerticalSlideSelectorProps<T>) {
  const activeIndex = options.findIndex((option) => option.value === value)

  const indicatorStyle = {
    '--vertical-slide-index': activeIndex < 0 ? 0 : activeIndex,
  } as CSSProperties

  return (
    <div
      className={`vertical-slide-selector${className ? ` ${className}` : ''}`}
      role='group'
      aria-label={ariaLabel}
      style={indicatorStyle}
    >
      <span className='vertical-slide-selector-indicator' aria-hidden='true' />
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          className={`vertical-slide-selector-button ${option.value === value ? 'is-active' : ''}`}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
