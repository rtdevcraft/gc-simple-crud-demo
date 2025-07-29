import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock all dependencies first
jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}))

jest.mock('@/lib/firebase-admin', () => ({
  initializeFirebaseAdmin: jest.fn(),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, options?: any) => ({
      json: async () => data,
      status: options?.status || 200,
    }),
  },
}))

describe('API Route: /api/tasks/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // --- PATCH Endpoint Tests ---
  describe('PATCH', () => {
    it('should update a task successfully', async () => {
      // Import dependencies
      const { PATCH } = await import('./route')
      const { prisma } = await import('@/lib/prisma')
      const { getAuth } = await import('firebase-admin/auth')

      // Arrange
      const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>
      const mockVerifyIdToken = jest.fn()
      mockGetAuth.mockReturnValue({ verifyIdToken: mockVerifyIdToken } as any)
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })

      const mockTask = { id: 1, text: 'Original', authorId: 'user123' }
      const updatedTask = { id: 1, text: 'Updated', authorId: 'user123' }
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask)
      ;(prisma.task.update as jest.Mock).mockResolvedValue(updatedTask)

      // Act
      const mockRequest = {
        headers: { get: jest.fn().mockReturnValue('Bearer token123') },
        json: jest.fn().mockResolvedValue({ text: 'Updated' }),
      }
      const response = await PATCH(mockRequest as any, { params: { id: '1' } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.text).toBe('Updated')
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { text: 'Updated' },
      })
    })

    it('should return 401 for an unauthorized request', async () => {
      // Import dependencies
      const { PATCH } = await import('./route')
      const { getAuth } = await import('firebase-admin/auth')

      // Arrange
      const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>
      const mockVerifyIdToken = jest.fn()
      mockGetAuth.mockReturnValue({ verifyIdToken: mockVerifyIdToken } as any)
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

      // Act
      const mockRequest = {
        headers: { get: jest.fn().mockReturnValue('Bearer invalid-token') },
        json: jest.fn().mockResolvedValue({ text: 'Updated' }),
      }
      const response = await PATCH(mockRequest as any, { params: { id: '1' } })

      // Assert
      expect(response.status).toBe(401)
    })

    it('should return 404 if the task does not exist', async () => {
      // Import dependencies
      const { PATCH } = await import('./route')
      const { prisma } = await import('@/lib/prisma')
      const { getAuth } = await import('firebase-admin/auth')

      // Arrange: Authenticate user but have prisma return null for the task
      const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>
      const mockVerifyIdToken = jest.fn()
      mockGetAuth.mockReturnValue({ verifyIdToken: mockVerifyIdToken } as any)
      mockVerifyIdToken.mockResolvedValue({ uid: 'user123' })
      ;(prisma.task.findUnique as jest.Mock).mockResolvedValue(null)

      // Act
      const mockRequest = {
        headers: { get: jest.fn().mockReturnValue('Bearer token123') },
        json: jest.fn().mockResolvedValue({ text: 'Updated' }),
      }
      const response = await PATCH(mockRequest as any, {
        params: { id: '999' },
      })

      // Assert
      expect(response.status).toBe(404)
    })
  })
})
