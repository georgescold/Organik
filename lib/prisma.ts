import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    // Limit connection pool to avoid Supabase MaxClientsInSessionMode error
    ...(process.env.NODE_ENV === 'production' ? {
      log: ['warn', 'error'],
    } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
