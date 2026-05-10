import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from '../node_modules/sharp/lib/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const svg = readFileSync(join(root, 'public', 'logo.svg'))

for (const size of [192, 512]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(root, 'public', `icon-${size}.png`))
  console.log(`✓ icon-${size}.png`)
}
console.log('Done.')
