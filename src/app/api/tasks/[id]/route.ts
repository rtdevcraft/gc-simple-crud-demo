import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdFromToken } from '@/lib/utils'

// --- GET Handler ---
export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context
  const userId = await getUserIdFromToken(req)

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const taskId = parseInt(params.id, 10)
  if (isNaN(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task || task.authorId !== userId) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(task)
  } catch {
    return NextResponse.json(
      { error: 'Failed to retrieve task' },
      { status: 500 }
    )
  }
}

// --- PATCH Handler ---
export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context
  const userId = await getUserIdFromToken(req)

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const taskId = parseInt(params.id, 10)
  if (isNaN(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task || task.authorId !== userId) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        text: body.text,
        completed: body.completed,
      },
    })

    return NextResponse.json(updatedTask)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

// --- DELETE Handler ---
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context
  const userId = await getUserIdFromToken(req)

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const taskId = parseInt(params.id, 10)
  if (isNaN(taskId)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  try {
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

    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
