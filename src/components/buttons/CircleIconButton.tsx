import type { ButtonProps } from 'antd'
import { Button } from 'antd'
import type { ReactNode } from 'react'

type CircleIconButtonProps = {
  icon: ReactNode
  ariaLabel: string
  className?: string
} & Pick<ButtonProps, 'disabled' | 'htmlType' | 'onClick'>

export function CircleIconButton({
  icon,
  ariaLabel,
  className,
  disabled,
  htmlType,
  onClick,
}: CircleIconButtonProps) {
  return (
    <Button
      type='text'
      icon={icon}
      aria-label={ariaLabel}
      className={`app-icon-button-circle${className ? ` ${className}` : ''}`}
      disabled={disabled}
      htmlType={htmlType}
      onClick={onClick}
    />
  )
}
