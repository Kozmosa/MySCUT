import { NavLink } from 'react-router-dom'
import AppRoutes from './app/routes'

function App() {
  return (
    <div className='app-shell'>
      <main className='page-content'>
        <AppRoutes />
      </main>

      <nav className='bottom-nav' aria-label='底部导航'>
        <NavLink
          to='/courses'
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'is-active' : ''}`
          }
        >
          课程
        </NavLink>
        <NavLink
          to='/mine'
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'is-active' : ''}`
          }
        >
          我的
        </NavLink>
      </nav>
    </div>
  )
}

export default App
