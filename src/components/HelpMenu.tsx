import { CircleHelp, ExternalLink, Route } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTour } from '@/components/tour/tour-context'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/** Project details is the only page with a tour so far. */
const TOUR_PAGE = /^\/projects\/(?!new$)[^/]+$/

/**
 * Help in the menu bar (UX review `06`, finish step 3246:18832): the way back into the page tour, plus Docs.
 * Same trigger styling as the theme menu beside it.
 */
export function HelpMenu() {
  const { pathname } = useLocation()
  const { start } = useTour()
  const hasTour = TOUR_PAGE.test(pathname)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        variant="ghost"
        data-tour="help"
        className="gap-1.5 px-2 hover:bg-header-action-hover hover:no-underline focus-visible:ring-offset-0 active:bg-header-action-hover data-[popup-open]:bg-header-action-hover data-[popup-open]:no-underline"
      >
        <CircleHelp />
        Help
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem disabled={!hasTour} onClick={start}>
            <Route />
            {hasTour ? 'Take the page tour' : 'No tour for this page yet'}
          </DropdownMenuItem>
          <DropdownMenuItem render={<a href="https://github.com/nebari-dev/nebi" target="_blank" rel="noreferrer" />}>
            <ExternalLink />
            Docs
            <span className="sr-only">(opens in a new tab)</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  )
}
