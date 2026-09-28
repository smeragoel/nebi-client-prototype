import { Plus, Trash2 } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from '@/components/ui/combobox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import type { RequestedPackage } from '@/data/sample'
import { isPlatformName, KNOWN_PLATFORMS, platformLabel } from '@/lib/platforms'
import { cn } from '@/lib/utils'

/**
 * Form pieces shared by Create project (3006:11876, pixi.toml 3011:11906) and
 * Create new version (3006:11933, pixi.toml 3011:11986). Fields fill their section's column.
 */

export const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/

const TAG_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/

export function tagError(tag: string) {
  if (TAG_PATTERN.test(tag)) return null
  if (!/^[A-Za-z]/.test(tag)) return `“${tag}” can’t be used: tags must start with a letter.`
  return `“${tag}” can’t be used: tags use letters, numbers, dots, hyphens and underscores.`
}

/** The column every create page sits in: header, section rows and footer share it. */
export const PAGE_COLUMN = 'mx-auto w-full max-w-[1080px]'

/**
 * One section row (2026-09-28 layout pass): a 280px intro with the section title and one line of
 * context, then the fields. Rows are divided by a rule; below 900px the intro stacks above its fields.
 */
export function FormSection({
  id,
  title,
  intro,
  children,
}: {
  id: string
  title: string
  intro: ReactNode
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="grid grid-cols-[280px_minmax(0,1fr)] gap-12 border-border border-t py-6 first:border-t-0 max-[900px]:grid-cols-1 max-[900px]:gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-heading`} className="font-semibold text-base text-foreground">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm">{intro}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  )
}

export function FormField({
  label,
  description,
  error,
  children,
}: {
  label: string
  description?: string
  error?: string | null
  children: ReactNode
}) {
  return (
    <Field invalid={!!error} className="w-full min-w-0 gap-1">
      <FieldLabel className="text-foreground">{label}</FieldLabel>
      {children}
      {error ? (
        <FieldError match className="text-xs">
          {error}
        </FieldError>
      ) : (
        description && <FieldDescription>{description}</FieldDescription>
      )}
    </Field>
  )
}

