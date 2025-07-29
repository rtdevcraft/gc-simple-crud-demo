import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from 'firebase-admin/auth'
import { initializeFirebaseAdmin } from '@/lib/firebase-admin'

// Initialize Firebase Admin SDK
initializeFirebaseAdmin()

// Helper function to get the user's Firebase UID from the Authorization header
async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split('Bearer ')[1]
  try {
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken.uid
  } catch (error) {
    console.error('Error verifying auth token:', error)
    return null
  }
}

// GET handler to fetch tasks
export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request)

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const tasks = await prisma.task.findMany({
      where: {
        authorId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

// POST handler to create a new task
export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request)

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid task text' }, { status: 400 })
    }

    // Ensure the user exists in our database, create if not
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        // We'll need the email, but for now we can use a placeholder
        // or get it from the decoded token if available
        email: `user-${userId}@example.com`,
      },
    })

    const newTask = await prisma.task.create({
      data: {
        text,
        authorId: userId,
      },
    })

    return NextResponse.json(newTask, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
