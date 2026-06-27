import { useCallback, useRef } from 'react'

interface UseInfiniteScrollOptions {
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
}: UseInfiniteScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el || isLoading || !hasMore) return
    if (el.scrollTop < 80) {
      onLoadMore()
    }
  }, [onLoadMore, hasMore, isLoading])

  return { containerRef, handleScroll }
}
