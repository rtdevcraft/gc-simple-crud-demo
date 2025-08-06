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

jest.mock('@/lib/logger', () => ({
  child: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
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
  const mockTask = {
    id: 1,
    text: 'Test Task',
    completed: false,
    authorId: 'user123',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })
  })

  // --- GET Tests ---
  describe('GET', () => {
    it('should retrieve a task successfully', async () => {
      const { GET } = await import('./route')
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask)

      const request = createMockRequest('http://localhost/api/tasks/1', {
        headers: { Authorization: 'Bearer valid-token' },
      })

      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(JSON.parse(JSON.stringify(mockTask)))
    })

    it("should return 403 when user tries to get someone else's task", async () => {
      const { GET } = await import('./route')
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        authorId: 'another-user',
      })

      const request = createMockRequest('http://localhost/api/tasks/1', {
        headers: { Authorization: 'Bearer valid-token' },
      })

      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      // Expect 403 Forbidden, not 404
      expect(response.status).toBe(403)
      // Check for the new error message format
      expect(data.message).toBe('Access denied.')
    })

    it('should return 401 for GET when unauthorized', async () => {
      const { GET } = await import('./route')
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

      const request = createMockRequest('http://localhost/api/tasks/1')

      const response = await GET(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      // Check for the new error message format
      expect(data.message).toContain('Unauthorized')
    })
  })

  // --- PATCH Tests ---
  describe('PATCH', () => {
    it('should update a task successfully', async () => {
      const { PATCH } = await import('./route')
      const updatedData = { text: 'Updated Text', completed: true }
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask)
      ;(prisma.task.update as jest.Mock).mockResolvedValue({
        ...mockTask,
        ...updatedData,
      })

      const request = createMockRequest('http://localhost/api/tasks/1', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      })

      const response = await PATCH(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.text).toBe(updatedData.text)
      expect(data.completed).toBe(updatedData.completed)
    })

    it('should return 404 when task is not found', async () => {
      const { PATCH } = await import('./route')
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(null)

      const request = createMockRequest('http://localhost/api/tasks/999', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'does not matter' }),
      })

      const response = await PATCH(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      // Check for the new error message format
      expect(data.message).toBe('Task not found.')
    })

    it("should return 403 when user tries to update someone else's task", async () => {
      const { PATCH } = await import('./route')
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        authorId: 'another-user',
      })

      const request = createMockRequest('http://localhost/api/tasks/1', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: 'new text' }),
      })

      const response = await PATCH(request, { params: { id: '1' } })
      const data = await response.json()

      // Expect 403 Forbidden, not 404
      expect(response.status).toBe(403)
      // Check for the new error message format
      expect(data.message).toBe('Access denied.')
    })
  })

  // --- DELETE Tests ---
  describe('DELETE', () => {
    it('should delete a task successfully', async () => {
      const { DELETE } = await import('./route')
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask)
      ;(prisma.task.delete as jest.Mock).mockResolvedValue(mockTask)

      const request = createMockRequest('http://localhost/api/tasks/1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      })

      const response = await DELETE(request, { params: { id: '1' } })

      expect(response.status).toBe(204)
      expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('should return 401 for DELETE when unauthorized', async () => {
      const { DELETE } = await import('./route')
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

      const request = createMockRequest('http://localhost/api/tasks/1', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      // Check for the new error message format
      expect(data.message).toContain('Unauthorized')
    })

    it('should return 404 for DELETE when task is not found', async () => {
      const { DELETE } = await import('./route')
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(null)

      const request = createMockRequest('http://localhost/api/tasks/999', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      })

      const response = await DELETE(request, { params: { id: '999' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      // Check for the new error message format
      expect(data.message).toBe('Task not found.')
    })

    it("should return 403 for DELETE when user tries to delete someone else's task", async () => {
      const { DELETE } = await import('./route')
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue({
        ...mockTask,
        authorId: 'another-user',
      })

      const request = createMockRequest('http://localhost/api/tasks/1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      })

      const response = await DELETE(request, { params: { id: '1' } })
      const data = await response.json()

      // Expect 403 Forbidden, not 404
      expect(response.status).toBe(403)
      // Check for the new error message format
      expect(data.message).toBe('Access denied.')
    })
  })
})
