import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { Checkbox, Modal, Switch } from 'antd'
import { useNavigate } from 'react-router-dom'
import { getUseLocalManual, setUseLocalManual } from '../../core/manual/manualSourceStorage'
import { ANIMATED_BACK_EVENT, type AnimatedBackRequestDetail } from '../../core/navigation/animatedBack'
import { GLOBAL_THEME_FAMILY_OPTIONS } from '../../core/theme/globalThemePresets'
import { APP_TODO_ITEMS, MANUAL_TODO_ITEMS } from '../../generated/todoSnapshot'
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

const LICENSE_ITEMS = [
  { name: 'my-scut-frontend', license: '未单独声明（private）' },
  { name: '@capacitor/android', license: 'MIT' },
  { name: '@capacitor/app', license: 'MIT' },
  { name: '@capacitor/cli', license: 'MIT' },
  { name: '@capacitor/core', license: 'MIT' },
  { name: '@capacitor/status-bar', license: 'MIT' },
  { name: '@capacitor/assets', license: 'MIT' },
  { name: 'antd', license: 'MIT' },
  { name: 'react', license: 'MIT' },
  { name: 'react-dom', license: 'MIT' },
  { name: 'react-router-dom', license: 'MIT' },
  { name: '@vitejs/plugin-react', license: 'MIT' },
  { name: 'vite', license: 'MIT' },
  { name: 'typescript', license: 'Apache-2.0' },
]

function MineDetailPage({ title }: MineDetailPageProps) {
  const navigate = useNavigate()
  const { themeFamily, mode, resolvedMode, setThemeFamily, setMode } = useGlobalTheme()
  const subtitle = DETAIL_SUBTITLE_MAP[title] ?? 'Details'
  const detailItems = DETAIL_ITEMS_MAP[title] ?? DETAIL_ITEMS_MAP['更多']
  const [isLocalManualEnabled, setIsLocalManualEnabled] = useState(() => getUseLocalManual())
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false)
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false)
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
        ) : title === '更多' ? (
          <>
            <div className='mine-button-group'>
              <div className='mine-group-button mine-detail-card-item'>
                <p className='mine-detail-card-title'>关于</p>
                <p className='mine-detail-card-description'>应用作者：@Kozumi</p>
                <p className='mine-detail-card-description'>
                  内容创作：启梦华工编辑部（成员：@Kozumi / @Rotioki）
                </p>
                <p className='mine-detail-card-description'>
                  免责声明：一切信息仅供参考，不对信息来源与权威性负责，请结合官方渠道审慎甄别。
                </p>
                <div className='mine-detail-link-row'>
                  <button
                    type='button'
                    className='mine-detail-link-button'
                    onClick={() => setIsTermsModalOpen(true)}
                  >
                    用户协议与隐私声明
                  </button>
                  <button
                    type='button'
                    className='mine-detail-link-button'
                    onClick={() => setIsLicenseModalOpen(true)}
                  >
                    开源许可证
                  </button>
                </div>
                <p className='mine-detail-card-description'>鸣谢支持：我不是卷神、华工转专业交流群</p>
              </div>
            </div>

            <div className='mine-button-group'>
              <button
                type='button'
                className='mine-group-button schedule-settings-action'
                onClick={() => setIsTodoModalOpen(true)}
              >
                查看TODO，参加贡献！
              </button>
            </div>

            {detailItems.map((item) => (
              <div className='mine-button-group' key={item.title}>
                <div className='mine-group-button mine-detail-card-item'>
                  <p className='mine-detail-card-title'>{item.title}</p>
                  <p className='mine-detail-card-description'>{item.description}</p>
                </div>
              </div>
            ))}

            <Modal
              title='用户协议与隐私声明'
              open={isTermsModalOpen}
              onCancel={() => setIsTermsModalOpen(false)}
              footer={null}
            >
              <div className='mine-legal-content'>
                <p>本应用为信息聚合与工具辅助产品，供校内学习与生活参考使用。</p>
                <p>
                  你在使用过程中应遵守法律法规与平台规则，不得将本应用用于违法违规、侵权或破坏性用途。
                </p>
                <p>
                  隐私方面，应用仅在本地存储必要配置（如头像、主题与课表导入结果），不主动上传个人数据。
                </p>
                <p>
                  本应用所载信息不构成官方承诺或权威结论，请以学校与相关机构发布的正式信息为准，并自行判断。
                </p>
              </div>
            </Modal>

            <Modal
              title='开源许可证'
              open={isLicenseModalOpen}
              onCancel={() => setIsLicenseModalOpen(false)}
              footer={null}
            >
              <div className='mine-legal-content'>
                <p>本项目及所引用开源项目许可证如下（以官方仓库声明为准）：</p>
                <ul className='mine-license-list'>
                  {LICENSE_ITEMS.map((item) => (
                    <li key={item.name}>
                      <span>{item.name}</span>
                      <span>{item.license}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Modal>

            <Modal
              title='查看TODO，参加贡献！'
              open={isTodoModalOpen}
              onCancel={() => setIsTodoModalOpen(false)}
              footer={null}
            >
              <section className='mine-todo-section'>
                <p className='mine-todo-section-title'>APP</p>
                {APP_TODO_ITEMS.length > 0 ? (
                  <ul className='mine-todo-list'>
                    {APP_TODO_ITEMS.map((todo, index) => (
                      <li key={`app-${index}`}>
                        <label>
                          <Checkbox checked={false} disabled />
                          <span>{todo}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='mine-detail-card-description'>暂无 TODO</p>
                )}
              </section>

              <section className='mine-todo-section'>
                <p className='mine-todo-section-title'>手册</p>
                {MANUAL_TODO_ITEMS.length > 0 ? (
                  <ul className='mine-todo-list'>
                    {MANUAL_TODO_ITEMS.map((todo, index) => (
                      <li key={`manual-${index}`}>
                        <label>
                          <Checkbox checked={false} disabled />
                          <span>{todo}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='mine-detail-card-description'>暂无 TODO</p>
                )}
              </section>
            </Modal>
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
