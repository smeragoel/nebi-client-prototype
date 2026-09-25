import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from '@/components/ui/toast'
import { INITIAL_PROJECTS, type Project } from '@/data/sample'

/** Install runs as two steps in the real env_install job: download, then link. */
export type Installing = { projectId: string; version: number; step: 1 | 2 }

type Store = {
  projects: Project[]
  installing: Installing | null
  install: (projectId: string, version: number) => void
  uninstall: (projectId: string) => void
  push: (projectId: string) => void
  pull: (projectId: string) => void
}

const StoreContext = createContext<Store | null>(null)

const STEP_MS = 1800
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
    (projectId: string, version: number) => {
      for (const t of timers.current) window.clearTimeout(t)
      setInstalling({ projectId, version, step: 1 })
      timers.current = [
        window.setTimeout(() => setInstalling({ projectId, version, step: 2 }), STEP_MS),
        window.setTimeout(() => {
          setInstalling(null)
          update(projectId, () => ({
            installedVersion: version,
            lastInstalledVersion: version,
            size: SIZE_AFTER_INSTALL[projectId] ?? '1 GB',
          }))
          toast.add({ title: `Version ${version} installed`, description: 'Ready to use on this machine.', type: 'success' })
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

  const push = useCallback(
    (projectId: string) => {
      const newest = Math.max(...(find(projectId)?.versions.map((v) => v.number) ?? [0]))
      update(projectId, () => ({ serverVersion: newest }))
      toast.add({ title: `Version ${newest} pushed`, description: 'This machine and the server are in sync.', type: 'success' })
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

  const value = useMemo(
    () => ({ projects, installing, install, uninstall, push, pull }),
    [projects, installing, install, uninstall, push, pull],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
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
