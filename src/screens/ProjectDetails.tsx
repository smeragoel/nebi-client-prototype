import { Copy, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { VersionPanel } from '@/components/details/VersionPanel'
import { VersionRail } from '@/components/details/VersionRail'
import { railVersions } from '@/components/details/sync'
import { ShareDialog } from '@/components/server/ShareDialog'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { notBuilt, useStore } from '@/state/store'

/**
 * Project details: one screen, no tabs (2026-09-22). Rail on the left picks a version,
 * the panel on the right shows it. The selected version lives in `?v=` so links can point at one.
 */
export default function ProjectDetails() {
  const { id } = useParams()
  const { projects, serverProjects } = useStore()
  const [params, setParams] = useSearchParams()
  const [sharing, setSharing] = useState(false)
  const project = projects.find((p) => p.id === id)

  if (!project) {
    return (
      <main className="flex flex-col gap-3 p-9">
        <h1 className="font-bold text-3xl text-foreground">Project not found</h1>
        <Link to="/" className="text-sm underline underline-offset-4">
          Back to projects
        </Link>
      </main>
    )
  }

  // Access lives on the server copy, matched by name as on the Server screen.
  const serverProject = serverProjects.find((sp) => sp.name === (project.serverName ?? project.name))

  const all = railVersions(project)
  // Default: the installed version, else the newest one on this machine.
  const fallback = project.installedVersion ?? all.find((v) => !v.serverOnly)?.number ?? all[0].number
  const requested = Number(params.get('v'))
  const selected = all.find((v) => v.number === requested) ?? all.find((v) => v.number === fallback) ?? all[0]

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(project.path)
      toast.add({ title: 'Path copied', description: project.path, type: 'success' })
    } catch {
      toast.add({ title: 'Couldn’t copy the path', description: 'Your browser blocked clipboard access.', type: 'error' })
    }
  }

  return (
    // Fills the window under the 56px app header (h-14) so the rail and the panel scroll separately.
    <main className="flex h-[calc(100dvh-3.5rem)] min-h-[560px] flex-col gap-6 px-9 pt-9">
      <header className="flex flex-col gap-1.5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/" />}>Projects</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{project.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-bold text-3xl text-foreground">{project.name}</h1>
          <Button variant="secondary" size="sm" onClick={() => (serverProject ? setSharing(true) : notBuilt('Share'))}>
            <Share2 />
            Share
          </Button>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          {project.path}
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon-xs" onClick={copyPath} aria-label="Copy path" />}>
              <Copy />
            </TooltipTrigger>
            <TooltipContent>Copy path</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-stretch gap-4">
        <VersionRail
          project={project}
          selected={selected.number}
          onSelect={(n) => setParams({ v: String(n) }, { replace: true })}
        />
        <div className="w-px shrink-0 bg-border" aria-hidden />
        {/* Keyed so picking another version starts its details at the top. */}
        <div key={selected.number} className="-mr-9 -ml-1 flex min-w-0 flex-1 overflow-y-auto pr-9 pb-9 pl-1">
          <VersionPanel project={project} version={selected} serverOnly={selected.serverOnly} />
        </div>
      </div>

      {serverProject && <ShareDialog project={serverProject} open={sharing} onOpenChange={setSharing} />}
    </main>
  )
}
