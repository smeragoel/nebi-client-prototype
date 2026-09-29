import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormField } from '@/components/form/fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { ServerProject } from '@/data/server'
import { useStore } from '@/state/store'

/**
 * Figma `Workspace naming` 2317:9951: pick the name the project gets on this machine, then the
 * job starts and a toast follows it (2317:10140). Pull only uses the same dialog without the
 * install line. Local names are unique per machine (decision 2026-09-11).
 */
export function PullDialog({
  project,
  andInstall,
  open,
  onOpenChange,
}: {
  project: ServerProject
  andInstall: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { projects, pullFromServer } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState(project.name)
  const [error, setError] = useState<string | null>(null)
  const verb = andInstall ? 'Pull and install' : 'Pull'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return setError('Give the project a name.')
    if (projects.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
      return setError(`A project called ${clean} is already on this machine. Pick another name.`)
    }
    pullFromServer(project.id, clean, andInstall, (id) => navigate(`/projects/${id}`))
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setName(project.name)
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-[520px]">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>
              {verb} {project.name}
            </DialogTitle>
            <DialogDescription>
              Choose a name for this project on your machine.{andInstall && ' The environment will install after pulling.'}
            </DialogDescription>
          </DialogHeader>
          <FormField label="Local name" error={error}>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              onFocus={(e) => e.currentTarget.select()}
              autoFocus
              spellCheck={false}
            />
          </FormField>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
            <Button render={<button type="submit" />}>{verb}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
