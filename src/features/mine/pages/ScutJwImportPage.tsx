import { CloseOutlined } from '@ant-design/icons'
import { Capacitor, CapacitorCookies, CapacitorHttp } from '@capacitor/core'
import { DefaultWebViewOptions, InAppBrowser } from '@capacitor/inappbrowser'
import { useEffect, useRef, useState } from 'react'
import { Modal, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import { parseScutScheduleHtml } from '../../../core/schedule/importScutHtml'
import { getScheduleThemePresetById } from '../../../core/schedule/themePresets'
import { loadActiveScheduleEntry, saveScheduleDataWithOptions } from '../../../core/schedule/storage'
import { getSemesterStartDate, saveSemesterStartDate } from '../../../core/scheduleSettings'

const SCUT_JW_URL = 'http://xsjw2018.jw.scut.edu.cn/'

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

function ScutJwImportPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [lastNavigatedUrl, setLastNavigatedUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isOpeningBrowser, setIsOpeningBrowser] = useState(false)
  const [isBrowserClosed, setIsBrowserClosed] = useState(false)
  const hasShownGuideRef = useRef(false)
  const listenerHandlesRef = useRef<Array<{ remove: () => Promise<void> }>>([])

  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

  useEffect(() => {
    if (!isAndroidNative || hasShownGuideRef.current) {
      return
    }

    hasShownGuideRef.current = true
    Modal.info({
      title: '导入提示',
      content: '请先登录教务系统，并在内置浏览器中打开“个人课表查询”栏目，然后再点击“开始导入当前页面”。',
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

        setIsBrowserClosed(true)
      })

      const navigationHandle = await InAppBrowser.addListener('browserPageNavigationCompleted', ({ url }) => {
        if (isUnmounted || !url) {
          return
        }

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

  const handleOpenBrowser = async () => {
    if (!isAndroidNative || isOpeningBrowser) {
      return
    }

    setIsOpeningBrowser(true)
    setIsBrowserClosed(false)

    try {
      await InAppBrowser.openInWebView({
        url: SCUT_JW_URL,
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '无法打开教务系统页面'
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

    setIsImporting(true)

    try {
      const cookies = await CapacitorCookies.getCookies({ url: lastNavigatedUrl })
      const cookieHeader = getCookieHeader(cookies)
      const response = await CapacitorHttp.get({
        url: lastNavigatedUrl,
        headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
        responseType: 'text',
      })

      if (response.status >= 400) {
        throw new Error(`教务系统页面请求失败（${response.status}）`)
      }

      const htmlText = toTextResponseData(response.data)
      const fallbackSemesterStartDate = getSemesterStartDate()
      const scheduleData = parseScutScheduleHtml(htmlText, {
        fallbackSemesterStartDate,
      })

      const activeSchedule = loadActiveScheduleEntry()
      const themeId = getScheduleThemePresetById(activeSchedule?.themeId ?? '').id
      const nextSemesterStartDate = scheduleData.table.startDate || fallbackSemesterStartDate
      const result = saveScheduleDataWithOptions(scheduleData, {
        themeId,
        timeSlotPresetId: 'builtIn',
        semesterStartDate: nextSemesterStartDate,
        preferredName: scheduleData.table.name,
        setActive: true,
      })

      if (!result.ok) {
        throw new Error('课表保存失败，请检查浏览器存储空间')
      }

      saveSemesterStartDate(nextSemesterStartDate)
      messageApi.success('华工教务课表导入成功')
      navigate('/mine/schedule-settings', { replace: true })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '华工教务课表导入失败'
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
            <div className='scut-jw-tip-card'>
              <p className='scut-jw-tip-title'>操作提示</p>
              <p className='scut-jw-tip-text'>1. 点击“打开教务系统”并完成登录</p>
              <p className='scut-jw-tip-text'>2. 在内置浏览器中进入“个人课表查询”栏目</p>
              <p className='scut-jw-tip-text'>3. 返回此页点击“开始导入当前页面”</p>
            </div>

            <div className='mine-button-group'>
              <button type='button' className='mine-group-button schedule-settings-action' onClick={() => {
                void handleOpenBrowser()
              }} disabled={isOpeningBrowser}>
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
