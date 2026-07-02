import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))

const envFiles = [
  'apps/client/.env',
  'apps/server/.env',
  'apps/agent-worker/.env',
  'packages/db/.env',
]

function parseKeys(content) {
  const keys = new Set()
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const key = trimmed.split('=')[0]
    if (key) keys.add(key)
  }
  return keys
}

for (const relativePath of envFiles) {
  const target = join(rootDir, relativePath)
  const example = `${target}.example`
  const exampleContent = readFileSync(example, 'utf8')

  if (!existsSync(target)) {
    copyFileSync(example, target)
    console.log(`create ${relativePath}`)
    continue
  }

  // File already exists — reconcile: append any keys present in
  // .env.example but missing here. Without this, a var added to
  // .env.example in a later phase would silently never reach an .env
  // created in an earlier one.
  const existingContent = readFileSync(target, 'utf8')
  const existingKeys = parseKeys(existingContent)
  const missingLines = exampleContent.split('\n').filter((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return false
    const key = trimmed.split('=')[0]
    return key && !existingKeys.has(key)
  })

  if (missingLines.length === 0) {
    console.log(`skip   ${relativePath} (already up to date)`)
    continue
  }

  writeFileSync(target, `${existingContent.trimEnd()}\n${missingLines.join('\n')}\n`)
  console.log(
    `update ${relativePath} (added: ${missingLines.map((line) => line.split('=')[0]).join(', ')})`,
  )
}

// Never ship a shared placeholder JWT secret — generate a real random one
// whenever it's still literally "changeme" (fresh file or just reconciled in).
const serverEnvPath = join(rootDir, 'apps/server/.env')
const serverEnv = readFileSync(serverEnvPath, 'utf8')
const placeholder = 'JWT_SECRET=changeme-generate-a-real-secret'

if (serverEnv.includes(placeholder)) {
  const generatedSecret = randomBytes(48).toString('hex')
  writeFileSync(serverEnvPath, serverEnv.replace(placeholder, `JWT_SECRET=${generatedSecret}`))
  console.log('generated a random JWT_SECRET in apps/server/.env')
}

console.log(
  '\nEnv files ready. Fill in packages/db/.env with real Neon connection strings — auth and sessions need a live database to actually run.',
)
