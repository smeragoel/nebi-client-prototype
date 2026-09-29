import { Menu } from '@base-ui/react/menu'
import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/toast'
import { DIRECTORY, type Principal, principalDetail, ROLE_LABEL, type Role, SAM, type ServerProject } from '@/data/server'
import { useStore } from '@/state/store'

type GrantRole = Exclude<Role, 'owner'>
const ROLES: GrantRole[] = ['view', 'edit']
const VERB: Record<GrantRole, string> = { view: 'view', edit: 'edit' }

/**
 * Figma `02c - Share` 2512:16436: add a person or team with a role, change or remove access
 * per row, every change confirmed by an undoable toast (2510:21938). Changes apply at once,
 * so the footer is just Done. No Copy link: sharing is user or team only (decision 2026-09-15).
 */
export function ShareDialog({
  project,
  open,
  onOpenChange,
}: {
  project: ServerProject
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { serverProjects, setAccess } = useStore()
  const access = serverProjects.find((p) => p.id === project.id)?.access ?? project.access
  const [picked, setPicked] = useState<Principal | null>(null)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<GrantRole>('view')

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    const has = new Set(access.map((g) => g.principal.id))
    if (!q) return []
    return DIRECTORY.filter(
      (p) => !has.has(p.id) && (p.name.toLowerCase().includes(q) || principalDetail(p).toLowerCase().includes(q)),
    )
  }, [access, query])

  const change = (principal: Principal, next: GrantRole | null, was: Role | null) => {
    const at = access.findIndex((g) => g.principal.id === principal.id)
    setAccess(project.id, principal, next)
    const undo = { children: 'Undo', onClick: () => setAccess(project.id, principal, was, at < 0 ? undefined : at) }
    if (was == null && next) {
      toast.add({ title: `Shared ${project.name}`, description: `${principal.name} can now ${VERB[next]} this project.`, type: 'success', actionProps: undo })
    } else if (next) {
      toast.add({ title: 'Access updated', description: `${principal.name} can now ${VERB[next]} ${project.name}.`, type: 'success', actionProps: undo })
    } else {
      toast.add({ title: 'Access removed', description: `${principal.name} can no longer open ${project.name}.`, type: 'success', actionProps: undo })
    }
  }

  const share = () => {
    if (!picked) return
    change(picked, role, null)
    setPicked(null)
    setQuery('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setPicked(null)
          setQuery('')
          setRole('view')
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Share {project.name}</DialogTitle>
          <DialogDescription>People and teams you add can open this project on the server.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <label htmlFor="share-with" className="font-medium text-foreground text-sm">
            Add people or teams
          </label>
          <div className="flex gap-2">
            <Combobox
              items={candidates}
              filter={null}
              autoHighlight
              value={picked}
              onValueChange={(p: Principal | null) => setPicked(p)}
              inputValue={query}
              onInputValueChange={(q) => {
                setQuery(q)
                if (picked && q !== picked.name) setPicked(null)
              }}
              itemToStringLabel={(p: Principal) => p.name}
              isItemEqualToValue={(a: Principal, b: Principal) => a.id === b.id}
            >
              <ComboboxInput
                id="share-with"
                placeholder="Name, email or team"
                fieldClassName="flex-1 [&_[data-slot=combobox-trigger]]:hidden"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && picked) share()
                }}
              />
              <ComboboxContent>
                <ComboboxEmpty>{query.trim() ? 'No one by that name has signed in to this server.' : null}</ComboboxEmpty>
                <ComboboxList>
                  {(p: Principal) => (
                    <ComboboxItem key={p.id} value={p}>
                      <PrincipalAvatar principal={p} className="size-5 text-[10px]" />
                      <span className="font-medium text-foreground">{p.name}</span>
                      <span className="truncate text-muted-foreground">{principalDetail(p)}</span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <RoleMenu value={role} onChange={setRole} variant="outline" label="Role for people you add" />
            <Button onClick={share} disabled={!picked}>
              Share
            </Button>
          </div>
        </div>

        <section className="grid gap-2" aria-labelledby="who-has-access">
          <h3 id="who-has-access" className="font-medium text-foreground text-sm">
            Who has access
          </h3>
          <ul className="grid gap-3">
            {access.map((g) => (
              <li key={g.principal.id} className="flex items-center gap-3">
                <PrincipalAvatar principal={g.principal} className="size-8 text-xs" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-foreground text-sm">
                    {g.principal.name}
                    {g.principal.id === SAM.id && ' (you)'}
                  </span>
                  <span className="truncate text-muted-foreground text-sm">{principalDetail(g.principal)}</span>
                </div>
                {g.role === 'owner' ? (
                  <span className="text-muted-foreground text-sm">Owner</span>
                ) : (
                  <RoleMenu
                    value={g.role}
                    onChange={(next) => next !== g.role && change(g.principal, next, g.role)}
                    onRemove={() => change(g.principal, null, g.role)}
                    variant="ghost"
                    label={`Access for ${g.principal.name}`}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>

        <DialogFooter>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Can view / Can edit, plus Remove access on an existing row (2510:21589). */
function RoleMenu({
  value,
  onChange,
  onRemove,
  variant,
  label,
}: {
  value: GrantRole
  onChange: (role: GrantRole) => void
  onRemove?: () => void
  variant: 'outline' | 'ghost'
  label: string
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={<Button variant={variant} size={variant === 'ghost' ? 'sm' : 'default'} className="shrink-0 justify-between gap-2" />}
        aria-label={`${label}: ${ROLE_LABEL[value]}`}
      >
        {ROLE_LABEL[value]}
        <ChevronDown />
      </Menu.Trigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" className="min-w-40">
          {ROLES.map((r) => (
            <DropdownMenuCheckboxItem key={r} checked={value === r} onCheckedChange={() => onChange(r)}>
              {ROLE_LABEL[r]}
            </DropdownMenuCheckboxItem>
          ))}
          {onRemove && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                Remove access
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </Menu.Root>
  )
}

function PrincipalAvatar({ principal, className }: { principal: Principal; className?: string }) {
  return (
    <Avatar className={className} aria-hidden>
      <AvatarFallback className="text-[inherit]">{principal.initials}</AvatarFallback>
    </Avatar>
  )
}
