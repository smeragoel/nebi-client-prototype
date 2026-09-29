import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listVersions } from '@/components/details/sync'
import { toast } from '@/components/ui/toast'
import { installLines, isActive, type Job, JOB_TYPE_LABEL, type JobType, lockLines, restoreLines, sampleJobs } from '@/data/jobs'
import { changeSummary, INITIAL_PROJECTS, ME, type Project, project1History, type Publication, publicationRef, resolve, type Version } from '@/data/sample'
import { type Connection, DEFAULT_CONNECTION, INITIAL_SERVER_PROJECTS, type Principal, type Role, type ServerProject } from '@/data/server'
import type { ProjectDraft } from '@/lib/toml'

/** Install runs as two steps in the real env_install job: download, then link. */
export type Installing = { projectId: string; version: number; step: 1 | 2; jobId: string }

export type Pushing = { projectId: string; upTo: number | null }

/** What the Create project page hands over: the environment plus version 1's path, tags and description. */
export type NewProjectDraft = ProjectDraft & Pick<Version, 'tags' | 'description'> & { path: string }

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
  /** The push that's running. `upTo` is null for a push of everything (the rail's Push). */
  pushing: Pushing | null
  /** `toast: false` when the caller shows progress itself (project details has its own install alert). Returns the job id. */
  install: (projectId: string, version: number, opts?: { toast?: boolean }) => string
  uninstall: (projectId: string) => void
  /** Pushes every unpushed version, or only those up to `upTo` (a version's own Push to server). */
  push: (projectId: string, upTo?: number) => void
  pull: (projectId: string) => void
  /** Saves version 1 of a new project and returns its id. `andInstall` starts the install job right away. */
  create: (draft: NewProjectDraft, andInstall: boolean) => string
  /** Saves a new version and returns its number. Tags it takes move off older versions. */
  createVersion: (projectId: string, draft: VersionDraft, andInstall: boolean) => number
  /** Replaces where one version is published. */
  publish: (projectId: string, version: number, next: Publication[]) => void
  /** Set by createVersion so the rail can play the landing highlight once (delight 2925:11253). */
  justCreated: { projectId: string; version: number; at: number } | null
  /** False when this client has no Nebi server set up (empty state 1774:15524). */
  serverConnected: boolean
  loadScenario: (scenario: Scenario) => void

  /** The one Nebi server this client talks to, or null (02b). */
  connection: Connection | null
  connect: (connection: Connection) => void
  updateConnection: (connection: Connection) => void
  /** Pulled projects stay on this machine and keep working; they just stop syncing. */
  disconnect: (opts?: { silent?: boolean }) => void
  /** Projects on the server this account can open (02a). */
  serverProjects: ServerProject[]
  syncedAt: number
  syncing: boolean
  refreshServer: () => void
  /** The pull that's running. `localId` is set once the pull lands and the install starts. */
  pulling: { serverId: string; localId: string | null } | null
  /** Pulls a server project under `localName`, then installs it when `andInstall`. `onOpen` backs the toast's Open project. */
  pullFromServer: (serverId: string, localName: string, andInstall: boolean, onOpen: (localId: string) => void) => void
  /** Gives, changes or (role null) removes someone's access to a server project. `at` puts a new row back where it was (Undo). */
  setAccess: (serverId: string, principal: Principal, role: Role | null, at?: number) => void

  /** Background jobs on this machine, newest first (05 Jobs). */
  jobs: Job[]
  /** Cancels a queued or running job. A running install stops and cleans up its partial environment. */
  cancelJob: (jobId: string) => void
}

const StoreContext = createContext<Store | null>(null)

