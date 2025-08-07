'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import TaskList from './TaskList'
import AddTaskForm from './AddTaskForm'
import { Container, Box, TextField } from '@mui/material'

export type Task = {
  id: number
  text: string
  completed: boolean
}

interface TaskContainerProps {
  initialTasks: Task[]
}

export default function TaskContainer({ initialTasks }: TaskContainerProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { idToken } = useAuth()

  const fetchTasks = useCallback(async () => {
    if (!idToken) return

    setIsLoading(true)
    setError(null)

    const url = `/api/tasks${
      searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''
    }`

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${idToken}` },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch tasks')
      }

      const data = await response.json()
      setTasks(data)
    } catch (err) {
      setError((err as Error).message)
      setTasks([])
    } finally {
      setIsLoading(false)
    }
  }, [idToken, searchTerm])

  useEffect(() => {
    if (searchTerm) {
      const debounceTimer = setTimeout(() => {
        fetchTasks()
      }, 300)
      return () => clearTimeout(debounceTimer)
    } else {
      setTasks(initialTasks)
    }
  }, [searchTerm, initialTasks, fetchTasks])

  const handleTaskAdded = (newTask: Task) => {
    setTasks((prevTasks) => [newTask, ...prevTasks])
  }

  return (
    <Container maxWidth='md' sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <AddTaskForm onTaskAdded={handleTaskAdded} />
      </Box>
      <Box>
        <TextField
          fullWidth
          variant='outlined'
          label='Search tasks...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TaskList tasks={tasks} isLoading={isLoading} error={error} />
      </Box>
    </Container>
  )
}
