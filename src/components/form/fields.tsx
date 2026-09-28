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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import type { RequestedPackage } from '@/data/sample'
import { isPlatformName, KNOWN_PLATFORMS, platformLabel } from '@/lib/platforms'
import { cn } from '@/lib/utils'

/** Form pieces shared by Create project (2309:16943) and Create new version (2914:9164). */

export const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/

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
    <Field invalid={!!error} className="w-[612px] max-w-full gap-1">
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
    <Field invalid={!!error} className="w-[612px] max-w-full gap-1">
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

/** Figma `Add Package Row` 2309:16973 + `Packages Table` 2309:16963. */
export function PackagesEditor({
  requested,
  onChange,
  description = 'Add packages to install in this project. Leave the version blank to allow any version.',
  emptyText = 'No packages yet. You can still create an empty project.',
}: {
  requested: RequestedPackage[]
  onChange: (next: RequestedPackage[]) => void
  description?: string
  emptyText?: string
}) {
  const [pkg, setPkg] = useState('')
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
    const c = constraint.trim() || '*'
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
    <>
      <div className="flex w-[612px] max-w-full flex-col gap-2">
        <div className="flex items-start gap-2">
          <Field invalid={!!error} className="flex-1 gap-1">
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
          <Field className="flex-1 gap-1">
            <FieldLabel className="text-foreground">Version</FieldLabel>
            <Input
              value={constraint}
              onChange={(e) => setConstraint(e.target.value)}
              onKeyDown={onEnter}
              placeholder="Version (e.g. >=1.0)"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Button type="button" variant="secondary" size="lg" className="mt-6 h-8" onClick={add}>
            <Plus />
            Add package
          </Button>
        </div>
        {error ? (
          <p className="text-destructive-foreground text-xs" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>

      <section className="flex w-[612px] max-w-full flex-col gap-1" aria-labelledby="packages-label">
        <h2 id="packages-label" className="font-medium text-foreground text-sm">
          Packages
        </h2>
        <Table>
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
      </section>
    </>
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
    <Field invalid={errors.length > 0} className="w-[612px] max-w-full gap-1">
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
