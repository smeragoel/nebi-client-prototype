import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from '@/components/ui/toast'
import { changeSummary, INITIAL_PROJECTS, ME, type Project, type Publication, publicationRef, resolve, type Version } from '@/data/sample'
import type { ProjectDraft } from '@/lib/toml'

/** Install runs as two steps in the real env_install job: download, then link. */
export type Installing = { projectId: string; version: number; step: 1 | 2 }

/** What the Create new version page hands over. */
export type VersionDraft = Pick<Version, 'channels' | 'platforms' | 'requested' | 'tags' | 'description'> & { base: number }

/** Sample-data setups reachable from /screens, for states the default data can't show. */
export type Scenario = 'default' | 'empty-not-connected' | 'empty-connected'

type Store = {
  projects: Project[]
  installing: Installing | null
  /** The install that just finished. Project details keeps its alert up for a few seconds, then drops it (2026-09-28 sync). */
  installDone: { projectId: string; version: number } | null
  dismissInstallDone: () => void
  /** Project whose push is running (the Push button shows "Pushing…"). */
  pushing: string | null
  /** `toast: false` when the caller shows progress itself (project details has its own install alert). */
  install: (projectId: string, version: number, opts?: { toast?: boolean }) => void
  uninstall: (projectId: string) => void
  push: (projectId: string) => void
  pull: (projectId: string) => void
  /** Saves version 1 of a new project and returns its id. `andInstall` starts the install job right away. */
  create: (draft: ProjectDraft & { path: string }, andInstall: boolean) => string
  /** Saves a new version and returns its number. Tags it takes move off older versions. */
  createVersion: (projectId: string, draft: VersionDraft, andInstall: boolean) => number
  /** Replaces where one version is published. */
  publish: (projectId: string, version: number, next: Publication[]) => void
  /** Set by createVersion so the rail can play the landing highlight once (delight 2925:11253). */
  justCreated: { projectId: string; version: number; at: number } | null
  /** False when this client has no Nebi server set up (empty state 1774:15524). */
  serverConnected: boolean
  loadScenario: (scenario: Scenario) => void
}

const StoreContext = createContext<Store | null>(null)

