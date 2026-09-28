import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChipsField, FormField, FormSection, PackagesEditor, PAGE_COLUMN, PlatformsField, tagError } from '@/components/form/fields'
import { EditorModeSwitch, TomlEditor } from '@/components/TomlEditor'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { changeSummary } from '@/data/sample'
import { thisMachinePlatform } from '@/lib/platforms'
import { draftToToml, parseToml } from '@/lib/toml'
import { cn } from '@/lib/utils'
import { useStore } from '@/state/store'

type Mode = 'gui' | 'toml'

const CHANNEL_SUGGESTIONS = ['conda-forge', 'bioconda', 'pytorch', 'nvidia', 'defaults']
const DESCRIPTION_SHOWN = 72
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Figma `Create new version (from version 5)` 3006:11933, laid out as section rows like
 * Create project. `/projects/:id/new-version?from=5`; `&mode=toml` is the pixi.toml editor
 * (3011:11986), which starts from the base version's pixi.toml. "About this version" (tags,
 * description) is the same in both modes. Saving lands on the new version in project details,
 * replacing this page in history.
 */
export default function CreateVersion() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const mode: Mode = params.get('mode') === 'toml' ? 'toml' : 'gui'
  const { projects, createVersion } = useStore()
  const navigate = useNavigate()
  const machine = useMemo(() => thisMachinePlatform(), [])
  const project = projects.find((p) => p.id === id)
  const base =
    project?.versions.find((v) => v.number === Number(params.get('from'))) ??
    project?.versions.reduce((a, b) => (b.number > a.number ? b : a))

  const [platforms, setPlatforms] = useState(base?.platforms ?? [])
  const [channels, setChannels] = useState(base?.channels ?? [])
  const [requested, setRequested] = useState(base?.requested ?? [])
  const baseToml = () =>
    draftToToml({ name: project?.name ?? '', channels: base?.channels ?? [], platforms: base?.platforms ?? [], requested: base?.requested ?? [] })
  const [toml, setToml] = useState(baseToml)
  const [tags, setTags] = useState(['latest'])
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [leavingTo, setLeavingTo] = useState<string | null>(null)
  const [created, setCreated] = useState(false)
  const descriptionRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => parseToml(toml), [toml])
  // In pixi.toml mode the environment is whatever the editor holds.
  const env =
    mode === 'gui'
      ? { platforms, channels, requested }
      : { platforms: parsed.draft.platforms, channels: parsed.draft.channels, requested: parsed.draft.requested }

  const summary = base ? changeSummary(base.requested, env.requested) : []
  const suggestion = summary.length ? capitalise(summary.join(', ')) : null

  const dirty =
    !created &&
    !!base &&
    (!same(env.platforms, base.platforms) ||
      !same(env.channels, base.channels) ||
      !same(env.requested, base.requested) ||
      (mode === 'toml' && toml.trim() !== baseToml().trim()) ||
      !same(tags, ['latest']) ||
      !!description.trim())

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!project || !base) {
    return (
      <main className="flex flex-col gap-3 p-9">
        <h1 className="font-bold text-3xl text-foreground">Project not found</h1>
        <Link to="/" className="text-sm underline underline-offset-4">
          Back to projects
        </Link>
      </main>
    )
  }

  const back = `/projects/${project.id}?v=${base.number}`
  const leave = (to: string) => (dirty ? setLeavingTo(to) : navigate(to))

  const descriptionError = submitted && !description.trim() ? 'Enter a description.' : null
  const platformsError = mode === 'gui' && submitted && platforms.length === 0 ? 'Add at least one platform.' : null
  const tomlError =
    mode !== 'toml' || !submitted
      ? null
      : !parsed.hasWorkspace
        ? 'pixi.toml needs a [workspace] table.'
        : parsed.draft.platforms.length === 0
          ? 'List at least one platform in platforms = [ ].'
          : null
  const tagsInvalid = tags.some((t) => tagError(t))

  /* ---------------- mode switch ---------------- */

  const setMode = (next: Mode) => {
    const nextParams = new URLSearchParams(params)
    if (next === 'toml') nextParams.set('mode', 'toml')
    else nextParams.delete('mode')
    setParams(nextParams, { replace: true })
  }

  const switchMode = () => {
    if (mode === 'gui') {
      setToml(draftToToml({ name: project.name, channels, platforms, requested }))
      setMode('toml')
    } else {
      const { draft, dropped } = parsed
      if (draft.channels.length) setChannels(draft.channels)
      setPlatforms(draft.platforms)
      setRequested(draft.requested)
      setMode('gui')
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

  /* ---------------- submit ---------------- */

  const submit = (andInstall: boolean) => {
    setSubmitted(true)
    const tomlInvalid = mode === 'toml' && (!parsed.hasWorkspace || parsed.draft.platforms.length === 0)
    const guiInvalid = mode === 'gui' && platforms.length === 0
    if (!description.trim() || tomlInvalid || guiInvalid || tagsInvalid) {
      if (!description.trim()) descriptionRef.current?.focus()
      return
    }
    setCreated(true)
    const n = createVersion(
      project.id,
      {
        base: base.number,
        platforms: env.platforms,
        channels: env.channels.length ? env.channels : base.channels,
        requested: env.requested,
        tags,
        description: description.trim(),
      },
      andInstall,
    )
    navigate(`/projects/${project.id}?v=${n}`, { replace: true })
  }

  const onSubmit = (e: FormEvent) => e.preventDefault()

  return (
    <main className="flex flex-1 flex-col px-9 pt-9">
      <form className="flex flex-1 flex-col" onSubmit={onSubmit} noValidate>
        <div className={cn(PAGE_COLUMN, 'flex flex-col gap-1.5 pb-6')}>
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
                <BreadcrumbLink
                  render={<Link to={back} />}
                  onClick={(e) => {
                    e.preventDefault()
                    leave(back)
                  }}
                >
                  {project.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>New version</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h1 className="font-bold text-3xl text-foreground">New version of {project.name}</h1>
              <p className="text-muted-foreground-strong text-sm">
                Starts from version {base.number}’s environment. Version {base.number} stays as it is.
              </p>
            </div>
            <EditorModeSwitch mode={mode} onSwitch={switchMode} />
          </div>
        </div>

        <div className={PAGE_COLUMN}>
          {mode === 'gui' ? (
            <>
              <FormSection id="environment" title="Environment" intro="The platforms and channels pixi solves this version for.">
                <PlatformsField
                  machine={machine}
                  value={platforms}
                  onChange={setPlatforms}
                  error={platformsError}
                  description={`Starts with version ${base.number}’s platforms. For uncommon platforms, type pixi’s name (e.g. linux-ppc64le).`}
                />
                <ChipsField
                  label="Channels"
                  value={channels}
                  onChange={setChannels}
                  suggestions={CHANNEL_SUGGESTIONS}
                  placeholder="Add a channel"
                  description="conda-forge works for most projects."
                  normalize={(s) => s.trim().toLowerCase()}
                />
              </FormSection>
              <FormSection
                id="packages"
                title="Packages"
                intro={`Starts with version ${base.number}’s packages. Leave the version blank to allow any version.`}
              >
                <PackagesEditor
                  requested={requested}
                  onChange={setRequested}
                  labelledBy="packages-heading"
                  emptyText="No packages. The new version would be an empty environment."
                />
              </FormSection>
            </>
          ) : (
            <FormSection
              id="toml"
              title="pixi.toml"
              intro={`Starts with version ${base.number}’s pixi.toml. Tags and the description aren’t part of pixi.toml, so they’re set below.`}
            >
              <div className="flex flex-col gap-1">
                <TomlEditor value={toml} onChange={setToml} invalid={!!tomlError} describedBy={tomlError ? 'toml-error' : undefined} />
                {tomlError && (
                  <p id="toml-error" className="text-destructive-foreground text-xs">
                    {tomlError}
                  </p>
                )}
              </div>
            </FormSection>
          )}

          <FormSection id="about" title="About this version" intro="Shown in the version list and on the version’s page.">
            <ChipsField
              label="Tags (optional)"
              value={tags}
              onChange={setTags}
              suggestions={[...new Set(project.versions.flatMap((v) => v.tags))]}
              placeholder="Add a tag"
              description="A tag stays with this version until a newer version uses the same tag. latest does this automatically."
              invalid={tagError}
            />
            <div className="flex flex-col gap-3">
              <FormField
                label="Description"
                error={descriptionError}
                description={`Required. The first ${DESCRIPTION_SHOWN} characters show in the version list.`}
              >
                <Input
                  ref={descriptionRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Swapped tensorflow for scikit-learn"
                  autoComplete="off"
                />
              </FormField>
              {suggestion && description !== suggestion && (
                <p className="flex items-center gap-2 text-muted-foreground-strong text-sm">
                  Suggested from your changes:
                  <Button type="button" variant="link" size="xs" className="h-auto px-0" onClick={() => setDescription(suggestion)}>
                    {suggestion}
                  </Button>
                </p>
              )}
            </div>
          </FormSection>
        </div>

        {/* Sticky so Create is always in reach on a long package list. */}
        <footer className="sticky bottom-0 z-10 -mx-9 mt-auto bg-canvas px-9">
          <div className={cn(PAGE_COLUMN, 'flex items-center justify-between gap-4 border-border border-t py-3')}>
            <Button type="button" variant="ghost" onClick={() => leave(back)}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => submit(false)}>
                Create version
              </Button>
              <Button onClick={() => submit(true)}>Create and install</Button>
            </div>
          </div>
        </footer>
      </form>

      <Dialog open={leavingTo != null} onOpenChange={(open) => !open && setLeavingTo(null)}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Discard new version?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground-strong text-sm">
            Your changes are discarded. Version {base.number} stays as it is.
          </p>
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
