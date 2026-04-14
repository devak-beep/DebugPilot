import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

if (!globalForPrisma.prisma) {
  if (process.env.TURSO_DATABASE_URL) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaLibSql } = require('@prisma/adapter-libsql')
    const adapter = new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    globalForPrisma.prisma = new PrismaClient({ adapter } as any)
  } else {
    globalForPrisma.prisma = new PrismaClient()
  }
}

export const prisma = globalForPrisma.prisma
