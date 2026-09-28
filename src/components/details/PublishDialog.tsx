import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { defaultPublication, type Project, type Publication, publicationRef, REGISTRIES, type Version } from '@/data/sample'
import { useStore } from '@/state/store'

type Row = { on: boolean; publication: Publication; published: boolean }

/**
 * Figma `Publishing for version 5` 2969:13055 (the simplified copy, 2026-09-28): one switch per
 * registry, changes apply on Save. Only a published row being switched off gets a note, since
 * that's the one thing the switch can't say. "Edit" changes repository:tag before first publish.
 */
export function PublishDialog({
  project,
  version: v,
  open,
  onOpenChange,
}: {
  project: Project
  version: Version
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { publish } = useStore()
  const initial = () =>
    Object.fromEntries(
      REGISTRIES.map((r) => {
        const existing = v.publications.find((p) => p.registry === r.url)
        return [r.url, { on: !!existing, published: !!existing, publication: existing ?? defaultPublication(r, project, v) }]
      }),
    ) as Record<string, Row>
  const [rows, setRows] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)

  const set = (url: string, change: Partial<Row>) => setRows((all) => ({ ...all, [url]: { ...all[url], ...change } }))
  const changed = Object.values(rows).some((r) => r.on !== r.published)

  const save = () => {
    publish(
      project.id,
      v.number,
      Object.values(rows)
        .filter((r) => r.on)
        .map((r) => r.publication),
    )
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setRows(initial())
        setEditing(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Publish version {v.number}</DialogTitle>
        </DialogHeader>

        <ul className="flex flex-col divide-y divide-border">
          {REGISTRIES.map((r) => {
            const row = rows[r.url]
            const removing = row.published && !row.on
            const switchId = `publish-${r.url}`
            return (
              <li key={r.url} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span id={switchId} className="font-medium text-foreground text-sm">
                    {r.name}
                  </span>
                  {editing === r.url ? (
                    <RefEditor
                      registry={r.url}
                      publication={row.publication}
                      onDone={(publication) => {
                        if (publication) set(r.url, { publication })
                        setEditing(null)
                      }}
                    />
                  ) : (
                    <span className="flex items-center gap-3">
                      <code className="truncate font-mono text-muted-foreground text-xs">{publicationRef(row.publication)}</code>
                      {row.on && !row.published && (
                        <Button variant="link" size="xs" className="h-auto px-0" onClick={() => setEditing(r.url)}>
                          Edit
                        </Button>
                      )}
                    </span>
                  )}
                  {removing && (
                    <p className="text-destructive-foreground text-xs">Will be unpublished. Pulls of this tag will stop working.</p>
                  )}
                </div>
                <Switch aria-labelledby={switchId} checked={row.on} onCheckedChange={(on) => set(r.url, { on })} />
              </li>
            )
          })}
        </ul>

        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
          <Button disabled={!changed} onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Inline repository:tag editor. Enter or leaving the field keeps it, Escape drops it. */
function RefEditor({
  registry,
  publication,
  onDone,
}: {
  registry: string
  publication: Publication
  onDone: (p: Publication | null) => void
}) {
  const [text, setText] = useState(`${publication.repository}:${publication.tag}`)
  const match = text.trim().match(/^([a-z0-9][a-z0-9._/-]*):([A-Za-z0-9_][A-Za-z0-9._-]{0,127})$/)
  const commit = () => onDone(match ? { registry, repository: match[1], tag: match[2] } : null)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="font-mono text-muted-foreground text-xs">{registry}/</span>
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') {
              e.stopPropagation()
              onDone(null)
            }
          }}
          aria-label="Repository and tag"
          aria-invalid={!match}
          className="h-7 w-64 font-mono text-xs"
          spellCheck={false}
        />
      </div>
      {!match && <p className="text-destructive-foreground text-xs">Use repository:tag, e.g. nebari/project_1:5.</p>}
    </div>
  )
}
