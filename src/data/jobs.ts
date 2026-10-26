import { type ResolvedPackage, resolve, type Version } from '@/data/sample'

/* ------------------------------------------------------------------ */
/* Jobs (nebari-dev/nebi internal/models/job.go)                       */
/* ------------------------------------------------------------------ */

/** The real JobType enum. Push, pull and publish aren't jobs. */
export type JobType = 'create' | 'delete' | 'install' | 'remove' | 'update' | 'rollback' | 'env_install' | 'env_uninstall'

/** The real JobStatus enum, under the names the Figma badges use (pending = Queued, completed = Succeeded). */
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

export type Job = {
  /** UUID, as in the model. The detail page is the only place it shows. */
  id: string
  type: JobType
  projectId: string
  status: JobStatus
  createdAt: number
  startedAt: number | null
  endedAt: number | null
  /** Logs are one untimestamped, unlevelled text blob in the model; kept here as lines. */
  log: string[]
  /** Lines still to stream in while the job runs. */
  pending: string[]
  /** `Job.Error`. For a failed install it's only the exit status; the cause is in the log. */
  error?: string
}

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  create: 'Create project',
  delete: 'Delete project',
  install: 'Add packages',
  remove: 'Remove packages',
  update: 'Update project',
  rollback: 'Rollback',
  env_install: 'Install environment',
  env_uninstall: 'Uninstall environment',
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export const isActive = (j: Job) => j.status === 'queued' || j.status === 'running'

/* ------------------------------------------------------------------ */
/* Log lines. Nebi's own lines are verbatim from                        */
/* internal/executor/local.go; the pixi output between them is          */
/* illustrative.                                                        */
/* ------------------------------------------------------------------ */

const BUILDS = ['py312h5f1b2c_0', 'py312hf9745cd_1', 'pyhd8ed1ab_0', 'h4bc722e_1', 'py312h7900ff3_1']
const condaFile = (p: ResolvedPackage, i: number) => `${p.name}-${p.version}-${BUILDS[i % BUILDS.length]}.conda`

/** `pixi install -v` output for a version: one download line per conda package. */
export function installLines(v: Version) {
  const conda = resolve(v.requested).filter((p) => p.channel !== 'pypi')
  return [
    ' INFO pixi_core::lock_file::update: updating lock-file',
    " INFO pixi_core::install: installing environment 'default' for linux-64",
    ...conda.map((p, i) => ` INFO rattler::install: downloading ${condaFile(p, i)}`),
    ` INFO rattler::install: linking ${conda.length} packages into .pixi/envs/default`,
  ]
}

export const lockLines = [
  'Running: pixi lock',
  ' INFO pixi_core::lock_file::update: solving environment default for linux-64',
  ' INFO pixi_core::lock_file::update: solving environment default for osx-arm64',
  'Lockfile resolved successfully',
]

/** What the worker writes when a job that edits pixi.toml is cancelled or fails (worker.go). */
export const restoreLines = ['Restoring pixi.toml...', 'Restoring pixi.lock...', 'Workspace restored successfully']

/**
 * sandbox's install always fails (user test, 7 Oct): tensorflow's download drops. The seeded failed job and
 * every new install of sandbox write these lines after `Running: pixi install -v`.
 */
export const sandboxDownloadLines = [
  ' INFO pixi_core::lock_file::update: updating lock-file',
  " INFO pixi_core::install: installing environment 'default' for linux-64",
  ' INFO rattler::install: downloading numpy-2.1.3-py312h5f1b2c_0.conda',
  ' INFO rattler::install: downloading pandas-2.2.3-py312hf9745cd_1.conda',
  ' INFO rattler::install: downloading scipy-1.14.1-py312h7d485d2_0.conda',
  ' INFO rattler::install: downloading matplotlib-3.9.2-py312h7900ff3_1.conda',
  ' INFO rattler::install: downloading tensorflow-2.18.0-cpu_py312h1a3f8f9_0.conda',
]

export const sandboxErrorLines = [
  'Error:   × failed to fetch tensorflow-2.18.0-cpu_py312h1a3f8f9_0.conda',
  '  ├─> error sending request for url (https://conda.anaconda.org/conda-forge/linux-64/tensorflow-2.18.0-cpu_py312h1a3f8f9_0.conda)',
  '  ╰─> connection closed before message completed',
  'Cleaning up job artifact: /home/user/sandbox/.pixi/envs',
]

const sandboxFailLines = [...sandboxDownloadLines, ...sandboxErrorLines]

export const SANDBOX_INSTALL_ERROR = 'pixi install failed: exit status 1'

/** The project's latest env_install job, when it failed. Projects list and project details point at it. */
export function failedInstall(jobs: Job[], projectId: string) {
  const latest = jobs
    .filter((j) => j.projectId === projectId && j.type === 'env_install')
    .reduce<Job | null>((a, j) => (a == null || j.createdAt > a.createdAt ? j : a), null)
  return latest?.status === 'failed' ? latest : null
}

