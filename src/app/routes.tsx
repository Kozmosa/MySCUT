import { Navigate, Route, Routes } from 'react-router-dom'
import { CoursesPage } from '../features/courses'
import { MineDetailPage, MinePage, ScheduleSettingsPage } from '../features/mine'

function AppRoutes() {
  return (
    <Routes>
      <Route path='/' element={<Navigate to='/courses' replace />} />
      <Route path='/courses' element={<CoursesPage />} />
      <Route path='/mine' element={<MinePage />} />
      <Route path='/mine/schedule-settings' element={<ScheduleSettingsPage />} />
      <Route path='/mine/global-settings' element={<MineDetailPage title='全局设置' />} />
      <Route path='/mine/faq' element={<MineDetailPage title='常见问答' />} />
      <Route path='/mine/more' element={<MineDetailPage title='更多' />} />
    </Routes>
  )
}

export default AppRoutes
