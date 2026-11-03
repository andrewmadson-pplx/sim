import { cp, mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const argument = process.argv.find((arg) => arg.startsWith('--outdir='))
const out = argument?.slice('--outdir='.length)
if (argument && !out) throw new Error('--outdir requires a directory.')
const dist = resolve(root, out ?? 'dist-new-tab')
if (!argument) await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
for (const file of ['manifest.json', 'new-tab.html', 'new-tab.css', 'new-tab.js']) {
  await cp(resolve(root, 'new-tab', file), resolve(dist, file))
}
for (const [size, file] of [
  [16, 'favicon-16x16.png'],
  [32, 'favicon-32x32.png'],
  [128, 'android-chrome-512x512.png'],
] as const) {
  await cp(resolve(root, '../sim/public/favicon', file), resolve(dist, `icon-${size}.png`))
}
