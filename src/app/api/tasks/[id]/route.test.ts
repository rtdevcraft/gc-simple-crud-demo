// Complete and final working test file
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

jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
describe('/api/tasks/[id] - API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // --- GET Tests ---
  describe('GET', () => {
    it('should retrieve a task successfully', async () => {
      const { GET } = await import('./route')
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })

      const myTask = {
        id: 1,
        text: 'My specific task',
        authorId: 'user123',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(myTask)

      const request = createMockRequest('http://localhost:3000/api/tasks/1', {
        headers: { Authorization: 'Bearer valid-token' },
      })

      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(JSON.parse(JSON.stringify(myTask)))
    })

    it("should return 404 when user tries to get someone else's task", async () => {
      const { GET } = await import('./route')
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })

      const otherUsersTask = {
        id: 2,
        text: "Someone else's task",
        authorId: 'different-user',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(otherUsersTask)

      const request = createMockRequest('http://localhost:3000/api/tasks/2', {
        headers: { Authorization: 'Bearer valid-token' },
      })

      const response = await GET(request, { params: { id: '2' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Task not found or access denied')
    })

    it('should return 401 for GET when unauthorized', async () => {
      const { GET } = await import('./route')
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

      const request = createMockRequest('http://localhost:3000/api/tasks/1', {
        headers: { Authorization: 'Bearer invalid-token' },
      })

      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  // --- PATCH Tests ---
  describe('PATCH', () => {
    it('should update a task successfully', async () => {
      const { PATCH } = await import('./route')
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })

      const originalTask = {
        id: 1,
        text: 'Original Text',
        authorId: 'user123',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(originalTask)

      const updatedTask = {
        ...originalTask,
        text: 'Updated Text',
        completed: true,
      }
      ;(prisma.task.update as jest.Mock).mockResolvedValue(updatedTask)

      const request = createMockRequest('http://localhost:3000/api/tasks/1', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'Updated Text', completed: true }),
      })

      const response = await PATCH(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(JSON.parse(JSON.stringify(updatedTask)))
    })

    it('should return 404 when task is not found', async () => {
      const { PATCH } = await import('./route')
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(null)

      const request = createMockRequest('http://localhost:3000/api/tasks/999', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'Updated Text' }),
      })

      const response = await PATCH(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Task not found or access denied')
    })

    it("should return 404 when user tries to update someone else's task", async () => {
      const { PATCH } = await import('./route')
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })

      const otherUsersTask = {
        id: 1,
        text: 'Original Text',
        authorId: 'different-user',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(otherUsersTask)

      const request = createMockRequest('http://localhost:3000/api/tasks/1', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'Updated Text' }),
      })

      const response = await PATCH(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Task not found or access denied')
    })
  })

  // --- DELETE Tests ---
  describe('DELETE', () => {
    it('should delete a task successfully', async () => {
      const { DELETE } = await import('./route')
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })

      const myTask = {
        id: 1,
        text: 'Task to Delete',
        authorId: 'user123',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(myTask)
      ;(prisma.task.delete as jest.Mock).mockResolvedValue(myTask)

      const request = createMockRequest('http://localhost:3000/api/tasks/1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      })

      const response = await DELETE(request, { params: { id: '1' } })

      expect(response.status).toBe(204)
    })

    it('should return 401 for DELETE when unauthorized', async () => {
      const { DELETE } = await import('./route')
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

      const request = createMockRequest('http://localhost:3000/api/tasks/1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer invalid-token' },
      })

      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 for DELETE when task is not found', async () => {
      const { DELETE } = await import('./route')
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(null)

      const request = createMockRequest('http://localhost:3000/api/tasks/999', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      })

      const response = await DELETE(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Task not found or access denied')
    })

    it("should return 404 for DELETE when user tries to delete someone else's task", async () => {
      const { DELETE } = await import('./route')
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })

      const otherUsersTask = {
        id: 1,
        text: "Someone else's task",
        authorId: 'different-user',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(otherUsersTask)

      const request = createMockRequest('http://localhost:3000/api/tasks/1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      })

      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Task not found or access denied')
    })
  })
})
