import db from './db'

// Runs once per cold start — idempotent (IF NOT EXISTS)
export async function ensureTables() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS ShareLink (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL,
      type TEXT NOT NULL,
      targetId TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      visibility TEXT NOT NULL DEFAULT 'public',
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ShareAccessRequest (
      id TEXT PRIMARY KEY,
      linkId TEXT NOT NULL,
      requesterId TEXT NOT NULL,
      requesterName TEXT NOT NULL,
      requesterEmail TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL
    );
  `)
}
