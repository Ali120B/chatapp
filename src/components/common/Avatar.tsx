import { useState } from 'react'
import { avatarInitial } from '@/utils/avatar'

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-10 w-10 text-base',
} as const

interface AvatarProps {
  src?: string | null
  name: string
  size?: keyof typeof sizeClasses
  className?: string
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = sizeClasses[size]

  const isValidSrc = src && src.length > 5 && !src.startsWith('[') && !imgError

  if (isValidSrc) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setImgError(true)}
        className={`${sizeClass} shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/20 font-medium text-[var(--color-accent)] ${className}`}
      aria-hidden="true"
    >
      {avatarInitial(name)}
    </div>
  )
}
