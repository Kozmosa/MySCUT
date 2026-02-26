import { NavLink, useLocation } from 'react-router-dom'
import AppRoutes from './app/routes'
import { useHardwareBackButton } from './platform/capacitor/useHardwareBackButton'

function App() {
  useHardwareBackButton()

  const location = useLocation()
  const isMineDetailPage = location.pathname.startsWith('/mine/')
  const isCoursesPage = location.pathname === '/courses'

  return (
    <div className='app-shell'>
      <main
        className={`page-content ${isMineDetailPage ? 'page-content--fullscreen' : ''} ${isCoursesPage ? 'page-content--courses' : ''}`}
      >
        <AppRoutes />
      </main>

      {!isMineDetailPage && (
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
      )}
    </div>
  )
}

export default App
