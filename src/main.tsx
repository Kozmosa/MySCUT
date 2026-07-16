import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import 'antd/dist/reset.css'
import './index.css'
import App from './App'
import { GlobalThemeProvider } from './platform/web/theme/GlobalThemeProvider'
import { bootstrapApplicationStorage } from './platform/storage/bootstrapApplicationStorage'
import { StorageRuntimeProvider } from './platform/storage/StorageRuntimeProvider'

const Router = import.meta.env.VITE_TARGET_PLATFORM === 'ohos' ? HashRouter : BrowserRouter

async function renderApplication() {
  const storageRuntime = await bootstrapApplicationStorage()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <StorageRuntimeProvider initialRuntime={storageRuntime}>
        <GlobalThemeProvider>
          <Router>
            <App />
          </Router>
        </GlobalThemeProvider>
      </StorageRuntimeProvider>
    </React.StrictMode>,
  )
}

void renderApplication()

if (__PWA_ENABLED__ && import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
