import { BookOpen, Boxes, ExternalLink, Package, Server } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import nebiMark from '@/assets/nebi-mark.svg'
import { ThemeMenu } from '@/components/ThemeMenu'
import { MenuBarActions, MenuBarBrand, MenuBarNav, NavigationMenu, NavLink } from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'
import { notBuilt } from '@/state/store'

const ITEM = 'h-full rounded-none'
const UNDERLINE =
  "after:absolute after:right-2 after:bottom-0 after:left-2 after:h-0.5 after:bg-primary after:content-['']"

/** Nebi client header (Figma `Navigation / MenuBar` 2015:24936), built on the NDS header recipe. */
export function AppHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
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
        <NavLink icon={<Server />} render={<a href="#server" />} onClick={soon('The Server page')} className={ITEM}>
          Server
        </NavLink>
        <NavLink icon={<Package />} render={<a href="#registries" />} onClick={soon('The Registries page')} className={ITEM}>
          Registries
        </NavLink>
        <NavLink icon={<BookOpen />} render={<a href="#jobs" />} onClick={soon('The Jobs page')} className={ITEM}>
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
        <ThemeMenu />
      </MenuBarActions>
    </NavigationMenu>
  )
}
