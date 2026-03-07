import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import 'antd/dist/reset.css'
import './index.css'
import App from './App'
import { GlobalThemeProvider } from './platform/web/theme/GlobalThemeProvider'

const Router = import.meta.env.VITE_TARGET_PLATFORM === 'ohos' ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalThemeProvider>
      <Router>
        <App />
      </Router>
    </GlobalThemeProvider>
  </React.StrictMode>,
)

if (__PWA_ENABLED__ && import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
