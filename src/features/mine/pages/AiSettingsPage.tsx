import { useEffect, useRef, useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { Input, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import { VerticalSlideSelector } from '../../../components/VerticalSlideSelector'
import {
  clearOpenAiCompatibleSettings,
  getOpenAiCompatibleSettings,
  getPreferredAiProvider,
  OPENAI_API_KEY_LOCAL_ONLY_NOTICE,
  setOpenAiCompatibleSettings,
  setStoredAiProvider,
  type AiProviderId,
} from '../../../core/ai'
import { ANIMATED_BACK_EVENT, type AnimatedBackRequestDetail } from '../../../core/navigation/animatedBack'

type TransitionStage = 'entering' | 'entered' | 'closing'

const ENTER_ANIMATION_FRAME_MS = 16
const CLOSE_TRANSITION_MS = 220

const AI_PROVIDER_OPTIONS: Array<{ value: AiProviderId; label: string }> = [
  { value: 'localModel', label: '本地服务' },
  { value: 'builtinGateway', label: '内置 AI 服务' },
  { value: 'openaiCompatible', label: 'OpenAI 兼容' },
]

function AiSettingsPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [providerId, setProviderId] = useState<AiProviderId>(() => getPreferredAiProvider())
  const [baseUrl, setBaseUrl] = useState(() => getOpenAiCompatibleSettings()?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState(() => getOpenAiCompatibleSettings()?.apiKey ?? '')
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

  const handleSaveSettings = () => {
    if (providerId === 'openaiCompatible') {
      if (!baseUrl.trim()) {
        messageApi.error('请填写 Base URL')
        return
      }

      if (!apiKey.trim()) {
        messageApi.error('请填写 API Key')
        return
      }

      const saved = setOpenAiCompatibleSettings({
        baseUrl,
        apiKey,
      })

      if (!saved) {
        messageApi.error('OpenAI 兼容配置保存失败，请稍后重试')
        return
      }
    }

    const savedProvider = setStoredAiProvider(providerId)
    if (!savedProvider) {
      messageApi.error('调用方式保存失败，请稍后重试')
      return
    }

    messageApi.success('AI 设置已保存')
  }

  const handleResetDefault = () => {
    const providerSaved = setStoredAiProvider('localModel')
    const configCleared = clearOpenAiCompatibleSettings()

    if (!providerSaved || !configCleared) {
      messageApi.error('恢复默认失败，请稍后重试')
      return
    }

    setProviderId('localModel')
    setBaseUrl('')
    setApiKey('')
    messageApi.success('已恢复默认（本地服务）')
  }

  return (
    <section className={`schedule-settings-page settings-view-transition settings-view-transition--${transitionStage}`}>
      {contextHolder}

      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>AI设置</p>
          <p className='schedule-settings-subtitle'>AI Settings</p>
        </div>

        <CircleIconButton
          ariaLabel='关闭 AI 设置页面'
          icon={<CloseOutlined />}
          disabled={transitionStage === 'closing'}
          onClick={startClosingTransition}
        />
      </header>

      <div className='schedule-settings-content'>
        <div className='mine-button-group'>
          <div className='mine-group-button mine-theme-family-panel'>
            <div className='mine-theme-mode-header'>
              <span>调用方式</span>
              <span className='mine-theme-toggle-meta'>
                {AI_PROVIDER_OPTIONS.find((item) => item.value === providerId)?.label ?? '本地服务'}
              </span>
            </div>

            <div className='mine-theme-family-list'>
              <VerticalSlideSelector
                value={providerId}
                options={AI_PROVIDER_OPTIONS}
                onChange={setProviderId}
                ariaLabel='AI 调用方式切换'
              />
            </div>
          </div>
        </div>

        {providerId === 'openaiCompatible' ? (
          <div className='mine-button-group'>
            <div className='mine-group-button ai-settings-form-panel'>
              <p className='mine-detail-card-title'>OpenAI 兼容配置</p>

              <div className='ai-settings-field'>
                <span className='ai-settings-label'>Base URL</span>
                <Input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder='例如 https://api.openai.com/v1'
                />
              </div>

              <div className='ai-settings-field'>
                <span className='ai-settings-label'>API Key</span>
                <Input.Password
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder='请输入 API Key'
                />
              </div>

              <p className='ai-settings-notice'>{OPENAI_API_KEY_LOCAL_ONLY_NOTICE}</p>
            </div>
          </div>
        ) : null}

        <div className='mine-button-group ai-settings-action-group'>
          <button type='button' className='mine-group-button schedule-settings-action' onClick={handleSaveSettings}>
            保存设置
          </button>
          <button type='button' className='mine-group-button schedule-settings-action' onClick={handleResetDefault}>
            恢复默认
          </button>
        </div>
      </div>
    </section>
  )
}

export default AiSettingsPage
