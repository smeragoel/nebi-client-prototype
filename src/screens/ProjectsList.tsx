import { Menu } from '@base-ui/react/menu'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, CodeXml, Ellipsis, History, LayoutTemplate, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { UninstallDialog } from '@/components/UninstallDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Project } from '@/data/sample'
import { newestLocal } from '@/components/details/sync'
import { notBuilt, type Scenario, useStore } from '@/state/store'

type SortKey = 'name' | 'version' | 'environment' | 'size' | 'remotes'
type Sort = { key: SortKey; dir: 'asc' | 'desc' }

const SIZE_UNITS: Record<string, number> = { KB: 1e3, MB: 1e6, GB: 1e9 }
const bytes = (size: string | null) => {
  if (!size) return -1
  const [n, unit] = size.split(' ')
  return Number(n) * (SIZE_UNITS[unit] ?? 1)
}
/** Installed version, else the last one installed, else (never installed) the newest on this machine. */
const shownVersion = (p: Project) => p.installedVersion ?? p.lastInstalledVersion ?? newestLocal(p)

const sortValue: Record<SortKey, (p: Project) => string | number> = {
  name: (p) => p.name.toLowerCase(),
  version: shownVersion,
  environment: (p) => (p.installedVersion ? 0 : 1),
  size: (p) => bytes(p.size),
  remotes: (p) => p.remotes.join(',').toLowerCase(),
}

/** Figma `01a - Main Projects` 1774:2940. */
export default function ProjectsList() {
  const { projects, loadScenario } = useStore()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>({ key: 'name', dir: 'asc' })
  const [uninstalling, setUninstalling] = useState<Project | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = projects.filter((p) => p.name.toLowerCase().includes(q))
    const get = sortValue[sort.key]
    return [...filtered].sort((a, b) => {
      const [x, y] = [get(a), get(b)]
      const cmp = x < y ? -1 : x > y ? 1 : 0
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [projects, query, sort])

  // `/?scenario=empty-connected` etc. load a sample-data setup (linked from /screens).
  const scenario = params.get('scenario') as Scenario | null
  useEffect(() => {
    if (!scenario) return
    loadScenario(scenario)
    setParams({}, { replace: true })
  }, [scenario, loadScenario, setParams])

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const head = (key: SortKey, label: string, className?: string) => {
    const active = sort.key === key
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
    return (
      <TableHead
        className={className}
        onClick={() => toggleSort(key)}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span className="flex-1">{label}</span>
        <Icon className={active ? 'size-3.5 text-foreground' : 'size-3.5 text-muted-foreground'} aria-hidden />
      </TableHead>
    )
  }

  const title = (
    <div className="flex flex-col gap-2">
      <h1 className="font-bold text-3xl text-foreground">Projects</h1>
      <p className="text-base text-muted-foreground">Local projects on this machine</p>
    </div>
  )

  if (projects.length === 0) {
    return (
      <main className="flex flex-col gap-5 px-12 py-12">
        {title}
        <EmptyState />
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-5 px-12 py-12">
      <div className="flex items-center justify-between gap-4">
        {title}
        <NewProjectButton />
      </div>

      <div className="relative w-80">
        <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects"
          aria-label="Search projects"
          className="pl-9"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {head('name', 'Project name')}
            {head('version', 'Version', 'w-[200px]')}
            {head('environment', 'Environment', 'w-[196px]')}
            {head('size', 'Size', 'w-[194px]')}
            {head('remotes', 'Connected remotes', 'w-[280px]')}
            <TableHead className="w-[74px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <ProjectRow key={p.id} project={p} onUninstall={() => setUninstalling(p)} />
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No projects match “{query}”.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {uninstalling && (
        <UninstallDialog
          project={projects.find((p) => p.id === uninstalling.id) ?? uninstalling}
          open
          onOpenChange={(open) => !open && setUninstalling(null)}
        />
      )}
    </main>
  )
}

/**
 * Figma `01b Main Projects empty` 2043:27084: not connected to a server (1774:15524) offers
 * Connect to server; connected (2314:9604) offers pulling instead.
 */
function EmptyState() {
  const { serverConnected } = useStore()
  const navigate = useNavigate()
  return (
    <section className="mt-20 flex flex-col items-center gap-3 text-center" aria-labelledby="empty-title">
      <h2 id="empty-title" className="font-semibold text-foreground text-xl leading-7">
        No projects yet
      </h2>
      <p className="max-w-xl text-muted-foreground-strong text-sm">
        {serverConnected
          ? 'Create one locally, or pull an existing project from your server or a registry.'
          : 'Create a project locally, or bring one in from your team’s server or a registry.'}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button onClick={() => navigate('/projects/new')}>
          <Plus />
          New project
        </Button>
        {serverConnected ? (
          <>
            <Button variant="secondary" onClick={() => navigate('/server')}>
              Pull from server
            </Button>
            <Button variant="secondary" onClick={() => notBuilt('Import from registry')}>
              Import from registry
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => navigate('/server?dialog=connect')}>
              Connect to server
            </Button>
            <Button variant="secondary" onClick={() => notBuilt('Add a registry')}>
              Add a registry
            </Button>
          </>
        )}
      </div>
    </section>
  )
}

/** Figma `01c - new Project dropdown` 2310:19662: split button, the main half opens the form. */
function NewProjectButton() {
  const navigate = useNavigate()
  return (
    <ButtonGroup aria-label="New project">
      <Button onClick={() => navigate('/projects/new')}>
        <Plus />
        New project
      </Button>
      <ButtonGroupSeparator className="bg-primary-foreground/40" />
      <Menu.Root>
        <Menu.Trigger render={<Button size="icon" aria-label="More ways to create a project" />}>
          <ChevronDown />
        </Menu.Trigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate('/projects/new?mode=toml')}>
              <CodeXml />
              Create from pixi.toml
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/projects/new')}>
              <LayoutTemplate />
              Create from GUI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </Menu.Root>
    </ButtonGroup>
  )
}

