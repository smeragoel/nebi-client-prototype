/**
 * Sample data for the prototype. Shapes follow nebari-dev/nebi `internal/models`
 * (Workspace, WorkspaceVersion, WorkspaceTag, Publication) as checked on 2026-09-24,
 * plus the client-only fields the 2026-09-24 sync asked for (installed version,
 * last installed version, server position). Values come from the Figma frames
 * 1774:2940, 2898:9525 and 2903:8908, with gaps filled so every state is clickable.
 */

export type Person = { name: string; initials: string }

export const ME: Person = { name: 'Sam Garcia', initials: 'SG' }
export const ALEX: Person = { name: 'Alex Kim', initials: 'AK' }

export type RequestedPackage = { name: string; constraint: string }

export type ResolvedPackage = {
  name: string
  version: string
  channel: string
  /** Download size from pixi.lock. PyPI entries have none. */
  size: string | null
}

export type Publication = { registry: string; repository: string; tag: string }

export type Version = {
  number: number
  description: string
  author: Person
  /** Days before today. Drives the rail's relative-time groups and the full date. */
  ageDays: number
  tags: string[]
  channels: string[]
  platforms: string[]
  requested: RequestedPackage[]
  publications: Publication[]
  /** Made in this session: the meta line says "just now" instead of a date. */
  justNow?: boolean
}

export type Project = {
  id: string
  name: string
  path: string
  /** Versions on this machine, oldest first. */
  versions: Version[]
  /** Versions only on the server (newer than anything local). */
  serverOnly: Version[]
  /** Highest version number the server has. */
  serverVersion: number | null
  installedVersion: number | null
  /** Shown muted with a history icon when nothing is installed. */
  lastInstalledVersion: number | null
  /** Size on disk. Stored per project, not per version. */
  size: string | null
  remotes: string[]
  /** Name on the server, when it was pulled under a different local name. */
  serverName?: string
}

const PLATFORMS = ['linux-64', 'linux-aarch64']

const pkg = (name: string, constraint: string): RequestedPackage => ({ name, constraint })

const base = [pkg('python', '3.11.*'), pkg('numpy', '>=2.0'), pkg('jupyterlab', '>=4.2'), pkg('ipykernel', '*')]
const reporting = [pkg('pandas', '>=2.2'), pkg('rich', '>=13.9')]
const withPython312 = (list: RequestedPackage[]) =>
  list.map((p) => (p.name === 'python' ? pkg('python', '3.12.*') : p))

/** Project_1's history, used as-is for Project_1 and trimmed for the others. */
export function project1History(): Version[] {
  const v1 = [...base]
  const v2 = [...v1, ...reporting]
  const v3 = [...v2, pkg('scikit-learn', '>=1.5')]
  const v4 = [...v2, pkg('tensorflow', '>=2.16'), pkg('matplotlib', '>=3.9')]
  const v5 = [...v2, pkg('matplotlib', '>=3.9'), pkg('scikit-learn', '>=1.5')]
  const v6 = withPython312([...v5, pkg('requests', '>=2.32')])
  const v7 = [...v6, pkg('scipy', '>=1.11')]

  const common = { platforms: PLATFORMS, author: ME }
  return [
    { ...common, number: 1, description: 'First version', ageDays: 136, tags: [], channels: ['conda-forge'], requested: v1, publications: [] },
    { ...common, number: 2, description: 'Added pandas and rich for reporting', ageDays: 128, tags: [], channels: ['conda-forge'], requested: v2, publications: [] },
    {
      ...common, number: 3, description: 'Added scikit-learn for the baseline model', ageDays: 104, tags: ['prod'], channels: ['conda-forge'], requested: v3,
      publications: [{ registry: 'ghcr.io', repository: 'example-org/project_1', tag: '3' }],
    },
    { ...common, number: 4, description: 'Added the pytorch channel', ageDays: 23, tags: [], channels: ['conda-forge', 'pytorch'], requested: v4, publications: [] },
    {
      ...common, number: 5, description: 'Swapped tensorflow for scikit-learn', ageDays: 13, tags: ['stable'], channels: ['conda-forge', 'defaults'], requested: v5,
      publications: [{ registry: 'ghcr.io', repository: 'example-org/project_1', tag: '5' }],
    },
    { ...common, author: ALEX, number: 6, description: 'Bumped Python to 3.12', ageDays: 3, tags: [], channels: ['conda-forge', 'defaults'], requested: v6, publications: [] },
    { ...common, number: 7, description: 'Added scipy for the new solver', ageDays: 0, tags: ['latest'], channels: ['conda-forge', 'defaults'], requested: v7, publications: [] },
  ]
}

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'project-1',
    name: 'Project_1',
    path: '/home/user/Project_1',
    versions: project1History(),
    serverOnly: [],
    serverVersion: 6,
    installedVersion: 7,
    lastInstalledVersion: 7,
    size: '1.2 GB',
    remotes: ['team-nebi', 'ghcr.io/example-org'],
  },
  {
    id: 'project-pulled-from-server',
    name: 'Project_pulled_from_server',
    path: '/home/user/Project_pulled_from_server',
    versions: project1History()
      .slice(0, 2)
      .map((v, i) => ({ ...v, author: ALEX, tags: i === 1 ? ['stable'] : [], ageDays: 60 - i * 20 })),
    serverOnly: [
      { ...project1History()[2], author: ALEX, ageDays: 1, tags: ['latest'], publications: [] },
    ],
    serverVersion: 3,
    installedVersion: null,
    lastInstalledVersion: 2,
    size: null,
    remotes: ['ghcr.io/nebari-dev'],
  },
  {
    id: 'oci-registry',
    name: 'oci_registry',
    path: '/home/user/oci_registry',
    versions: project1History().map((v) => ({ ...v, publications: [] })),
    serverOnly: [],
    serverVersion: 7,
    installedVersion: 7,
    lastInstalledVersion: 7,
    size: '890 MB',
    remotes: ['team-nebi'],
  },
  {
    id: 'sandbox',
    name: 'sandbox',
    path: '/home/user/sandbox',
    versions: [{ ...project1History()[0], ageDays: 9, tags: ['latest'] }],
    serverOnly: [],
    serverVersion: null,
    installedVersion: null,
    lastInstalledVersion: 1,
    size: null,
    remotes: ['quay.io/reiemp'],
  },
]

