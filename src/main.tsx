import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { PortfolioProvider } from './state/PortfolioProvider'
import './index.css'

// App entry point. PortfolioProvider wraps the whole app so every page and
// component shares one portfolio (see state/PortfolioProvider.tsx).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PortfolioProvider>
      <App />
    </PortfolioProvider>
  </StrictMode>,
)
