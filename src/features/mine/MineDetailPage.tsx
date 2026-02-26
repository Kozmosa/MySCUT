import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ANIMATED_BACK_EVENT, type AnimatedBackRequestDetail } from '../../core/navigation/animatedBack'

type MineDetailPageProps = {
  title: string
}

type TransitionStage = 'entering' | 'entered' | 'closing'

const ENTER_ANIMATION_FRAME_MS = 16
const CLOSE_TRANSITION_MS = 220

const DETAIL_SUBTITLE_MAP: Record<string, string> = {
  '全局设置': 'Global Settings',
  '常见问答': 'FAQ',
  更多: 'More',
}

const DETAIL_ITEMS_MAP: Record<string, Array<{ title: string; description: string }>> = {
  '全局设置': [
    {
      title: '全局能力正在建设中',
      description: '后续将在这里统一管理通知、显示偏好与通用行为设置。',
    },
  ],
  '常见问答': [
    {
      title: '使用说明持续补充中',
      description: '后续会在此整理导入、切换课表和常见问题的快速解答。',
    },
  ],
  更多: [
    {
      title: '更多功能敬请期待',
      description: '后续将接入更多工具与入口，保持与课表设置一致的使用体验。',
    },
  ],
}

function MineDetailPage({ title }: MineDetailPageProps) {
  const navigate = useNavigate()
  const subtitle = DETAIL_SUBTITLE_MAP[title] ?? 'Details'
  const detailItems = DETAIL_ITEMS_MAP[title] ?? DETAIL_ITEMS_MAP['更多']
  const [transitionStage, setTransitionStage] = useState<TransitionStage>('entering')
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

  const handleClose = () => {
    startClosingTransition()
  }

  return (
    <section
      className={`schedule-settings-page mine-detail-page settings-view-transition settings-view-transition--${transitionStage}`}
    >
      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>{title}</p>
          <p className='schedule-settings-subtitle'>{subtitle}</p>
        </div>

        <button
          type='button'
          className='schedule-settings-close-button'
          aria-label='关闭详情页面'
          disabled={transitionStage === 'closing'}
          onClick={handleClose}
        >
          ×
        </button>
      </header>

      <div className='schedule-settings-content mine-detail-content'>
        {detailItems.map((item) => (
          <div className='mine-button-group' key={item.title}>
            <div className='mine-group-button mine-detail-card-item'>
              <p className='mine-detail-card-title'>{item.title}</p>
              <p className='mine-detail-card-description'>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default MineDetailPage
