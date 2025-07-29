import { NextRequest, NextResponse } from 'next/server'
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

// PATCH handler to update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params // Await params before accessing properties
  const userId = await getUserIdFromRequest(request)
  const taskId = parseInt(id, 10)

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (isNaN(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  try {
    const { text, completed } = await request.json()

    // First, verify the task exists and belongs to the user
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task || task.authorId !== userId) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      )
    }

    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        text: text, // Will be undefined if not provided, so Prisma ignores it
        completed: completed, // Will be undefined if not provided
      },
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error(`Error updating task ${taskId}:`, error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

// DELETE handler to delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params // Await params before accessing properties
  const userId = await getUserIdFromRequest(request)
  const taskId = parseInt(id, 10)

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (isNaN(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  try {
    // Verify the task exists and belongs to the user before deleting
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task || task.authorId !== userId) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      )
    }

    await prisma.task.delete({
      where: { id: taskId },
    })

    return new NextResponse(null, { status: 204 }) // 204 No Content for successful deletion
  } catch (error) {
    console.error(`Error deleting task ${taskId}:`, error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
