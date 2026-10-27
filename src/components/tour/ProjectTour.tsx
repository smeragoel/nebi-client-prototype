import { X } from 'lucide-react'
import { type KeyboardEvent, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { findTarget, PROJECT_TOUR, type TourStep } from './steps'
import { useTour } from './tour-context'

/** The NDS Popover surface (Figma `Popover` 83d900…, shared with DropdownMenu): border, popover fill, shadow/md. */
const SURFACE = 'rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10'
const CARD_W = 320
const GAP = 12
const EDGE = 16

/**
 * Project details onboarding (UX review `06` 3245:15707): the first-visit prompt in the corner, then the
 * guided steps. Mounted by the Project details screen, so leaving the page ends the tour.
 */
export function ProjectTour() {
  const { active, seen, start, stop, dismissPrompt } = useTour()
  // Leaving the page mid-tour ends it. Only while it's running: StrictMode's mount-unmount-mount would
  // otherwise mark the tour seen before the prompt ever shows.
  const running = useRef(active)
  useEffect(() => {
    running.current = active
  }, [active])
  useEffect(
    () => () => {
      if (running.current) stop()
    },
    [stop],
  )

  if (active) return <TourSteps onClose={stop} />
  if (seen) return null
  return <TourPrompt onStart={start} onDismiss={dismissPrompt} />
}

/** `Onboarding / Tour prompt` 3245:15746. No scrim: the page stays usable while it's up. */
function TourPrompt({ onStart, onDismiss }: { onStart: () => void; onDismiss: () => void }) {
  const titleId = useId()
  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      className={cn(SURFACE, 'fixed right-6 bottom-6 z-40 w-80 motion-safe:animate-slide-up-fade')}
    >
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="font-medium text-foreground text-sm">
            New to Nebi projects?
          </h2>
          <Button variant="ghost" size="icon-xs" onClick={onDismiss} aria-label="Close">
            <X />
          </Button>
        </div>
        <p className="text-muted-foreground-strong text-sm">
          Take a 1-minute tour of this page: versions, installing, sharing and publishing.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onDismiss}>
            Not now
          </Button>
          <Button size="sm" onClick={onStart}>
            Start tour
          </Button>
        </div>
      </div>
    </div>
  )
}

type Box = { top: number; left: number; width: number; height: number }

function TourSteps({ onClose }: { onClose: () => void }) {
  // Steps whose element isn't on the page are dropped once, when the tour starts.
  const steps = useMemo(() => PROJECT_TOUR.filter((s) => findTarget(s)), [])
  const numbered = steps.filter((s) => !s.finish).length
  const [index, setIndex] = useState(0)
  const step = steps[index]
  const returnFocus = useRef<Element | null>(document.activeElement)

  const close = useCallback(() => {
    onClose()
    // Back to where the tour was started from; the prompt is gone by then, so fall back to Help.
    const el = returnFocus.current
    const target = el instanceof HTMLElement && el.isConnected ? el : document.querySelector<HTMLElement>('[data-tour="help"]')
    target?.focus()
  }, [onClose])

  const next = () => (index < steps.length - 1 ? setIndex(index + 1) : close())
  const back = () => setIndex(Math.max(0, index - 1))

  if (!step) return null
  return (
    <TourStepView
      key={step.id}
      step={step}
      counter={step.finish ? null : `${index + 1} of ${numbered}`}
      canGoBack={index > 0}
      onNext={next}
      onBack={back}
      onClose={close}
    />
  )
}

function TourStepView({
  step,
  counter,
  canGoBack,
  onNext,
  onBack,
  onClose,
}: {
  step: TourStep
  counter: string | null
  canGoBack: boolean
  onNext: () => void
  onBack: () => void
  onClose: () => void
}) {
  const titleId = useId()
  const bodyId = useId()
  const cardRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const [hole, setHole] = useState<Box | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const measure = useCallback(() => {
    const el = findTarget(step)
    const card = cardRef.current
    if (!el || !card) return
    const r = el.getBoundingClientRect()
    const pad = step.pad ?? 6
    const h = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 }
    setHole(h)

    const cardH = card.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    let top: number
    let left: number
    if (step.placement === 'right') {
      left = h.left + h.width + GAP
      top = h.top
    } else {
      left = step.placement === 'bottom-end' ? h.left + h.width - CARD_W : h.left
      top = h.top + h.height + GAP
      // Not enough room under it: go above.
      if (top + cardH > vh - EDGE) top = h.top - GAP - cardH
    }
    setPos({
      left: Math.min(Math.max(left, EDGE), vw - CARD_W - EDGE),
      top: Math.min(Math.max(top, EDGE), vh - cardH - EDGE),
    })
  }, [step])

  useLayoutEffect(() => {
    findTarget(step)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    measure()
    let frame = 0
    const onChange = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    window.addEventListener('resize', onChange)
    // Capture: the rail and the version panel scroll on their own.
    window.addEventListener('scroll', onChange, true)
    const ro = new ResizeObserver(onChange)
    ro.observe(document.body)
    if (cardRef.current) ro.observe(cardRef.current)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onChange)
      window.removeEventListener('scroll', onChange, true)
      ro.disconnect()
    }
  }, [measure, step])

  // Focus Next once the card is placed: until then it's `invisible`, and hidden buttons can't take focus.
  const placed = pos !== null
  useEffect(() => {
    if (placed) nextRef.current?.focus()
  }, [placed])

  // Esc closes and ← / → step through, wherever focus is while the tour is up.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onNext()
      else if (e.key === 'ArrowLeft' && canGoBack) onBack()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNext, onBack, canGoBack])

  // The page behind can't be clicked, so keep Tab inside the card.
  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !cardRef.current) return
    const items = [...cardRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')]
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      {/* Blocks the page; clicking the dimmed area does nothing (Figma notes). */}
      <div className="fixed inset-0 z-50" aria-hidden />
      {hole && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 rounded-lg shadow-[0_0_0_9999px_var(--scrim)] ring-2 ring-primary motion-safe:animate-fade-in"
          style={hole}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={trapTab}
        className={cn(SURFACE, 'fixed z-50 w-80', pos ? 'motion-safe:animate-slide-up-fade' : 'invisible')}
        style={pos ?? { top: 0, left: 0 }}
      >
        {/* `Onboarding / Tour step` 3245:15708 (Smera's 10-27 layout): title and ✕, body, then counter and Back / Next. */}
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className="font-medium text-foreground text-sm">
              {step.title}
            </h2>
            <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="End tour">
              <X />
            </Button>
          </div>
          <p id={bodyId} className="text-muted-foreground-strong text-sm">
            {step.body}
          </p>
          <div className="flex items-center justify-between gap-2 pt-1">
            {counter && <span className="text-muted-foreground text-xs">{counter}</span>}
            <div className="ml-auto flex gap-2">
              {canGoBack && (
                <Button variant="secondary" size="xs" onClick={onBack}>
                  Back
                </Button>
              )}
              <Button ref={nextRef} size="xs" onClick={onNext}>
                {step.finish ? 'Done' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
