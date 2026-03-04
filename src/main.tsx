import React from 'react'
import ReactDOM from 'react-dom/client'
import { message } from 'antd'
import { BrowserRouter } from 'react-router-dom'
import 'antd/dist/reset.css'
import './index.css'
import App from './App'
import { GlobalThemeProvider } from './platform/web/theme/GlobalThemeProvider'

message.config({
  top: 'calc(env(safe-area-inset-top) + 24px)',
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GlobalThemeProvider>
  </React.StrictMode>,
)
