import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'

type Tour = {
  /** The tour is running (the page is dimmed and a step card is up). */
  active: boolean
  /** Finished, closed or turned down once. The first-visit prompt doesn't come back after that. */
  seen: boolean
  start: () => void
  /** Ends the tour (Done, ✕, Esc, or leaving the page) and marks it seen. */
  stop: () => void
  /** "Not now" on the first-visit prompt. */
  dismissPrompt: () => void
}

const TourContext = createContext<Tour | null>(null)

/**
 * Onboarding tour state (UX review `06` 3245:15707). Kept in memory like the rest of the prototype,
 * so a reload brings the first-visit prompt back.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [seen, setSeen] = useState(false)

  const start = useCallback(() => setActive(true), [])
  const stop = useCallback(() => {
    setActive(false)
    setSeen(true)
  }, [])
  const dismissPrompt = useCallback(() => setSeen(true), [])

  const value = useMemo(() => ({ active, seen, start, stop, dismissPrompt }), [active, seen, start, stop, dismissPrompt])
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export function useTour() {
  const tour = useContext(TourContext)
  if (!tour) throw new Error('useTour must be used inside TourProvider')
  return tour
}
