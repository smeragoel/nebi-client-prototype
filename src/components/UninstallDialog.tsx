import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Project } from '@/data/sample'
import { useStore } from '@/state/store'

/** Figma `Uninstall confirmation` 2923:24190. */
export function UninstallDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { uninstall } = useStore()
  const v = project.installedVersion

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Uninstall version {v}?</DialogTitle>
          {project.size && <DialogDescription>Frees {project.size} on this machine.</DialogDescription>}
        </DialogHeader>
        <p className="text-foreground text-sm">
          The environment is removed from disk. The project and all its versions stay, and Nebi remembers version {v} so
          you can install it again.
        </p>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
          <Button
            onClick={() => {
              uninstall(project.id)
              onOpenChange(false)
            }}
          >
            Uninstall
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
