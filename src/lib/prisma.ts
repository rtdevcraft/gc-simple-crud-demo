import { PrismaClient } from '@prisma/client'

// This helps us avoid creating a new PrismaClient on every hot reload in development.
// In production, it will just be a single instance.
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
