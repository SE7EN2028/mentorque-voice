export * from './client.js'
// Re-exported so consumers only ever need to depend on @mentorque/db, never
// directly on @prisma/client — this package is the DB abstraction boundary.
export * from '@prisma/client'
