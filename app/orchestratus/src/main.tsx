import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@mantine/core/styles.css'
import { createTheme, MantineProvider } from '@mantine/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { queryClient } from './queryClient.ts'

const theme = createTheme({
  primaryColor: 'violet',
  primaryShade: 5,
  defaultRadius: 'md',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  headings: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  colors: {
    violet: [
      '#f4f0ff',
      '#e7ddff',
      '#cdbaff',
      '#b093ff',
      '#9873ff',
      '#8257e6',
      '#6d42c7',
      '#5632a3',
      '#3d2475',
      '#28184c',
    ],
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} forceColorScheme="dark">
        <App />
        <Toaster richColors position="top-right" />
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>,
)
