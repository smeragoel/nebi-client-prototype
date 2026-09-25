import { ChevronDown, CircleCheck, Code, Download, Info, Package, Plus, Search, Server, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PersonAvatar } from '@/components/avatar'
import { UninstallDialog } from '@/components/UninstallDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CodeBlock, CodeBlockBody } from '@/components/ui/code-block'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fullDate, ME, type Project, pixiToml, resolve, type Version } from '@/data/sample'
import { notBuilt, useStore } from '@/state/store'
import { listVersions, newestLocal } from './sync'

/** Right panel of project details (Figma 2898:9525 installed, 2903:8908 not installed). */
export function VersionPanel({ project, version: v, serverOnly }: { project: Project; version: Version; serverOnly: boolean }) {
  const [confirmOlder, setConfirmOlder] = useState(false)
  const newer = project.versions.filter((x) => x.number > v.number).map((x) => x.number)

  const createNewVersion = () => (newer.length > 0 ? setConfirmOlder(true) : notBuilt('The Create new version page'))

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-4" aria-label={`Version ${v.number}`}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground text-xl leading-7">Version {v.number}</h2>
            {v.tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" size="sm" onClick={createNewVersion} />}>
                <Plus />
                Create new version
              </TooltipTrigger>
              <TooltipContent>Creates a new version based on version {v.number}</TooltipContent>
            </Tooltip>
            <Button variant="outline" size="sm" onClick={() => notBuilt('Publish')}>
              <Upload />
              Publish
            </Button>
          </div>
        </div>

        <p className="text-foreground text-sm">{v.description}</p>
        <VersionMeta project={project} version={v} serverOnly={serverOnly} />
        <InstallStrip project={project} version={v} serverOnly={serverOnly} />
      </div>

      <hr className="border-border" />

      <EnvironmentSpec project={project} version={v} />

      <Dialog open={confirmOlder} onOpenChange={setConfirmOlder}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Start a new version from version {v.number}?</DialogTitle>
            <DialogDescription>
              Version {v.number} is older than the latest version, {newestLocal(project)}.
            </DialogDescription>
          </DialogHeader>
          <p className="text-foreground text-sm">
            Changes made in {listVersions(newer)} won’t carry over, but those versions stay in the history.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
            <Button
              onClick={() => {
                setConfirmOlder(false)
                notBuilt('The Create new version page')
              }}
            >
              Start from version {v.number}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function Dot() {
  return (
    <span className="text-muted-foreground" aria-hidden>
      ·
    </span>
  )
}

function VersionMeta({ project, version: v, serverOnly }: { project: Project; version: Version; serverOnly: boolean }) {
  const onServer = serverOnly || (project.serverVersion != null && v.number <= project.serverVersion)
  const server =
    project.serverVersion == null
      ? 'Not connected to a server'
      : serverOnly
        ? 'On the server · not on this machine yet'
        : onServer
          ? 'On the server'
          : `Not on the server yet · server is at version ${project.serverVersion}`
  const published = v.publications.map((p) => `${p.registry}/${p.repository}:${p.tag}`).join(', ')

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground-strong text-sm">
      <span className="flex items-center gap-1.5">
        <PersonAvatar person={v.author} />
        {v.author.name}
        {v.author === ME && ' (you)'} · {fullDate(v.ageDays)}
      </span>
      <Dot />
      <span className="flex items-center gap-1.5">
        <Server className="size-3.5" aria-hidden />
        {server}
      </span>
      <Dot />
      <span className="flex items-center gap-1.5">
        <Upload className="size-3.5" aria-hidden />
        {published ? `Published to ${published}` : 'Not published'}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Install strip                                                       */
/* ------------------------------------------------------------------ */

function InstallStrip({ project, version: v, serverOnly }: { project: Project; version: Version; serverOnly: boolean }) {
  const { installing, install, pull } = useStore()
  const [uninstallOpen, setUninstallOpen] = useState(false)
  const isInstalling = installing?.projectId === project.id && installing.version === v.number
  const installed = project.installedVersion === v.number

  if (isInstalling) return <InstallingStrip version={v} step={installing.step} />

  if (installed) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-md bg-success py-2.5 pr-2.5 pl-4">
        <span className="flex items-center gap-2 font-medium text-sm text-success-foreground">
          <CircleCheck className="size-4" aria-hidden />
          Installed on this machine
        </span>
        <span className="flex items-center gap-3 text-muted-foreground-strong text-sm">
          {project.size && `${project.size} on disk`}
          <Button variant="outline" size="sm" onClick={() => setUninstallOpen(true)}>
            <Package />
            Uninstall
          </Button>
        </span>
        <UninstallDialog project={project} open={uninstallOpen} onOpenChange={setUninstallOpen} />
      </div>
    )
  }

  const other = project.installedVersion
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-muted py-2.5 pr-2.5 pl-4">
      <span className="flex items-center gap-2 font-medium text-foreground text-sm">
        <Info className="size-4 text-muted-foreground-strong" aria-hidden />
        {serverOnly
          ? 'Not on this machine yet'
          : other != null
            ? `Not installed · version ${other} is installed on this machine`
            : 'Not installed'}
      </span>
      <span className="flex items-center gap-3 text-muted-foreground-strong text-sm">
        {serverOnly ? (
          <Button size="sm" onClick={() => pull(project.id)}>
            <Download />
            Pull version {v.number}
          </Button>
        ) : (
          <>
            {other != null && `Replaces version ${other} on disk`}
            <Button size="sm" disabled={installing != null} onClick={() => install(project.id, v.number)}>
              <Download />
              Install this version
            </Button>
          </>
        )}
      </span>
    </div>
  )
}

