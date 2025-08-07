import { AuthProvider } from '@/context/AuthContext'
import Header from '@/app/components/Header'
import TaskContainer from '@/app/components/TaskContainer'
import { getTasks } from '@/app/components/TaskList'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { cookies } from 'next/headers'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
})

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('firebaseIdToken')?.value
  const initialTasks = await getTasks(token, '')

  return (
    <AuthProvider>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Header />
        <main>
          <TaskContainer initialTasks={initialTasks} />
        </main>
      </ThemeProvider>
    </AuthProvider>
  )
}
