'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  Container,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Box,
  CircularProgress,
  AppBar,
  Toolbar,
  Checkbox,
} from '@mui/material'
import { Edit, Add, Save, Clear } from '@mui/icons-material'

// Define the shape of a task object
interface Task {
  id: number
  text: string
  completed: boolean
  createdAt: string
}

export default function HomePage() {
  const { user, signIn, signOut, idToken, loading: authLoading } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskText, setNewTaskText] = useState('')
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editText, setEditText] = useState('')

  // Effect to fetch tasks when the user's authentication state is known
  useEffect(() => {
    const fetchTasks = async () => {
      if (!idToken) {
        setTasks([])
        setLoadingTasks(false)
        return
      }
      try {
        setLoadingTasks(true)
        const response = await fetch('/api/tasks', {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        if (!response.ok) throw new Error('Failed to fetch tasks')
        const data: Task[] = await response.json()
        setTasks(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoadingTasks(false)
      }
    }
    if (!authLoading) {
      fetchTasks()
    }
  }, [idToken, authLoading])

  // Handler to create a new task
  const handleAddTask = async () => {
    if (newTaskText.trim() === '' || !idToken) return
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ text: newTaskText }),
      })
      if (!response.ok) throw new Error('Failed to add task')
      const newTask: Task = await response.json()
      setTasks([newTask, ...tasks])
      setNewTaskText('')
    } catch (error) {
      console.error(error)
    }
  }

  // Optimistic update for deleting a task
  const handleDeleteTask = async (taskIdToDelete: number) => {
    if (!idToken) return

    const originalTasks = tasks
    // Immediately update the UI
    setTasks(tasks.filter((task) => task.id !== taskIdToDelete))

    // Send the request to the server in the background
    try {
      const response = await fetch(`/api/tasks/${taskIdToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (!response.ok) {
        // If the server fails, revert the UI change
        setTasks(originalTasks)
        throw new Error('Failed to delete task')
      }
    } catch (error) {
      console.error(error)
      // Also revert on network error
      setTasks(originalTasks)
    }
  }

  // Handler to update a task's text
  const handleUpdateTask = async () => {
    if (!editingTask || editText.trim() === '' || !idToken) return
    try {
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ text: editText }),
      })
      if (!response.ok) throw new Error('Failed to update task')
      const updatedTask: Task = await response.json()
      setTasks(
        tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
      )
      setEditingTask(null)
      setEditText('')
    } catch (error) {
      console.error(error)
    }
  }

  // Optimistic update for toggling a task's completion status
  const handleToggleComplete = async (taskToToggle: Task) => {
    if (!idToken) return

    const originalTasks = tasks
    // Immediately update the UI by flipping the 'completed' status
    const optimisticallyUpdatedTasks = tasks.map((task) =>
      task.id === taskToToggle.id
        ? { ...task, completed: !task.completed }
        : task
    )
    setTasks(optimisticallyUpdatedTasks)

    // Send the request to the server in the background
    try {
      const response = await fetch(`/api/tasks/${taskToToggle.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ completed: !taskToToggle.completed }),
      })
      if (!response.ok) {
        // If the server fails, revert the UI change
        setTasks(originalTasks)
        throw new Error('Failed to update task')
      }
    } catch (error) {
      console.error(error)
      // Also revert on network error
      setTasks(originalTasks)
    }
  }

  if (authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <AppBar position='static'>
        <Toolbar>
          <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
            Task Manager
          </Typography>
          {user ? (
            <Button color='inherit' onClick={signOut}>
              Sign Out
            </Button>
          ) : (
            <Button color='inherit' onClick={signIn}>
              Sign In with Google
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Container component='main' maxWidth='md' sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant='h4' component='h1' gutterBottom>
            My Tasks
          </Typography>
          {!user ? (
            <Typography>Please sign in to manage your tasks.</Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <TextField
                  label='New Task'
                  variant='outlined'
                  fullWidth
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                />
                <Button
                  variant='contained'
                  color='primary'
                  onClick={handleAddTask}
                  startIcon={<Add />}
                  disabled={!newTaskText.trim()}
                >
                  Add Task
                </Button>
              </Box>
              {loadingTasks ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {tasks.map((task) => (
                    <ListItem
                      key={task.id}
                      secondaryAction={
                        editingTask?.id === task.id ? (
                          <IconButton
                            edge='end'
                            aria-label='save'
                            onClick={handleUpdateTask}
                          >
                            <Save />
                          </IconButton>
                        ) : (
                          <>
                            <IconButton
                              edge='end'
                              aria-label='edit'
                              sx={{
                                mr: 1,
                                '&:hover': { color: '#4db6ac' },
                              }}
                              onClick={() => {
                                setEditingTask(task)
                                setEditText(task.text)
                              }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              edge='end'
                              aria-label='delete'
                              sx={{
                                '&:hover': { color: 'error.main' },
                              }}
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Clear />
                            </IconButton>
                          </>
                        )
                      }
                    >
                      <Checkbox
                        edge='start'
                        checked={task.completed}
                        tabIndex={-1}
                        disableRipple
                        onChange={() => handleToggleComplete(task)}
                      />
                      {editingTask?.id === task.id ? (
                        <TextField
                          variant='standard'
                          fullWidth
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === 'Enter' && handleUpdateTask()
                          }
                          autoFocus
                        />
                      ) : (
                        <ListItemText
                          primary={task.text}
                          sx={{
                            textDecoration: task.completed
                              ? 'line-through'
                              : 'none',
                          }}
                        />
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </>
          )}
        </Paper>
      </Container>
    </>
  )
}
