'use client'

import { Task } from './TaskContainer'
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material'

interface TaskListProps {
  tasks: Task[]
  isLoading: boolean
  error: string | null
}

export default function TaskList({ tasks, isLoading, error }: TaskListProps) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ mt: 2 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
      {tasks.length > 0 ? (
        <List>
          {tasks.map((task) => (
            <ListItem
              key={task.id}
              sx={{
                textDecoration: task.completed ? 'line-through' : 'none',
                color: task.completed ? 'text.disabled' : 'text.primary',
              }}
            >
              <ListItemText primary={task.text} />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography
          variant='body1'
          align='center'
          sx={{ p: 4, color: 'text.secondary' }}
        >
          No tasks found.
        </Typography>
      )}
    </Box>
  )
}

// SERVER-SIDE DATA FETCHING FUNCTION
export async function getTasks(
  token: string | undefined,
  searchTerm: string
): Promise<Task[]> {
  const { headers } = await import('next/headers')
  const logger = (await import('@/lib/logger')).default

  if (!token) {
    return []
  }

  const headerStore = await headers()
  const traceHeader = headerStore.get('x-cloud-trace-context')
  const [trace] = traceHeader ? traceHeader.split('/') : [null]
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  const serverLogger = logger.child(
    trace && projectId
      ? {
          'logging.googleapis.com/trace': `projects/${projectId}/traces/${trace}`,
        }
      : {}
  )

  const host = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
  const url = `${host}/api/tasks${
    searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
  }`

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      serverLogger.error({
        message: 'Failed to fetch tasks from upstream API on the server.',
        context: { functionName: 'getTasks' },
        api: {
          url,
          method: 'GET',
          statusCode: response.status,
          statusText: response.statusText,
        },
      })
      return []
    }

    return response.json()
  } catch (error) {
    serverLogger.error({
      message:
        'An unexpected error occurred while fetching tasks on the server.',
      context: { functionName: 'getTasks', url },
      error: {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
    })
    return []
  }
}
