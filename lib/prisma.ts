import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@/generated/prisma-full'
import ws from 'ws'

// إذا عم تشتغل محلياً بيئة Node.js العادية
if (process.env.NODE_ENV !== 'production') {
  neonConfig.webSocketConstructor = ws
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL is required to connect to PostgreSQL.")
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

// تأكد إنو الـ pool متعرف ومو undefined أبداً
const pool = globalForPrisma.pool ?? new Pool({ connectionString })
if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool

const adapter = new PrismaNeon(pool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
