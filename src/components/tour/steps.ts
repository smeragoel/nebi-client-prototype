/** Where the card sits relative to the highlighted element. */
export type Placement = 'right' | 'bottom' | 'bottom-end'

export type TourStep = {
  id: string
  /** `data-tour` values to look for, in order. The first one on the page is highlighted. */
  targets: string[]
  title: string
  body: string
  placement: Placement
  /** Space between the element and the spotlight's edge. */
  pad?: number
  /** The closing step: no counter, and Next reads Done. */
  finish?: boolean
}

/**
 * Project details tour, copy and order from Figma (UX review `06` 3245:15707). A step whose element isn't
 * on the page is skipped, and the counter only counts the steps shown: Share needs a server copy of the
 * project, and Push only shows on a version the server doesn't have yet (3b, "4 of 6").
 */
export const PROJECT_TOUR: TourStep[] = [
  {
    id: 'versions',
    targets: ['rail'],
    title: 'Every change is a new version',
    body: 'A version is a saved snapshot of this project’s packages. Versions never change, so you can always go back to one.',
    placement: 'right',
    pad: 8,
  },
  {
    id: 'installed',
    // The Installed badge on the installed version; on any other version, its Install button.
    targets: ['installed', 'install'],
    title: 'One version is installed at a time',
    body: 'The installed version is the one on your disk. Installing another version replaces it.',
    placement: 'bottom',
  },
  {
    id: 'create',
    targets: ['create-version'],
    title: 'Change packages with a new version',
    body: 'Start from any version, edit its packages, and save it as the next version.',
    placement: 'bottom',
  },
  {
    id: 'push',
    targets: ['push'],
    title: 'Push sends your versions to the server',
    body: 'Versions you create stay on this machine until you push them. Teammates only see pushed versions.',
    placement: 'bottom',
  },
  {
    id: 'share',
    targets: ['share'],
    title: 'Share gives teammates access',
    body: 'Add people or teams to this project on your Nebi server. They can see and pull its versions.',
    placement: 'bottom-end',
  },
  {
    id: 'publish',
    targets: ['publish'],
    title: 'Publish sends a version to a registry',
    body: 'Use it to make a version available outside Nebi, like GHCR or Quay. To work with teammates, use Share.',
    placement: 'bottom',
  },
  {
    id: 'finish',
    targets: ['help'],
    title: 'Come back anytime',
    body: 'Restart this tour from Help whenever you need it.',
    placement: 'bottom-end',
    finish: true,
  },
]

export function findTarget(step: TourStep): HTMLElement | null {
  for (const t of step.targets) {
    const el = document.querySelector<HTMLElement>(`[data-tour="${t}"]`)
    if (el) return el
  }
  return null
}
