import { NextRequest } from 'next/server'
import { getUserIdFromToken } from './utils'
import { getAuth } from 'firebase-admin/auth'
import { initializeFirebaseAdmin } from './firebase-admin'

// Mock the dependencies
jest.mock('./firebase-admin', () => ({
  initializeFirebaseAdmin: jest.fn(),
}))

const mockVerifyIdToken = jest.fn()
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}))

// Helper to create a mock NextRequest
const createMockRequest = (headers: HeadersInit = {}): NextRequest => {
  return new NextRequest('http://localhost/api/test', { headers })
}

describe('getUserIdFromToken', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  it('should return a user ID for a valid token', async () => {
    const mockUid = 'user-abc-123'
    mockVerifyIdToken.mockResolvedValue({ uid: mockUid })

    const request = createMockRequest({
      Authorization: 'Bearer valid-fake-token',
    })

    const userId = await getUserIdFromToken(request)

    expect(userId).toBe(mockUid)
    expect(initializeFirebaseAdmin).toHaveBeenCalled()
    expect(getAuth).toHaveBeenCalled()
    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-fake-token')
  })

  it('should return null if the token is invalid', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'))

    const request = createMockRequest({
      Authorization: 'Bearer invalid-fake-token',
    })

    const userId = await getUserIdFromToken(request)

    expect(userId).toBeNull()
  })

  it('should return null if the Authorization header is missing', async () => {
    const request = createMockRequest() // No headers

    const userId = await getUserIdFromToken(request)

    expect(userId).toBeNull()
    // verifyIdToken should not be called if there's no header
    expect(mockVerifyIdToken).not.toHaveBeenCalled()
  })

  it('should return null if the Authorization header is malformed (not Bearer)', async () => {
    const request = createMockRequest({
      Authorization: 'Basic some-other-auth',
    })

    const userId = await getUserIdFromToken(request)

    expect(userId).toBeNull()
    expect(mockVerifyIdToken).not.toHaveBeenCalled()
  })

  it('should return null if the token is missing after "Bearer "', async () => {
    const request = createMockRequest({
      Authorization: 'Bearer ',
    })

    const userId = await getUserIdFromToken(request)

    expect(userId).toBeNull()
    expect(mockVerifyIdToken).not.toHaveBeenCalled()
  })
})