/* ------------------------------------------------------------------ */
/* Sample jobs (Figma 05a 2399:7084, 05b 2431:7330, 05c 2435:7405)      */
/* ------------------------------------------------------------------ */

const MIN = 60_000
const HOUR = 60 * MIN

/** Sample rows from 05a, timed relative to page load. Row 2 is 05c and row 3 is 05b. */
export function sampleJobs(now = Date.now()): Job[] {
  const done = (id: string, type: JobType, projectId: string, status: JobStatus, ago: number, seconds: number, log: string[], error?: string): Job => ({
    id,
    type,
    projectId,
    status,
    createdAt: now - ago - 2000,
    startedAt: now - ago,
    endedAt: now - ago + seconds * 1000,
    log,
    pending: [],
    error,
  })

  return [
    {
      id: '4f0c9a61-2b7e-4d3a-9e55-0b8d1c7a2f13',
      type: 'install',
      projectId: 'project-1',
      status: 'queued',
      createdAt: now - 10_000,
      startedAt: null,
      endedAt: null,
      log: [],
      pending: [],
    },
    {
      // 05c: Running. The last lines stream in while the page is open; the job itself stays running.
      id: 'b3e21d07-6c4f-4a9b-8f12-7d95e0c43a68',
      type: 'env_install',
      projectId: 'project-pulled-from-server',
      status: 'running',
      createdAt: now - 124_000 - 1500,
      startedAt: now - 124_000,
      endedAt: null,
      log: [
        'Running: pixi install -v',
        ' INFO pixi_core::lock_file::update: updating lock-file',
        " INFO pixi_core::install: installing environment 'default' for linux-64",
        ' INFO rattler::install: downloading pandas-2.2.3-py312hf9745cd_1.conda',
        ' INFO rattler::install: downloading matplotlib-3.9.2-py312h7900ff3_1.conda',
      ],
      pending: [
        ' INFO rattler::install: downloading scikit-learn-1.5.2-py312h775a589_1.conda',
        ' INFO rattler::install: downloading pytorch-2.5.1-cpu_py312h1a3f8f9_0.conda',
        ' INFO rattler::install: downloading transformers-4.46.3-pyhd8ed1ab_0.conda',
      ],
    },
    done('9a7d4e2c-1f36-4b88-a0c5-e62b9f0d8471', 'env_install', 'sandbox', 'failed', 30 * MIN, 42, [
      'Running: pixi install -v',
      ...sandboxFailLines,
    ], SANDBOX_INSTALL_ERROR),
    done('2c58f1b9-8e04-47d1-b6a3-5f19c7e20d94', 'update', 'project-1', 'succeeded', 3 * HOUR, 72, [
      'Solving environment from current pixi.toml...',
      ...lockLines,
    ]),
    done('71e6b0d3-4a92-4c5f-9d18-c3a07e5f6b21', 'rollback', 'oci-registry', 'cancelled', 5 * HOUR, 8, [
      'Rolling back to version 6',
      'Running: pixi lock',
      ' INFO pixi_core::lock_file::update: solving environment default for linux-64',
      ...restoreLines,
    ]),
    done('d9f3a8c1-5b27-4e60-8a4d-1e6c2b9f7035', 'install', 'oci-registry', 'succeeded', 26 * HOUR, 90, [
      'Installing packages: [scikit-learn]',
      ...lockLines,
      'Packages installed successfully',
    ]),
    done('5e8b2f47-0c1a-4d93-b7e6-8f3d5a1c9e02', 'create', 'sandbox', 'succeeded', 29 * HOUR, 54, [
      'Creating environment at: /home/user/sandbox',
      'Writing custom pixi.toml content',
      ...lockLines,
      'Environment created successfully',
    ]),
  ]
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** "2m 04s", "42s", "1h 03m", as in 05a. */
export function formatDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

export function jobDuration(j: Job, now: number) {
  if (j.startedAt == null) return null
  return formatDuration((j.endedAt ?? now) - j.startedAt)
}

/** "Just now", "2 min ago", "3 hours ago", "Yesterday", as in 05a. Older jobs get a date. */
export function relativeTime(at: number, now: number) {
  const s = (now - at) / 1000
  if (s < 60) return 'Just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  if (at >= today.getTime()) return h === 1 ? '1 hour ago' : `${h} hours ago`
  if (at >= today.getTime() - 24 * HOUR) return 'Yesterday'
  return `${new Date(at).getDate()} ${MONTHS[new Date(at).getMonth()]}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "15 Sep, 09:12", as in the 05b/05c fact row. */
export function absoluteTime(at: number) {
  const d = new Date(at)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
