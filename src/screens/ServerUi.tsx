import { Menu } from '@base-ui/react/menu'
import { Ellipsis, ExternalLink, Server as ServerIcon, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import nebiMark from '@/assets/nebi-mark.svg'
import { ThemeMenu } from '@/components/ThemeMenu'
import { ServerProjectsTable } from '@/components/server/ServerProjectsTable'
import { ShareDialog } from '@/components/server/ShareDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal } from '@/components/ui/dropdown-menu'
import { MenuBarActions, MenuBarBrand, MenuBarNav, NavigationMenu, NavLink } from '@/components/ui/navigation-menu'
import { DEFAULT_CONNECTION, type ServerProject } from '@/data/server'
import { notBuilt, useStore } from '@/state/store'

/**
 * Figma `02d - Pure view-mode (Server UI)` 2392:6914: the administrative server UI. Projects are
 * read-only here: share or delete, never pull or install (2026-09-15). The frame's Registries
 * and Jobs tabs are left out, per its own annotation 2397:6848 and the 2026-09-15 decision.
 */
export default function ServerUi() {
  const { serverProjects } = useStore()
  const [sharing, setSharing] = useState<ServerProject | null>(null)

  return (
    <>
      <ServerUiHeader />
      <main className="flex flex-col gap-5 px-12 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="font-bold text-3xl text-foreground">Server projects</h1>
          <p className="text-base text-muted-foreground">
            This is a server-only interface. Projects can be managed and shared here, but not pulled or installed.
          </p>
        </div>

        <ServerProjectsTable
          projects={serverProjects}
          actionsWidth="w-[112px]"
          actions={(p) => (
            <ButtonGroup aria-label={`Actions for ${p.name}`}>
              <Button variant="outline" onClick={() => setSharing(p)}>
                Share
              </Button>
              <ButtonGroupSeparator />
              <Menu.Root>
                <Menu.Trigger render={<Button variant="outline" size="icon" aria-label={`More actions for ${p.name}`} />}>
                  <Ellipsis />
                </Menu.Trigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSharing(p)}>
                      <Users />
                      Manage access
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => notBuilt('Delete from the server')}>
                      <Trash2 />
                      Delete from server…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </Menu.Root>
            </ButtonGroup>
          )}
        />

        {sharing && <ShareDialog project={sharing} open onOpenChange={(open) => !open && setSharing(null)} />}
      </main>
    </>
  )
}

const ITEM = 'h-full rounded-none'

/** The server UI's own header: one Server projects tab and Docs, with the server named on the right. */
function ServerUiHeader() {
  const navigate = useNavigate()
  return (
    <NavigationMenu className="h-14 gap-3 border-border bg-header pl-4 text-header-foreground">
      <MenuBarBrand
        href="/server-ui"
        aria-label="Nebi server home"
        onClick={(e) => {
          e.preventDefault()
          navigate('/server-ui')
        }}
      >
        <img src={nebiMark} alt="" className="h-8 w-auto" />
        <span className="font-bold text-[21px] text-foreground tracking-tight">Nebi</span>
      </MenuBarBrand>
      <MenuBarNav className="self-stretch">
        <NavLink icon={<ServerIcon />} active render={<Link to="/server-ui" />} className={ITEM}>
          Server projects
        </NavLink>
        <NavLink render={<a href="https://github.com/nebari-dev/nebi" target="_blank" rel="noreferrer" />} className={ITEM}>
          <span className="inline-flex items-center gap-1.5">
            Docs
            <ExternalLink className="size-4" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </span>
        </NavLink>
      </MenuBarNav>
      <MenuBarActions className="gap-2">
        <Badge variant="outline" className="border-border font-medium text-foreground">
          <ServerIcon aria-hidden />
          {DEFAULT_CONNECTION.url}
        </Badge>
        <ThemeMenu />
      </MenuBarActions>
    </NavigationMenu>
  )
}
