import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { Switch } from 'antd'
import { useNavigate } from 'react-router-dom'
import { getUseLocalManual, setUseLocalManual } from '../../core/manual/manualSourceStorage'
import { ANIMATED_BACK_EVENT, type AnimatedBackRequestDetail } from '../../core/navigation/animatedBack'
import { GLOBAL_THEME_FAMILY_OPTIONS } from '../../core/theme/globalThemePresets'
import { useGlobalTheme } from '../../platform/web/theme/GlobalThemeProvider'

type MineDetailPageProps = {
  title: string
}

type TransitionStage = 'entering' | 'entered' | 'closing'

const ENTER_ANIMATION_FRAME_MS = 16
const CLOSE_TRANSITION_MS = 220

const GLOBAL_THEME_MODE_LABELS = {
  light: '亮色',
  dark: '暗色',
  system: '跟随系统',
} as const

const RESOLVED_THEME_MODE_LABELS = {
  light: '亮色',
  dark: '暗色',
} as const

const THEME_MODE_INDEX: Record<keyof typeof GLOBAL_THEME_MODE_LABELS, number> = {
  light: 0,
  dark: 1,
  system: 2,
}

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
  const { themeFamily, mode, resolvedMode, setThemeFamily, setMode } = useGlobalTheme()
  const subtitle = DETAIL_SUBTITLE_MAP[title] ?? 'Details'
  const detailItems = DETAIL_ITEMS_MAP[title] ?? DETAIL_ITEMS_MAP['更多']
  const [isLocalManualEnabled, setIsLocalManualEnabled] = useState(() => getUseLocalManual())
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

  const handleLocalManualSwitchChange = (checked: boolean) => {
    setIsLocalManualEnabled(checked)
    setUseLocalManual(checked)
  }

  const segmentStyle = {
    '--segment-index': THEME_MODE_INDEX[mode],
  } as CSSProperties

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
        {title === '全局设置' ? (
          <>
            <div className='mine-button-group'>
              <div className='mine-group-button mine-theme-family-panel'>
                <div className='mine-theme-mode-header'>
                  <span>全局主题套装</span>
                  <span className='mine-theme-toggle-meta'>
                    {GLOBAL_THEME_FAMILY_OPTIONS.find((item) => item.id === themeFamily)?.name ?? '默认'}
                  </span>
                </div>

                <div className='mine-theme-family-list'>
                  {GLOBAL_THEME_FAMILY_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type='button'
                      className={`mine-theme-family-item ${themeFamily === item.id ? 'is-active' : ''}`}
                      onClick={() => setThemeFamily(item.id)}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className='mine-button-group'>
              <div className='mine-group-button mine-theme-mode-panel'>
                <div className='mine-theme-mode-header'>
                  <span>全局主题模式</span>
                  <span className='mine-theme-toggle-meta'>{GLOBAL_THEME_MODE_LABELS[mode]}</span>
                </div>

                <div className='mine-theme-segment' role='group' aria-label='全局主题切换' style={segmentStyle}>
                  <span className='mine-theme-segment-indicator' aria-hidden='true' />
                  <button
                    type='button'
                    className={`mine-theme-segment-button ${mode === 'light' ? 'is-active' : ''}`}
                    aria-pressed={mode === 'light'}
                    onClick={() => setMode('light')}
                  >
                    亮色
                  </button>
                  <button
                    type='button'
                    className={`mine-theme-segment-button ${mode === 'dark' ? 'is-active' : ''}`}
                    aria-pressed={mode === 'dark'}
                    onClick={() => setMode('dark')}
                  >
                    暗色
                  </button>
                  <button
                    type='button'
                    className={`mine-theme-segment-button ${mode === 'system' ? 'is-active' : ''}`}
                    aria-pressed={mode === 'system'}
                    onClick={() => setMode('system')}
                  >
                    跟随系统
                  </button>
                </div>

                <div className='mine-theme-mode-footer'>
                  <span>当前生效主题</span>
                  <span className='mine-theme-toggle-meta'>{RESOLVED_THEME_MODE_LABELS[resolvedMode]}</span>
                </div>
              </div>
            </div>

            <div className='mine-button-group'>
              <div className='mine-group-button mine-setting-row'>
                <div className='mine-setting-copy'>
                  <p className='mine-detail-card-title'>启用本地手册</p>
                  <p className='mine-detail-card-description'>开启后优先加载应用内置手册资源</p>
                </div>
                <Switch checked={isLocalManualEnabled} onChange={handleLocalManualSwitchChange} />
              </div>
            </div>
          </>
        ) : (
          detailItems.map((item) => (
            <div className='mine-button-group' key={item.title}>
              <div className='mine-group-button mine-detail-card-item'>
                <p className='mine-detail-card-title'>{item.title}</p>
                <p className='mine-detail-card-description'>{item.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default MineDetailPage
