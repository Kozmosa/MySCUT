import { Navigate, Route, Routes } from 'react-router-dom'
import { CoursesPage } from '../features/courses'
import { MinePage } from '../features/mine'

function AppRoutes() {
  return (
    <Routes>
      <Route path='/' element={<Navigate to='/courses' replace />} />
      <Route path='/courses' element={<CoursesPage />} />
      <Route path='/mine' element={<MinePage />} />
    </Routes>
  )
}

export default AppRoutes
