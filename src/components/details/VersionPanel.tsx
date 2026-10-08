import { Check, ChevronDown, CircleCheck, CodeXml, Download, Import, PackageX, Plus, Search, Server, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { failedInstall } from '@/data/jobs'
import { fullDate, ME, type Project, pixiToml, resolve, type Version } from '@/data/sample'
import { cn } from '@/lib/utils'
import { notBuilt, useStore } from '@/state/store'
import { PublishDialog } from './PublishDialog'
import { listVersions, newestLocal } from './sync'

/** Right panel of project details (Figma 2898:9525 installed, 2903:8908 not installed). */
export function VersionPanel({ project, version: v, serverOnly }: { project: Project; version: Version; serverOnly: boolean }) {
  const navigate = useNavigate()
  const [confirmOlder, setConfirmOlder] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const newer = project.versions.filter((x) => x.number > v.number).map((x) => x.number)
  const newVersionPage = `/projects/${project.id}/new-version?from=${v.number}`

  const createNewVersion = () => (newer.length > 0 ? setConfirmOlder(true) : navigate(newVersionPage))
  const installed = project.installedVersion === v.number

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-4" aria-label={`Version ${v.number}`}>
      {/* 2026-09-28 sync with Nat (Figma 2898:9525 / 2903:8908): no install banner. Install or Uninstall
          sits with the other actions, with size or "Replaces vN" under it; the meta line only states facts that are true. */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-h-7 items-center gap-2">
              <h2 className="font-semibold text-foreground text-xl leading-7">Version {v.number}</h2>
              {v.tags.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
              {installed && (
                <Badge className="border-transparent bg-success text-success-foreground">
                  <Check />
                  Installed
                </Badge>
              )}
            </div>
            <div className="flex items-start gap-2">
              <Tooltip>
                <TooltipTrigger
                  render={<Button variant="outline" size="sm" disabled={serverOnly} onClick={createNewVersion} />}
                >
                  <Plus />
                  Create new version
                </TooltipTrigger>
                <TooltipContent>
                  {serverOnly ? `Pull version ${v.number} first` : `Creates a new version based on version ${v.number}`}
                </TooltipContent>
              </Tooltip>
              <Button variant="outline" size="sm" disabled={serverOnly} onClick={() => setPublishOpen(true)}>
                <Upload />
                Publish
              </Button>
              <InstallAction project={project} version={v} serverOnly={serverOnly} />
            </div>
          </div>
          <VersionMeta project={project} version={v} serverOnly={serverOnly} />
        </div>

        <p className="text-base text-foreground">{v.description}</p>
        <InstallAlert project={project} version={v} />
      </div>

      <hr className="border-border" />

      <EnvironmentSpec project={project} version={v} />

      <PublishDialog project={project} version={v} open={publishOpen} onOpenChange={setPublishOpen} />

      {/* Figma 2916:10035: the latest version is offered as the other way forward, beside the older base. */}
      <Dialog open={confirmOlder} onOpenChange={setConfirmOlder}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Start a new version from version {v.number}?</DialogTitle>
            <DialogDescription>
              Version {v.number} is older than the latest version, v{newestLocal(project)}.
            </DialogDescription>
          </DialogHeader>
          <p className="text-foreground text-sm">
            The new version starts with version {v.number}’s packages and settings. Changes made in {listVersions(newer)} won’t
            carry over, but those versions stay in the history.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" className="sm:mr-auto" />}>Cancel</DialogClose>
            <Button variant="secondary" onClick={() => navigate(`/projects/${project.id}/new-version?from=${newestLocal(project)}`)}>
              Start from v{newestLocal(project)}
            </Button>
            <Button onClick={() => navigate(newVersionPage)}>Start from version {v.number}</Button>
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

/** Only facts that hold are shown: no "Not on the server yet", no "Not published" (2026-09-28 sync). */
function VersionMeta({ project, version: v, serverOnly }: { project: Project; version: Version; serverOnly: boolean }) {
  const onServer = serverOnly || (project.serverVersion != null && v.number <= project.serverVersion)
  const refs = v.publications.map((p) => `${p.registry}/${p.repository}:${p.tag}`)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground-strong text-sm">
      <span className="flex items-center gap-1.5">
        <PersonAvatar person={v.author} />
        {v.author.name}
        {v.author === ME && ' (you)'} · {v.justNow ? 'just now' : fullDate(v.ageDays)}
      </span>
      {onServer && (
        <>
          <Dot />
          <span className="flex items-center gap-1.5">
            <Server className="size-3.5" aria-hidden />
            {serverOnly ? 'On the server · not on this machine yet' : 'On the server'}
          </span>
        </>
      )}
      {refs.length > 0 && (
        <>
          <Dot />
          {refs.length === 1 ? (
            <span className="flex items-center gap-1.5">
              <Upload className="size-3.5" aria-hidden />
              Published to {refs[0]}
            </span>
          ) : (
            // More than one registry: a count, with the full list on hover.
            <Tooltip>
              <TooltipTrigger render={<span className="flex items-center gap-1.5 underline decoration-dotted underline-offset-4" tabIndex={0} />}>
                <Upload className="size-3.5" aria-hidden />
                Published to {refs.length} registries
              </TooltipTrigger>
              <TooltipContent>{refs.join(', ')}</TooltipContent>
            </Tooltip>
          )}
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Install / Uninstall                                                 */
/* ------------------------------------------------------------------ */

/** The last header action, with a muted caption under it: size on disk, or what an install replaces. */
/**
 * The note under Install / Uninstall (Figma 2898:9525, 2903:8908): left-aligned to the button and
 * wrapping at the button's width, so the column is only ever as wide as the button.
 */
const UNDER_BUTTON = 'block w-0 min-w-full text-muted-foreground-strong text-xs'

function InstallAction({ project, version: v, serverOnly }: { project: Project; version: Version; serverOnly: boolean }) {
  const { installing, install, pull, jobs } = useStore()
  const [uninstallOpen, setUninstallOpen] = useState(false)
  const failed = failedInstall(jobs, project.id)
  const isInstalling = installing?.projectId === project.id && installing.version === v.number
  const other = project.installedVersion

  if (serverOnly) {
    return (
      <Button size="sm" onClick={() => pull(project.id)}>
        <Download />
        Pull version {v.number}
      </Button>
    )
  }

  if (other === v.number) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button variant="outline" size="sm" onClick={() => setUninstallOpen(true)}>
          <PackageX />
          Uninstall
        </Button>
        {project.size && <span className={UNDER_BUTTON}>{project.size} on disk</span>}
        <UninstallDialog project={project} open={uninstallOpen} onOpenChange={setUninstallOpen} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        size="sm"
        loading={isInstalling}
        loadingText="Installing…"
        disabled={installing != null && !isInstalling}
        onClick={() => install(project.id, v.number, { toast: false })}
      >
        <Import />
        Install
      </Button>
      {/* User test 7 Oct; not in Figma yet. Only when the project's latest env_install job failed. */}
      {failed && (
        <span className={cn(UNDER_BUTTON, 'text-destructive-foreground')}>
          Install failed ·{' '}
          <Link to={`/jobs/${failed.id}`} className="underline underline-offset-4">
            View job
          </Link>
        </span>
      )}
      {other != null && (
        <span className={UNDER_BUTTON}>
          Replaces{' '}
          <Link to={`?v=${other}`} replace className="underline underline-offset-4 hover:text-primary">
            v{other}
          </Link>{' '}
          on disk
        </span>
      )}
    </div>
  )
}

/** Shows while this version installs, then stays ~5s once it's done and dismisses itself. */
function InstallAlert({ project, version: v }: { project: Project; version: Version }) {
  const { installing, installDone, dismissInstallDone } = useStore()
  if (installing?.projectId === project.id && installing.version === v.number) {
    return <InstallingStrip version={v} step={installing.step} jobId={installing.jobId} />
  }
  if (installDone?.projectId !== project.id || installDone.version !== v.number) return null
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-md bg-success py-2 pr-2 pl-4 text-success-foreground" role="status">
      <span className="flex items-center gap-2 font-medium text-sm">
        <CircleCheck className="size-4" aria-hidden />
        Version {v.number} installed · ready to use on this machine
      </span>
      <Button variant="ghost" size="icon-sm" className="text-success-foreground" onClick={dismissInstallDone} aria-label="Dismiss">
        <X />
      </Button>
    </div>
  )
}

/**
 * Delight frame 2925:10612: stage from the env_install job, plus the latest pixi log line in mono.
 * The log line cycles through this version's resolved packages to stand in for the real job log.
 */
function InstallingStrip({ version: v, step, jobId }: { version: Version; step: 1 | 2; jobId: string }) {
  const navigate = useNavigate()
  const packages = useMemo(() => resolve(v.requested).filter((p) => p.size), [v])
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % packages.length), 280)
    return () => window.clearInterval(t)
  }, [packages.length])
  const line = packages[i]

  return (
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-md bg-info py-2 pr-4 pl-4 text-info-foreground" role="status">
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
        <Button variant="link" size="xs" className="text-info-foreground" onClick={() => navigate(`/jobs/${jobId}`)}>
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
  const platformOption = (p: string) => (p === v.platforms[0] ? `${p} · this machine` : p)
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
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTomlOpen(true)}>
                <CodeXml />
                View pixi.toml
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => notBuilt('View pixi.lock')}>
                <CodeXml />
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

      <div className="flex flex-col gap-2">
        <h4 className="font-semibold text-base text-foreground leading-5">Packages</h4>
        <Tabs value={tab} onValueChange={(t) => setTab(t as typeof tab)}>
          <div className="flex items-end justify-between gap-2 border-border border-b pb-1.5">
            <TabsList variant="underline" className="border-0">
              <TabsTab value="requested">Requested ({v.requested.length})</TabsTab>
              <TabsTab value="resolved">Resolved ({resolved.length})</TabsTab>
              <TabsIndicator />
            </TabsList>
            <div className="flex items-center gap-2">
              <div className="relative w-60">
                <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
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
                  <SelectTrigger className="w-auto" aria-label="Platform">
                    {/* Every label sits in one grid cell, so the trigger is as wide as the longest one. */}
                    <span className="grid text-left">
                      {v.platforms.map((p) => (
                        <span key={p} className="invisible col-start-1 row-start-1 whitespace-nowrap" aria-hidden>
                          {platformOption(p)}
                        </span>
                      ))}
                      <SelectValue className="col-start-1 row-start-1 whitespace-nowrap">
                        {(p: string) => platformOption(p)}
                      </SelectValue>
                    </span>
                  </SelectTrigger>
                  <SelectContent className="w-auto min-w-(--anchor-width)">
                    {v.platforms.map((p) => (
                      <SelectItem key={p} value={p}>
                        {platformOption(p)}
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
                  <TableHead>Download size</TableHead>
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
