import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'antd/dist/reset.css'
import './index.css'
import App from './App'
import { GlobalThemeProvider } from './platform/web/theme/GlobalThemeProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GlobalThemeProvider>
  </React.StrictMode>,
)
