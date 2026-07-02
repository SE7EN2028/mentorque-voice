import { copyFileSync, existsSync } from 'node:fs'
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

console.log(
  '\nEnv files ready. Fill in packages/db/.env with real Neon connection strings before Phase 1.',
)
