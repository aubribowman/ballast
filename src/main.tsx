import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { PortfolioProvider } from './state/PortfolioProvider'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PortfolioProvider>
      <App />
    </PortfolioProvider>
  </StrictMode>,
)