/* ------------------------------------------------------------------ */
/* Registries (client-side OCI registries, 2026-09-15: off the server)  */
/* ------------------------------------------------------------------ */

export type Registry = { name: string; url: string; namespace: string }

/** Registries this machine can publish to. Values from the Publish modal 2969:13055. */
export const REGISTRIES: Registry[] = [
  { name: 'GitHub Container Registry', url: 'ghcr.io', namespace: 'example-org' },
  { name: 'Quay', url: 'quay.io', namespace: 'nebari' },
  { name: 'Internal Harbor', url: 'harbor.example.com', namespace: 'ml' },
]

/** Default publication for a version: repository = project name, tag = version number (GET /publish-defaults). */
export function defaultPublication(r: Registry, project: Project, v: Version): Publication {
  return { registry: r.url, repository: `${r.namespace}/${project.name.toLowerCase()}`, tag: String(v.number) }
}

export const publicationRef = (p: Publication) => `${p.registry}/${p.repository}:${p.tag}`

/* ------------------------------------------------------------------ */
/* Change summary (computed from the manifest diff, ◐ in ux.md)         */
/* ------------------------------------------------------------------ */

/** ["added seaborn", "removed requests", "changed numpy"]: what differs between two package lists. */
export function changeSummary(before: RequestedPackage[], after: RequestedPackage[]) {
  const was = new Map(before.map((p) => [p.name, p.constraint]))
  const now = new Map(after.map((p) => [p.name, p.constraint]))
  const added = after.filter((p) => !was.has(p.name)).map((p) => p.name)
  const removed = before.filter((p) => !now.has(p.name)).map((p) => p.name)
  const changed = after.filter((p) => was.has(p.name) && was.get(p.name) !== p.constraint).map((p) => p.name)
  const list = (xs: string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)
  return [
    added.length ? `added ${list(added)}` : null,
    removed.length ? `removed ${list(removed)}` : null,
    changed.length ? `changed ${list(changed)}` : null,
  ].filter((x): x is string => x != null)
}

/* ------------------------------------------------------------------ */
/* Resolved packages (pixi.lock). Computed from the requested list.    */
/* ------------------------------------------------------------------ */

type LockEntry = Omit<ResolvedPackage, 'name'> & { deps?: string[] }

