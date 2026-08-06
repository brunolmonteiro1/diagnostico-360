import { BrowserRouter } from 'react-router-dom'
import { SessaoProvider } from './app/auth/SessaoProvider'
import { AppRoutes } from './routes'

export default function App() {
  return (
    <BrowserRouter>
      <SessaoProvider>
        <AppRoutes />
      </SessaoProvider>
    </BrowserRouter>
  )
}
