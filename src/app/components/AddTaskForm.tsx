'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Task } from './TaskContainer'
import { TextField, Button, Box, Alert } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

interface AddTaskFormProps {
  onTaskAdded: (task: Task) => void
}

export default function AddTaskForm({ onTaskAdded }: AddTaskFormProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { idToken } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !idToken) return

    setError(null)

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to add task')
      }

      const newTask = await response.json()
      onTaskAdded(newTask)
      setText('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Box
      component='form'
      onSubmit={handleSubmit}
      sx={{ display: 'flex', gap: 1 }}
    >
      <TextField
        fullWidth
        variant='outlined'
        label='What needs to be done?'
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button
        type='submit'
        variant='contained'
        color='primary'
        disabled={!text.trim()}
        startIcon={<AddIcon />}
        sx={{ flexShrink: 0 }}
      >
        Add Task
      </Button>
      {error && (
        <Alert severity='error' sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  )
}
