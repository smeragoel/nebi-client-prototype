import { Check, CodeXml, Copy, LayoutTemplate } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Editable pixi.toml with a line-number gutter, styled like the NDS Code Block in Figma 3011:26136
 * (the NDS CodeBlock itself is read-only). The textarea grows with its content so the gutter never
 * has to scroll in step with it; `minRows` keeps a short file looking like an editor (Figma: 240px).
 */
export function TomlEditor({
  value,
  onChange,
  invalid,
  describedBy,
  minRows = 12,
}: {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
  minRows?: number
}) {
  const [copied, setCopied] = useState(false)
  const lines = value.split('\n').length

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-border bg-muted focus-within:ring-2 focus-within:ring-ring',
        invalid && 'border-destructive-foreground ring-2 ring-destructive-foreground focus-within:ring-destructive-foreground',
      )}
    >
      <div className="flex items-center justify-between py-0.5 pr-0.5 pl-1.5">
        <span className="font-mono text-muted-foreground text-xs leading-4">pixi.toml</span>
        <Button variant="ghost" size="icon-xs" onClick={copy} aria-label={copied ? 'Copied' : 'Copy pixi.toml'}>
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <div className="flex gap-2.5 border-border border-t bg-card p-1.5 font-mono text-xs leading-4">
        <div aria-hidden className="select-none text-right text-muted-foreground tabular-nums">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          aria-label="pixi.toml"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.max(lines, minRows)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          className="min-w-0 flex-1 resize-none overflow-x-auto overflow-y-hidden whitespace-pre bg-transparent text-foreground outline-none"
        />
      </div>
    </div>
  )
}

/**
 * Top-right switch between the form and the pixi.toml editor on both create pages. In pixi.toml
 * mode it warns that the form can't show everything a pixi.toml can hold.
 */
export function EditorModeSwitch({ mode, onSwitch }: { mode: 'gui' | 'toml'; onSwitch: () => void }) {
  return (
    <div className="flex w-[300px] max-w-full shrink-0 flex-col items-end gap-0.5">
      <Button type="button" variant="outline" onClick={onSwitch}>
        {mode === 'gui' ? <CodeXml /> : <LayoutTemplate />}
        {mode === 'gui' ? 'Open in TOML editor' : 'Open in GUI editor'}
      </Button>
      {mode === 'toml' && (
        <p className="text-right text-muted-foreground text-sm">You may lose some data that isn’t supported in the GUI editor.</p>
      )}
    </div>
  )
}
