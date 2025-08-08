import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initializeFirebaseAdmin } from '@/lib/firebase-admin'
import { withAuthentication, withErrorHandler } from '@/lib/api-helpers'
import { HttpError } from '@/lib/errors'

initializeFirebaseAdmin()

// --- GET Handler ---

const getTasks = async (
  req: NextRequest,
  _params: object,
  auth: { userId: string }
) => {
  const tasks = await prisma.task.findMany({
    where: { authorId: auth.userId },
    orderBy: { createdAt: 'desc' },
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

  // Ensure the user exists in our database, create if not
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