const STEP_MS = 1800
const PUSH_MS = 1200
/** How long the finished install alert stays before it dismisses itself. */
const INSTALL_DONE_MS = 5000
/** Where Nebi puts a project when Path is left blank (GetWorkspacePath: app data + name). */
const DEFAULT_PROJECTS_DIR = '/home/user/.local/share/nebi/projects'
// Size is per project in the data model; these stand in for a fresh install.
const SIZE_AFTER_INSTALL: Record<string, string> = {
  'project-1': '1.2 GB',
  'project-pulled-from-server': '960 MB',
  'oci-registry': '890 MB',
  sandbox: '233.4 MB',
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState(INITIAL_PROJECTS)
  const [installing, setInstalling] = useState<Installing | null>(null)
  const [installDone, setInstallDone] = useState<Store['installDone']>(null)
  const [pushing, setPushing] = useState<string | null>(null)
  const pushingRef = useRef<string | null>(null)
  const [justCreated, setJustCreated] = useState<Store['justCreated']>(null)
  const [serverConnected, setServerConnected] = useState(true)
  const timers = useRef<number[]>([])
  // Latest projects for event handlers (toasts need values before the state update lands).
  const current = useRef(projects)
  useEffect(() => {
    current.current = projects
  }, [projects])
  const find = (projectId: string) => current.current.find((p) => p.id === projectId)

  const update = useCallback((projectId: string, change: (p: Project) => Partial<Project>) => {
    setProjects((all) => all.map((p) => (p.id === projectId ? { ...p, ...change(p) } : p)))
  }, [])

  const install = useCallback(
    (projectId: string, version: number, opts?: { toast?: boolean }) => {
      for (const t of timers.current) window.clearTimeout(t)
      setInstallDone(null)
      setInstalling({ projectId, version, step: 1 })
      timers.current = [
        window.setTimeout(() => setInstalling({ projectId, version, step: 2 }), STEP_MS),
        window.setTimeout(() => {
          setInstalling(null)
          update(projectId, () => ({
            installedVersion: version,
            lastInstalledVersion: version,
            size: SIZE_AFTER_INSTALL[projectId] ?? estimateSize(find(projectId), version),
          }))
          if (opts?.toast === false) {
            setInstallDone({ projectId, version })
            timers.current.push(window.setTimeout(() => setInstallDone(null), INSTALL_DONE_MS))
          } else {
            toast.add({ title: `Version ${version} installed`, description: 'Ready to use on this machine.', type: 'success' })
          }
        }, STEP_MS * 2),
      ]
    },
    [update],
  )

  const uninstall = useCallback(
    (projectId: string) => {
      const p = find(projectId)
      update(projectId, () => ({ installedVersion: null, size: null }))
      toast.add({
        title: `Version ${p?.installedVersion ?? ''} uninstalled`.replace('  ', ' '),
        description: p?.size ? `Freed ${p.size} on this machine.` : undefined,
      })
    },
    [update],
  )

  /** Pushes take a moment, so the in-sync delight plays when the push finishes, not on click. */
  const push = useCallback(
    (projectId: string) => {
      if (pushingRef.current) return
      pushingRef.current = projectId
      setPushing(projectId)
      window.setTimeout(() => {
        const newest = Math.max(...(find(projectId)?.versions.map((v) => v.number) ?? [0]))
        pushingRef.current = null
        setPushing(null)
        update(projectId, () => ({ serverVersion: newest }))
        toast.add({ title: `Version ${newest} pushed`, description: 'This machine and the server are in sync.', type: 'success' })
      }, PUSH_MS)
    },
    [update],
  )

  const pull = useCallback(
    (projectId: string) => {
      const pulled = find(projectId)?.serverOnly.map((v) => v.number) ?? []
      update(projectId, (p) => {
        // A pulled version takes over tags like `latest` from older local versions.
        const movedTags = new Set(p.serverOnly.flatMap((v) => v.tags))
        const local = p.versions.map((v) => ({ ...v, tags: v.tags.filter((t) => !movedTags.has(t)) }))
        return { versions: [...local, ...p.serverOnly], serverOnly: [] }
      })
      toast.add({ title: `Version ${pulled.join(', ')} pulled`, description: 'It is on this machine now. Install it to use it.', type: 'success' })
    },
    [update],
  )

  const create = useCallback(
    (draft: ProjectDraft & { path: string }, andInstall: boolean) => {
      const taken = new Set(current.current.map((p) => p.id))
      const slug = draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'
      let id = slug
      for (let n = 2; taken.has(id); n++) id = `${slug}-${n}`

      const project: Project = {
        id,
        name: draft.name,
        path: draft.path || `${DEFAULT_PROJECTS_DIR}/${draft.name}`,
        versions: [
          {
            number: 1,
            description: 'First version',
            author: ME,
            ageDays: 0,
            tags: ['latest'],
            channels: draft.channels,
            platforms: draft.platforms,
            requested: draft.requested,
            publications: [],
          },
        ],
        serverOnly: [],
        serverVersion: null,
        installedVersion: null,
        lastInstalledVersion: null,
        size: null,
        remotes: [],
      }
      current.current = [...current.current, project]
      setProjects((all) => [...all, project])
      toast.add({
        title: `${draft.name} created`,
        description: andInstall ? 'Version 1 is saved. Installing it now.' : 'Version 1 is saved on this machine. Install it when you need it.',
        type: 'success',
      })
      if (andInstall) install(id, 1, { toast: false })
      return id
    },
    [install],
  )

  const createVersion = useCallback(
    (projectId: string, draft: VersionDraft, andInstall: boolean) => {
      const p = find(projectId)
      if (!p) return 0
      const n = Math.max(...[...p.versions, ...p.serverOnly].map((v) => v.number), p.serverVersion ?? 0) + 1
      const base = p.versions.find((v) => v.number === draft.base)
      const version: Version = {
        number: n,
        description: draft.description,
        author: ME,
        ageDays: 0,
        justNow: true,
        tags: draft.tags,
        channels: draft.channels,
        platforms: draft.platforms,
        requested: draft.requested,
        publications: [],
      }
      const taken = new Set(draft.tags)
      const next = {
        ...p,
        versions: [...p.versions.map((v) => ({ ...v, tags: v.tags.filter((t) => !taken.has(t)) })), version],
      }
      current.current = current.current.map((x) => (x.id === projectId ? next : x))
      setProjects(current.current)
      setJustCreated({ projectId, version: n, at: Date.now() })

      const summary = base ? changeSummary(base.requested, draft.requested) : []
      toast.add({
        title: `Version ${n} created`,
        description: [`Started from version ${draft.base}`, ...summary].join(' · '),
        type: 'success',
        // Delight 2925:11253: the toast offers the next step when there's a server to push to.
        ...(p.serverVersion != null && !andInstall
          ? { actionProps: { children: 'Push to server', onClick: () => push(projectId) } }
          : {}),
      })
      if (andInstall) install(projectId, n, { toast: false })
      return n
    },
    [install, push],
  )

  const publish = useCallback(
    (projectId: string, version: number, next: Publication[]) => {
      const before = find(projectId)?.versions.find((v) => v.number === version)?.publications ?? []
      const refs = new Set(next.map(publicationRef))
      const was = new Set(before.map(publicationRef))
      const added = next.filter((x) => !was.has(publicationRef(x)))
      const removed = before.filter((x) => !refs.has(publicationRef(x)))
      if (!added.length && !removed.length) return
      update(projectId, (p) => ({
        versions: p.versions.map((v) => (v.number === version ? { ...v, publications: next } : v)),
      }))
      const names = (xs: Publication[]) => xs.map((x) => x.registry).join(', ')
      toast.add({
        title: added.length
          ? `Version ${version} published to ${names(added)}`
          : `Version ${version} unpublished from ${names(removed)}`,
        description: added.length && removed.length ? `Unpublished from ${names(removed)}.` : undefined,
        type: 'success',
      })
    },
    [update],
  )

  const loadScenario = useCallback((scenario: Scenario) => {
    for (const t of timers.current) window.clearTimeout(t)
    setInstalling(null)
    setInstallDone(null)
    setJustCreated(null)
    const next = scenario === 'default' ? INITIAL_PROJECTS : []
    current.current = next
    setProjects(next)
    setServerConnected(scenario !== 'empty-not-connected')
  }, [])

  const dismissInstallDone = useCallback(() => setInstallDone(null), [])

  const value = useMemo(
    () => ({
      projects, installing, installDone, dismissInstallDone, pushing, install, uninstall, push, pull, create, createVersion, publish, justCreated, serverConnected, loadScenario,
    }),
    [projects, installing, installDone, dismissInstallDone, pushing, install, uninstall, push, pull, create, createVersion, publish, justCreated, serverConnected, loadScenario],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

/** Sum of the lockfile download sizes, standing in for size on disk after an install. */
function estimateSize(p: Project | undefined, version: number) {
  const v = p?.versions.find((x) => x.number === version)
  if (!v) return '1 GB'
  const mb = resolve(v.requested).reduce((sum, r) => {
    const [n, unit] = (r.size ?? '0 MB').split(' ')
    return sum + Number(n) * (unit === 'KB' ? 0.001 : unit === 'GB' ? 1000 : 1)
  }, 0)
  // Unpacked environments run about 3x the download.
  const disk = mb * 3
  return disk >= 1000 ? `${(disk / 1000).toFixed(1)} GB` : `${Math.round(disk)} MB`
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>')
  return ctx
}

/** For buttons whose screens are designed in Figma but not built here yet. */
export function notBuilt(feature: string) {
  toast.add({
    title: `${feature} isn't in the prototype yet`,
    description: 'It is designed in Figma but not built here.',
    type: 'info',
  })
}
