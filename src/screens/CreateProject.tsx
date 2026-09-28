import { CodeXml, FolderOpen, LayoutPanelTop } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FormField, NAME_PATTERN, PackagesEditor, PlatformsField } from '@/components/form/fields'
import { TomlEditor } from '@/components/TomlEditor'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { RequestedPackage } from '@/data/sample'
import { thisMachinePlatform } from '@/lib/platforms'
import { draftToToml, parseToml, withTomlName } from '@/lib/toml'
import { notBuilt, useStore } from '@/state/store'

type Mode = 'gui' | 'toml'

const DEFAULT_CHANNELS = ['conda-forge']
const DEFAULT_PACKAGES: RequestedPackage[] = [{ name: 'python', constraint: '>=3.11' }]
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Figma `01c Create Project` 1811:19075: one page, two bodies.
 * `/projects/new` is the form (2309:16943); `?mode=toml` is the pixi.toml editor (2675:8526).
 * Switching mode swaps the body and carries the entries across; Cancel with entries asks first (2671:8341).
 * After Create the form is replaced in history by the new project, so Back can't submit it twice.
 */
export default function CreateProject() {
  const { projects, create } = useStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const mode: Mode = params.get('mode') === 'toml' ? 'toml' : 'gui'
  const machine = useMemo(() => thisMachinePlatform(), [])

  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [platforms, setPlatforms] = useState([machine])
  const [channels, setChannels] = useState(DEFAULT_CHANNELS)
  const [requested, setRequested] = useState(DEFAULT_PACKAGES)
  const blankToml = (n: string) => draftToToml({ name: n, channels: DEFAULT_CHANNELS, platforms: [machine], requested: DEFAULT_PACKAGES })
  const [toml, setToml] = useState(() => blankToml(''))
  const [submitted, setSubmitted] = useState(false)
  const [leavingTo, setLeavingTo] = useState<string | null>(null)
  // Set on a successful Create. Navigation runs as a transition, so without this the form would
  // flash "already exists" for its own new project before the details page replaces it.
  const [created, setCreated] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  /* ---------------- validation ---------------- */

  const trimmed = name.trim()
  const duplicate = !created && projects.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())
  const nameError = !trimmed
    ? submitted
      ? 'Enter a project name.'
      : null
    : duplicate
      ? 'A project with that name already exists.'
      : !NAME_PATTERN.test(trimmed)
        ? 'Use letters, numbers, hyphens, underscores or dots.'
        : null
  const platformsError = mode === 'gui' && submitted && platforms.length === 0 ? 'Add at least one platform.' : null
  const parsed = useMemo(() => parseToml(toml), [toml])
  const tomlError =
    mode !== 'toml' || !submitted
      ? null
      : !parsed.hasWorkspace
        ? 'pixi.toml needs a [workspace] table.'
        : parsed.draft.platforms.length === 0
          ? 'List at least one platform in platforms = [ ].'
          : null

  /* ---------------- leaving ---------------- */

  const dirty =
    !created &&
    (!!trimmed ||
    !!path.trim() ||
    (mode === 'gui'
      ? !same(platforms, [machine]) || !same(requested, DEFAULT_PACKAGES)
      : toml.trim() !== blankToml(name).trim()))

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const leave = (to: string) => (dirty ? setLeavingTo(to) : navigate(to))

  /* ---------------- mode switch ---------------- */

  const switchMode = () => {
    if (mode === 'gui') {
      setToml(draftToToml({ name: trimmed, channels, platforms, requested }))
      setParams({ mode: 'toml' }, { replace: true })
    } else {
      const { draft, dropped } = parseToml(toml)
      if (draft.channels.length) setChannels(draft.channels)
      setPlatforms(draft.platforms)
      setRequested(draft.requested)
      if (!trimmed && draft.name) setName(draft.name)
      setParams({}, { replace: true })
      if (dropped.length) {
        toast.add({
          title: `The form can’t show ${dropped.join(', ')}`,
          description: 'Those tables were left out. Switch back to the pixi.toml editor to add them again.',
          type: 'info',
        })
      }
    }
    setSubmitted(false)
  }

  const onNameChange = (value: string) => {
    setName(value)
    if (mode === 'toml') setToml((t) => withTomlName(t, value.trim()))
  }

  /* ---------------- submit ---------------- */

  const submit = (andInstall: boolean) => {
    setSubmitted(true)
    const tomlInvalid = mode === 'toml' && (!parsed.hasWorkspace || parsed.draft.platforms.length === 0)
    const guiInvalid = mode === 'gui' && platforms.length === 0
    if (!trimmed || nameError || tomlInvalid || guiInvalid) {
      if (!trimmed || nameError) nameRef.current?.focus()
      return
    }
    const draft =
      mode === 'gui'
        ? { name: trimmed, channels, platforms, requested }
        : {
            name: trimmed,
            channels: parsed.draft.channels.length ? parsed.draft.channels : DEFAULT_CHANNELS,
            platforms: parsed.draft.platforms,
            requested: parsed.draft.requested,
          }
    setCreated(true)
    const id = create({ ...draft, path: path.trim() }, andInstall)
    navigate(`/projects/${id}?v=1`, { replace: true })
  }

  // NDS Button always renders type="button", so the form never submits on its own; the buttons call submit().
  const onSubmit = (e: FormEvent) => e.preventDefault()

  return (
    <main className="flex flex-1 flex-col px-12 pt-12">
      <form className="flex flex-1 flex-col gap-5" onSubmit={onSubmit} noValidate>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link to="/" />}
                onClick={(e) => {
                  e.preventDefault()
                  leave('/')
                }}
              >
                Projects
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New project</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex h-9 items-start justify-between gap-4">
          <h1 className="font-bold text-3xl text-foreground">New project</h1>
          <div className="relative w-[200px]">
            <Button type="button" variant="outline" className="w-full justify-start" onClick={switchMode}>
              {mode === 'gui' ? <CodeXml /> : <LayoutPanelTop />}
              {mode === 'gui' ? 'Open in TOML editor' : 'Open in GUI editor'}
            </Button>
            {mode === 'toml' && (
              <p className="absolute top-full mt-0.5 text-muted-foreground text-sm">
                You may lose some data that is not supported in the GUI editor
              </p>
            )}
          </div>
        </div>

        <FormField label="Project name" error={nameError}>
          <Input
            ref={nameRef}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., my-data-project"
            autoComplete="off"
            spellCheck={false}
          />
        </FormField>

        <FormField
          label="Path (optional)"
          description="Where the project folder is created. Leave blank to use Nebi’s default location."
        >
          <div className="relative">
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="e.g., /home/user/projects/my-data-project"
              autoComplete="off"
              spellCheck={false}
              className="pr-10"
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute top-1/2 right-1.5 -translate-y-1/2"
                    aria-label="Choose a folder"
                    onClick={() => notBuilt('The folder picker')}
                  />
                }
              >
                <FolderOpen />
              </TooltipTrigger>
              <TooltipContent>Choose a folder</TooltipContent>
            </Tooltip>
          </div>
        </FormField>

        {mode === 'gui' ? (
          <>
            <PlatformsField
              machine={machine}
              value={platforms}
              onChange={setPlatforms}
              error={platformsError}
            />
            <PackagesEditor requested={requested} onChange={setRequested} />
          </>
        ) : (
          <div className="flex w-[612px] max-w-full flex-col gap-1">
            <TomlEditor value={toml} onChange={setToml} invalid={!!tomlError} describedBy={tomlError ? 'toml-error' : undefined} />
            {tomlError && (
              <p id="toml-error" className="text-destructive-foreground text-xs">
                {tomlError}
              </p>
            )}
          </div>
        )}

        {/* Sticky so Create is always in reach on a long package list. */}
        <footer className="sticky bottom-0 z-10 -mx-12 mt-auto flex items-center justify-between gap-4 border-border border-t bg-canvas px-12 py-4">
          <Button type="button" variant="ghost" onClick={() => leave('/')}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => submit(false)}>
              Create
            </Button>
            <Button onClick={() => submit(true)}>Create and install</Button>
          </div>
        </footer>
      </form>

      <Dialog open={leavingTo != null} onOpenChange={(open) => !open && setLeavingTo(null)}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Discard new project?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground-strong text-sm">Any filled data will be discarded.</p>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>Go back</DialogClose>
            <Button variant="destructive" onClick={() => leavingTo && navigate(leavingTo)}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
