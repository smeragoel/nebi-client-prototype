import type { RequestedPackage } from '@/data/sample'

/** What the Create project form holds. The pixi.toml editor is built from and parsed back into it. */
export type ProjectDraft = {
  name: string
  channels: string[]
  platforms: string[]
  requested: RequestedPackage[]
}

const list = (items: string[]) => `[${items.map((s) => `"${s}"`).join(', ')}]`

export function draftToToml(d: ProjectDraft) {
  const deps = d.requested.map((p) => `${p.name} = "${p.constraint}"`).join('\n')
  return `[workspace]
name = "${d.name}"
channels = ${list(d.channels)}
platforms = ${list(d.platforms)}

[dependencies]
${deps}
`
}

/** Rewrites the `name = "…"` line of the [workspace] table so it follows the Project name field. */
export function withTomlName(toml: string, name: string) {
  let section = ''
  return toml
    .split('\n')
    .map((line) => {
      const header = line.match(/^\s*\[([^\]]+)\]/)
      if (header) section = header[1].trim()
      if ((section === 'workspace' || section === 'project') && /^\s*name\s*=/.test(line)) return `name = "${name}"`
      return line
    })
    .join('\n')
}

export type ParsedToml = {
  draft: Omit<ProjectDraft, 'name'> & { name: string | null }
  /** Has a [workspace] (or older [project]) table. */
  hasWorkspace: boolean
  /** Tables the GUI form can't show, e.g. [tasks] or [feature.test.dependencies]. */
  dropped: string[]
}

const unquote = (s: string) => s.trim().replace(/^["']|["']$/g, '')
const parseList = (s: string) =>
  s
    .replace(/^\s*\[|\]\s*$/g, '')
    .split(',')
    .map(unquote)
    .filter(Boolean)

/**
 * A deliberately small reader for the parts of pixi.toml the GUI form supports:
 * [workspace] name / channels / platforms and [dependencies] / [pypi-dependencies].
 * Good enough for a prototype; the app would use a real TOML parser.
 */
export function parseToml(toml: string): ParsedToml {
  const draft: ParsedToml['draft'] = { name: null, channels: [], platforms: [], requested: [] }
  const dropped: string[] = []
  let hasWorkspace = false
  let section = ''

  for (const raw of toml.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const header = line.match(/^\[([^\]]+)\]$/)
    if (header) {
      section = header[1].trim()
      if (section === 'workspace' || section === 'project') hasWorkspace = true
      else if (section !== 'dependencies' && section !== 'pypi-dependencies') dropped.push(`[${section}]`)
      continue
    }
    const kv = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/)
    if (!kv) continue
    const [, key, value] = kv
    if (section === 'workspace' || section === 'project') {
      if (key === 'name') draft.name = unquote(value)
      else if (key === 'channels') draft.channels = parseList(value)
      else if (key === 'platforms') draft.platforms = parseList(value)
    } else if (section === 'dependencies' || section === 'pypi-dependencies') {
      // `pkg = "1.0"` or `pkg = { version = "1.0", … }`
      const table = value.match(/version\s*=\s*["']([^"']*)["']/)
      draft.requested.push({ name: key, constraint: table ? table[1] : unquote(value) || '*' })
    }
  }
  return { draft, hasWorkspace, dropped }
}
