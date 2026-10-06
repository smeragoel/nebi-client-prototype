import { X } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { railVersions } from '@/components/details/sync'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type Project, resolve, type Version } from '@/data/sample'
import { cn } from '@/lib/utils'
import { useStore } from '@/state/store'

type Change = 'added' | 'removed' | 'changed' | 'same'
type Side = { line: number; name: string; version: string } | null
type DiffRow = { name: string; change: Change; base: Side; compare: Side }

const MARK: Record<Change, string> = { added: '+', removed: '−', changed: '~', same: '' }
const TINT: Record<Change, string> = {
  added: 'bg-success',
  removed: 'bg-destructive',
  changed: 'bg-warning',
  same: 'bg-card',
}
const TONE: Record<Change, string> = {
  added: 'text-success-foreground',
  removed: 'text-destructive-foreground',
  changed: 'text-warning-foreground',
  same: 'text-muted-foreground',
}

/**
 * Compare versions (2605:25880): requested packages of two versions side by side, A–Z.
 * Base is on the left. + is only in Compare to, − is only in Base, ~ resolves to a different version.
 * Versions live in `?base=` and `?to=`; `?from=` is the version project details had selected.
 */
export default function CompareVersions() {
  const { id } = useParams()
  const { projects } = useStore()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const project = projects.find((p) => p.id === id)

  if (!project) {
    return (
      <main className="flex flex-col gap-3 p-9">
        <h1 className="font-bold text-3xl text-foreground">Project not found</h1>
        <Link to="/" className="text-sm underline underline-offset-4">
          Back to projects
        </Link>
      </main>
    )
  }

  const all = railVersions(project)
  const [defaultBase, defaultCompare] = defaults(project, all)
  const pick = (key: string, fallback: number) => all.find((v) => v.number === Number(params.get(key))) ?? all.find((v) => v.number === fallback) ?? all[0]
  const base = pick('base', defaultBase)
  const compare = pick('to', defaultCompare)
  const rows = diff(base, compare)
  const count = (c: Change) => rows.filter((r) => r.change === c).length

  const choose = (key: 'base' | 'to', n: number) => {
    const next = new URLSearchParams(params)
    next.set('base', String(key === 'base' ? n : base.number))
    next.set('to', String(key === 'to' ? n : compare.number))
    setParams(next, { replace: true })
  }
  const exit = () => navigate(`/projects/${project.id}${params.get('from') ? `?v=${params.get('from')}` : ''}`)

  const label = (n: number) => {
    const notes = [
      project.installedVersion === n && 'installed',
      project.serverVersion === n && 'latest on server',
    ].filter(Boolean)
    return notes.length ? `v${n} (${notes.join(', ')})` : `v${n}`
  }

  return (
    <main className="flex flex-col gap-6 px-9 py-9">
      <header className="flex flex-col gap-1.5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/" />}>Projects</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to={`/projects/${project.id}`} />}>{project.name}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Compare versions</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="font-bold text-3xl text-foreground">{project.name}</h1>
        <p className="text-muted-foreground text-sm">{project.path}</p>
      </header>

      <Card className="gap-4 p-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-semibold text-foreground text-xl leading-7">Compare versions</h2>
          <Button variant="outline" size="sm" onClick={exit}>
            Exit Compare
            <X />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted p-2">
          <VersionSelect label="Base" value={base.number} versions={all} format={label} onChange={(n) => choose('base', n)} />
          <VersionSelect label="Compare to" value={compare.number} versions={all} format={label} onChange={(n) => choose('to', n)} />
          <p className="ml-auto flex items-center gap-2 font-medium text-sm leading-5" aria-label="Summary of changes">
            {rows.some((r) => r.change !== 'same') ? (
              <>
                <span className={TONE.added} title="Added">+{count('added')}</span>
                <span className={TONE.removed} title="Removed">−{count('removed')}</span>
                <span className={TONE.changed} title="Changed">~{count('changed')}</span>
              </>
            ) : (
              <span className="text-muted-foreground">No changes</span>
            )}
          </p>
        </div>

        <Table aria-label={`Requested packages, ${label(base.number)} compared to ${label(compare.number)}`} className="table-fixed">
          <colgroup>
            <col className="w-9" />
            <col className="w-6" />
            <col />
            <col className="w-10" />
            <col className="w-9" />
            <col className="w-6" />
            <col />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead colSpan={3} className="px-4 font-semibold text-base">
                {label(base.number)}
              </TableHead>
              <TableHead aria-hidden />
              <TableHead colSpan={3} className="px-4 font-semibold text-base">
                {label(compare.number)}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.name} className="hover:bg-transparent">
                <DiffCells side={r.base} change={r.change} />
                <TableCell aria-hidden className="h-auto bg-card p-0" />
                <DiffCells side={r.compare} change={r.change} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </main>
  )
}

