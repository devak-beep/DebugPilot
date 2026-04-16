import db from './db'

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
    CREATE TABLE IF NOT EXISTS CollectionMember (
      id TEXT PRIMARY KEY,
      collectionId TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      memberId TEXT,
      memberEmail TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      status TEXT NOT NULL DEFAULT 'pending',
      inviteToken TEXT UNIQUE,
      createdAt TEXT NOT NULL
    );
  `)
}
