import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { Monitor, Moon, Sun } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuPortal, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useTheme } from '@/hooks/theme-provider'
import { isThemeMode, type ThemeMode } from '@/hooks/use-theme-preference'
import { cn } from '@/lib/utils'

const MODES: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

/**
 * Theme picker for testing light and dark. The NDS header recipe puts this radio group inside the
 * profile menu, but the Nebi header in Figma has no profile menu, so it gets its own icon trigger.
 * Same semantics as the recipe: `menuitemradio` items, and the menu stays open so modes can be compared.
 */
export function ThemeMenu() {
  const { themeMode, isDarkMode, setThemeMode } = useTheme()
  const Current = themeMode === 'system' ? Monitor : isDarkMode ? Moon : Sun

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        variant="ghost"
        aria-label="Theme"
        className="w-8 px-0 hover:bg-header-action-hover hover:no-underline focus-visible:ring-offset-0 active:bg-header-action-hover data-[popup-open]:bg-header-action-hover data-[popup-open]:no-underline"
      >
        <Current />
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" className="w-[248px] p-2">
          <p className="px-1.5 pb-2 font-medium text-foreground text-sm">Theme</p>
          <MenuPrimitive.RadioGroup
            aria-label="Theme"
            value={themeMode}
            onValueChange={(value) => {
              if (isThemeMode(value)) setThemeMode(value)
            }}
            className="flex h-[34px] items-center gap-1 rounded-md bg-muted p-1"
          >
            {MODES.map(({ value, label, Icon }) => (
              <MenuPrimitive.RadioItem
                key={value}
                value={value}
                aria-label={`${label} mode`}
                title={`${label} mode`}
                closeOnClick={false}
                className={cn(
                  'flex h-auto flex-1 cursor-pointer items-center justify-center gap-1 rounded-sm border border-transparent px-1.5 py-0.5 font-medium text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'text-muted-foreground-strong hover:text-foreground',
                  'data-checked:border-border-strong data-checked:bg-card data-checked:text-foreground data-checked:shadow-[0_1px_3px_0_rgba(0,0,0,0.10)]',
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span>{label}</span>
              </MenuPrimitive.RadioItem>
            ))}
          </MenuPrimitive.RadioGroup>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  )
}
