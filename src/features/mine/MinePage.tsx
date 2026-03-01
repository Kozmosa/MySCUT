import { type ChangeEvent, useRef, useState } from 'react'
import { message } from 'antd'
import { Link } from 'react-router-dom'

const AVATAR_STORAGE_KEY = 'avatar'
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg']
const AVATAR_OUTPUT_SIZE = 256

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
        <Link to='/mine/schedule-settings' className='mine-group-button'>
          课表设置
        </Link>
        <Link to='/mine/global-settings' className='mine-group-button'>
          全局设置
        </Link>
        <Link to='/mine/ai-settings' className='mine-group-button'>
          AI设置
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
