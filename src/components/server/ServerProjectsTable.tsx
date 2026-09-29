import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ServerProject } from '@/data/server'

type SortKey = 'name' | 'version' | 'namespace'
type Sort = { key: SortKey; dir: 'asc' | 'desc' }

const sortValue: Record<SortKey, (p: ServerProject) => string | number> = {
  name: (p) => p.name.toLowerCase(),
  version: (p) => p.latestVersion,
  namespace: (p) => p.namespace.toLowerCase(),
}

/**
 * The server's project list, shared by the client Server page (02a 2512:15552) and the server
 * UI (02d 2392:6914). Only the Actions column differs, so the caller renders it.
 */
export function ServerProjectsTable({
  projects,
  actions,
  actionsWidth,
}: {
  projects: ServerProject[]
  actions: (p: ServerProject) => ReactNode
  actionsWidth: string
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>({ key: 'name', dir: 'asc' })

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const get = sortValue[sort.key]
    return projects
      .filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const [x, y] = [get(a), get(b)]
        const cmp = x < y ? -1 : x > y ? 1 : 0
        return sort.dir === 'asc' ? cmp : -cmp
      })
  }, [projects, query, sort])

  const head = (key: SortKey, label: string, className?: string) => {
    const active = sort.key === key
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
    return (
      <TableHead
        className={className}
        onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span className="flex-1">{label}</span>
        <Icon className={active ? 'size-3.5 text-foreground' : 'size-3.5 text-muted-foreground'} aria-hidden />
      </TableHead>
    )
  }

  return (
    <>
      <div className="relative w-80">
        <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search server projects"
          aria-label="Search server projects"
          className="pl-9"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {head('name', 'Project')}
            {head('version', 'Latest version', 'w-[150px]')}
            {head('namespace', 'Namespace', 'w-[300px]')}
            <TableHead className={actionsWidth}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="h-10 py-2">{p.name}</TableCell>
              <TableCell className="h-10 py-2">
                <Badge className="bg-muted text-muted-foreground-strong">v{p.latestVersion}</Badge>
              </TableCell>
              <TableCell className="h-10 py-2">{p.namespace}</TableCell>
              <TableCell className="h-10 py-1">{actions(p)}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                {query ? `No server projects match “${query}”.` : 'Nothing is shared with you on this server yet.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  )
}
