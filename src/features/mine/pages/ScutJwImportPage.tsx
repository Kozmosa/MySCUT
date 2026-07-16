import { CloseOutlined } from '@ant-design/icons'
import { Capacitor, CapacitorCookies, CapacitorHttp } from '@capacitor/core'
import { DefaultWebViewOptions, InAppBrowser } from '@capacitor/inappbrowser'
import { useEffect, useRef, useState } from 'react'
import { Input, Modal, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import { parseScutScheduleHtml } from '../../../core/schedule/importScutHtml'
import {
  SCUT_JW_CAMPUS_URL,
  SCUT_JW_WEBVPN_URL,
  resolveScutJwEntryUrl,
  type ScutJwAccessMode,
} from '../../../core/schedule/scutJwAccess'
import { saveScheduleDataWithOptions } from '../../../core/schedule/storage'
import { resolveScheduleImportThemePreset } from '../../../core/schedule/themePresets'
import { getScheduleThemeId } from '../../../core/schedule/themeStorage'
import { getSemesterStartDate, saveSemesterStartDate } from '../../../core/scheduleSettings'

const SCUT_JW_ACCESS_OPTIONS: Array<{
  value: ScutJwAccessMode
  label: string
  description: string
}> = [
  {
    value: 'campus',
    label: '校园网',
    description: SCUT_JW_CAMPUS_URL,
  },
  {
    value: 'webvpn',
    label: '校外 WebVPN',
    description: SCUT_JW_WEBVPN_URL,
  },
  {
    value: 'custom',
    label: '自定义网址',
    description: '输入其他可访问的教务系统网址',
  },
]

// Override via localStorage for testing against mock server:
//   localStorage.setItem('scutJwMockUrl', 'http://10.0.2.2:8080/')
function getScutJwTargetUrl(targetUrl: string): string {
  try {
    const override = localStorage.getItem('scutJwMockUrl')
    if (override) {
      if (import.meta.env.DEV) {
        debugLog('[ScutJwImport] Using mock URL:', override)
      }
      return override
    }
  } catch {
    // localStorage may not be available
  }
  return targetUrl
}

function getCookieHeader(cookies: Record<string, string>) {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
}

function toTextResponseData(data: unknown) {
  if (typeof data === 'string') {
    return data
  }

  return JSON.stringify(data)
}

/** Debug logger — stripped from production bundles via import.meta.env.DEV */
function debugLog(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.log('[ScutJwImport]', ...args)
  }
}

function ScutJwImportPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [lastNavigatedUrl, setLastNavigatedUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isOpeningBrowser, setIsOpeningBrowser] = useState(false)
  const [isBrowserClosed, setIsBrowserClosed] = useState(false)
  const [accessMode, setAccessMode] = useState<ScutJwAccessMode>('campus')
  const [customUrl, setCustomUrl] = useState('')
  const hasShownGuideRef = useRef(false)
  const listenerHandlesRef = useRef<Array<{ remove: () => Promise<void> }>>([])

  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  const entryUrlResult = resolveScutJwEntryUrl(accessMode, customUrl)
  const customUrlError = accessMode === 'custom' && customUrl.trim() && !entryUrlResult.ok
    ? entryUrlResult.error
    : ''

  useEffect(() => {
    if (!isAndroidNative || hasShownGuideRef.current) {
      return
    }

    hasShownGuideRef.current = true
    Modal.info({
      title: '导入提示',
      content: '请选择当前可用的访问方式，登录教务系统并打开“个人课表查询”栏目，然后再点击“开始导入当前页面”。',
      okText: '知道了',
    })
  }, [isAndroidNative])

  useEffect(() => {
    if (!isAndroidNative) {
      return
    }

    let isUnmounted = false

    const setupListeners = async () => {
      const closedHandle = await InAppBrowser.addListener('browserClosed', () => {
        if (isUnmounted) {
          return
        }

        debugLog('[ScutJwImport] InAppBrowser closed by user')
        setIsBrowserClosed(true)
      })

      const navigationHandle = await InAppBrowser.addListener('browserPageNavigationCompleted', ({ url }) => {
        if (isUnmounted || !url) {
          return
        }

        debugLog('[ScutJwImport] Navigated to:', url)
        setLastNavigatedUrl(url)
      })

      listenerHandlesRef.current = [closedHandle, navigationHandle]
    }

    void setupListeners()

    return () => {
      isUnmounted = true
      const handles = listenerHandlesRef.current
      listenerHandlesRef.current = []
      void Promise.all(handles.map((handle) => handle.remove().catch(() => undefined)))
    }
  }, [isAndroidNative])

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/mine/schedule-settings', { replace: true })
  }

  const resetCapturedPage = () => {
    setLastNavigatedUrl('')
    setIsBrowserClosed(false)
  }

  const handleAccessModeChange = (nextAccessMode: ScutJwAccessMode) => {
    setAccessMode(nextAccessMode)
    resetCapturedPage()
  }

  const handleCustomUrlChange = (nextCustomUrl: string) => {
    setCustomUrl(nextCustomUrl)
    resetCapturedPage()
  }

  const handleOpenBrowser = async () => {
    if (!isAndroidNative || isOpeningBrowser) {
      return
    }

    if (!entryUrlResult.ok) {
      messageApi.error(entryUrlResult.error)
      return
    }

    setIsOpeningBrowser(true)
    resetCapturedPage()

    try {
      const targetUrl = getScutJwTargetUrl(entryUrlResult.url)
      debugLog('[ScutJwImport] Opening InAppBrowser to:', targetUrl)
      await InAppBrowser.openInWebView({
        url: targetUrl,
        options: {
          ...DefaultWebViewOptions,
          showURL: true,
          showToolbar: true,
          showNavigationButtons: true,
          closeButtonText: '关闭',
          android: {
            ...DefaultWebViewOptions.android,
            hardwareBack: true,
          },
        },
      })
      debugLog('[ScutJwImport] InAppBrowser closed')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '无法打开教务系统页面'
      console.error('[ScutJwImport] Failed to open browser:', error)
      messageApi.error(errorMessage)
    } finally {
      setIsOpeningBrowser(false)
    }
  }

  const handleStartImport = async () => {
    if (!isAndroidNative) {
      messageApi.error('仅支持安卓原生环境导入')
      return
    }

    if (!lastNavigatedUrl) {
      messageApi.error('请先打开教务系统并进入个人课表查询页面')
      return
    }

    debugLog('[ScutJwImport] ====== 开始导入 ======')
    debugLog('[ScutJwImport] 当前页面 URL:', lastNavigatedUrl)
    setIsImporting(true)

    try {
      debugLog('[ScutJwImport] 步骤1/6: 从', lastNavigatedUrl, '获取 Cookies')
      const cookies = await CapacitorCookies.getCookies({ url: lastNavigatedUrl })
      debugLog('[ScutJwImport] Cookies 获取结果:', JSON.stringify(cookies))
      const cookieHeader = getCookieHeader(cookies)
      debugLog('[ScutJwImport] Cookie Header:', cookieHeader || '(无)')

      debugLog('[ScutJwImport] 步骤2/6: 请求页面 HTML')
      const response = await CapacitorHttp.get({
        url: lastNavigatedUrl,
        headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
        responseType: 'text',
      })
      debugLog('[ScutJwImport] HTTP 响应状态:', response.status)
      debugLog('[ScutJwImport] HTTP 响应头:', JSON.stringify(response.headers))

      if (response.status >= 400) {
        throw new Error(`教务系统页面请求失败（${response.status}）`)
      }

      const htmlText = toTextResponseData(response.data)
      debugLog('[ScutJwImport] 步骤3/6: HTML 获取成功, 长度:', htmlText.length, '字符')
      debugLog('[ScutJwImport] HTML 前 200 字符:', htmlText.substring(0, 200).replace(/\n/g, '\\n'))
      debugLog('[ScutJwImport] HTML 后 200 字符:', htmlText.substring(Math.max(0, htmlText.length - 200)).replace(/\n/g, '\\n'))

      const fallbackSemesterStartDate = getSemesterStartDate()
      debugLog('[ScutJwImport] fallbackSemesterStartDate:', fallbackSemesterStartDate)

      debugLog('[ScutJwImport] 步骤4/6: 解析课表 HTML')
      let scheduleData
      try {
        scheduleData = parseScutScheduleHtml(htmlText, {
          fallbackSemesterStartDate,
        })
      } catch (parseError) {
        console.error('[ScutJwImport] 解析失败:', parseError)
        throw parseError
      }
      debugLog('[ScutJwImport] 解析成功:')
      debugLog('[ScutJwImport]   - 课程数量:', scheduleData.courses.length)
      debugLog('[ScutJwImport]   - 课程列表:', scheduleData.courses.map((c) => c.name).join(', '))
      debugLog('[ScutJwImport]   - 课程节数:', scheduleData.lessons.length)
      debugLog('[ScutJwImport]   - 课表名称:', scheduleData.table.name)
      debugLog('[ScutJwImport]   - 学期开始:', scheduleData.table.startDate)
      debugLog('[ScutJwImport]   - 最大周数:', scheduleData.table.maxWeek)
      debugLog('[ScutJwImport]   - 显示周六:', scheduleData.table.showSat)
      debugLog('[ScutJwImport]   - 显示周日:', scheduleData.table.showSun)

      // Log each lesson for debugging
      scheduleData.lessons.forEach((lesson, i) => {
        debugLog(`[ScutJwImport]   lesson[${i}]: day=${lesson.day} node=${lesson.startNode}-${lesson.endNode} week=${lesson.startWeek}-${lesson.endWeek} step=${lesson.weekStep} room=${lesson.room} teacher=${lesson.teacher}`)
      })

      const themePreset = resolveScheduleImportThemePreset(getScheduleThemeId())
      const themeId = themePreset.id
      const nextSemesterStartDate = scheduleData.table.startDate || fallbackSemesterStartDate

      debugLog('[ScutJwImport] 步骤5/6: 保存课表')
      debugLog('[ScutJwImport]   - 主题:', themeId, themePreset.name)
      debugLog('[ScutJwImport]   - 学期开始:', nextSemesterStartDate)

      const result = await saveScheduleDataWithOptions(scheduleData, {
        themeId,
        timeSlotPresetId: 'builtIn',
        semesterStartDate: nextSemesterStartDate,
        preferredName: scheduleData.table.name,
        setActive: true,
      })

      if (!result.ok) {
        throw new Error('课表保存失败，请稍后重试')
      }

      debugLog('[ScutJwImport] 步骤6/6: 持久化学期开始日期')
      saveSemesterStartDate(nextSemesterStartDate)

      debugLog('[ScutJwImport] ====== 导入成功 ======')
      messageApi.success(`华工教务课表导入成功，已按当前主题“${themePreset.name}”上色`)
      // Navigate to courses — the user's goal is to see the imported schedule.
      // Using replace avoids adding a duplicate history entry that would cause
      // a white screen on back navigation (the settings page already mounted
      // with closing animation, and navigate(-1) to a same-URL entry would
      // keep the stale closing state without re-rendering).
      navigate('/courses', { replace: true })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '华工教务课表导入失败'
      console.error('[ScutJwImport] ====== 导入失败 ======')
      console.error('[ScutJwImport] 错误信息:', errorMessage)
      console.error('[ScutJwImport] 原始错误:', error)
      messageApi.error(errorMessage)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <section className='schedule-settings-page'>
      {contextHolder}

      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>从华工教务系统导入</p>
          <p className='schedule-settings-subtitle'>SCUT In-App Import</p>
        </div>

        <CircleIconButton ariaLabel='关闭页面' icon={<CloseOutlined />} onClick={handleClose} />
      </header>

      <div className='schedule-settings-content'>
        {!isAndroidNative ? (
          <p className='schedule-pdf-error'>当前环境不支持该功能，请在安卓原生应用中使用。</p>
        ) : (
          <>
            <fieldset className='scut-jw-access-group'>
              <legend className='scut-jw-access-legend'>访问方式</legend>
              <div className='scut-jw-access-options'>
                {SCUT_JW_ACCESS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`scut-jw-access-option ${accessMode === option.value ? 'is-active' : ''}`}
                  >
                    <input
                      type='radio'
                      name='scut-jw-access-mode'
                      value={option.value}
                      checked={accessMode === option.value}
                      onChange={() => handleAccessModeChange(option.value)}
                    />
                    <span className='scut-jw-access-radio' aria-hidden='true' />
                    <span className='scut-jw-access-copy'>
                      <span className='scut-jw-access-label'>
                        {option.label}
                        {option.value === 'campus' ? <span className='scut-jw-access-badge'>默认</span> : null}
                      </span>
                      <span className='scut-jw-access-description'>{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>

              {accessMode === 'custom' ? (
                <div className='scut-jw-custom-url'>
                  <Input
                    value={customUrl}
                    onChange={(event) => handleCustomUrlChange(event.target.value)}
                    placeholder='例如 jw.example.edu.cn'
                    inputMode='url'
                    autoCapitalize='none'
                    autoCorrect='off'
                    spellCheck={false}
                    status={customUrlError ? 'error' : undefined}
                    aria-invalid={Boolean(customUrlError)}
                    aria-describedby='scut-jw-custom-url-hint'
                  />
                  <p
                    id='scut-jw-custom-url-hint'
                    className={`scut-jw-custom-url-hint ${customUrlError ? 'is-error' : ''}`}
                    role={customUrlError ? 'alert' : undefined}
                  >
                    {customUrlError || '未填写协议时将自动使用 HTTPS'}
                  </p>
                </div>
              ) : null}
            </fieldset>

            <div className='scut-jw-tip-card'>
              <p className='scut-jw-tip-title'>操作提示</p>
              <p className='scut-jw-tip-text'>1. 选择访问方式，点击“打开教务系统”并完成登录</p>
              <p className='scut-jw-tip-text'>2. 在内置浏览器中进入“个人课表查询”栏目</p>
              <p className='scut-jw-tip-text'>3. 返回此页点击“开始导入当前页面”</p>
            </div>

            <div className='mine-button-group'>
              <button type='button' className='mine-group-button schedule-settings-action' onClick={() => {
                void handleOpenBrowser()
              }} disabled={isOpeningBrowser || !entryUrlResult.ok}>
                {isOpeningBrowser ? '正在打开...' : '打开教务系统'}
              </button>
              <button
                type='button'
                className='mine-group-button schedule-settings-action'
                onClick={() => {
                  void handleStartImport()
                }}
                disabled={isImporting || !lastNavigatedUrl}
              >
                {isImporting ? '导入中...' : '开始导入当前页面'}
              </button>
            </div>

            <div className='scut-jw-status-card'>
              <p className='schedule-settings-current-date'>当前捕获页面：{lastNavigatedUrl || '尚未检测到导航页面'}</p>
              <p className='schedule-settings-current-date'>
                浏览器状态：{isBrowserClosed ? '已关闭，可开始导入' : '请在内置浏览器中完成登录与页面跳转'}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default ScutJwImportPage
