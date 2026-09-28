import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Editable pixi.toml with a line-number gutter, styled like the NDS Code Block in Figma 2675:8689
 * (the NDS CodeBlock itself is read-only). The textarea grows with its content so the gutter never
 * has to scroll in step with it.
 */
export function TomlEditor({
  value,
  onChange,
  invalid,
  describedBy,
}: {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
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
          rows={lines}
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
