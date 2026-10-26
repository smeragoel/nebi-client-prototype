import { Check, Laptop, Search, Server, Upload } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PersonAvatar } from '@/components/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { type Project, timeGroup, type Version } from '@/data/sample'
import { cn } from '@/lib/utils'
import { useStore } from '@/state/store'
import { newestLocal, railVersions, type SyncMarker, syncMarker } from './sync'
import { useSyncMotion } from './useSyncMotion'

/**
 * Left rail of project details. Rows follow the live `Version row` component 2931:11315, which the
 * 2026-09-28 consistency pass put in every project-details frame: line 1 is the number, then
 * Installed/Installing → tags → +N, with the sync marker and published icon on the right; line 2 is
 * the author avatar and the description.
 */
export function VersionRail({
  project,
  selected,
  onSelect,
}: {
  project: Project
  selected: number
  onSelect: (n: number) => void
}) {
  const { push, pull, pushing } = useStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const listRef = useRef<HTMLElement>(null)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^v(?=\d)/, '')
    const matches = (v: Version) =>
      !q ||
      String(v.number) === q ||
      v.description.toLowerCase().includes(q) ||
      v.author.name.toLowerCase().includes(q) ||
      v.tags.some((t) => t.toLowerCase().includes(q))
    const out: { label: string; versions: ReturnType<typeof railVersions> }[] = []
    for (const v of railVersions(project).filter(matches)) {
      const label = timeGroup(v.ageDays)
      if (out.at(-1)?.label !== label) out.push({ label, versions: [] })
      out.at(-1)?.versions.push(v)
    }
    return out
  }, [project, query])

  const ahead = project.serverVersion != null ? newestLocal(project) - project.serverVersion : 0
  const behind = project.serverOnly.length
  // A collapsing notice keeps its last wording ("1 version…") instead of flashing "0 versions".
  const [shownAhead, setShownAhead] = useState(ahead)
  if (ahead > 0 && ahead !== shownAhead) setShownAhead(ahead)
  const newestOnServer = project.serverOnly.at(-1)?.number
  const [shownBehind, setShownBehind] = useState({ count: behind, version: newestOnServer })
  if (behind > 0 && (behind !== shownBehind.count || newestOnServer !== shownBehind.version)) {
    setShownBehind({ count: behind, version: newestOnServer })
  }
  useSyncMotion(listRef, project.serverVersion != null && project.serverVersion === newestLocal(project) && behind === 0)

  // The rail scrolls on its own; bring the selected row into view when the page opens on it.
  // Only on first render: later selections are clicks on rows already in view.
  useEffect(() => {
    listRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [])

  return (
    <aside className="flex min-h-0 w-[300px] shrink-0 flex-col gap-3" aria-label="Versions">
      {/* Heading, notices and search stay put; only the version list scrolls. */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base text-foreground leading-5">Versions</h2>
          <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}/compare?from=${selected}`)}>
            Compare versions
          </Button>
        </div>

        <Collapse open={ahead > 0}>
          <Notice
            icon={<Laptop />}
            action={
              <Button
                variant="outline"
                size="xs"
                loading={pushing?.projectId === project.id && pushing.upTo == null}
                disabled={pushing != null && pushing.upTo != null}
                loadingText="Pushing…"
                onClick={() => push(project.id)}
              >
                Push
              </Button>
            }
          >
            {shownAhead} {shownAhead === 1 ? 'version' : 'versions'} not on the server yet
          </Notice>
        </Collapse>
        <Collapse open={behind > 0}>
          <Notice
            icon={<Server />}
            action={
              <Button variant="outline" size="xs" onClick={() => pull(project.id)}>
                Pull version {shownBehind.version}
              </Button>
            }
          >
            Server is {shownBehind.count} {shownBehind.count === 1 ? 'version' : 'versions'} ahead
          </Notice>
        </Collapse>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search versions"
            aria-label="Search versions"
            className="pl-9"
          />
        </div>
      </div>

      <nav ref={listRef} aria-label="Version history" className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-9">
        {groups.map((g) => (
          <section key={g.label} className="flex flex-col">
            <h3 className="mt-4 mb-1.5 font-medium text-muted-foreground text-xs leading-4 first:mt-1">{g.label}</h3>
            <ul className="flex flex-col gap-1.5">
              {g.versions.map((v) => (
                <li key={v.number}>
                  <VersionRow
                    project={project}
                    version={v}
                    serverOnly={v.serverOnly}
                    selected={v.number === selected}
                    onSelect={() => onSelect(v.number)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {groups.length === 0 && <p className="px-3 py-6 text-muted-foreground text-sm">No versions match “{query}”.</p>}
      </nav>
    </aside>
  )
}

/** Height-collapsing wrapper for the rail notices ("The notice collapses", 2925:25499). */
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open}
      className={cn(
        'grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-[240ms] motion-safe:ease-out',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="pt-3">{children}</div>
      </div>
    </div>
  )
}

function Notice({ icon, action, children }: { icon: ReactNode; action: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-info py-2 pr-2 pl-3 text-info-foreground text-sm">
      <span className="flex items-center gap-2 [&_svg]:size-3.5 [&_svg]:shrink-0">
        {icon}
        {children}
      </span>
      {action}
    </div>
  )
}

/** How long the "just created" wash holds before it fades (delight 2925:11253). */
const FRESH_HOLD_MS = 600
const FRESH_FADE_MS = 1200

function VersionRow({
  project,
  version: v,
  serverOnly,
  selected,
  onSelect,
}: {
  project: Project
  version: Version
  serverOnly: boolean
  selected: boolean
  onSelect: () => void
}) {
  const { installing, justCreated } = useStore()
  const isInstalling = installing?.projectId === project.id && installing.version === v.number
  const installed = project.installedVersion === v.number
  const sync: SyncMarker = serverOnly ? 'newest-on-server' : syncMarker(project, v.number)
  const published = v.publications.length > 0

  // Row 8 lands with a light purple wash that fades to the selected fill (~1.2s, ease-out).
  const [fresh, setFresh] = useState<'lit' | 'fading' | null>(() =>
    justCreated?.projectId === project.id && justCreated.version === v.number && Date.now() - justCreated.at < 2000
      ? 'lit'
      : null,
  )
  useEffect(() => {
    if (!fresh) return
    const t = window.setTimeout(() => setFresh(fresh === 'lit' ? 'fading' : null), fresh === 'lit' ? FRESH_HOLD_MS : FRESH_FADE_MS)
    return () => window.clearTimeout(t)
  }, [fresh])

  // Overflow rule: tags cap at one + count; the sync label goes icon-only when the line
  // is already carrying Installed and a tag.
  const [firstTag, ...moreTags] = v.tags
  const compactSync = (installed || isInstalling) && firstTag != null && moreTags.length > 0

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex w-full flex-col gap-1 rounded-md border border-transparent bg-background px-3 py-2 text-left outline-none',
        'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
        'motion-safe:transition-[background-color,border-color] motion-safe:duration-(--duration-fast) motion-safe:ease-(--ease-standard)',
        selected && 'border-border-strong bg-muted',
        fresh === 'lit' && 'border-primary/40 bg-primary/10 hover:bg-primary/10',
        fresh === 'fading' && 'motion-safe:duration-[1200ms] motion-safe:ease-out',
      )}
    >
      <span className="flex min-h-5 w-full items-center gap-1.5">
        <span className="font-medium text-foreground text-sm leading-5">v{v.number}</span>
        {isInstalling ? (
          <Badge className="border-transparent bg-transparent px-1 text-info-foreground">
            <Spinner size="xs" className="size-3" />
            Installing
          </Badge>
        ) : (
          installed && (
            <Badge className="border-transparent bg-success text-success-foreground">
              <Check />
              Installed
            </Badge>
          )
        )}
        {firstTag && (
          <Badge variant="outline" className="max-w-24">
            <span className="truncate">{firstTag}</span>
          </Badge>
        )}
        {moreTags.length > 0 && (
          <Tooltip>
            <TooltipTrigger render={<Badge variant="outline" />}>+{moreTags.length}</TooltipTrigger>
            <TooltipContent>{moreTags.join(', ')}</TooltipContent>
          </Tooltip>
        )}
        <span className="ml-auto flex items-center gap-2">
          {sync && <SyncLabel marker={sync} compact={compactSync} />}
          {published && (
            <Tooltip>
              <TooltipTrigger render={<span className="text-muted-foreground-strong" />}>
                <Upload className="size-3.5" aria-label="Published" />
              </TooltipTrigger>
              <TooltipContent>
                Published to {v.publications.map((p) => `${p.registry}/${p.repository}:${p.tag}`).join(', ')}
              </TooltipContent>
            </Tooltip>
          )}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <PersonAvatar person={v.author} focusable={false} />
        <span className="truncate text-muted-foreground-strong text-xs leading-4">{v.description}</span>
      </span>
    </button>
  )
}

const SYNC = {
  'newest-here': { icon: Laptop, label: 'Newest here', tip: 'Latest on this machine. Not on the server yet.' },
  'newest-on-server': { icon: Server, label: 'Newest on server', tip: 'Latest on the server. Not on this machine yet.' },
  'in-sync': { icon: null, label: 'In sync', tip: 'This machine and the server both have this version.' },
} as const

function SyncLabel({ marker, compact }: { marker: Exclude<SyncMarker, null>; compact: boolean }) {
  const { icon: Icon, label, tip } = SYNC[marker]
  const tone = marker === 'in-sync' ? 'text-success-foreground' : 'text-muted-foreground-strong'
  return (
    <Tooltip>
      <TooltipTrigger render={<span data-sync={marker} className={cn('flex items-center gap-1 text-xs leading-4', tone)} />}>
        {Icon ? (
          <Icon className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <span className="flex items-center" aria-hidden>
            <Laptop data-sync-part="laptop" className="size-3.5 shrink-0" />
            <Server data-sync-part="server" className="size-3.5 shrink-0" />
          </span>
        )}
        {compact ? <span className="sr-only">{label}</span> : <span data-sync-part="label">{label}</span>}
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}
