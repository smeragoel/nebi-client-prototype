import { Menu } from '@base-ui/react/menu'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuPortal, DropdownMenuTrigger, dropdownMenuItemVariants } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { JOB_STATUS_LABEL, type JobStatus } from '@/data/jobs'
import { cn } from '@/lib/utils'

/** Status badges from 05a: Queued outline, Running info, Succeeded success, Failed destructive, Cancelled muted. */
const STATUS_CLASS: Record<JobStatus, string> = {
  queued: '',
  running: 'border-transparent bg-info text-info-foreground',
  succeeded: 'border-transparent bg-success text-success-foreground',
  failed: '',
  cancelled: 'border-transparent bg-muted text-muted-foreground',
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const variant = status === 'queued' ? 'outline' : status === 'failed' ? 'destructive' : 'default'
  return (
    <Badge variant={variant} className={STATUS_CLASS[status]}>
      {JOB_STATUS_LABEL[status]}
    </Badge>
  )
}

/** The current time, re-rendering every second, for live durations and "2 min ago". */
export function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

type Option = { value: string; label: string }

/**
 * Toolbar filter from 05a ("Status: All"): an outline button that opens a single-choice menu.
 * `searchable` adds the search field from the Project menu (2764:13743).
 */
export function FilterMenu({
  label,
  value,
  options,
  onChange,
  searchable = false,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  searchable?: boolean
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const all: Option = { value: 'all', label: 'All' }
  const shown = [all, ...options.filter((o) => o.label.toLowerCase().includes(q))]
  const current = value === 'all' ? 'All' : (options.find((o) => o.value === value)?.label ?? 'All')

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery('')}>
      <DropdownMenuTrigger variant="outline" aria-label={`${label}: ${current}. Change filter`}>
        {label}: {current}
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent className="w-60">
          {searchable && (
            <div className="relative mb-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                // Keep typing in the field; the menu would otherwise treat letters as typeahead.
                onKeyDown={(e) => {
                  if (e.key !== 'Escape' && e.key !== 'ArrowDown' && e.key !== 'Tab') e.stopPropagation()
                }}
                placeholder="Search"
                aria-label={`Search ${label.toLowerCase()}s`}
                className="pr-9"
              />
              <Search className="pointer-events-none absolute top-1/2 right-3 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
            </div>
          )}
          <Menu.RadioGroup value={value} onValueChange={(v) => onChange(v as string)}>
            {shown.map((o) => (
              <Menu.RadioItem key={o.value} value={o.value} className={cn(dropdownMenuItemVariants(), 'pr-7')}>
                <span className="flex-1 truncate">{o.label}</span>
                <Menu.RadioItemIndicator className="pointer-events-none absolute right-1.5 inline-flex size-4 items-center justify-center">
                  <Check className="size-4" />
                </Menu.RadioItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
          {shown.length === 1 && q && <p className="px-1.5 py-1 text-muted-foreground text-sm">No match</p>}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  )
}
