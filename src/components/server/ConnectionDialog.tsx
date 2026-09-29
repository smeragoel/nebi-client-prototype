import { useState } from 'react'
import { FormField } from '@/components/form/fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs'
import { type Connection, DEFAULT_CONNECTION } from '@/data/server'
import { useStore } from '@/state/store'

const CONNECT_MS = 900

/**
 * Figma `02b - Connect server (dialog)` 2099:4743 and `02a - Manage connection (server)`
 * 2371:28706. Same fields: no Name, None | Token auth only, no Trust toggle (2102:4715).
 * Manage adds the Disconnect section, which asks first (2512:16372).
 */
export function ConnectionDialog({
  mode,
  open,
  onOpenChange,
}: {
  mode: 'connect' | 'manage'
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { connection, connect, updateConnection } = useStore()
  const start = () => connection ?? { ...DEFAULT_CONNECTION, url: '' }
  const [url, setUrl] = useState(start().url)
  const [auth, setAuth] = useState<Connection['auth']>(start().auth)
  const [token, setToken] = useState(mode === 'manage' ? '••••••••••••••••' : '')
  const [errors, setErrors] = useState<{ url?: string; token?: string }>({})
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const reset = () => {
    const c = start()
    setUrl(c.url)
    setAuth(c.auth)
    setToken(mode === 'manage' ? '••••••••••••••••' : '')
    setErrors({})
    setBusy(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = url.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
    const found = {
      url: !clean
        ? 'Enter the server’s URL.'
        : !/^[a-z0-9.-]+(:\d+)?(\/.*)?$/i.test(clean)
          ? 'That doesn’t look like a URL. Try nebi.example.com.'
          : undefined,
      token: auth === 'token' && !token ? 'Paste a token, or choose None.' : undefined,
    }
    setErrors(found)
    if (found.url || found.token) return
    const next: Connection = { url: clean, auth, signedInAs: auth === 'token' ? DEFAULT_CONNECTION.signedInAs : 'anonymous' }
    if (mode === 'manage') {
      updateConnection(next)
      onOpenChange(false)
      return
    }
    setBusy(true)
    window.setTimeout(() => {
      connect(next)
      onOpenChange(false)
    }, CONNECT_MS)
  }

  return (
    <>
      <Dialog
        open={open && !confirming}
        onOpenChange={(next) => {
          if (next) reset()
          onOpenChange(next)
        }}
      >
        <DialogContent className="max-w-[520px]">
          <form onSubmit={submit} className="grid gap-4" noValidate>
            <DialogHeader>
              <DialogTitle>{mode === 'connect' ? 'Connect server' : 'Manage connection'}</DialogTitle>
              <DialogDescription>You can connect to one server at a time.</DialogDescription>
            </DialogHeader>

            <FormField label="Server URL" error={errors.url}>
              <Input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setErrors((x) => ({ ...x, url: undefined }))
                }}
                placeholder="nebi.example.com"
                autoFocus={mode === 'connect'}
                spellCheck={false}
              />
            </FormField>

            <div className="grid gap-1">
              <span id="auth-label" className="font-medium text-foreground text-sm">
                Authentication
              </span>
              <Tabs value={auth} onValueChange={(v) => setAuth(v as Connection['auth'])}>
                <TabsList variant="toggle" aria-labelledby="auth-label" className="w-full">
                  <TabsTab value="none" className="flex-1">
                    None
                  </TabsTab>
                  <TabsTab value="token" className="flex-1">
                    Token
                  </TabsTab>
                </TabsList>
              </Tabs>
            </div>

            {auth === 'token' && (
              <FormField label="Token" error={errors.token}>
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value)
                    setErrors((x) => ({ ...x, token: undefined }))
                  }}
                  onFocus={(e) => mode === 'manage' && token.startsWith('•') && e.currentTarget.select()}
                  autoComplete="off"
                />
              </FormField>
            )}

            {mode === 'manage' && (
              <section className="grid gap-2 border-border border-t pt-4" aria-labelledby="disconnect-title">
                <h3 id="disconnect-title" className="font-medium text-foreground text-sm">
                  Disconnect from this server
                </h3>
                <p className="text-muted-foreground text-sm">
                  Severs the link to this server. Projects you’ve already pulled stay on your machine and keep working. They
                  just stop syncing. You can reconnect at any time.
                </p>
                <Button variant="destructive" size="sm" className="w-fit" onClick={() => setConfirming(true)}>
                  Disconnect
                </Button>
              </section>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
              <Button render={<button type="submit" />} loading={busy} loadingText="Connecting…">
                {mode === 'connect' ? 'Connect' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {mode === 'manage' && (
        <DisconnectDialog
          open={open && confirming}
          onOpenChange={(next) => !next && setConfirming(false)}
          onDisconnected={() => {
            setConfirming(false)
            onOpenChange(false)
          }}
        />
      )}
    </>
  )
}

/** Figma `Add Remote dialog` instance 2512:16372, used as the disconnect confirmation. */
function DisconnectDialog({
  open,
  onOpenChange,
  onDisconnected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDisconnected: () => void
}) {
  const { connection, disconnect } = useStore()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Disconnect from {connection?.url}?</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Severs the link to this server. Projects you’ve already pulled stay on your machine and keep working. They just
          stop syncing. You can reconnect at any time.
        </p>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              disconnect()
              onDisconnected()
            }}
          >
            Disconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
