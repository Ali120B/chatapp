import type { ReactNode, CSSProperties } from 'react'

type GlassVariant = 'window' | 'pill' | 'chip' | 'bubble-out' | 'bubble-in'

interface GlassPanelProps {
  variant?: GlassVariant
  className?: string
  style?: CSSProperties
  children?: ReactNode
  as?: 'div' | 'button' | 'form'
  onClick?: () => void
  role?: string
  'aria-label'?: string
  'aria-expanded'?: boolean
  tabIndex?: number
}

const variantClass: Record<GlassVariant, string> = {
  window: 'glass-window',
  pill: 'glass-pill',
  chip: 'glass-chip',
  'bubble-out': 'glass-bubble-out',
  'bubble-in': 'glass-bubble-in',
}

export function GlassPanel({
  variant = 'window',
  className = '',
  style,
  children,
  as: Component = 'div',
  onClick,
  role,
  'aria-label': ariaLabel,
  'aria-expanded': ariaExpanded,
  tabIndex,
}: GlassPanelProps) {
  return (
    <Component
      className={`${variantClass[variant]} ${className}`}
      style={style}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      tabIndex={tabIndex}
    >
      {children}
    </Component>
  )
}
