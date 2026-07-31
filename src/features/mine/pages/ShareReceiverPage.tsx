import { CloseOutlined } from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'
import { Button, Modal, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../components/buttons/CircleIconButton'
import { ANIMATED_BACK_EVENT, type AnimatedBackRequestDetail } from '../../core/navigation/animatedBack'
import { decodeCompressedQmsText } from '../../core/schedule/compressedQms'
import { parseQmsScheduleText } from '../../core/schedule/importQms'
import { saveScheduleDataWithOptions } from '../../core/schedule/storage'
import { getSemesterStartDate, saveSemesterStartDate } from '../../core/scheduleSettings'

type TransitionStage = 'entering' | 'entered' | 'closing'

const ENTER_ANIMATION_FRAME_MS = 16
const CLOSE_TRANSITION_MS = 220

function getShareDataFromHash() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const hash = window.location.hash.slice(1)
    if (!hash) {
      return null
    }

    return decodeURIComponent(hash)
  } catch {
    return null
  }
}

function ShareReceiverPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [transitionStage, setTransitionStage] = useState<TransitionStage>('entering')
  const [isLoading, setIsLoading] = useState(true)
  const [isImported, setIsImported] = useState(false)
  const [scheduleName, setScheduleName] = useState('')
  const [courseCount, setCourseCount] = useState(0)
  const [lessonCount, setLessonCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [qmsText, setQmsText] = useState('')
  const closeTimerRef = useRef<number | null>(null)
  const enterTimerRef = useRef<number | null>(null)
  const isClosingRef = useRef(false)

  const navigateBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/mine', { replace: true })
  }

  const startClosingTransition = () => {
    if (isClosingRef.current) {
      return false
    }

    isClosingRef.current = true
    setTransitionStage('closing')

    closeTimerRef.current = window.setTimeout(() => {
      navigateBack()
    }, CLOSE_TRANSITION_MS)

    return true
  }

  useEffect(() => {
    enterTimerRef.current = window.setTimeout(() => {
      setTransitionStage('entered')
    }, ENTER_ANIMATION_FRAME_MS)

    const handleAnimatedBack = (event: Event) => {
      const customEvent = event as CustomEvent<AnimatedBackRequestDetail>
      if (customEvent.detail.handled) {
        return
      }

      const handled = startClosingTransition()
      customEvent.detail.handled = handled
    }

    window.addEventListener(ANIMATED_BACK_EVENT, handleAnimatedBack)

    return () => {
      window.removeEventListener(ANIMATED_BACK_EVENT, handleAnimatedBack)
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current)
      }
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const shareData = getShareDataFromHash()
    if (!shareData) {
      setIsLoading(false)
      setErrorMessage('未检测到分享数据，请确认链接完整')
      return
    }

    let isCancelled = false

    const loadShareData = async () => {
      try {
        const decoded = await decodeCompressedQmsText(shareData)
        if (isCancelled) {
          return
        }

        const parsed = parseQmsScheduleText(decoded)
        if (isCancelled) {
          return
        }

        setQmsText(decoded)
        setScheduleName(parsed.preferredName || parsed.scheduleData.table.name || '分享课表')
        setCourseCount(parsed.scheduleData.courses.length)
        setLessonCount(parsed.scheduleData.lessons.length)
        setIsLoading(false)
      } catch (error) {
        if (isCancelled) {
          return
        }

        const errorMessage = error instanceof Error ? error.message : '课表数据解析失败'
        setErrorMessage(errorMessage)
        setIsLoading(false)
      }
    }

    void loadShareData()

    return () => {
      isCancelled = true
    }
  }, [])

  const handleImport = async () => {
    if (!qmsText) {
      return
    }

    try {
      const parsed = parseQmsScheduleText(qmsText)
      const semesterStartDate = getSemesterStartDate()
      saveSemesterStartDate(semesterStartDate)

      const result = await saveScheduleDataWithOptions(parsed.scheduleData, {
        themeId: parsed.themeId,
        timeSlotPresetId: parsed.timeSlotPresetId,
        semesterStartDate,
        preferredName: parsed.preferredName,
        setActive: true,
      })

      if (!result.ok) {
        messageApi.error('课表导入失败，请稍后重试')
        return
      }

      setIsImported(true)
      messageApi.success(`课表"${parsed.preferredName}"已导入，可通过课表设置中的"切换课表"查看`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '课表导入失败'
      messageApi.error(errorMessage)
    }
  }

  const handleViewSchedule = () => {
    navigate('/courses', { replace: true })
  }

  return (
    <section className={`schedule-settings-page settings-view-transition settings-view-transition--${transitionStage}`}>
      {contextHolder}

      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>接收课表</p>
          <p className='schedule-settings-subtitle'>接收来自好友分享的课表</p>
        </div>
        <CircleIconButton
          ariaLabel='关闭页面'
          icon={<CloseOutlined />}
          disabled={transitionStage === 'closing'}
          onClick={startClosingTransition}
        />
      </header>

      <div className='schedule-settings-content'>
        {isLoading ? (
          <div className='share-receiver-loading'>
            <p>正在解析课表数据...</p>
          </div>
        ) : errorMessage ? (
          <div className='share-receiver-error'>
            <p className='schedule-pdf-error'>{errorMessage}</p>
            <Button onClick={navigateBack}>返回</Button>
          </div>
        ) : (
          <>
            <div className='mine-button-group'>
              <div className='mine-group-button mine-detail-card-item'>
                <p className='mine-detail-card-title'>{scheduleName}</p>
                <p className='mine-detail-card-description'>课程数量：{courseCount}</p>
                <p className='mine-detail-card-description'>课程节数：{lessonCount}</p>
              </div>
            </div>

            <div className='mine-button-group'>
              {!isImported ? (
                <button type='button' className='mine-group-button schedule-settings-action' onClick={() => { void handleImport() }}>
                  导入此课表
                </button>
              ) : (
                <>
                  <button type='button' className='mine-group-button schedule-settings-action' onClick={handleViewSchedule}>
                    查看课表
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default ShareReceiverPage
