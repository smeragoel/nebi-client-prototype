/** pixi platform names offered in the Create project form. Anything else can be typed in. */
export const KNOWN_PLATFORMS: Record<string, string> = {
  'linux-64': 'Linux',
  'linux-aarch64': 'Linux ARM',
  'osx-64': 'macOS Intel',
  'osx-arm64': 'macOS Apple silicon',
  'win-64': 'Windows',
}

/** Best guess at this machine's pixi platform, from the browser. The desktop app would ask pixi. */
export function thisMachinePlatform(): string {
  const ua = navigator.userAgent
  if (/Windows/i.test(ua)) return 'win-64'
  if (/Mac/i.test(ua)) return 'osx-arm64'
  if (/aarch64|arm64/i.test(ua)) return 'linux-aarch64'
  return 'linux-64'
}

/** "osx-arm64 · this machine", "win-64 · Windows", or just the name for a typed-in platform. */
export function platformLabel(id: string, machine: string) {
  if (id === machine) return `${id} · this machine`
  const name = KNOWN_PLATFORMS[id]
  return name ? `${id} · ${name}` : id
}

/** pixi platform names are lowercase words joined by hyphens, e.g. linux-ppc64le. */
export const isPlatformName = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)+$/.test(s)
