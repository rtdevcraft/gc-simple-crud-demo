import { NextRequest } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { initializeFirebaseAdmin } from './firebase-admin'

export async function getUserIdFromToken(
  request: NextRequest
): Promise<string | null> {
  initializeFirebaseAdmin() // Ensure Firebase is initialized

  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return null
  }

  const token = authHeader.split('Bearer ')[1]
  if (!token) {
    return null
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken.uid
  } catch {
    // console.error('Error verifying auth token:', error);
    return null
  }
}
