import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))

const envFiles = ['apps/client/.env', 'apps/server/.env', 'packages/db/.env']

for (const relativePath of envFiles) {
  const target = join(rootDir, relativePath)
  const example = `${target}.example`

  if (existsSync(target)) {
    console.log(`skip   ${relativePath} (already exists)`)
    continue
  }

  copyFileSync(example, target)
  console.log(`create ${relativePath}`)
}

// Never ship a shared placeholder JWT secret — generate a real random one on
// first setup so nobody accidentally deploys with "changeme" still in place.
const serverEnvPath = join(rootDir, 'apps/server/.env')
const serverEnv = readFileSync(serverEnvPath, 'utf8')
const placeholder = 'JWT_SECRET=changeme-generate-a-real-secret'

if (serverEnv.includes(placeholder)) {
  const generatedSecret = randomBytes(48).toString('hex')
  writeFileSync(serverEnvPath, serverEnv.replace(placeholder, `JWT_SECRET=${generatedSecret}`))
  console.log('generate a random JWT_SECRET in apps/server/.env')
}

console.log(
  '\nEnv files ready. Fill in packages/db/.env with real Neon connection strings — Phase 1 auth needs a live database to actually run.',
)
