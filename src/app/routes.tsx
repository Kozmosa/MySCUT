import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

const isWebPlatform = import.meta.env.VITE_TARGET_PLATFORM === 'web'

const CoursesPage = lazy(async () => {
  const module = await import('../features/courses/CoursesPage')
  return { default: module.default }
})

const ManualPage = lazy(async () => {
  const module = await import('../features/manual/ManualPage')
  return { default: module.default }
})

const MinePage = lazy(async () => {
  const module = await import('../features/mine/MinePage')
  return { default: module.default }
})

const ScheduleSettingsPage = lazy(async () => {
  const module = await import('../features/mine/pages/ScheduleSettingsPage')
  return { default: module.default }
})

const ScheduleIntersectionPage = lazy(async () => {
  const module = await import('../features/mine/pages/ScheduleIntersectionPage')
  return { default: module.default }
})

const AiSettingsPage = lazy(async () => {
  const module = await import('../features/mine/pages/AiSettingsPage')
  return { default: module.default }
})

const ScutPdfImportPage = lazy(async () => {
  const module = await import('../features/mine/pages/ScutPdfImportPage')
  return { default: module.default }
})

const ScutJwImportPage = isWebPlatform
  ? null
  : lazy(async () => {
    const module = await import('../features/mine/pages/ScutJwImportPage')
    return { default: module.default }
  })

const MineDetailPage = lazy(async () => {
  const module = await import('../features/mine/MineDetailPage')
  return { default: module.default }
})

function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path='/' element={<Navigate to='/courses' replace />} />
        <Route path='/courses' element={<CoursesPage />} />
        <Route path='/courses/intersection-preview' element={<CoursesPage />} />
        <Route path='/manual' element={<ManualPage />} />
        <Route path='/mine' element={<MinePage />} />
        <Route path='/mine/schedule-settings' element={<ScheduleSettingsPage />} />
        <Route path='/mine/schedule-intersection' element={<ScheduleIntersectionPage />} />
        <Route path='/mine/ai-settings' element={<AiSettingsPage />} />
        <Route path='/mine/import-scut-pdf' element={<ScutPdfImportPage />} />
        <Route
          path='/mine/import-scut-jw'
          element={isWebPlatform || ScutJwImportPage === null ? <Navigate to='/mine/schedule-settings' replace /> : <ScutJwImportPage />}
        />
        <Route path='/mine/global-settings' element={<MineDetailPage title='全局设置' />} />
        <Route path='/mine/faq' element={<MineDetailPage title='常见问答' />} />
        <Route path='/mine/more' element={<MineDetailPage title='更多' />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
