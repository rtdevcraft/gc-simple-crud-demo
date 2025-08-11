import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  withAuthentication,
  withErrorHandler,
  RouteContext,
} from '@/lib/api-helpers'
import { HttpError } from '@/lib/errors'

// --- A helper to find and authorize a task to avoid repetition ---
async function findAndAuthorizeTask(taskId: number, userId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) {
    throw new HttpError(404, 'Task not found.')
  }
  if (task.authorId !== userId) {
    throw new HttpError(403, 'Access denied.')
  }
  return task
}

// --- GET Handler ---
const getTask = async (
  _req: NextRequest,
  { params }: RouteContext,
  auth: { userId: string }
) => {
  const taskId = parseInt(params.id as string, 10)
  if (isNaN(taskId)) throw new HttpError(400, 'Invalid task ID.')

  const task = await findAndAuthorizeTask(taskId, auth.userId)
  return NextResponse.json(task)
}

// --- PATCH Handler ---
const updateTask = async (
  req: NextRequest,
  { params }: RouteContext,
  auth: { userId: string }
) => {
  const taskId = parseInt(params.id as string, 10)
  if (isNaN(taskId)) throw new HttpError(400, 'Invalid task ID.')

  await findAndAuthorizeTask(taskId, auth.userId) // Ensures authorization

  const { text, completed } = await req.json()
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { text, completed },
  })

  return NextResponse.json(updatedTask)
}

// --- DELETE Handler ---
const deleteTask = async (
  _req: NextRequest,
  { params }: RouteContext,
  auth: { userId: string }
) => {
  const taskId = parseInt(params.id as string, 10)
  if (isNaN(taskId)) throw new HttpError(400, 'Invalid task ID.')

  await findAndAuthorizeTask(taskId, auth.userId) // Ensures authorization

  await prisma.task.delete({ where: { id: taskId } })
  return new NextResponse(null, { status: 204 }) // 204 No Content is standard for successful deletions
}

// --- Export wrapped handlers ---
export const GET = withErrorHandler(withAuthentication(getTask))
export const PATCH = withErrorHandler(withAuthentication(updateTask))
export const DELETE = withErrorHandler(withAuthentication(deleteTask))
