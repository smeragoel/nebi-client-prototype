import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Person } from '@/data/sample'
import { cn } from '@/lib/utils'

/**
 * App-owned avatar (the @nebari registry doesn't ship one), per the nebari-ui skill.
 * Figma's `Avatar` xs is 20px with an 11px initials label.
 */
function Avatar({ className, ...props }: AvatarPrimitive.Root.Props) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        'relative flex size-5 shrink-0 select-none overflow-hidden rounded-full border border-border bg-muted',
        className,
      )}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center font-medium text-[11px] text-muted-foreground-strong leading-4',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Initials avatar with the person's name in a tooltip. Pass `focusable={false}` inside
 * another control (a version row is a button) so focus doesn't nest.
 */
function PersonAvatar({ person, className, focusable = true }: { person: Person; className?: string; focusable?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={focusable ? 0 : undefined}
            aria-label={person.name}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        <Avatar className={className}>
          <AvatarFallback>{person.initials}</AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>{person.name}</TooltipContent>
    </Tooltip>
  )
}

export { Avatar, AvatarFallback, PersonAvatar }
