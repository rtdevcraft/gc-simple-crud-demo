'use client'

import { useAuth } from '@/context/AuthContext'
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material'

export default function Header() {
  const { user, signIn, signOut } = useAuth()

  return (
    <AppBar position='static'>
      <Container maxWidth='xl'>
        <Toolbar disableGutters>
          <Typography
            variant='h6'
            component='div'
            sx={{ flexGrow: 1, fontWeight: 'bold' }}
          >
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
      </Container>
    </AppBar>
  )
}
