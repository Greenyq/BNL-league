import { useEffect, useRef, useState } from 'react'

export function useCountUp(target, duration = 1500, start = 0) {
  const [count, setCount] = useState(start)
  const rafRef = useRef(null)

  useEffect(() => {
    if (target === undefined || target === null) return
    const startTime = performance.now()
    const startVal = start

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(startVal + (target - startVal) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, start])

  return count
}
