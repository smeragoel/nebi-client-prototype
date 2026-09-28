import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChipsField, FormField, PackagesEditor, PlatformsField } from '@/components/form/fields'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { changeSummary } from '@/data/sample'
import { thisMachinePlatform } from '@/lib/platforms'
import { useStore } from '@/state/store'

const CHANNEL_SUGGESTIONS = ['conda-forge', 'bioconda', 'pytorch', 'nvidia', 'defaults']
const TAG_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/
const DESCRIPTION_SHOWN = 72
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function tagError(tag: string) {
  if (TAG_PATTERN.test(tag)) return null
  if (!/^[A-Za-z]/.test(tag)) return `“${tag}” can’t be used: tags must start with a letter.`
  return `“${tag}” can’t be used: tags use letters, numbers, dots, hyphens and underscores.`
}

/**
 * Figma `Create new version (from version 5)` 2914:9164, a sibling of Create project.
 * `/projects/:id/new-version?from=5`. Environment first, then "About this version" (tags, description).
 * Saving lands on the new version in project details, replacing this page in history.
 */
export default function CreateVersion() {
  const { id } = useParams()
  const [params] = useSearchParams()
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
  const [tags, setTags] = useState(['latest'])
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [leavingTo, setLeavingTo] = useState<string | null>(null)
  const [created, setCreated] = useState(false)
  const descriptionRef = useRef<HTMLInputElement>(null)

  const summary = base ? changeSummary(base.requested, requested) : []
  const suggestion = summary.length ? capitalise(summary.join(', ')) : null

  const dirty =
    !created &&
    !!base &&
    (!same(platforms, base.platforms) ||
      !same(channels, base.channels) ||
      !same(requested, base.requested) ||
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
  const platformsError = submitted && platforms.length === 0 ? 'Add at least one platform.' : null
  const tagsInvalid = tags.some((t) => tagError(t))

  const submit = (andInstall: boolean) => {
    setSubmitted(true)
    if (!description.trim() || platforms.length === 0 || tagsInvalid) {
      if (!description.trim()) descriptionRef.current?.focus()
      return
    }
    setCreated(true)
    const n = createVersion(
      project.id,
      { base: base.number, platforms, channels, requested, tags, description: description.trim() },
      andInstall,
    )
    navigate(`/projects/${project.id}?v=${n}`, { replace: true })
  }

  const onSubmit = (e: FormEvent) => e.preventDefault()

  return (
    <main className="flex flex-1 flex-col px-9 pt-9">
      <form className="flex flex-1 flex-col gap-5" onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-1.5">
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
          <h1 className="font-bold text-3xl text-foreground">New version of {project.name}</h1>
          <p className="text-muted-foreground-strong text-sm">
            Starts from version {base.number}’s environment. Version {base.number} stays as it is.
          </p>
        </div>

        <section className="flex flex-col gap-5" aria-labelledby="environment-heading">
          <h2 id="environment-heading" className="font-semibold text-base text-foreground">
            Environment
          </h2>
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
          <PackagesEditor
            requested={requested}
            onChange={setRequested}
            description={`Add or remove packages. The table starts with version ${base.number}’s packages. Leave the version blank to allow any version.`}
            emptyText="No packages. The new version would be an empty environment."
          />
        </section>

        <section className="flex flex-col gap-5" aria-labelledby="about-heading">
          <h2 id="about-heading" className="font-semibold text-base text-foreground">
            About this version
          </h2>
          <ChipsField
            label="Tags (optional)"
            value={tags}
            onChange={setTags}
            suggestions={[...new Set(project.versions.flatMap((v) => v.tags))]}
            placeholder="Add a tag"
            description="A tag stays with this version until a newer version uses the same tag. latest does this automatically."
            invalid={tagError}
          />
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
            <p className="-mt-3 flex items-center gap-2 text-muted-foreground-strong text-sm">
              Suggested from your changes:
              <Button type="button" variant="link" size="xs" className="h-auto px-0" onClick={() => setDescription(suggestion)}>
                {suggestion}
              </Button>
            </p>
          )}
        </section>

        {/* Sticky so Create is always in reach on a long package list. */}
        <footer className="sticky bottom-0 z-10 -mx-9 mt-auto flex items-center justify-between gap-4 border-border border-t bg-canvas px-9 py-4">
          <Button type="button" variant="ghost" onClick={() => leave(back)}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => submit(false)}>
              Create version
            </Button>
            <Button onClick={() => submit(true)}>Create and install</Button>
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
