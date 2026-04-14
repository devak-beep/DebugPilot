import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrisma(): PrismaClient {
  if (process.env.NEON_DATABASE_URL) {
    const { Pool, neonConfig } = require('@neondatabase/serverless')
    const { PrismaNeon } = require('@prisma/adapter-neon')
    const ws = require('ws')
    neonConfig.webSocketConstructor = ws
    const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL })
    const adapter = new PrismaNeon(pool)
    return new PrismaClient({ adapter } as any)
  }
  return new PrismaClient()
}

export const prisma = globalForPrisma.prisma ?? createPrisma()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