function VersionSelect({
  label,
  value,
  versions,
  format,
  onChange,
}: {
  label: string
  value: number
  versions: Version[]
  format: (n: number) => string
  onChange: (n: number) => void
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="text-muted-foreground text-xs leading-4">{label}</span>
      <Select value={value} onValueChange={(n) => n != null && onChange(n)}>
        <SelectTrigger className="min-h-7 w-auto bg-background py-1 font-medium text-xs" aria-label={label}>
          <SelectValue>{(n: number) => format(n)}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" className="min-w-48">
          {versions.map((v) => (
            <SelectItem key={v.number} value={v.number}>
              {format(v.number)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

/** One half of a row: line number, change mark, package and resolved version. An empty half shows a dash. */
function DiffCells({ side, change }: { side: Side; change: Change }) {
  const tint = side ? TINT[change] : 'bg-muted/40'
  return (
    <>
      <TableCell className="h-auto border-border border-r bg-muted px-2 py-2.5 text-right align-top font-mono text-muted-foreground text-xs leading-4">
        {side?.line}
      </TableCell>
      <TableCell className={cn('h-auto px-1 py-2.5 text-center align-top font-mono text-xs leading-4', tint, TONE[change])} aria-label={side && change !== 'same' ? change : undefined}>
        {side && MARK[change]}
      </TableCell>
      <TableCell className={cn('h-auto py-2.5 pr-4 pl-2 font-mono', tint)}>
        {side ? (
          <span className="flex items-center justify-between gap-4">
            <span className="truncate text-foreground text-sm leading-5">{side.name}</span>
            <span className={cn('shrink-0 text-xs leading-4', TONE[change])}>{side.version}</span>
          </span>
        ) : (
          <span className="text-muted-foreground text-xs leading-4">—</span>
        )}
      </TableCell>
    </>
  )
}

/** Installed version against the server's latest. Falls back to the newest version and the one before it. */
function defaults(project: Project, all: Version[]): [number, number] {
  const base = project.installedVersion ?? all.find((v) => v.number <= (project.serverVersion ?? Infinity))?.number ?? all[0].number
  const server = project.serverVersion != null && all.some((v) => v.number === project.serverVersion) ? project.serverVersion : null
  const compare = server != null && server !== base ? server : (all.find((v) => v.number !== base)?.number ?? base)
  return [base, compare]
}

/** Requested packages of both versions, A–Z, with the version each resolves to in pixi.lock. */
function diff(base: Version, compare: Version): DiffRow[] {
  const index = (v: Version) => {
    const resolved = new Map(resolve(v.requested).map((r) => [r.name, r.version]))
    return new Map(v.requested.map((p) => [p.name, { constraint: p.constraint, version: resolved.get(p.name) ?? p.constraint }]))
  }
  const b = index(base)
  const c = index(compare)
  const names = [...new Set([...b.keys(), ...c.keys()])].sort((x, y) => x.localeCompare(y))
  let bLine = 0
  let cLine = 0
  return names.map((name) => {
    const was = b.get(name)
    const now = c.get(name)
    const change: Change = !was ? 'added' : !now ? 'removed' : was.version !== now.version || was.constraint !== now.constraint ? 'changed' : 'same'
    return {
      name,
      change,
      base: was ? { line: ++bLine, name, version: was.version } : null,
      compare: now ? { line: ++cLine, name, version: now.version } : null,
    }
  })
}
