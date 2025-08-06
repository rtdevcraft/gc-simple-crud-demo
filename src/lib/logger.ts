import pino from 'pino'

// Create a logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // In a serverless environment like Vercel or Cloud Run, logs are written to stdout.
  // pino-pretty is a development-only transport to make logs more readable.
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname', // These are less useful in serverless contexts
          },
        }
      : undefined,
})

export default logger
