import { createClient } from '@libsql/client/http'

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export default db

export function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
