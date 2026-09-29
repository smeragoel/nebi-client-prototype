/**
 * Sample data for the Server screens (Figma `02 Server` 1811:17495). Access follows the
 * server's Casbin model: per-project read / write / admin, shown as Can view / Can edit /
 * Owner. Groups show as teams. Sharing is user-or-team only, no links (decision 2026-09-15).
 */

export type Principal =
  | { kind: 'user'; id: string; name: string; email: string; initials: string }
  | { kind: 'team'; id: string; name: string; members: number; initials: string }

export type Role = 'owner' | 'edit' | 'view'

export type Grant = { principal: Principal; role: Role }

export type ServerProject = {
  id: string
  name: string
  latestVersion: number
  namespace: string
  access: Grant[]
}

export type Connection = {
  url: string
  auth: 'none' | 'token'
  /** Who the token signs in as. Identity belongs to the connection, not the app (02a note 1). */
  signedInAs: string
}

export const DEFAULT_CONNECTION: Connection = { url: 'nebi.openteams.ai', auth: 'token', signedInAs: 'sam@openteams.ai' }

const user = (id: string, name: string, initials: string): Principal => ({
  kind: 'user', id, name, email: `${id}@openteams.ai`, initials,
})
const team = (name: string, members: number, initials: string): Principal => ({
  kind: 'team', id: name, name, members, initials,
})

export const SAM = user('sam', 'Sam Garcia', 'SG')

/** Everyone who has signed in to the server, so can be shared with. Values from 2510:21781. */
export const DIRECTORY: Principal[] = [
  SAM,
  user('alex', 'Alex Kim', 'AK'),
  user('jordan', 'Jordan Lee', 'JL'),
  user('joaquin', 'Joaquin Ruiz', 'JR'),
  user('priya', 'Priya Shah', 'PS'),
  team('team-jatic', 6, 'TJ'),
  team('team-jobs', 4, 'JO'),
  team('team-nebi', 8, 'TN'),
]

const who = (id: string) => DIRECTORY.find((p) => p.id === id)!
const owner: Grant = { principal: SAM, role: 'owner' }

/**
 * The first four rows are the Figma list (2512:15552). The last three are the local sample
 * projects that already have a server copy (their `serverVersion`), so the two lists agree.
 */
export const INITIAL_SERVER_PROJECTS: ServerProject[] = [
  {
    id: 'ml-baseline', name: 'ml-baseline', latestVersion: 4, namespace: 'Personal',
    access: [owner, { principal: who('team-jatic'), role: 'edit' }, { principal: who('alex'), role: 'view' }],
  },
  { id: 'jatic-cosmos', name: 'jatic-cosmos', latestVersion: 2, namespace: 'team-jatic', access: [owner, { principal: who('team-jatic'), role: 'edit' }] },
  { id: 'nebi-chat', name: 'nebi-chat', latestVersion: 7, namespace: 'Personal', access: [owner] },
  { id: 'oci-test', name: 'oci-test', latestVersion: 1, namespace: 'team-nebi', access: [owner, { principal: who('team-nebi'), role: 'view' }] },
  { id: 'project-1', name: 'Project_1', latestVersion: 6, namespace: 'Personal', access: [owner, { principal: who('alex'), role: 'edit' }] },
  {
    id: 'project-pulled-from-server', name: 'Project_pulled_from_server', latestVersion: 3, namespace: 'team-nebi',
    access: [owner, { principal: who('alex'), role: 'edit' }, { principal: who('team-nebi'), role: 'view' }],
  },
  { id: 'oci-registry', name: 'oci_registry', latestVersion: 7, namespace: 'team-nebi', access: [owner, { principal: who('team-nebi'), role: 'edit' }] },
]

export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', edit: 'Can edit', view: 'Can view' }

/** Second line under a name: the email, or the team size. */
export const principalDetail = (p: Principal) => (p.kind === 'user' ? p.email : `Team, ${p.members} members`)
