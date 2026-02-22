import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'mapbox-gl/dist/mapbox-gl.css'
import './index.css'
import App from './App.jsx'
import { AppThemeProvider } from './theme/AppThemeProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
  </StrictMode>,
)
