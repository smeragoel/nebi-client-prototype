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

/**
 * A pixi.lock stand-in for linux-64: conda-forge pins from late 2024, with each package's main
 * runtime dependencies. resolve() walks `deps` to build the full tree the Resolved tab shows.
 */
const LOCK: Record<string, LockEntry> = {
  _libgcc_mutex: { version: '0.1', channel: 'conda-forge', size: '2.5 KB' },
  _openmp_mutex: { version: '4.5', channel: 'conda-forge', size: '23 KB', deps: ['libgomp'] },
  anyio: { version: '4.6.2', channel: 'conda-forge', size: '109 KB', deps: ['idna', 'sniffio'] },
  asttokens: { version: '2.4.1', channel: 'conda-forge', size: '28 KB', deps: ['six'] },
  'async-lru': { version: '2.0.4', channel: 'conda-forge', size: '15 KB' },
  attrs: { version: '24.2.0', channel: 'conda-forge', size: '55 KB' },
  bzip2: { version: '1.0.8', channel: 'conda-forge', size: '247 KB', deps: ['libgcc'] },
  'ca-certificates': { version: '2024.8.30', channel: 'conda-forge', size: '155 KB' },
  certifi: { version: '2024.8.30', channel: 'conda-forge', size: '160 KB' },
  'charset-normalizer': { version: '3.4.0', channel: 'pypi', size: null },
  comm: { version: '0.2.2', channel: 'conda-forge', size: '12 KB', deps: ['traitlets'] },
  contourpy: { version: '1.3.0', channel: 'conda-forge', size: '268 KB', deps: ['numpy', 'libstdcxx'] },
  cycler: { version: '0.12.1', channel: 'conda-forge', size: '13 KB' },
  debugpy: { version: '1.8.8', channel: 'conda-forge', size: '2.6 MB', deps: ['libstdcxx'] },
  decorator: { version: '5.1.1', channel: 'conda-forge', size: '12 KB' },
  executing: { version: '2.1.0', channel: 'conda-forge', size: '28 KB' },
  fastjsonschema: { version: '2.20.0', channel: 'conda-forge', size: '225 KB' },
  fonttools: { version: '4.54.1', channel: 'conda-forge', size: '2.3 MB' },
  freetype: { version: '2.12.1', channel: 'conda-forge', size: '635 KB', deps: ['libpng', 'libzlib'] },
  h11: { version: '0.14.0', channel: 'conda-forge', size: '48 KB' },
  httpcore: { version: '1.0.7', channel: 'conda-forge', size: '48 KB', deps: ['certifi', 'h11'] },
  httpx: { version: '0.27.2', channel: 'conda-forge', size: '64 KB', deps: ['anyio', 'certifi', 'httpcore', 'idna', 'sniffio'] },
  idna: { version: '3.10', channel: 'conda-forge', size: '49 KB' },
  ipykernel: { version: '6.29.5', channel: 'conda-forge', size: '118 KB', deps: ['comm', 'debugpy', 'ipython', 'jupyter_client', 'jupyter_core', 'matplotlib-inline', 'nest-asyncio', 'packaging', 'psutil', 'pyzmq', 'tornado', 'traitlets'] },
  ipython: { version: '8.29.0', channel: 'conda-forge', size: '585 KB', deps: ['decorator', 'jedi', 'matplotlib-inline', 'pexpect', 'prompt-toolkit', 'pygments', 'stack_data', 'traitlets'] },
  jedi: { version: '0.19.2', channel: 'conda-forge', size: '843 KB', deps: ['parso'] },
  jinja2: { version: '3.1.4', channel: 'conda-forge', size: '109 KB', deps: ['markupsafe'] },
  joblib: { version: '1.4.2', channel: 'conda-forge', size: '215 KB' },
  jsonschema: { version: '4.23.0', channel: 'conda-forge', size: '74 KB', deps: ['attrs', 'jsonschema-specifications', 'referencing', 'rpds-py'] },
  'jsonschema-specifications': { version: '2024.10.1', channel: 'conda-forge', size: '16 KB', deps: ['referencing'] },
  'jupyter-lsp': { version: '2.2.5', channel: 'conda-forge', size: '55 KB', deps: ['jupyter_server'] },
  jupyter_client: { version: '8.6.3', channel: 'conda-forge', size: '106 KB', deps: ['jupyter_core', 'python-dateutil', 'pyzmq', 'tornado', 'traitlets'] },
  jupyter_core: { version: '5.7.2', channel: 'conda-forge', size: '93 KB', deps: ['platformdirs', 'traitlets'] },
  jupyter_server: { version: '2.14.2', channel: 'conda-forge', size: '319 KB', deps: ['anyio', 'jinja2', 'jupyter_client', 'jupyter_core', 'jupyter_server_terminals', 'nbformat', 'packaging', 'pyzmq', 'terminado', 'tornado', 'traitlets'] },
  jupyter_server_terminals: { version: '0.5.3', channel: 'conda-forge', size: '19 KB', deps: ['terminado'] },
  jupyterlab: { version: '4.2.5', channel: 'conda-forge', size: '7.4 MB', deps: ['async-lru', 'httpx', 'ipykernel', 'jinja2', 'jupyter-lsp', 'jupyter_core', 'jupyter_server', 'jupyterlab_server', 'notebook-shim', 'packaging', 'setuptools', 'tornado', 'traitlets'] },
  jupyterlab_server: { version: '2.27.3', channel: 'conda-forge', size: '49 KB', deps: ['jinja2', 'jsonschema', 'jupyter_server', 'packaging', 'requests'] },
  kiwisolver: { version: '1.4.7', channel: 'conda-forge', size: '71 KB', deps: ['libstdcxx'] },
  lcms2: { version: '2.16', channel: 'conda-forge', size: '239 KB', deps: ['libjpeg-turbo', 'libtiff'] },
  'ld_impl_linux-64': { version: '2.43', channel: 'conda-forge', size: '654 KB' },
  libblas: { version: '3.9.0', channel: 'conda-forge', size: '16 KB', deps: ['libopenblas'] },
  libcblas: { version: '3.9.0', channel: 'conda-forge', size: '16 KB', deps: ['libblas'] },
  libexpat: { version: '2.6.4', channel: 'conda-forge', size: '72 KB', deps: ['libgcc'] },
  libffi: { version: '3.4.2', channel: 'conda-forge', size: '57 KB', deps: ['libgcc'] },
  libgcc: { version: '14.2.0', channel: 'conda-forge', size: '829 KB', deps: ['_libgcc_mutex', '_openmp_mutex'] },
  libgfortran: { version: '14.2.0', channel: 'conda-forge', size: '53 KB', deps: ['libgfortran5'] },
  libgfortran5: { version: '14.2.0', channel: 'conda-forge', size: '1.5 MB', deps: ['libgcc'] },
  libgomp: { version: '14.2.0', channel: 'conda-forge', size: '450 KB' },
  'libjpeg-turbo': { version: '3.0.0', channel: 'conda-forge', size: '603 KB', deps: ['libgcc'] },
  liblapack: { version: '3.9.0', channel: 'conda-forge', size: '16 KB', deps: ['libblas'] },
  libopenblas: { version: '0.3.28', channel: 'conda-forge', size: '5.4 MB', deps: ['libgcc', 'libgfortran', 'libgfortran5'] },
  libpng: { version: '1.6.44', channel: 'conda-forge', size: '284 KB', deps: ['libzlib'] },
  libsodium: { version: '1.0.20', channel: 'conda-forge', size: '206 KB', deps: ['libgcc'] },
  libsqlite: { version: '3.47.0', channel: 'conda-forge', size: '854 KB', deps: ['libgcc', 'libzlib'] },
  libstdcxx: { version: '14.2.0', channel: 'conda-forge', size: '3.7 MB', deps: ['libgcc'] },
  libtiff: { version: '4.7.0', channel: 'conda-forge', size: '418 KB', deps: ['libjpeg-turbo', 'libwebp-base', 'zstd'] },
  libuuid: { version: '2.38.1', channel: 'conda-forge', size: '33 KB', deps: ['libgcc'] },
  'libwebp-base': { version: '1.4.0', channel: 'conda-forge', size: '429 KB', deps: ['libgcc'] },
  libzlib: { version: '1.3.1', channel: 'conda-forge', size: '60 KB', deps: ['libgcc'] },
  'markdown-it-py': { version: '3.0.0', channel: 'conda-forge', size: '64 KB', deps: ['mdurl'] },
  markupsafe: { version: '3.0.2', channel: 'conda-forge', size: '23 KB' },
  matplotlib: { version: '3.9.2', channel: 'conda-forge', size: '7.6 MB', deps: ['contourpy', 'cycler', 'fonttools', 'freetype', 'kiwisolver', 'numpy', 'packaging', 'pillow', 'pyparsing', 'python-dateutil'] },
  'matplotlib-inline': { version: '0.1.7', channel: 'conda-forge', size: '14 KB', deps: ['traitlets'] },
  mdurl: { version: '0.1.2', channel: 'conda-forge', size: '14 KB' },
  nbformat: { version: '5.10.4', channel: 'conda-forge', size: '99 KB', deps: ['fastjsonschema', 'jsonschema', 'jupyter_core', 'traitlets'] },
  ncurses: { version: '6.5', channel: 'conda-forge', size: '868 KB', deps: ['libgcc'] },
  'nest-asyncio': { version: '1.6.0', channel: 'conda-forge', size: '11 KB' },
  'notebook-shim': { version: '0.2.4', channel: 'conda-forge', size: '16 KB', deps: ['jupyter_server'] },
  numpy: { version: '2.1.3', channel: 'conda-forge', size: '7.9 MB', deps: ['libblas', 'libcblas', 'liblapack', 'libgcc', 'libstdcxx'] },
  openjpeg: { version: '2.5.2', channel: 'conda-forge', size: '334 KB', deps: ['libpng', 'libtiff'] },
  openssl: { version: '3.3.2', channel: 'conda-forge', size: '2.8 MB', deps: ['ca-certificates', 'libgcc'] },
  packaging: { version: '24.2', channel: 'conda-forge', size: '59 KB' },
  pandas: { version: '2.2.3', channel: 'conda-forge', size: '14.6 MB', deps: ['numpy', 'python-dateutil', 'pytz', 'tzdata', 'libgcc', 'libstdcxx'] },
  parso: { version: '0.8.4', channel: 'conda-forge', size: '73 KB' },
  pexpect: { version: '4.9.0', channel: 'conda-forge', size: '52 KB', deps: ['ptyprocess'] },
  pillow: { version: '11.0.0', channel: 'conda-forge', size: '41.2 MB', deps: ['freetype', 'lcms2', 'libjpeg-turbo', 'libtiff', 'libwebp-base', 'openjpeg'] },
  pip: { version: '24.2', channel: 'conda-forge', size: '1.2 MB', deps: ['setuptools', 'wheel'] },
  platformdirs: { version: '4.3.6', channel: 'conda-forge', size: '20 KB' },
  'prompt-toolkit': { version: '3.0.48', channel: 'conda-forge', size: '264 KB', deps: ['wcwidth'] },
  psutil: { version: '6.1.0', channel: 'conda-forge', size: '482 KB', deps: ['libgcc'] },
  ptyprocess: { version: '0.7.0', channel: 'conda-forge', size: '16 KB' },
  pure_eval: { version: '0.2.3', channel: 'conda-forge', size: '16 KB' },
  pygments: { version: '2.18.0', channel: 'conda-forge', size: '859 KB' },
  pyparsing: { version: '3.2.0', channel: 'conda-forge', size: '90 KB' },
  'python-dateutil': { version: '2.9.0', channel: 'conda-forge', size: '218 KB', deps: ['six'] },
  'python@3.11': { version: '3.11.10', channel: 'conda-forge', size: '30.5 MB', deps: ['bzip2', 'ld_impl_linux-64', 'libexpat', 'libffi', 'libgcc', 'libsqlite', 'libuuid', 'libzlib', 'ncurses', 'openssl', 'pip', 'readline', 'tk', 'tzdata', 'xz', 'ca-certificates'] },
  'python@3.12': { version: '3.12.7', channel: 'conda-forge', size: '31.2 MB', deps: ['bzip2', 'ld_impl_linux-64', 'libexpat', 'libffi', 'libgcc', 'libsqlite', 'libuuid', 'libzlib', 'ncurses', 'openssl', 'pip', 'readline', 'tk', 'tzdata', 'xz', 'ca-certificates'] },
  pytz: { version: '2024.2', channel: 'conda-forge', size: '186 KB' },
  pyzmq: { version: '26.2.0', channel: 'conda-forge', size: '370 KB', deps: ['libsodium', 'zeromq'] },
  readline: { version: '8.2', channel: 'conda-forge', size: '281 KB', deps: ['ncurses'] },
  referencing: { version: '0.35.1', channel: 'conda-forge', size: '41 KB', deps: ['attrs', 'rpds-py'] },
  requests: { version: '2.32.3', channel: 'pypi', size: null, deps: ['certifi', 'charset-normalizer', 'idna', 'urllib3'] },
  rich: { version: '13.9.4', channel: 'conda-forge', size: '185 KB', deps: ['markdown-it-py', 'pygments'] },
  'rpds-py': { version: '0.21.0', channel: 'conda-forge', size: '330 KB', deps: ['libgcc'] },
  'scikit-learn': { version: '1.5.2', channel: 'conda-forge', size: '9.4 MB', deps: ['joblib', 'numpy', 'scipy', 'threadpoolctl', 'libstdcxx', '_openmp_mutex'] },
  scipy: { version: '1.14.1', channel: 'conda-forge', size: '17.2 MB', deps: ['libblas', 'libcblas', 'liblapack', 'libgfortran5', 'libstdcxx', 'numpy'] },
  seaborn: { version: '0.13.2', channel: 'conda-forge', size: '234 KB', deps: ['matplotlib', 'numpy', 'pandas', 'scipy'] },
  setuptools: { version: '75.3.0', channel: 'conda-forge', size: '777 KB' },
  six: { version: '1.16.0', channel: 'conda-forge', size: '14 KB' },
  sniffio: { version: '1.3.1', channel: 'conda-forge', size: '15 KB' },
  stack_data: { version: '0.6.2', channel: 'conda-forge', size: '26 KB', deps: ['asttokens', 'executing', 'pure_eval'] },
  tensorflow: { version: '2.16.2', channel: 'conda-forge', size: '312.8 MB', deps: ['numpy', 'libstdcxx'] },
  terminado: { version: '0.18.1', channel: 'conda-forge', size: '22 KB', deps: ['ptyprocess', 'tornado'] },
  threadpoolctl: { version: '3.5.0', channel: 'conda-forge', size: '23 KB' },
  tk: { version: '8.6.13', channel: 'conda-forge', size: '3.2 MB', deps: ['libzlib'] },
  tornado: { version: '6.4.1', channel: 'conda-forge', size: '643 KB', deps: ['libgcc'] },
  traitlets: { version: '5.14.3', channel: 'conda-forge', size: '110 KB' },
  tzdata: { version: '2024b', channel: 'conda-forge', size: '122 KB' },
  urllib3: { version: '2.2.3', channel: 'pypi', size: null },
  wcwidth: { version: '0.2.13', channel: 'conda-forge', size: '32 KB' },
  wheel: { version: '0.45.0', channel: 'conda-forge', size: '62 KB' },
  xz: { version: '5.2.6', channel: 'conda-forge', size: '418 KB', deps: ['libgcc'] },
  zeromq: { version: '4.3.5', channel: 'conda-forge', size: '343 KB', deps: ['libsodium', 'libstdcxx'] },
  zstd: { version: '1.5.6', channel: 'conda-forge', size: '555 KB', deps: ['libzlib'] },
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

/** The lock file: every requested package pinned, plus all of its transitive dependencies, A–Z. */
export function resolve(requested: RequestedPackage[]): ResolvedPackage[] {
  const out = new Map<string, ResolvedPackage>()
  const add = (name: string, entry: LockEntry) => {
    if (out.has(name)) return
    out.set(name, { name, version: entry.version, channel: entry.channel, size: entry.size })
    for (const d of entry.deps ?? []) add(d, LOCK[d])
  }
  // Requested pins win over the same package pulled in as a dependency.
  for (const p of requested) out.set(p.name, { name: p.name, ...pick(LOCK[lockKey(p)] ?? unknownEntry(p)) })
  for (const p of requested) for (const d of (LOCK[lockKey(p)] ?? unknownEntry(p)).deps ?? []) add(d, LOCK[d])
  return [...out.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

const pick = ({ version, channel, size }: LockEntry) => ({ version, channel, size })

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
