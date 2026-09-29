import { ArrowDown, ArrowUp, Ellipsis, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FilterMenu, JobStatusBadge, useNow } from '@/components/jobs/job-parts'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { isActive, type Job, JOB_STATUS_LABEL, JOB_TYPE_LABEL, type JobStatus, type JobType, jobDuration, relativeTime } from '@/data/jobs'
import { cn } from '@/lib/utils'
import { useStore } from '@/state/store'

const STATUS_OPTIONS = (Object.keys(JOB_STATUS_LABEL) as JobStatus[]).map((s) => ({ value: s, label: JOB_STATUS_LABEL[s] }))
const TYPE_OPTIONS = (Object.keys(JOB_TYPE_LABEL) as JobType[]).map((t) => ({ value: t, label: JOB_TYPE_LABEL[t] }))
const REFRESH_MS = 700

/** Figma `05a` 2399:7084: background jobs on this machine. */
export default function Jobs() {
  const { jobs, projects } = useStore()
  const now = useNow()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [project, setProject] = useState('all')
  const [newestFirst, setNewestFirst] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const nameOf = (id: string) => projects.find((p) => p.id === id)?.name ?? id
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }))

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const name = (id: string) => projects.find((p) => p.id === id)?.name ?? id
    const at = (j: Job) => j.startedAt ?? j.createdAt
    return jobs
      .filter((j) => status === 'all' || j.status === status)
      .filter((j) => type === 'all' || j.type === type)
      .filter((j) => project === 'all' || j.projectId === project)
      .filter((j) => !q || JOB_TYPE_LABEL[j.type].toLowerCase().includes(q) || name(j.projectId).toLowerCase().includes(q))
      .sort((a, b) => (newestFirst ? at(b) - at(a) : at(a) - at(b)))
  }, [jobs, projects, query, status, type, project, newestFirst])

  const filtered = query.trim() !== '' || status !== 'all' || type !== 'all' || project !== 'all'
  const clearFilters = () => {
    setQuery('')
    setStatus('all')
    setType('all')
    setProject('all')
  }

  // Jobs are local, so Refresh only re-reads the list; it's here for the running ones.
  const refresh = () => {
    setRefreshing(true)
    window.setTimeout(() => setRefreshing(false), REFRESH_MS)
  }

  return (
    <main className="flex flex-col gap-5 px-12 py-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-bold text-3xl text-foreground">Jobs</h1>
          <p className="text-base text-muted-foreground">Background tasks running on this machine</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={cn(refreshing && 'motion-safe:animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs"
            aria-label="Search jobs"
            className="pl-9"
          />
        </div>
        <FilterMenu label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        <FilterMenu label="Job type" value={type} options={TYPE_OPTIONS} onChange={setType} />
        <FilterMenu label="Project" value={project} options={projectOptions} onChange={setProject} searchable />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead className="w-[340px]">Project</TableHead>
            <TableHead className="w-[180px]">Status</TableHead>
            <TableHead
              className="w-[180px]"
              onClick={() => setNewestFirst((d) => !d)}
              aria-sort={newestFirst ? 'descending' : 'ascending'}
            >
              <span className="flex-1">Started</span>
              {newestFirst ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUp className="size-3.5" aria-hidden />}
            </TableHead>
            <TableHead className="w-[160px]">Duration</TableHead>
            <TableHead className="w-[74px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((j) => (
            <JobRow key={j.id} job={j} projectName={nameOf(j.projectId)} now={now} />
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {filtered ? (
                  <>
                    No jobs match these filters.{' '}
                    <Button variant="link" size="xs" className="px-0" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </>
                ) : (
                  'No jobs have run on this machine yet.'
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  )
}

function JobRow({ job: j, projectName, now }: { job: Job; projectName: string; now: number }) {
  const { cancelJob, projects } = useStore()
  const navigate = useNavigate()
  const exists = projects.some((p) => p.id === j.projectId)
  const to = `/jobs/${j.id}`

  // Same row behaviour as the Projects list: the row opens the job, the name link is the keyboard path.
  const openRow = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a, button, [role="menuitem"], [role="menu"]')) return
    if (!e.currentTarget.contains(target)) return
    if (window.getSelection()?.toString()) return
    navigate(to)
  }

  return (
    <TableRow className="cursor-pointer" onClick={openRow}>
      <TableCell className="h-10 whitespace-nowrap py-2">
        <Link to={to} className="underline-offset-4 hover:underline focus-visible:underline">
          {JOB_TYPE_LABEL[j.type]}
        </Link>
      </TableCell>
      <TableCell className="h-10 py-2">
        {exists ? (
          <Link to={`/projects/${j.projectId}`} className="underline underline-offset-4">
            {projectName}
          </Link>
        ) : (
          <span className="text-muted-foreground-strong">{projectName}</span>
        )}
      </TableCell>
      <TableCell className="h-10 py-2">
        <JobStatusBadge status={j.status} />
      </TableCell>
      <TableCell className="h-10 py-2">{relativeTime(j.startedAt ?? j.createdAt, now)}</TableCell>
      <TableCell className="h-10 py-2 tabular-nums">{jobDuration(j, now) ?? '—'}</TableCell>
      <TableCell className="h-10 py-1">
        <DropdownMenu>
          <DropdownMenuTrigger variant="ghost" className="size-7 px-0" aria-label={`Actions for ${JOB_TYPE_LABEL[j.type]} on ${projectName}`}>
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem disabled={!exists} onClick={() => navigate(`/projects/${j.projectId}`)}>
                View project
              </DropdownMenuItem>
              {isActive(j) && <DropdownMenuItem onClick={() => cancelJob(j.id)}>Cancel job</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
