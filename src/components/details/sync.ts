import type { Project, Version } from '@/data/sample'

export type SyncMarker = 'newest-here' | 'newest-on-server' | 'in-sync' | null

/** Every version the rail shows, newest first: server-only versions sit above local ones. */
export function railVersions(p: Project): (Version & { serverOnly: boolean })[] {
  return [
    ...p.serverOnly.map((v) => ({ ...v, serverOnly: true })),
    ...p.versions.map((v) => ({ ...v, serverOnly: false })),
  ].sort((a, b) => b.number - a.number)
}

export function newestLocal(p: Project) {
  return Math.max(...p.versions.map((v) => v.number))
}

/**
 * Sync markers from the 2026-09-24 sync: laptop = newest on this machine, server = newest on
 * the server. When both point at the same version they merge into "In sync" (delight 2925:25499).
 */
export function syncMarker(p: Project, n: number): SyncMarker {
  if (p.serverVersion == null) return null
  const here = newestLocal(p)
  if (here === p.serverVersion) return n === here ? 'in-sync' : null
  if (n === here) return 'newest-here'
  if (n === p.serverVersion) return 'newest-on-server'
  return null
}

/** "versions 6 and 7", "version 7", "versions 4, 5 and 6". */
export function listVersions(numbers: number[]) {
  if (numbers.length === 1) return `version ${numbers[0]}`
  return `versions ${numbers.slice(0, -1).join(', ')} and ${numbers.at(-1)}`
}
