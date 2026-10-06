import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import figmaMap from '@/figma-map.json'

const FIGMA_FILE = `https://www.figma.com/design/${figmaMap.fileKey}/Nebi-UI`

// Index of screens this prototype will cover. Add a `path` once a screen is built.
const screens: { name: keyof typeof figmaMap.screens; label: string; path?: string }[] = [
  { name: 'ProjectsList', label: 'Projects list', path: '/?scenario=default' },
  { name: 'RemotesWrap', label: 'Projects list: several remotes wrap in the cell', path: '/?scenario=default' },
  { name: 'EmptyNotConnected', label: 'Projects list: empty, not connected to a server', path: '/?scenario=empty-not-connected' },
  { name: 'EmptyConnected', label: 'Projects list: empty, connected to a server', path: '/?scenario=empty-connected' },
  { name: 'NewProjectMenu', label: 'New project split button', path: '/' },
  { name: 'CreateProject', label: 'Create project: form', path: '/projects/new' },
  { name: 'CreateProjectToml', label: 'Create project: pixi.toml editor', path: '/projects/new?mode=toml' },
  { name: 'DiscardNewProject', label: 'Discard new project (Cancel with entries)', path: '/projects/new' },
  { name: 'ProjectDetailsInstalled', label: 'Project details: installed version selected', path: '/projects/project-1?v=7' },
  { name: 'ProjectDetailsOtherVersion', label: 'Project details: other version selected', path: '/projects/project-1?v=5' },
  { name: 'VersionRow', label: 'Version row (live component, used in the rail)', path: '/projects/project-1' },
  { name: 'Installing', label: 'Installing (Install on version 5)', path: '/projects/project-1?v=5' },
  { name: 'InSync', label: 'In sync (Push)', path: '/projects/project-1' },
  { name: 'CreateNewVersion', label: 'Create new version (from version 7)', path: '/projects/project-1/new-version?from=7' },
  { name: 'OlderBaseConfirm', label: 'Older-base confirmation (Create new version on v5)', path: '/projects/project-1?v=5' },
  { name: 'JustCreated', label: 'Version just created (save the Create new version page)', path: '/projects/project-1/new-version?from=5' },
  { name: 'CompareVersions', label: 'Compare versions (installed against the server’s latest)', path: '/projects/project-1/compare' },
  { name: 'PublishModal', label: 'Publish (simplified, 2026-09-28)', path: '/projects/project-1?v=5' },
  { name: 'ServerAhead', label: 'Server ahead', path: '/projects/project-pulled-from-server' },
  { name: 'UninstallConfirm', label: 'Uninstall confirmation', path: '/projects/project-1?v=7' },
  { name: 'VersionRowRedesign', label: 'Version row layout pass (2026-09-25 proposal, not used)' },
  { name: 'PublishAfterSave', label: 'Publish: after save, per-registry results' },
  { name: 'ServerConnected', label: 'Server (connected), row menu: Pull project, Manage access', path: '/server?state=connected' },
  { name: 'PullAndInstall', label: 'Pull and install: local name', path: '/server?dialog=pull-install&project=ml-baseline' },
  { name: 'PullToast', label: 'Pull and install job toast (pull ml-baseline to see it run)', path: '/server' },
  { name: 'ManageConnection', label: 'Manage connection', path: '/server?dialog=manage' },
  { name: 'DisconnectConfirm', label: 'Disconnect confirmation (Manage connection → Disconnect)', path: '/server?dialog=manage' },
  { name: 'ServerDisconnected', label: 'Server (disconnected)', path: '/server?state=disconnected' },
  { name: 'ConnectServer', label: 'Connect server', path: '/server?state=disconnected&dialog=connect' },
  { name: 'ShareDialog', label: 'Share (client: Manage access)', path: '/server?dialog=share&project=ml-baseline' },
  { name: 'ShareRoleMenu', label: 'Share: role menu', path: '/server?dialog=share&project=ml-baseline' },
  { name: 'ShareAdding', label: 'Share: adding people (type “jo”)', path: '/server?dialog=share&project=ml-baseline' },
  { name: 'ShareToasts', label: 'Share toasts with Undo', path: '/server?dialog=share&project=ml-baseline' },
  { name: 'ServerUi', label: 'Server UI (administrative, share only)', path: '/server-ui' },
  { name: 'Jobs', label: 'Jobs list', path: '/jobs' },
  { name: 'JobsProjectFilter', label: 'Jobs: Project filter with search', path: '/jobs' },
  { name: 'JobsRowMenu', label: 'Jobs: row menu (View project, Cancel job on a running job)', path: '/jobs' },
  { name: 'JobFailed', label: 'Job details: failed', path: '/jobs/9a7d4e2c-1f36-4b88-a0c5-e62b9f0d8471' },
  { name: 'JobRunning', label: 'Job details: running (log streams, Cancel job)', path: '/jobs/b3e21d07-6c4f-4a9b-8f12-7d95e0c43a68' },
]

export default function Start() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-foreground">Nebi client prototype</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every screen in scope, what's built, and its Figma frame. Designs as of 2026-09-29. Reloading a page resets the sample data.
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
