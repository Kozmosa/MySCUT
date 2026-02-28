import type { ButtonProps } from 'antd'
import { Button } from 'antd'
import type { ReactNode } from 'react'

type RoundedSquareIconButtonProps = {
  icon: ReactNode
  ariaLabel: string
  className?: string
} & Pick<ButtonProps, 'disabled' | 'htmlType' | 'onClick'>

export function RoundedSquareIconButton({
  icon,
  ariaLabel,
  className,
  disabled,
  htmlType,
  onClick,
}: RoundedSquareIconButtonProps) {
  return (
    <Button
      type='text'
      icon={icon}
      aria-label={ariaLabel}
      className={`app-icon-button-square${className ? ` ${className}` : ''}`}
      disabled={disabled}
      htmlType={htmlType}
      onClick={onClick}
    />
  )
}