/** Figma `Platforms field` 2917:25100: multi-select chips, this machine first, any pixi name can be typed in. */
export function PlatformsField({
  machine,
  value,
  onChange,
  error,
  description = 'Your machine’s platform is added. For uncommon platforms, type pixi’s name (e.g. linux-ppc64le).',
}: {
  machine: string
  value: string[]
  onChange: (value: string[]) => void
  error: string | null
  description?: string
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const known = [machine, ...Object.keys(KNOWN_PLATFORMS).filter((p) => p !== machine)]
  const custom = value.filter((p) => !known.includes(p))
  const typed = q && isPlatformName(q) && !known.includes(q) && !custom.includes(q) ? [q] : []
  // Filtered here rather than by Base UI so the "Add …" row and the matches always agree.
  const items = [
    ...[...known, ...custom].filter((id) => !q || platformLabel(id, machine).toLowerCase().includes(q)),
    ...typed,
  ]

  return (
    <Field invalid={!!error} className="w-full min-w-0 gap-1">
      <FieldLabel className="text-foreground">Platforms</FieldLabel>
      <Combobox
        multiple
        items={items}
        filter={null}
        autoHighlight
        value={value}
        onValueChange={(next) => {
          onChange(next)
          setQuery('')
        }}
        inputValue={query}
        onInputValueChange={setQuery}
        itemToStringLabel={(id: string) => platformLabel(id, machine)}
      >
        <ComboboxChips>
          <ComboboxValue>
            {(selected: string[]) =>
              selected.map((id) => <ComboboxChip key={id}>{platformLabel(id, machine)}</ComboboxChip>)
            }
          </ComboboxValue>
          <ComboboxInput placeholder={value.length ? '' : 'Add a platform'} />
        </ComboboxChips>
        <ComboboxContent>
          <ComboboxEmpty>No match. Type pixi’s name for it, e.g. linux-ppc64le.</ComboboxEmpty>
          <ComboboxList>
            {(id: string) => (
              <ComboboxItem key={id} value={id}>
                {typed.includes(id) ? `Add “${id}”` : platformLabel(id, machine)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {error ? (
        <FieldError match className="text-xs">
          {error}
        </FieldError>
      ) : (
        <FieldDescription>{description}</FieldDescription>
      )}
    </Field>
  )
}

/** Match-spec operators for the add row. The version is left blank to allow any version. */
const VERSION_OPERATORS = [
  ['>=', 'at least'],
  ['==', 'exactly'],
  ['<=', 'at most'],
  ['>', 'newer than'],
  ['<', 'older than'],
  ['!=', 'anything but'],
  ['~=', 'compatible with'],
] as const
type VersionOperator = (typeof VERSION_OPERATORS)[number][0]

/**
 * The add row + packages table that fill the Packages section. The section's intro carries the
 * helper text and its heading labels the table, so neither repeats here.
 */
export function PackagesEditor({
  requested,
  onChange,
  labelledBy,
  emptyText = 'No packages yet. You can still create an empty project.',
}: {
  requested: RequestedPackage[]
  onChange: (next: RequestedPackage[]) => void
  labelledBy: string
  emptyText?: string
}) {
  const [pkg, setPkg] = useState('')
  const [operator, setOperator] = useState<VersionOperator>('>=')
  const [constraint, setConstraint] = useState('')
  const [error, setError] = useState<string | null>(null)
  const pkgRef = useRef<HTMLInputElement>(null)

  const add = () => {
    const n = pkg.trim().toLowerCase()
    if (!n) {
      setError('Enter a package name.')
      pkgRef.current?.focus()
      return
    }
    if (!NAME_PATTERN.test(n)) {
      setError('Package names use letters, numbers, hyphens, underscores or dots.')
      pkgRef.current?.focus()
      return
    }
    const version = constraint.trim()
    // An operator typed into the field (e.g. "<2" or "3.11.*" with "==") wins over the dropdown.
    const c = !version ? '*' : /^[<>=!~]/.test(version) ? version : `${operator}${version}`
    const exists = requested.some((p) => p.name === n)
    onChange(exists ? requested.map((p) => (p.name === n ? { name: n, constraint: c } : p)) : [...requested, { name: n, constraint: c }])
    if (exists) toast.add({ title: `Updated ${n}`, description: `Version constraint is now ${c}.` })
    setPkg('')
    setConstraint('')
    setError(null)
    pkgRef.current?.focus()
  }

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {/* Figma 3017:15835: Package name · operator (no label of its own) · Version · Add package. */}
        <div className="flex items-end gap-2">
          <Field invalid={!!error} className="w-[200px] shrink-0 gap-1">
            <FieldLabel className="text-foreground">Package name</FieldLabel>
            <Input
              ref={pkgRef}
              value={pkg}
              onChange={(e) => {
                setPkg(e.target.value)
                setError(null)
              }}
              onKeyDown={onEnter}
              placeholder="Package name"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Select value={operator} onValueChange={(v) => v && setOperator(v as VersionOperator)}>
            <SelectTrigger className="w-20 shrink-0" aria-label="Version operator">
              <SelectValue>{(v: VersionOperator) => v}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start" className="min-w-48">
              {VERSION_OPERATORS.map(([op, meaning]) => (
                <SelectItem key={op} value={op}>
                  <span className="w-6 shrink-0 font-mono">{op}</span>
                  <span className="text-muted-foreground">{meaning}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Field className="min-w-0 flex-1 gap-1">
            <FieldLabel className="text-foreground">Version</FieldLabel>
            <Input
              value={constraint}
              onChange={(e) => setConstraint(e.target.value)}
              onKeyDown={onEnter}
              placeholder="e.g. 1.0"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Button type="button" variant="secondary" size="lg" className="h-8 shrink-0" onClick={add}>
            <Plus />
            Add package
          </Button>
        </div>
        {error && (
          <p className="text-destructive-foreground text-xs" role="alert">
            {error}
          </p>
        )}
      </div>

      <Table aria-labelledby={labelledBy}>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Version constraint</TableHead>
            <TableHead className="w-20">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requested.map((p) => (
            <TableRow key={p.name}>
              <TableCell className="h-10 py-2">{p.name}</TableCell>
              <TableCell className="h-10 py-2">{p.constraint}</TableCell>
              <TableCell className="h-10 py-1 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => onChange(requested.filter((r) => r.name !== p.name))}
                >
                  <Trash2 />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {requested.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Free-text chips with optional suggestions (Channels and Tags on Create new version, 2914:9164).
 * Enter adds what's typed. `invalid` returns an error for a chip, which then shows in red with
 * the error under the field (the "2025-q3" state).
 */
export function ChipsField({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder,
  description,
  invalid,
  normalize = (s) => s.trim(),
}: {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  suggestions?: string[]
  placeholder: string
  description: string
  invalid?: (chip: string) => string | null
  normalize?: (s: string) => string
}) {
  const [query, setQuery] = useState('')
  const typed = normalize(query)
  const q = typed.toLowerCase()
  const known = [...new Set([...suggestions, ...value])]
  const extra = typed && !known.includes(typed) ? [typed] : []
  const items = [...known.filter((s) => !q || s.toLowerCase().includes(q)), ...extra]
  const errors = value.map((v) => invalid?.(v)).filter((e): e is string => !!e)

  return (
    <Field invalid={errors.length > 0} className="w-full min-w-0 gap-1">
      <FieldLabel className="text-foreground">{label}</FieldLabel>
      <Combobox
        multiple
        items={items}
        filter={null}
        autoHighlight
        value={value}
        onValueChange={(next) => {
          onChange(next)
          setQuery('')
        }}
        inputValue={query}
        onInputValueChange={setQuery}
      >
        <ComboboxChips>
          <ComboboxValue>
            {(selected: string[]) =>
              selected.map((chip) => (
                <ComboboxChip
                  key={chip}
                  className={cn(invalid?.(chip) && 'border-destructive-foreground text-destructive-foreground')}
                >
                  {chip}
                </ComboboxChip>
              ))
            }
          </ComboboxValue>
          <ComboboxInput placeholder={placeholder} />
        </ComboboxChips>
        {items.length > 0 && (
          <ComboboxContent>
            <ComboboxEmpty>Type a name and press Enter.</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {extra.includes(item) ? `Add “${item}”` : item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        )}
      </Combobox>
      {errors.map((e) => (
        <FieldError key={e} match className="text-xs">
          {e}
        </FieldError>
      ))}
      <FieldDescription>{description}</FieldDescription>
    </Field>
  )
}
