import { BookOpen, Boxes, Computer, ExternalLink, Package, Server } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import nebiMark from '@/assets/nebi-mark.svg'
import { ThemeMenu } from '@/components/ThemeMenu'
import { Badge } from '@/components/ui/badge'
import { MenuBarActions, MenuBarBrand, MenuBarNav, NavigationMenu, NavLink } from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'
import { notBuilt, useStore } from '@/state/store'

const ITEM = 'h-full rounded-none'
const UNDERLINE =
  "after:absolute after:right-2 after:bottom-0 after:left-2 after:h-0.5 after:bg-primary after:content-['']"

/** Nebi client header (Figma `Navigation / MenuBar` 2015:24936), built on the NDS header recipe. */
export function AppHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { connection } = useStore()
  const onProjects = pathname === '/' || pathname.startsWith('/projects')

  const soon = (feature: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    notBuilt(feature)
  }

  return (
    <NavigationMenu className="h-14 gap-3 border-border bg-header pl-4 text-header-foreground">
      <MenuBarBrand
        href="/"
        aria-label="Nebi home"
        onClick={(e) => {
          e.preventDefault()
          navigate('/')
        }}
      >
        <img src={nebiMark} alt="" className="h-8 w-auto" />
        <span className="font-bold text-[21px] text-foreground tracking-tight">Nebi</span>
      </MenuBarBrand>
      <MenuBarNav className="self-stretch">
        {/* NDS NavLink ignores clicks while `active`, so on a project page the tab keeps its
            underline through a class instead and still navigates back to the list. */}
        <NavLink
          icon={<Boxes />}
          active={pathname === '/'}
          render={<Link to="/" />}
          className={cn(ITEM, onProjects && pathname !== '/' && UNDERLINE)}
        >
          Projects
        </NavLink>
        <NavLink icon={<Computer />} active={pathname === '/server'} render={<Link to="/server" />} className={ITEM}>
          Server
        </NavLink>
        <NavLink icon={<Package />} render={<a href="#registries" />} onClick={soon('The Registries page')} className={ITEM}>
          Registries
        </NavLink>
        <NavLink
          icon={<BookOpen />}
          active={pathname === '/jobs'}
          render={<Link to="/jobs" />}
          className={cn(ITEM, pathname.startsWith('/jobs/') && UNDERLINE)}
        >
          Jobs
        </NavLink>
        <NavLink
          // Real docs URL not confirmed yet; the repo README stands in.
          render={<a href="https://github.com/nebari-dev/nebi" target="_blank" rel="noreferrer" />}
          className={ITEM}
        >
          <span className="inline-flex items-center gap-1.5">
            Docs
            <ExternalLink className="size-4" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </span>
        </NavLink>
      </MenuBarNav>
      <MenuBarActions className="gap-2">
        {/* 02a notes 2 and 4: a neutral chip names the connected server, never the person, and routes to
            the Server page. No chip at all when there's no server. */}
        {connection && (
          <Badge
            variant="outline"
            className="border-border font-medium text-foreground"
            render={<Link to="/server" aria-label={`Connected to ${connection.url}. Open the Server page`} />}
          >
            <Server aria-hidden />
            {connection.url}
          </Badge>
        )}
        <ThemeMenu />
      </MenuBarActions>
    </NavigationMenu>
  )
}
