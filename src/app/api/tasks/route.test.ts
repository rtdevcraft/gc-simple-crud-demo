import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// --- MOCKS ---
jest.mock('@/lib/firebase-admin', () => ({
  initializeFirebaseAdmin: jest.fn(),
}))

const mockVerifyIdToken = jest.fn()
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}))

// Add the user model and upsert method to the mock
jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      upsert: jest.fn(),
    },
  },
}))

jest.mock('next/server', () => {
  class MockNextResponse extends Response {
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      super(body, init)
    }
    static json = (data: unknown, options?: { status: number }) => {
      const serializedData = JSON.parse(JSON.stringify(data))
      const body = JSON.stringify(serializedData)
      const headers = { 'Content-Type': 'application/json' }
      const status = options?.status || 200
      return new MockNextResponse(body, { status, headers })
    }
  }
  return {
    NextRequest: class MockNextRequest extends Request {},
    NextResponse: MockNextResponse,
  }
})

// --- HELPER FUNCTION ---
const createMockRequest = (
  url: string,
  options: RequestInit = {}
): NextRequest => {
  return new Request(url, options) as NextRequest
}

// --- TESTS ---
describe('/api/tasks - API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // --- GET Tests ---
  describe('GET', () => {
    it('should retrieve all tasks for a user', async () => {
      const { GET } = await import('./route')
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })

      const tasks = [
        { id: 1, text: 'Task 1', authorId: 'user123', createdAt: new Date() },
        { id: 2, text: 'Task 2', authorId: 'user123', createdAt: new Date() },
      ]
      ;(prisma.task.findMany as jest.Mock).mockResolvedValue(tasks)

      const request = createMockRequest('http://localhost:3000/api/tasks', {
        headers: { Authorization: 'Bearer valid-token' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(JSON.parse(JSON.stringify(tasks)))
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { authorId: 'user123' },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return 401 if user is not authenticated', async () => {
      const { GET } = await import('./route')
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

      const request = createMockRequest('http://localhost:3000/api/tasks')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  // --- POST Tests ---
  describe('POST', () => {
    it('should create a new task successfully', async () => {
      const { POST } = await import('./route')
      const userId = 'user123'
      mockVerifyIdToken.mockResolvedValue({
        uid: userId,
        email: `user-${userId}@example.com`,
      })

      // FIX: Mock the new user upsert call
      ;(prisma.user.upsert as jest.Mock).mockResolvedValue({
        id: userId,
        email: `user-${userId}@example.com`,
      })

      const newTaskData = { text: 'A new task' }
      const createdTask = {
        id: 3,
        authorId: userId,
        ...newTaskData,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(prisma.task.create as jest.Mock).mockResolvedValue(createdTask)

      const request = createMockRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTaskData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(JSON.parse(JSON.stringify(createdTask)))

      // Verify user upsert was called correctly
      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `user-${userId}@example.com`,
        },
      })

      // Verify task creation was called correctly
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          text: newTaskData.text,
          authorId: userId,
        },
      })
    })

    it('should return 400 if task text is missing', async () => {
      const { POST } = await import('./route')
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })

      const request = createMockRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Empty body
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      // Update expected error message to match new code
      expect(data.error).toBe('Invalid task text')
    })
  })
})