const STEP_MS = 1800
const PUSH_MS = 1200
const PULL_MS = 1600
const SYNC_MS = 900
/** How often a running job's next log line streams in. */
const LOG_LINE_MS = 900
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
  const [pushing, setPushing] = useState<Pushing | null>(null)
  const pushingRef = useRef<Pushing | null>(null)
  const [justCreated, setJustCreated] = useState<Store['justCreated']>(null)
  const [connection, setConnection] = useState<Connection | null>(DEFAULT_CONNECTION)
  const serverConnected = connection != null
  const [serverProjects, setServerProjects] = useState(INITIAL_SERVER_PROJECTS)
  const [syncedAt, setSyncedAt] = useState(() => Date.now() - 2 * 60_000)
  const [syncing, setSyncing] = useState(false)
  const [pulling, setPulling] = useState<Store['pulling']>(null)
  const [jobs, setJobs] = useState(() => sampleJobs())
  const jobsRef = useRef(jobs)
  const navigate = useNavigate()
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

  // Jobs change from timers and toasts, so the ref is the source of truth and state follows it.
  const updateJob = useCallback((jobId: string, change: (j: Job) => Partial<Job>) => {
    jobsRef.current = jobsRef.current.map((j) => (j.id === jobId ? { ...j, ...change(j) } : j))
    setJobs(jobsRef.current)
  }, [])

  /** Adds a job to the top of the list. Jobs that finish at once (create, update, uninstall) pass `seconds`. */
  const addJob = useCallback(
    (type: JobType, projectId: string, log: string[], opts: { seconds?: number; pending?: string[] } = {}) => {
      const now = Date.now()
      const job: Job = {
        id: crypto.randomUUID(),
        type,
        projectId,
        status: opts.seconds != null ? 'succeeded' : 'running',
        createdAt: now,
        startedAt: now,
        endedAt: opts.seconds != null ? now + opts.seconds * 1000 : null,
        log,
        pending: opts.pending ?? [],
      }
      jobsRef.current = [job, ...jobsRef.current]
      setJobs(jobsRef.current)
      return job.id
    },
    [],
  )

  // Running jobs stream their log a line at a time.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (!jobsRef.current.some((j) => j.status === 'running' && j.pending.length)) return
      jobsRef.current = jobsRef.current.map((j) =>
        j.status === 'running' && j.pending.length ? { ...j, log: [...j.log, j.pending[0]], pending: j.pending.slice(1) } : j,
      )
      setJobs(jobsRef.current)
    }, LOG_LINE_MS)
    return () => window.clearInterval(t)
  }, [])

  const installingRef = useRef<Installing | null>(null)
  useEffect(() => {
    installingRef.current = installing
  }, [installing])

  const install = useCallback(
    (projectId: string, version: number, opts?: { toast?: boolean }) => {
      for (const t of timers.current) window.clearTimeout(t)
      setInstallDone(null)
      const v = find(projectId)?.versions.find((x) => x.number === version)
      const jobId = addJob('env_install', projectId, ['Running: pixi install -v'], { pending: v ? installLines(v) : [] })
      setInstalling({ projectId, version, step: 1, jobId })
      timers.current = [
        window.setTimeout(() => setInstalling({ projectId, version, step: 2, jobId }), STEP_MS),
        window.setTimeout(() => {
          setInstalling(null)
          updateJob(jobId, (j) => ({
            status: 'succeeded',
            endedAt: Date.now(),
            log: [...j.log, ...j.pending, 'Environment installed successfully'],
            pending: [],
          }))
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
      return jobId
    },
    [update, addJob, updateJob],
  )

  const cancelJob = useCallback(
    (jobId: string) => {
      const job = jobsRef.current.find((j) => j.id === jobId)
      if (!job || !isActive(job)) return
      const p = find(job.projectId)
      if (installingRef.current?.jobId === jobId) {
        for (const t of timers.current) window.clearTimeout(t)
        setInstalling(null)
      }
      // What the worker writes on the way out (worker.go). A queued job never started, so there's nothing to undo.
      const cleanup =
        job.status === 'queued'
          ? []
          : job.type === 'env_install'
            ? [`Cleaning up job artifact: ${p?.path ?? '/home/user/project'}/.pixi/envs`]
            : restoreLines
      updateJob(jobId, (j) => ({ status: 'cancelled', endedAt: j.startedAt ? Date.now() : null, log: [...j.log, ...cleanup], pending: [] }))
      toast.add({ title: `${JOB_TYPE_LABEL[job.type]} cancelled`, description: p ? `Nothing changed in ${p.name}.` : undefined })
    },
    [updateJob],
  )

  const uninstall = useCallback(
    (projectId: string) => {
      const p = find(projectId)
      update(projectId, () => ({ installedVersion: null, size: null }))
      addJob('env_uninstall', projectId, [`Removing installed environment at: ${p?.path}/.pixi/envs`, 'Environment uninstalled successfully'], {
        seconds: 1,
      })
      toast.add({
        title: `Version ${p?.installedVersion ?? ''} uninstalled`.replace('  ', ' '),
        description: p?.size ? `Freed ${p.size} on this machine.` : undefined,
      })
    },
    [update, addJob],
  )

  /** Pushes take a moment, so the in-sync delight plays when the push finishes, not on click. */
  const push = useCallback(
    (projectId: string, upTo?: number) => {
      if (pushingRef.current) return
      const job = { projectId, upTo: upTo ?? null }
      pushingRef.current = job
      setPushing(job)
      window.setTimeout(() => {
        const p = find(projectId)
        const local = p?.versions.map((v) => v.number).sort((a, b) => a - b) ?? []
        const newest = local.at(-1) ?? 0
        const target = Math.min(upTo ?? newest, newest)
        const sent = local.filter((n) => n > (p?.serverVersion ?? 0) && n <= target)
        const left = local.filter((n) => n > target)
        pushingRef.current = null
        setPushing(null)
        update(projectId, () => ({ serverVersion: target }))
        toast.add({
          title: `${capitalize(listVersions(sent))} pushed`,
          description: left.length
            ? `${capitalize(listVersions(left))} ${left.length === 1 ? 'is' : 'are'} still only on this machine.`
            : 'This machine and the server are in sync.',
          type: 'success',
        })
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
    (draft: NewProjectDraft, andInstall: boolean) => {
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
            description: draft.description,
            author: ME,
            ageDays: 0,
            tags: draft.tags,
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
      addJob('create', id, [`Creating environment at: ${project.path}`, 'Writing custom pixi.toml content', ...lockLines, 'Environment created successfully'], {
        seconds: 4,
      })
      toast.add({
        title: `${draft.name} created`,
        description: andInstall ? 'Version 1 is saved. Installing it now.' : 'Version 1 is saved on this machine. Install it when you need it.',
        type: 'success',
      })
      if (andInstall) install(id, 1, { toast: false })
      return id
    },
    [install, addJob],
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
      addJob('update', projectId, ['Writing custom pixi.toml content', ...lockLines], { seconds: 3 })

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
    [install, push, addJob],
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
    setConnection(scenario === 'empty-not-connected' ? null : DEFAULT_CONNECTION)
    setServerProjects(INITIAL_SERVER_PROJECTS)
  }, [])

  const connect = useCallback((next: Connection) => {
    setConnection(next)
    setSyncedAt(Date.now())
    toast.add({ title: `Connected to ${next.url}`, description: 'Projects shared with you are listed on the Server page.', type: 'success' })
  }, [])

  const updateConnection = useCallback((next: Connection) => {
    setConnection(next)
    toast.add({ title: 'Connection updated', type: 'success' })
  }, [])

  const disconnect = useCallback((opts?: { silent?: boolean }) => {
    const was = connectionRef.current
    setConnection(null)
    if (was && !opts?.silent) {
      toast.add({ title: `Disconnected from ${was.url}`, description: 'Projects you pulled stay on this machine and keep working.' })
    }
  }, [])

  const refreshServer = useCallback(() => {
    setSyncing(true)
    window.setTimeout(() => {
      setSyncing(false)
      setSyncedAt(Date.now())
    }, SYNC_MS)
  }, [])

  const serverCurrent = useRef(serverProjects)
  useEffect(() => {
    serverCurrent.current = serverProjects
  }, [serverProjects])
  const connectionRef = useRef(connection)
  useEffect(() => {
    connectionRef.current = connection
  }, [connection])

  const pullFromServer = useCallback(
    (serverId: string, localName: string, andInstall: boolean, onOpen: (localId: string) => void) => {
      const sp = serverCurrent.current.find((x) => x.id === serverId)
      if (!sp) return
      const taken = new Set(current.current.map((p) => p.id))
      const slug = localName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'
      let id = slug
      for (let n = 2; taken.has(id); n++) id = `${slug}-${n}`
      const n = sp.latestVersion
      const open = { children: 'Open project', onClick: () => onOpen(id) }

      setPulling({ serverId, localId: null })
      // Figma `Toast confirmation` 2317:10140: one toast follows the job from start to finish.
      const toastId = toast.add({
        type: 'loading',
        title: sp.name,
        description: andInstall ? 'Pull and install job started' : 'Pull job started',
        actionProps: { children: 'View in Jobs', onClick: () => navigate('/jobs') },
      })

      window.setTimeout(() => {
        const history = project1History().slice(0, n)
        const project: Project = {
          id,
          name: localName,
          path: `/home/user/${localName}`,
          versions: history.map((v, i) => ({ ...v, publications: [], tags: i === n - 1 ? ['latest'] : [] })),
          serverOnly: [],
          serverVersion: n,
          installedVersion: null,
          lastInstalledVersion: null,
          size: null,
          remotes: ['team-nebi'],
          ...(localName !== sp.name ? { serverName: sp.name } : {}),
        }
        current.current = [...current.current, project]
        setProjects(current.current)

        if (!andInstall) {
          setPulling(null)
          toast.update(toastId, {
            type: 'success',
            title: `${sp.name} pulled`,
            description: `Version ${n} is on this machine. Install it when you need it.`,
            actionProps: open,
          })
          return
        }
        setPulling({ serverId, localId: id })
        toast.update(toastId, { description: `Pulled. Installing version ${n}…` })
        const jobId = install(id, n, { toast: false })
        window.setTimeout(() => {
          setPulling(null)
          if (jobsRef.current.find((j) => j.id === jobId)?.status === 'cancelled') {
            toast.update(toastId, {
              type: 'info',
              title: `${sp.name} pulled`,
              description: `The install was cancelled. Version ${n} is on this machine; install it when you need it.`,
              actionProps: open,
            })
            return
          }
          toast.update(toastId, {
            type: 'success',
            title: `${sp.name} installed`,
            description: `Version ${n} is ready to use on this machine.`,
            actionProps: open,
          })
        }, STEP_MS * 2 + 50)
      }, PULL_MS)
    },
    [install, navigate],
  )

  const setAccess = useCallback((serverId: string, principal: Principal, role: Role | null, at?: number) => {
    setServerProjects((all) =>
      all.map((sp) => {
        if (sp.id !== serverId) return sp
        const has = sp.access.some((g) => g.principal.id === principal.id)
        const access =
          role == null
            ? sp.access.filter((g) => g.principal.id !== principal.id)
            : has
              ? sp.access.map((g) => (g.principal.id === principal.id ? { ...g, role } : g))
              : sp.access.toSpliced(at ?? sp.access.length, 0, { principal, role })
        return { ...sp, access }
      }),
    )
  }, [])

  const dismissInstallDone = useCallback(() => setInstallDone(null), [])

  const value = useMemo(
    () => ({
      projects, installing, installDone, dismissInstallDone, pushing, install, uninstall, push, pull, create, createVersion, publish, justCreated, serverConnected, loadScenario,
      connection, connect, updateConnection, disconnect, serverProjects, syncedAt, syncing, refreshServer, pulling, pullFromServer, setAccess,
      jobs, cancelJob,
    }),
    [projects, installing, installDone, dismissInstallDone, pushing, install, uninstall, push, pull, create, createVersion, publish, justCreated, serverConnected, loadScenario,
      connection, connect, updateConnection, disconnect, serverProjects, syncedAt, syncing, refreshServer, pulling, pullFromServer, setAccess,
      jobs, cancelJob],
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

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
