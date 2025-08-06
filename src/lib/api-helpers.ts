import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { HttpError } from './errors'
import logger from './logger'

// --- Type Definitions for our wrappers ---
// Defines the shape of the 'params' object from dynamic routes (e.g., { id: '123' })
export type RouteContext = {
  params: { [key: string]: string | string[] | undefined }
}

type RouteHandler = (
  req: NextRequest,
  context: RouteContext,
  auth: { userId: string }
) => Promise<NextResponse | Response>

type AuthenticatedRouteHandler = (
  req: NextRequest,
  context: RouteContext
) => Promise<NextResponse | Response>

// --- Wrapper 1: Handles Authentication ---
export function withAuthentication(
  handler: RouteHandler
): AuthenticatedRouteHandler {
  return async (req, context) => {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'Unauthorized: Missing or invalid token.')
    }

    const token = authHeader.split('Bearer ')[1]
    try {
      const decodedToken = await getAuth().verifyIdToken(token)
      return handler(req, context, { userId: decodedToken.uid })
    } catch {
      // The original 'error' variable was unused, so we can omit it.
      throw new HttpError(401, 'Unauthorized: Invalid token.')
    }
  }
}

// --- Wrapper 2: Handles Errors ---
export function withErrorHandler(
  handler: AuthenticatedRouteHandler
): AuthenticatedRouteHandler {
  return async (req, context) => {
    const traceHeader = req.headers.get('x-cloud-trace-context')
    const [trace] = traceHeader ? traceHeader.split('/') : [null]

    // Use NEXT_PUBLIC_FIREBASE_PROJECT_ID since it's already available at runtime from the build.
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

    const requestLogger = logger.child(
      trace && projectId
        ? {
            'logging.googleapis.com/trace': `projects/${projectId}/traces/${trace}`,
          }
        : {}
    )

    try {
      return await handler(req, context)
    } catch (error) {
      if (error instanceof HttpError) {
        requestLogger.warn(
          { statusCode: error.statusCode, message: error.message },
          'API Error'
        )
        return NextResponse.json(
          { message: error.message },
          { status: error.statusCode }
        )
      }

      requestLogger.error(
        { err: error, message: (error as Error).message },
        'An unexpected API error occurred.'
      )
      return NextResponse.json(
        { message: 'An internal server error occurred.' },
        { status: 500 }
      )
    }
  }
}
