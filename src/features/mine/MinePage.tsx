import { type CSSProperties, type ChangeEvent, useRef, useState } from 'react'
import { message } from 'antd'
import { Link } from 'react-router-dom'
import { useGlobalTheme } from '../../platform/web/theme/GlobalThemeProvider'

const AVATAR_STORAGE_KEY = 'avatar'
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg']
const AVATAR_OUTPUT_SIZE = 256

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

function getStoredAvatar() {
  try {
    return localStorage.getItem(AVATAR_STORAGE_KEY)
  } catch {
    return null
  }
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('头像图片加载失败'))
    }

    image.src = objectUrl
  })
}

async function cropFileToAvatarBase64(file: File) {
  const image = await loadImageFromFile(file)
  const sourceSide = Math.min(image.naturalWidth, image.naturalHeight)
  const sourceX = Math.floor((image.naturalWidth - sourceSide) / 2)

  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_OUTPUT_SIZE
  canvas.height = AVATAR_OUTPUT_SIZE

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('头像图片处理失败')
  }

  context.drawImage(
    image,
    sourceX,
    0,
    sourceSide,
    sourceSide,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE,
  )

  return canvas.toDataURL('image/jpeg', 0.9)
}

function MinePage() {
  const [messageApi, contextHolder] = message.useMessage()
  const [avatar, setAvatar] = useState<string | null>(() => getStoredAvatar())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mode, resolvedMode, setMode } = useGlobalTheme()
  const segmentStyle = {
    '--segment-index': THEME_MODE_INDEX[mode],
  } as CSSProperties

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      messageApi.error('仅支持上传 JPG 或 PNG 图片')
      event.target.value = ''
      return
    }

    try {
      const avatarBase64 = await cropFileToAvatarBase64(file)
      setAvatar(avatarBase64)

      try {
        localStorage.setItem(AVATAR_STORAGE_KEY, avatarBase64)
      } catch {
        messageApi.error('头像保存失败，请检查浏览器存储空间')
      }
    } catch {
      messageApi.error('头像处理失败，请重试')
    }

    event.target.value = ''
  }

  return (
    <div className='mine-page'>
      {contextHolder}

      <button type='button' className='mine-avatar mine-avatar-button' onClick={handleAvatarClick}>
        {avatar ? (
          <img src={avatar} alt='头像' className='mine-avatar-image' draggable={false} />
        ) : (
          <span className='mine-avatar-text'>头像</span>
        )}
      </button>
      <input
        ref={fileInputRef}
        type='file'
        accept='image/png,image/jpeg'
        className='mine-avatar-input'
        onChange={handleFileChange}
      />

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
        <Link to='/mine/schedule-settings' className='mine-group-button'>
          课表设置
        </Link>
        <Link to='/mine/global-settings' className='mine-group-button'>
          全局设置
        </Link>
      </div>

      <div className='mine-button-group'>
        <Link to='/mine/faq' className='mine-group-button'>
          常见问答
        </Link>
        <Link to='/mine/more' className='mine-group-button'>
          更多
        </Link>
      </div>
    </div>
  )
}

export default MinePage
