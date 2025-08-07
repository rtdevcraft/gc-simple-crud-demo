import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initializeFirebaseAdmin } from '@/lib/firebase-admin'
import { withAuthentication, withErrorHandler } from '@/lib/api-helpers'
import { HttpError } from '@/lib/errors'
import { Prisma } from '@prisma/client'

initializeFirebaseAdmin()

// --- GET Handler (Updated with Search Logic) ---
const getTasks = async (
  req: NextRequest,
  _params: object,
  auth: { userId: string }
) => {
  const { searchParams } = req.nextUrl
  const search = searchParams.get('search')

  // Build the 'where' clause for the Prisma query with an explicit type
  const whereClause: Prisma.TaskWhereInput = {
    authorId: auth.userId,
  }

  // If a 'search' query exists, add the 'contains' filter
  if (search) {
    whereClause.text = {
      contains: search,
      mode: 'insensitive',
    }
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json(tasks)
}

// --- POST Handler ---
const createTask = async (
  req: NextRequest,
  _params: object,
  auth: { userId: string }
) => {
  const { text } = await req.json()

  if (!text || typeof text !== 'string') {
    throw new HttpError(400, 'Invalid task text.')
  }

  await prisma.user.upsert({
    where: { id: auth.userId },
    update: {},
    create: { id: auth.userId, email: `user-${auth.userId}@example.com` },
  })

  const newTask = await prisma.task.create({
    data: { text, authorId: auth.userId },
  })

  return NextResponse.json(newTask, { status: 201 })
}

// --- Export wrapped handlers ---
export const GET = withErrorHandler(withAuthentication(getTasks))
export const POST = withErrorHandler(withAuthentication(createTask))
