import { CircleAlert, Search } from 'lucide-react'
import { Fragment, type ReactNode, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { JobStatusBadge, useNow } from '@/components/jobs/job-parts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { absoluteTime, isActive, JOB_TYPE_LABEL, jobDuration } from '@/data/jobs'
import { useStore } from '@/state/store'

/**
 * Figma `05b` 2431:7330 (failed) and `05c` 2435:7405 (running): one job and its log.
 * Full page rather than a drawer, so the install strip, the pull toast and the Jobs list can all link here.
 */
export default function JobDetails() {
  const { id } = useParams()
  const { jobs, projects, cancelJob } = useStore()
  const navigate = useNavigate()
  const now = useNow()
  const [query, setQuery] = useState('')
  const job = jobs.find((j) => j.id === id)

  if (!job) {
    return (
      <main className="flex flex-col items-start gap-3 px-12 py-12">
        <h1 className="font-bold text-3xl text-foreground">Job not found</h1>
        <p className="text-muted-foreground text-sm">It may have been cleared from this machine.</p>
        <Button variant="outline" render={<Link to="/jobs" />}>
          Back to Jobs
        </Button>
      </main>
    )
  }

  const project = projects.find((p) => p.id === job.projectId)
  const label = JOB_TYPE_LABEL[job.type]
  const text = job.log.join('\n')
  const q = query.trim().toLowerCase()
  const matches = q ? job.log.filter((l) => l.toLowerCase().includes(q)).length : 0

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ title: 'Log copied', type: 'success' })
    } catch {
      toast.add({ title: 'Couldn’t copy the log', description: 'Select the text in the log and copy it instead.', type: 'error' })
    }
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([`${text}\n`], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `nebi-${job.type}-${job.id.slice(0, 8)}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="flex flex-col gap-5 px-12 py-12">
      <div className="flex flex-col gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/jobs" />}>Jobs</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{label}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="font-bold text-3xl text-foreground">{label}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          {isActive(job) ? (
            <Button variant="outline" onClick={() => cancelJob(job.id)}>
              Cancel job
            </Button>
          ) : (
            <Button variant="outline" disabled={!project} onClick={() => navigate(`/projects/${job.projectId}`)}>
              View project
            </Button>
          )}
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-10 gap-y-3 text-sm leading-5">
        <Fact label="Project">
          {project ? (
            <Link to={`/projects/${project.id}`} className="underline underline-offset-4">
              {project.name}
            </Link>
          ) : (
            job.projectId
          )}
        </Fact>
        <Fact label="Started">{job.startedAt ? absoluteTime(job.startedAt) : '—'}</Fact>
        <Fact label="Ended">{job.endedAt ? absoluteTime(job.endedAt) : '—'}</Fact>
        <Fact label="Duration">
          <span className="tabular-nums">{jobDuration(job, now) ?? '—'}</span>
        </Fact>
      </dl>

      {job.status === 'failed' && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>Job failed</AlertTitle>
          <AlertDescription>This job couldn’t be completed successfully. Please see logs for details.</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <div className="relative w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search logs"
            aria-label="Search logs"
            className="pl-9"
          />
        </div>
        {q && (
          <span className="text-muted-foreground text-sm" role="status">
            {matches === 0 ? 'No matching lines' : matches === 1 ? '1 matching line' : `${matches} matching lines`}
          </span>
        )}
        <span className="flex-1" />
        <Button variant="outline" onClick={copy} disabled={!job.log.length}>
          Copy
        </Button>
        <Button variant="outline" onClick={download} disabled={!job.log.length}>
          Download
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-3 font-mono text-card-foreground text-xs leading-4">
        {job.log.length > 0 ? (
          <pre role="log" aria-label={`${label} log`} className="whitespace-pre-wrap break-words font-mono">
            {job.log.map((line, i) => (
              <Fragment key={i}>
                <Highlight line={line} query={q} />
                {'\n'}
              </Fragment>
            ))}
          </pre>
        ) : (
          // Not in Figma: a queued job hasn't written anything yet.
          <p className="text-muted-foreground">Waiting to start. The log appears once the job runs.</p>
        )}
        {job.status === 'running' && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success-foreground motion-safe:animate-pulse" aria-hidden />
            Streaming — job in progress
          </p>
        )}
      </div>
    </main>
  )
}

/** Label over value, as in the 05b fact row. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  )
}

/** Marks every match of `query` in a log line. Matching lines stay in place so the context around them stays readable. */
function Highlight({ line, query }: { line: string; query: string }) {
  if (!query) return line
  const lower = line.toLowerCase()
  const parts: ReactNode[] = []
  let from = 0
  for (let at = lower.indexOf(query); at !== -1; at = lower.indexOf(query, from)) {
    parts.push(line.slice(from, at), <mark key={at} className="rounded-sm bg-warning text-warning-foreground">{line.slice(at, at + query.length)}</mark>)
    from = at + query.length
  }
  parts.push(line.slice(from))
  return parts
}
