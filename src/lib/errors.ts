export class HttpError extends Error {
  // 1. Declare the statusCode property and its type
  statusCode: number

  // 2. Add types to the constructor parameters
  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
  }
}