/**
 * Delight frame 2925:10612: stage from the env_install job, plus the latest pixi log line in mono.
 * The log line cycles through this version's resolved packages to stand in for the real job log.
 */
function InstallingStrip({ version: v, step }: { version: Version; step: 1 | 2 }) {
  const packages = useMemo(() => resolve(v.requested).filter((p) => p.size), [v])
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % packages.length), 280)
    return () => window.clearInterval(t)
  }, [packages.length])
  const line = packages[i]

  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-info py-2.5 pr-4 pl-4 text-info-foreground" role="status">
      <span className="flex items-center gap-2 font-medium text-sm">
        <Spinner size="sm" />
        Installing version {v.number} · {step === 1 ? 'downloading packages (step 1 of 2)' : 'linking packages (step 2 of 2)'}
      </span>
      <span className="flex items-center gap-4">
        {line && (
          <code className="font-mono text-muted-foreground-strong text-xs" aria-hidden>
            {line.name} {line.version} · {line.channel} · {line.size}
          </code>
        )}
        <Button variant="link" size="xs" className="text-info-foreground" onClick={() => notBuilt('The job log')}>
          View log
        </Button>
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Environment specification                                           */
/* ------------------------------------------------------------------ */

function EnvironmentSpec({ project, version: v }: { project: Project; version: Version }) {
  const [tab, setTab] = useState<'requested' | 'resolved'>('requested')
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState(v.platforms[0])
  const [tomlOpen, setTomlOpen] = useState(false)
  const resolved = useMemo(() => resolve(v.requested), [v])
  const q = query.trim().toLowerCase()
  const requestedRows = v.requested.filter((p) => p.name.includes(q))
  const resolvedRows = resolved.filter((p) => p.name.includes(q))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base text-foreground leading-5">Environment specification</h3>
        <DropdownMenu>
          <DropdownMenuTrigger variant="outline" className="h-6 gap-1 px-2 text-xs [&_svg]:size-3">
            Files
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTomlOpen(true)}>
                <Code />
                View pixi.toml
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => notBuilt('View pixi.lock')}>
                <Code />
                View pixi.lock
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => notBuilt('Download archive')}>
                <Download />
                Download archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </div>

      <dl className="grid grid-cols-[88px_1fr] gap-x-1.5 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Channels</dt>
        <dd className="text-foreground">{v.channels.join(', ')}</dd>
        <dt className="text-muted-foreground">Platforms</dt>
        <dd className="text-foreground">{v.platforms.join(', ')}</dd>
      </dl>

      <div className="flex flex-col gap-1">
        <h4 className="font-medium text-foreground text-sm">Packages</h4>
        <Tabs value={tab} onValueChange={(t) => setTab(t as typeof tab)}>
          <div className="flex items-end justify-between gap-2 border-border border-b pb-1.5">
            <TabsList variant="underline" className="border-0">
              <TabsTab value="requested">Requested ({v.requested.length})</TabsTab>
              <TabsTab value="resolved">Resolved ({resolved.length})</TabsTab>
              <TabsIndicator />
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative w-60">
                <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search packages"
                  aria-label="Search packages"
                  className="pl-9"
                />
              </div>
              {tab === 'resolved' && (
                <Select value={platform} onValueChange={(p) => p && setPlatform(p)}>
                  <SelectTrigger className="w-44" aria-label="Platform">
                    <SelectValue>{(p: string) => (p === v.platforms[0] ? `${p} · this machine` : p)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {v.platforms.map((p, i) => (
                      <SelectItem key={p} value={p}>
                        {i === 0 ? `${p} · this machine` : p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <TabsPanel value="requested" className="pt-1.5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version constraint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestedRows.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="h-10 py-2">{p.name}</TableCell>
                    <TableCell className="h-10 py-2">{p.constraint}</TableCell>
                  </TableRow>
                ))}
                {requestedRows.length === 0 && <EmptyRow cols={2} query={query} />}
              </TableBody>
            </Table>
          </TabsPanel>
          <TabsPanel value="resolved" className="pt-1.5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolvedRows.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="h-10 py-2">{p.name}</TableCell>
                    <TableCell className="h-10 py-2">{p.version}</TableCell>
                    <TableCell className="h-10 py-2">{p.channel}</TableCell>
                    <TableCell className="h-10 py-2">{p.size ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {resolvedRows.length === 0 && <EmptyRow cols={4} query={query} />}
              </TableBody>
            </Table>
          </TabsPanel>
        </Tabs>
      </div>

      <Dialog open={tomlOpen} onOpenChange={setTomlOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>pixi.toml · version {v.number}</DialogTitle>
            <DialogDescription>{project.path}/pixi.toml</DialogDescription>
          </DialogHeader>
          <CodeBlock code={pixiToml(project, v)} className="w-full">
            <CodeBlockBody />
          </CodeBlock>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmptyRow({ cols, query }: { cols: number; query: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="h-20 text-center text-muted-foreground">
        No packages match “{query}”.
      </TableCell>
    </TableRow>
  )
}
