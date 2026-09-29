import { Menu } from '@base-ui/react/menu'
import { ChevronDown, RefreshCw, Server as ServerIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ConnectionDialog } from '@/components/server/ConnectionDialog'
import { PullDialog } from '@/components/server/PullDialog'
import { ServerProjectsTable } from '@/components/server/ServerProjectsTable'
import { ShareDialog } from '@/components/server/ShareDialog'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ServerProject } from '@/data/server'
import { useStore } from '@/state/store'

type Open =
  | { kind: 'connect' | 'manage' }
  | { kind: 'pull'; project: ServerProject; andInstall: boolean }
  | { kind: 'share'; project: ServerProject }

/** Figma `02a - Server (connected)` 2512:15552 and `02b - Server (disconnected)` 2043:28463. */
export default function Server() {
  const { connection, serverProjects, disconnect, loadScenario } = useStore()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState<Open | null>(null)
  const close = (next: boolean) => !next && setOpen(null)

  // Deep links from /screens: `?state=disconnected|connected`, `?dialog=…&project=…`.
  useEffect(() => {
    const state = params.get('state')
    const dialog = params.get('dialog')
    if (!state && !dialog) return
    if (state === 'disconnected') disconnect({ silent: true })
    if (state === 'connected') loadScenario('default')
    const project = serverProjects.find((p) => p.id === (params.get('project') ?? 'ml-baseline'))
    if (dialog === 'connect' || dialog === 'manage') setOpen({ kind: dialog })
    if (project && (dialog === 'pull' || dialog === 'pull-install')) setOpen({ kind: 'pull', project, andInstall: dialog === 'pull-install' })
    if (project && dialog === 'share') setOpen({ kind: 'share', project })
    setParams({}, { replace: true })
  }, [params, setParams, disconnect, loadScenario, serverProjects])

  return (
    <main className="flex flex-col gap-5 px-12 py-12">
      {connection ? (
        <Connected onOpen={setOpen} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="font-bold text-3xl text-foreground">Server</h1>
            <p className="text-base text-muted-foreground">Not connected</p>
          </div>
          <section className="mt-20 flex flex-col items-center gap-3 text-center" aria-labelledby="empty-title">
            <h2 id="empty-title" className="font-semibold text-foreground text-xl leading-7">
              No server connected
            </h2>
            <p className="max-w-xl text-muted-foreground-strong text-sm">
              Connect your team’s Nebi server to browse and pull shared projects.
            </p>
            <Button className="mt-2" onClick={() => setOpen({ kind: 'connect' })}>
              Connect server
            </Button>
          </section>
        </>
      )}

      {(open?.kind === 'connect' || open?.kind === 'manage') && (
        <ConnectionDialog mode={open.kind} open onOpenChange={close} />
      )}
      {open?.kind === 'pull' && <PullDialog project={open.project} andInstall={open.andInstall} open onOpenChange={close} />}
      {open?.kind === 'share' && <ShareDialog project={open.project} open onOpenChange={close} />}
    </main>
  )
}

function Connected({ onOpen }: { onOpen: (open: Open) => void }) {
  const { connection, serverProjects, syncedAt, syncing, refreshServer } = useStore()
  const now = useNow()
  if (!connection) return null

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-3">
          <h1 className="font-bold text-3xl text-foreground">Server</h1>
          {/* 02a note 3: the URL is promoted out of the facts row, which also sets this page apart from Registries. */}
          <div className="flex flex-col gap-1">
            <span className="font-medium text-muted-foreground text-sm">Connected to</span>
            <span className="flex items-center gap-2 font-semibold text-base text-foreground leading-5">
              <ServerIcon className="size-4" aria-hidden />
              {connection.url}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={() => onOpen({ kind: 'manage' })}>
          Manage connection
        </Button>
      </div>

      <dl className="flex gap-10">
        <div className="flex flex-col gap-0.5">
          <dt className="font-medium text-foreground text-sm leading-6">Signed in as</dt>
          <dd className="text-foreground text-sm">{connection.signedInAs}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="flex items-center gap-2.5 font-medium text-foreground text-sm">
            Last synced
            <Tooltip>
              <TooltipTrigger
                render={<Button variant="secondary" size="icon-xs" onClick={refreshServer} disabled={syncing} aria-label="Refresh the server’s project list" />}
              >
                <RefreshCw className={syncing ? 'motion-safe:animate-spin' : undefined} />
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </dt>
          <dd className="text-foreground text-sm" aria-live="polite">
            {syncing ? 'Syncing…' : ago(now - syncedAt)}
          </dd>
        </div>
      </dl>

      <ServerProjectsTable
        projects={serverProjects}
        actionsWidth="w-[180px]"
        actions={(p) => <RowActions project={p} onOpen={onOpen} />}
      />
    </>
  )
}

/**
 * Pull and install is the default for the trusted team server, Pull only sits in the menu
 * (2026-08-27). A project already on this machine opens instead: one local checkout per
 * project (2026-09-15), so it can't be pulled twice.
 */
function RowActions({ project: p, onOpen }: { project: ServerProject; onOpen: (open: Open) => void }) {
  const { projects, pulling, installing } = useStore()
  const navigate = useNavigate()
  const local = projects.find((x) => (x.serverName ?? x.name) === p.name)
  const busy = pulling?.serverId === p.id
  const installingIt = busy && installing?.projectId === pulling?.localId

  return (
    <ButtonGroup aria-label={`Actions for ${p.name}`}>
      {busy ? (
        <Button variant="outline" loading loadingText={installingIt ? 'Installing…' : 'Pulling…'} className="min-w-[117px]" />
      ) : local ? (
        <Button variant="outline" className="min-w-[117px]" onClick={() => navigate(`/projects/${local.id}`)}>
          Open project
        </Button>
      ) : (
        <Button variant="outline" onClick={() => onOpen({ kind: 'pull', project: p, andInstall: true })} disabled={pulling != null}>
          Pull and install
        </Button>
      )}
      <ButtonGroupSeparator />
      <Menu.Root>
        <Menu.Trigger render={<Button variant="outline" size="icon" aria-label={`More actions for ${p.name}`} />}>
          <ChevronDown />
        </Menu.Trigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align="end">
            {!local && !busy && (
              <DropdownMenuItem disabled={pulling != null} onClick={() => onOpen({ kind: 'pull', project: p, andInstall: false })}>
                Pull project
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onOpen({ kind: 'share', project: p })}>Manage access</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </Menu.Root>
    </ButtonGroup>
  )
}

/** Re-renders every 30 seconds so "Last synced" keeps counting. */
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

function ago(ms: number) {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'} ago`
}
