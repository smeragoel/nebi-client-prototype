import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import figmaMap from '@/figma-map.json'

const FIGMA_FILE = `https://www.figma.com/design/${figmaMap.fileKey}/Nebi-UI`

// Index of screens this prototype will cover. Add a `path` once a screen is built.
const screens: { name: keyof typeof figmaMap.screens; label: string; path?: string }[] = [
  { name: 'ProjectsList', label: 'Projects list', path: '/' },
  { name: 'CreateProject', label: 'Create project' },
  { name: 'ProjectDetailsInstalled', label: 'Project details: installed version selected', path: '/projects/project-1?v=7' },
  { name: 'ProjectDetailsOtherVersion', label: 'Project details: other version selected', path: '/projects/project-1?v=5' },
  { name: 'VersionRowRedesign', label: 'Version row layout pass (used in the rail)', path: '/projects/project-1' },
  { name: 'Installing', label: 'Installing (Install this version)', path: '/projects/project-1?v=5' },
  { name: 'InSync', label: 'In sync (Push)', path: '/projects/project-1' },
  { name: 'CreateNewVersion', label: 'Create new version' },
  { name: 'OlderBaseConfirm', label: 'Older-base confirmation (Create new version on v5)', path: '/projects/project-1?v=5' },
  { name: 'PublishModal', label: 'Publish' },
  { name: 'ServerAhead', label: 'Server ahead', path: '/projects/project-pulled-from-server' },
  { name: 'UninstallConfirm', label: 'Uninstall confirmation', path: '/projects/project-1?v=7' },
]

export default function Start() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-foreground">Nebi client prototype</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every screen in scope, what's built, and its Figma frame. Designs as of 2026-09-25. Reloading a page resets the sample data.
      </p>
      <ul className="mt-8 divide-y divide-border rounded-md border border-border">
        {screens.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-4 px-4 py-3">
            {s.path ? (
              <Link to={s.path} className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
                {s.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
            )}
            <span className="flex items-center gap-3">
              {s.path ? <Badge>Built</Badge> : <Badge variant="outline">Not built</Badge>}
              <a
                className="text-sm text-primary underline-offset-4 hover:underline"
                href={`${FIGMA_FILE}?node-id=${figmaMap.screens[s.name].replace(':', '-')}`}
                target="_blank"
                rel="noreferrer"
              >
                Figma
              </a>
            </span>
          </li>
        ))}
      </ul>
    </main>
  )
}
