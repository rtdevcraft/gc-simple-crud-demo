import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  User,
} from 'firebase/auth'

// Mock the dependencies
jest.mock('@/lib/firebase-client', () => ({
  auth: {}, // Mock the auth object from firebase-client
}))

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(() => {
    return jest.fn() // Return a mock unsubscribe function
  }),
  signOut: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
}))

jest.mock('@mui/material', () => ({
  Box: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='loading-box'>{children}</div>
  ),
  CircularProgress: () => <div data-testid='spinner'>Loading...</div>,
}))

// A simple test component to consume and display the context values
const TestConsumerComponent = () => {
  const { user, loading, signIn, signOut, idToken } = useAuth()

  if (loading) {
    return <div>App is loading</div>
  }

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.displayName}</p>
          <p>Token: {idToken}</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <div>
          <p>No user is signed in.</p>
          <button onClick={signIn}>Sign In</button>
        </div>
      )}
    </div>
  )
}

// Type assertion for the mocked function
const mockedOnAuthStateChanged = onAuthStateChanged as jest.Mock

describe('AuthProvider', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  it('should render the loading spinner initially', () => {
    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    )
    // The provider itself shows the spinner, not the consumer
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
    expect(screen.queryByText('App is loading')).not.toBeInTheDocument()
  })

  it('should render children with no user when auth state is null', async () => {
    // Simulate onAuthStateChanged finding no user
    mockedOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null) // No user
      return jest.fn() // Return an unsubscribe function
    })

    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    )

    // Wait for the loading state to resolve
    await waitFor(() => {
      expect(screen.queryByText('App is loading')).not.toBeInTheDocument()
    })

    expect(screen.getByText('No user is signed in.')).toBeInTheDocument()
  })

  it('should render children with user data when auth state changes', async () => {
    const mockUser: Partial<User> = {
      displayName: 'Test User',
      uid: 'test-uid-123',
      getIdToken: jest.fn().mockResolvedValue('fake-jwt-token'),
    }

    // Simulate onAuthStateChanged finding a user
    mockedOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser as User)
      return jest.fn()
    })

    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User')).toBeInTheDocument()
    })

    expect(screen.getByText('Token: fake-jwt-token')).toBeInTheDocument()
    expect(mockUser.getIdToken).toHaveBeenCalled()
  })

  it('should call signInWithPopup when signIn is called', async () => {
    // Start with no user
    mockedOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null)
      return jest.fn()
    })

    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    const signInButton = screen.getByText('Sign In')
    fireEvent.click(signInButton)

    expect(signInWithPopup).toHaveBeenCalled()
    expect(GoogleAuthProvider).toHaveBeenCalled()
  })

  it('should call firebaseSignOut when signOut is called', async () => {
    const mockUser: Partial<User> = {
      displayName: 'Test User',
      uid: 'test-uid-123',
      getIdToken: jest.fn().mockResolvedValue('fake-jwt-token'),
    }

    // Start with a logged-in user
    mockedOnAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser as User)
      return jest.fn()
    })

    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    expect(signOut).toHaveBeenCalled()
  })
})
