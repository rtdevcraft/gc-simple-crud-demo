import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HomePage from './page' // Assuming this is the path to your HomePage component
import { useAuth } from '@/context/AuthContext'
import '@testing-library/jest-dom'

// Mock the AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}))

// Mock MUI components to simplify testing
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'), // Import and retain default exports
  CircularProgress: () => <div data-testid='spinner'>Loading...</div>,
}))

// Type assertion for the mocked hook
const useAuthMock = useAuth as jest.Mock

// Mock the global fetch function
global.fetch = jest.fn()

const mockUser = {
  displayName: 'Test User',
  uid: 'test-uid-123',
}

const mockTasks = [
  {
    id: 1,
    text: 'First task',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    text: 'Second task',
    completed: true,
    createdAt: new Date().toISOString(),
  },
]

describe('HomePage Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    // Reset fetch mock
    ;(fetch as jest.Mock).mockClear()
  })

  it('should render a loading spinner while auth is loading', () => {
    useAuthMock.mockReturnValue({
      user: null,
      idToken: null,
      loading: true,
    })
    render(<HomePage />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('should show a sign-in message when user is not authenticated', () => {
    useAuthMock.mockReturnValue({
      user: null,
      idToken: null,
      loading: false,
    })
    render(<HomePage />)
    expect(
      screen.getByText('Please sign in to manage your tasks.')
    ).toBeInTheDocument()
    expect(screen.getByText('Sign In with Google')).toBeInTheDocument()
  })

  describe('when user is authenticated', () => {
    beforeEach(() => {
      useAuthMock.mockReturnValue({
        user: mockUser,
        idToken: 'fake-id-token',
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
      })
    })

    it('should fetch and display tasks', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      })

      render(<HomePage />)
      expect(screen.getByTestId('spinner')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('First task')).toBeInTheDocument()
        expect(screen.getByText('Second task')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
    })

    it('should handle failure when fetching tasks', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      render(<HomePage />)

      await waitFor(() => {
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument()
        expect(screen.queryByText('First task')).not.toBeInTheDocument()
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          new Error('Failed to fetch tasks')
        )
      })
      consoleErrorSpy.mockRestore()
    })

    it('should allow a user to add a new task', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      render(<HomePage />)
      await waitFor(() =>
        expect(screen.getByLabelText('New Task')).toBeInTheDocument()
      )

      const newTask = {
        id: 3,
        text: 'Newly added task',
        completed: false,
        createdAt: new Date().toISOString(),
      }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => newTask,
      })

      fireEvent.change(screen.getByLabelText('New Task'), {
        target: { value: 'Newly added task' },
      })
      fireEvent.click(screen.getByText('Add Task'))

      await waitFor(() =>
        expect(screen.getByText('Newly added task')).toBeInTheDocument()
      )
      expect(screen.getByLabelText('New Task')).toHaveValue('')
    })

    it('should handle failure when adding a new task', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      render(<HomePage />)
      await waitFor(() =>
        expect(screen.getByLabelText('New Task')).toBeInTheDocument()
      )

      // Mock a failed POST request
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })

      fireEvent.change(screen.getByLabelText('New Task'), {
        target: { value: 'This will fail' },
      })
      fireEvent.click(screen.getByText('Add Task'))

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          new Error('Failed to add task')
        )
        // The input should NOT be cleared on failure
        expect(screen.getByLabelText('New Task')).toHaveValue('This will fail')
      })
      consoleErrorSpy.mockRestore()
    })

    it('should allow a user to edit a task', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      })
      render(<HomePage />)
      await waitFor(() =>
        expect(screen.getByText('First task')).toBeInTheDocument()
      )

      const editButtons = screen.getAllByLabelText('edit')
      fireEvent.click(editButtons[0])

      const editInput = screen.getByDisplayValue('First task')
      expect(editInput).toBeInTheDocument()

      const updatedTask = { ...mockTasks[0], text: 'Updated first task' }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTask,
      })

      fireEvent.change(editInput, { target: { value: 'Updated first task' } })
      fireEvent.keyPress(editInput, {
        key: 'Enter',
        code: 'Enter',
        charCode: 13,
      })

      await waitFor(() => {
        expect(screen.getByText('Updated first task')).toBeInTheDocument()
        expect(
          screen.queryByDisplayValue('Updated first task')
        ).not.toBeInTheDocument()
      })
    })

    it('should allow a user to delete a task', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      })
      render(<HomePage />)
      await waitFor(() =>
        expect(screen.getByText('First task')).toBeInTheDocument()
      )
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 204 })

      fireEvent.click(screen.getAllByLabelText('delete')[0])
      await waitFor(() =>
        expect(screen.queryByText('First task')).not.toBeInTheDocument()
      )
    })

    it('should revert the UI if deleting a task fails', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      })
      render(<HomePage />)
      await waitFor(() =>
        expect(screen.getByText('First task')).toBeInTheDocument()
      )

      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })

      fireEvent.click(screen.getAllByLabelText('delete')[0])

      await waitFor(() =>
        expect(screen.queryByText('First task')).not.toBeInTheDocument()
      )

      await waitFor(() =>
        expect(screen.getByText('First task')).toBeInTheDocument()
      )
    })

    it('should allow a user to toggle a task as complete', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      })
      render(<HomePage />)
      await waitFor(() =>
        expect(screen.getByText('First task')).toBeInTheDocument()
      )

      const updatedTask = { ...mockTasks[0], completed: true }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTask,
      })

      fireEvent.click(screen.getAllByRole('checkbox')[0])
      await waitFor(() => {
        expect(screen.getByText('First task').parentElement).toHaveStyle(
          'text-decoration: line-through'
        )
      })
    })

    it('should revert the UI if toggling a task fails', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      })
      render(<HomePage />)
      await waitFor(() =>
        expect(screen.getByText('First task')).toBeInTheDocument()
      )

      // The first task is initially not complete
      const firstTaskCheckbox = screen.getAllByRole('checkbox')[0]
      expect(firstTaskCheckbox).not.toBeChecked()

      // Mock a failed PATCH request
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: false })

      // Click the checkbox
      fireEvent.click(firstTaskCheckbox)

      // It should immediately appear checked due to optimistic update
      await waitFor(() => expect(firstTaskCheckbox).toBeChecked())

      // Then, after the API call fails, it should revert to being unchecked
      await waitFor(() => expect(firstTaskCheckbox).not.toBeChecked())
    })
  })
})
