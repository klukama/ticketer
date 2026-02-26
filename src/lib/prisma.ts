import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

if (!globalForPrisma.prisma) {
  const rawUrl = process.env.DATABASE_URL
  let maskedUrl = 'not set'
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl)
      if (parsed.password) parsed.password = '***'
      maskedUrl = parsed.toString()
    } catch {
      maskedUrl = rawUrl.replace(/:([^:@/]+)@/, ':***@')
    }
  }
  console.log(`[${new Date().toISOString()}] Initializing Prisma Client (NODE_ENV=${process.env.NODE_ENV}, DATABASE_URL=${maskedUrl})`)
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
