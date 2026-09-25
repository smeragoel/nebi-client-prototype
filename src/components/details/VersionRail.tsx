import { Check, ChevronDown, Laptop, Search, Server, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PersonAvatar } from '@/components/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { type Project, timeGroup, type Version } from '@/data/sample'
import { cn } from '@/lib/utils'
import { notBuilt, useStore } from '@/state/store'
import { newestLocal, railVersions, type SyncMarker, syncMarker } from './sync'

/**
 * Left rail of project details. Row layout is the 2026-09-25 layout pass
 * (Figma `Version row (redesign)` 2940:11443), not the live rail in 2898:9525:
 * number gutter, avatar + description on line 1, status line (Installed → tags → sync →
 * published) on line 2, hidden when there's nothing to report.
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
  const { push, pull } = useStore()
  const [query, setQuery] = useState('')

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

  return (
    <aside className="flex w-[300px] shrink-0 flex-col gap-3" aria-label="Versions">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base text-foreground leading-5">Versions</h2>
        <Button variant="outline" size="sm" onClick={() => notBuilt('Compare versions')}>
          Compare versions
        </Button>
      </div>

      {ahead > 0 && (
        <Notice icon={<Laptop />} action={<Button variant="outline" size="xs" onClick={() => push(project.id)}>Push</Button>}>
          {ahead} {ahead === 1 ? 'version' : 'versions'} not on the server yet
        </Notice>
      )}
      {behind > 0 && (
        <Notice
          icon={<Server />}
          action={
            <Button variant="outline" size="xs" onClick={() => pull(project.id)}>
              Pull version {project.serverOnly.at(-1)?.number}
            </Button>
          }
        >
          Server is {behind} {behind === 1 ? 'version' : 'versions'} ahead
        </Notice>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search versions"
            aria-label="Search versions"
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => notBuilt('Version filters')}>
          Filters
          <ChevronDown />
        </Button>
      </div>

      <nav aria-label="Version history" className="flex flex-col">
        {groups.map((g) => (
          <section key={g.label} className="flex flex-col">
            <h3 className="mt-4 mb-1 pl-3 font-medium text-muted-foreground text-xs leading-4 first:mt-1">{g.label}</h3>
            <ul className="flex flex-col gap-0.5">
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

function Notice({ icon, action, children }: { icon: React.ReactNode; action: React.ReactNode; children: React.ReactNode }) {
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
  const { installing } = useStore()
  const isInstalling = installing?.projectId === project.id && installing.version === v.number
  const installed = project.installedVersion === v.number
  const sync: SyncMarker = serverOnly ? 'newest-on-server' : syncMarker(project, v.number)
  const published = v.publications.length > 0

  // Overflow rule from the layout pass: tags cap at one + count; the sync label goes
  // icon-only when the line is already carrying Installed and a tag.
  const [firstTag, ...moreTags] = v.tags
  const compactSync = (installed || isInstalling) && firstTag != null && sync !== 'in-sync'
  const hasStatus = installed || isInstalling || v.tags.length > 0 || sync != null || published

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'grid w-full grid-cols-[32px_1fr] items-start rounded-md border border-transparent px-3 py-2 text-left outline-none',
        'hover:bg-background focus-visible:ring-2 focus-visible:ring-ring',
        'motion-safe:transition-[background-color,border-color] motion-safe:duration-(--duration-fast) motion-safe:ease-(--ease-standard)',
        selected && 'border-border-strong bg-muted hover:bg-muted',
      )}
    >
      <span className="font-medium text-foreground text-sm leading-5">v{v.number}</span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <PersonAvatar person={v.author} focusable={false} />
          <span className="truncate text-foreground text-sm leading-5">{v.description}</span>
        </span>
        {hasStatus && (
          <span className="flex min-h-5 items-center gap-1.5">
            {isInstalling ? (
              <Badge className="border-transparent bg-info text-info-foreground">
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
            {moreTags.length > 0 && <Badge variant="outline">+{moreTags.length}</Badge>}
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
        )}
      </span>
    </button>
  )
}

const SYNC = {
  'newest-here': { icon: Laptop, label: 'Newest here', tip: 'Latest on this machine. Not on the server yet.' },
  'newest-on-server': { icon: Server, label: 'Newest on server', tip: 'Latest on the server. Not on this machine yet.' },
  'in-sync': { icon: Check, label: 'In sync', tip: 'This machine and the server both have this version.' },
} as const

function SyncLabel({ marker, compact }: { marker: Exclude<SyncMarker, null>; compact: boolean }) {
  const { icon: Icon, label, tip } = SYNC[marker]
  const tone = marker === 'in-sync' ? 'text-success-foreground' : 'text-muted-foreground-strong'
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cn('flex items-center gap-1 text-xs leading-4', tone)} />}>
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {compact ? <span className="sr-only">{label}</span> : label}
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}