const LOCK: Record<string, LockEntry> = {
  'python@3.11': { version: '3.11.10', channel: 'conda-forge', size: '30.5 MB', deps: ['openssl', 'libzlib', 'tzdata', 'pip', 'ca-certificates'] },
  'python@3.12': { version: '3.12.7', channel: 'conda-forge', size: '31.2 MB', deps: ['openssl', 'libzlib', 'tzdata', 'pip', 'ca-certificates'] },
  numpy: { version: '2.1.3', channel: 'conda-forge', size: '7.9 MB', deps: ['libopenblas'] },
  pandas: { version: '2.2.3', channel: 'conda-forge', size: '14.6 MB', deps: ['python-dateutil', 'pytz'] },
  rich: { version: '13.9.4', channel: 'conda-forge', size: '185 KB', deps: ['markdown-it-py', 'pygments'] },
  seaborn: { version: '0.13.2', channel: 'conda-forge', size: '234 KB', deps: ['matplotlib', 'pandas'] },
  scipy: { version: '1.14.1', channel: 'conda-forge', size: '17.2 MB' },
  matplotlib: { version: '3.9.2', channel: 'conda-forge', size: '7.6 MB', deps: ['pillow', 'fonttools'] },
  'scikit-learn': { version: '1.5.2', channel: 'conda-forge', size: '9.4 MB', deps: ['joblib', 'threadpoolctl'] },
  jupyterlab: { version: '4.2.5', channel: 'conda-forge', size: '7.4 MB', deps: ['tornado', 'jinja2'] },
  ipykernel: { version: '6.29.5', channel: 'conda-forge', size: '118 KB', deps: ['tornado'] },
  requests: { version: '2.32.3', channel: 'pypi', size: null },
  tensorflow: { version: '2.16.2', channel: 'conda-forge', size: '312.8 MB' },
  openssl: { version: '3.3.2', channel: 'conda-forge', size: '2.8 MB' },
  libzlib: { version: '1.3.1', channel: 'conda-forge', size: '60 KB' },
  tzdata: { version: '2024b', channel: 'conda-forge', size: '122 KB' },
  pip: { version: '24.2', channel: 'conda-forge', size: '1.2 MB' },
  'ca-certificates': { version: '2024.8.30', channel: 'conda-forge', size: '155 KB' },
  libopenblas: { version: '0.3.28', channel: 'conda-forge', size: '5.4 MB' },
  'python-dateutil': { version: '2.9.0', channel: 'conda-forge', size: '218 KB' },
  pytz: { version: '2024.2', channel: 'conda-forge', size: '186 KB' },
  'markdown-it-py': { version: '3.0.0', channel: 'conda-forge', size: '64 KB' },
  pygments: { version: '2.18.0', channel: 'conda-forge', size: '859 KB' },
  pillow: { version: '11.0.0', channel: 'conda-forge', size: '41.2 MB' },
  fonttools: { version: '4.54.1', channel: 'conda-forge', size: '2.3 MB' },
  joblib: { version: '1.4.2', channel: 'conda-forge', size: '215 KB' },
  threadpoolctl: { version: '3.5.0', channel: 'conda-forge', size: '23 KB' },
  tornado: { version: '6.4.1', channel: 'conda-forge', size: '643 KB' },
  jinja2: { version: '3.1.4', channel: 'conda-forge', size: '109 KB' },
}

function lockKey(p: RequestedPackage) {
  if (p.name === 'python') return /3\.1[2-9]/.test(p.constraint) ? 'python@3.12' : 'python@3.11'
  return p.name
}

/** Stand-in lock entry for packages typed into Create project that the sample lock doesn't know. */
function unknownEntry(p: RequestedPackage): LockEntry {
  const pinned = p.constraint.match(/\d+(\.\d+)*/)?.[0]
  return { version: pinned ?? '1.0.0', channel: 'conda-forge', size: '2.1 MB' }
}

/** Requested packages first (in manifest order), then their dependencies A–Z. */
export function resolve(requested: RequestedPackage[]): ResolvedPackage[] {
  const direct = requested.map((p) => ({ name: p.name, ...(LOCK[lockKey(p)] ?? unknownEntry(p)) }))
  const depNames = new Set<string>()
  for (const p of requested) for (const d of LOCK[lockKey(p)]?.deps ?? []) depNames.add(d)
  for (const p of requested) depNames.delete(p.name)
  const deps = [...depNames].sort().map((name) => ({ name, ...LOCK[name] }))
  return [...direct, ...deps].map(({ name, version, channel, size }) => ({ name, version, channel, size }))
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export function dateFor(ageDays: number) {
  const d = new Date()
  d.setDate(d.getDate() - ageDays)
  return d
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "21 May 2026", as in the Figma meta line. */
export function fullDate(ageDays: number) {
  const d = dateFor(ageDays)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Relative-time separators from the 2026-09-24 sync: Today / This week / This month / This year / Older. */
export function timeGroup(ageDays: number) {
  if (ageDays < 1) return 'Today'
  if (ageDays < 7) return 'This week'
  if (ageDays < 31) return 'This month'
  if (ageDays < 365) return 'This year'
  return 'Older'
}

export function pixiToml(project: Project, v: Version) {
  const isPypi = (p: RequestedPackage) => LOCK[lockKey(p)]?.channel === 'pypi'
  const line = (p: RequestedPackage) => `${p.name} = "${p.constraint}"`
  const conda = v.requested.filter((p) => !isPypi(p)).map(line).join('\n')
  const pypi = v.requested.filter(isPypi).map(line).join('\n')
  return `[workspace]
name = "${project.name}"
channels = [${v.channels.map((c) => `"${c}"`).join(', ')}]
platforms = [${v.platforms.map((p) => `"${p}"`).join(', ')}]

[dependencies]
${conda}
${pypi ? `\n[pypi-dependencies]\n${pypi}\n` : ''}`
}