function ProjectRow({ project: p, onUninstall }: { project: Project; onUninstall: () => void }) {
  const { installing, install } = useStore()
  const navigate = useNavigate()
  const isInstalling = installing?.projectId === p.id
  const installed = p.installedVersion != null
  const installTarget = p.lastInstalledVersion ?? newestLocal(p)

  // The whole row opens the project. Controls inside it (Install, remotes, the menu) keep their own
  // action; the name link stays the keyboard path, so the row itself isn't a tab stop.
  const openRow = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a, button, [role="menuitem"], [role="menu"], [data-slot="badge"]')) return
    if (!e.currentTarget.contains(target)) return // clicks inside portalled menus/dialogs
    if (window.getSelection()?.toString()) return // let people copy text from a row
    navigate(`/projects/${p.id}`)
  }

  return (
    <TableRow className="cursor-pointer" onClick={openRow}>
      <TableCell className="h-10 py-2">
        <Link to={`/projects/${p.id}`} className="underline-offset-4 hover:underline focus-visible:underline">
          {p.name}
        </Link>
      </TableCell>

      <TableCell className="h-10 py-2">
        <span className="flex items-center gap-1.5">
          {installed ? (
            <span>v{p.installedVersion}</span>
          ) : p.lastInstalledVersion == null ? (
            <span className="text-muted-foreground">v{installTarget}</span>
          ) : (
            <>
              <span className="text-muted-foreground">v{p.lastInstalledVersion}</span>
              <Tooltip>
                <TooltipTrigger
                  render={<span tabIndex={0} className="rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />}
                  aria-label="Last installed version"
                >
                  <History className="size-3.5" aria-hidden />
                </TooltipTrigger>
                <TooltipContent side="bottom">Last installed version. This project isn’t installed right now.</TooltipContent>
              </Tooltip>
            </>
          )}
          {p.serverOnly.length > 0 && (
            <Badge
              className="border-transparent bg-info text-info-foreground"
              render={<button type="button" onClick={() => navigate(`/projects/${p.id}`)} />}
            >
              Update available
            </Badge>
          )}
        </span>
      </TableCell>

      <TableCell className="h-10 py-2">
        {installed ? (
          <Button variant="secondary" size="xs" onClick={onUninstall}>
            Uninstall
          </Button>
        ) : (
          <Button
            size="xs"
            loading={isInstalling}
            loadingText="Installing…"
            disabled={installing != null && !isInstalling}
            onClick={() => install(p.id, installTarget)}
          >
            Install
          </Button>
        )}
      </TableCell>

      <TableCell className="h-10 py-2">{p.size ?? '—'}</TableCell>

      <TableCell className="h-10 py-1">
        {p.remotes.length === 0 ? (
          '—'
        ) : (
          <span className="flex flex-wrap gap-1">
            {p.remotes.map((r) => (
              <Button key={r} variant="ghost" size="xs" onClick={() => (r === 'team-nebi' ? navigate('/server') : notBuilt('Remote details'))}>
                {r}
              </Button>
            ))}
          </span>
        )}
      </TableCell>

      <TableCell className="h-10 py-1">
        <DropdownMenu>
          <DropdownMenuTrigger variant="ghost" className="size-7 px-0" aria-label={`Actions for ${p.name}`}>
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/projects/${p.id}/new-version?from=${newestLocal(p)}`)}>
                <Pencil />
                Create new version
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => notBuilt('Delete project')}>
                <Trash2 />
                Delete project…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
