import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { Input, Modal, Select, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import { ANIMATED_BACK_EVENT, type AnimatedBackRequestDetail } from '../../../core/navigation/animatedBack'
import { decodeCompressedQmsText } from '../../../core/schedule/compressedQms'
import { buildIntersectionSchedule, type IntersectionDisplayMode } from '../../../core/schedule/intersection'
import { saveIntersectionPreviewPayload } from '../../../core/schedule/intersectionPreview'
import { parseQmsScheduleText } from '../../../core/schedule/importQms'
import { parseScutScheduleHtml } from '../../../core/schedule/importScutHtml'
import { parseWakeupScheduleText } from '../../../core/schedule/importWakeup'
import { listSavedSchedules, loadActiveScheduleEntry, loadSavedScheduleById } from '../../../core/schedule/storage'
import type { ScheduleData } from '../../../core/schedule/types'
import { getSemesterStartDate } from '../../../core/scheduleSettings'

const { TextArea } = Input

type HtmlImportMethod = 'file' | 'clipboard' | 'input'
type TransitionStage = 'entering' | 'entered' | 'closing'

type ExternalScheduleItem = {
  id: string
  name: string
  source: string
  scheduleData: ScheduleData
}

const ENTER_ANIMATION_FRAME_MS = 16
const CLOSE_TRANSITION_MS = 220

function getDefaultExternalName(index: number) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const safeIndex = Math.max(0, index)
  if (safeIndex < alphabet.length) {
    return alphabet[safeIndex]
  }

  return `P${safeIndex + 1}`
}

function ScheduleIntersectionPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const wakeupFileInputRef = useRef<HTMLInputElement>(null)
  const qmsFileInputRef = useRef<HTMLInputElement>(null)
  const htmlFileInputRef = useRef<HTMLInputElement>(null)

  const [transitionStage, setTransitionStage] = useState<TransitionStage>('entering')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isHtmlImportMethodModalOpen, setIsHtmlImportMethodModalOpen] = useState(false)
  const [isHtmlInputModalOpen, setIsHtmlInputModalOpen] = useState(false)
  const [htmlImportMethod, setHtmlImportMethod] = useState<HtmlImportMethod>('file')
  const [htmlInputText, setHtmlInputText] = useState('')
  const [isLocalScheduleModalOpen, setIsLocalScheduleModalOpen] = useState(false)
  const [selectedLocalScheduleId, setSelectedLocalScheduleId] = useState(() => loadActiveScheduleEntry()?.id ?? '')
  const [savedSchedules, setSavedSchedules] = useState(() => listSavedSchedules())
  const [externalSchedules, setExternalSchedules] = useState<ExternalScheduleItem[]>([])
  const [pendingExternalSchedule, setPendingExternalSchedule] = useState<ExternalScheduleItem | null>(null)
  const [pendingExternalName, setPendingExternalName] = useState('A')
  const [isExternalNameModalOpen, setIsExternalNameModalOpen] = useState(false)
  const [localUserName, setLocalUserName] = useState('')
  const [displayMode, setDisplayMode] = useState<IntersectionDisplayMode>('default')

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

  const handleImportWakeupEntry = () => {
    setIsImportModalOpen(false)
    wakeupFileInputRef.current?.click()
  }

  const handleImportHtmlEntry = () => {
    setIsImportModalOpen(false)
    setHtmlImportMethod('file')
    setIsHtmlImportMethodModalOpen(true)
  }

  const handleImportPdfEntry = () => {
    setIsImportModalOpen(false)
    navigate('/mine/import-scut-pdf')
  }

  const handleImportQmsEntry = () => {
    setIsImportModalOpen(false)
    qmsFileInputRef.current?.click()
  }

  const handleImportCompressedQmsFromClipboardEntry = async () => {
    setIsImportModalOpen(false)

    if (!navigator.clipboard?.readText) {
      messageApi.error('当前环境不支持读取剪贴板')
      return
    }

    try {
      const compressedQmsText = await navigator.clipboard.readText()
      const qmsText = await decodeCompressedQmsText(compressedQmsText)
      const parsedQms = parseQmsScheduleText(qmsText)
      openExternalNameModal(parsedQms.scheduleData, 'QMS')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '压缩QMS导入失败'
      messageApi.error(errorMessage)
    }
  }

  const handleConfirmHtmlImportMethod = async () => {
    if (htmlImportMethod === 'file') {
      setIsHtmlImportMethodModalOpen(false)
      htmlFileInputRef.current?.click()
      return
    }

    if (htmlImportMethod === 'input') {
      setHtmlInputText('')
      setIsHtmlImportMethodModalOpen(false)
      setIsHtmlInputModalOpen(true)
      return
    }

    setIsHtmlImportMethodModalOpen(false)
    try {
      const clipboardText = await navigator.clipboard.readText()
      const scheduleData = parseScutScheduleHtml(clipboardText, {
        fallbackSemesterStartDate: getSemesterStartDate(),
      })
      openExternalNameModal(scheduleData, '华工教务HTML')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导入失败'
      messageApi.error(errorMessage)
    }
  }

  const openExternalNameModal = (scheduleData: ScheduleData, source: string) => {
    const nextIndex = externalSchedules.length
    const defaultName = getDefaultExternalName(nextIndex)

    setPendingExternalSchedule({
      id: `external-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: defaultName,
      source,
      scheduleData,
    })
    setPendingExternalName(defaultName)
    setIsExternalNameModalOpen(true)
  }

  const handleConfirmExternalName = () => {
    if (!pendingExternalSchedule) {
      setIsExternalNameModalOpen(false)
      return
    }

    const finalName = pendingExternalName.trim() || pendingExternalSchedule.name

    setExternalSchedules((previous) => [
      ...previous,
      {
        ...pendingExternalSchedule,
        name: finalName,
      },
    ])
    setPendingExternalSchedule(null)
    setPendingExternalName('')
    setIsExternalNameModalOpen(false)
    messageApi.success('外部课表添加成功')
  }

  const handleImportWakeup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const scheduleData = parseWakeupScheduleText(content)
      openExternalNameModal(scheduleData, 'WakeUp')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导入失败'
      messageApi.error(errorMessage)
    } finally {
      event.target.value = ''
    }
  }

  const handleImportQms = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const parsedQms = parseQmsScheduleText(content)
      openExternalNameModal(parsedQms.scheduleData, 'QMS')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'QMS 课表导入失败'
      messageApi.error(errorMessage)
    } finally {
      event.target.value = ''
    }
  }

  const handleImportHtmlFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const html = await file.text()
      const scheduleData = parseScutScheduleHtml(html, {
        fallbackSemesterStartDate: getSemesterStartDate(),
      })
      openExternalNameModal(scheduleData, '华工教务HTML')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '华工教务课表导入失败'
      messageApi.error(errorMessage)
    } finally {
      event.target.value = ''
    }
  }

  const handleConfirmHtmlInput = async () => {
    if (!htmlInputText.trim()) {
      messageApi.error('请输入 HTML 内容')
      return
    }

    try {
      const scheduleData = parseScutScheduleHtml(htmlInputText, {
        fallbackSemesterStartDate: getSemesterStartDate(),
      })
      openExternalNameModal(scheduleData, '华工教务HTML')
      setIsHtmlInputModalOpen(false)
      setHtmlInputText('')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '华工教务课表导入失败'
      messageApi.error(errorMessage)
    }
  }

  const selectedLocalSchedule = loadSavedScheduleById(selectedLocalScheduleId)

  const handleCalculate = () => {
    if (!selectedLocalSchedule) {
      messageApi.error('请先选择本地课表')
      return
    }

    if (externalSchedules.length === 0) {
      messageApi.error('请至少添加一个外部课表')
      return
    }

    const normalizedLocalUserName = localUserName.trim() || 'Kozumi'
    const participants = [
      {
        name: normalizedLocalUserName,
        scheduleData: selectedLocalSchedule.scheduleData,
        timeSlotPresetId: selectedLocalSchedule.timeSlotPresetId,
      },
      ...externalSchedules.map((item) => ({
        name: item.name,
        scheduleData: item.scheduleData,
        timeSlotPresetId: 'builtIn' as const,
      })),
    ]

    const intersectionScheduleData = buildIntersectionSchedule(participants, displayMode, '课表取交集')
    const defaultSaveName = [...externalSchedules.map((item) => item.name), normalizedLocalUserName].join('/')
    const saved = saveIntersectionPreviewPayload({
      scheduleData: intersectionScheduleData,
      defaultSaveName,
    })

    if (!saved) {
      messageApi.error('临时课表生成失败，请检查浏览器存储空间')
      return
    }

    navigate('/courses/intersection-preview')
  }

  return (
    <section className={`schedule-settings-page settings-view-transition settings-view-transition--${transitionStage}`}>
      {contextHolder}

      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>课表取交集</p>
          <p className='schedule-settings-subtitle'>Schedule Intersection</p>
        </div>

        <CircleIconButton ariaLabel='关闭页面' icon={<CloseOutlined />} onClick={startClosingTransition} />
      </header>

      <div className='schedule-settings-content'>
        <div className='mine-button-group'>
          <div className='mine-group-button mine-setting-row'>
            <div className='mine-setting-copy'>
              <p className='mine-detail-card-title'>我的名字</p>
              <p className='mine-detail-card-description'>用于统计展示与保存默认名称</p>
            </div>
            <Input
              value={localUserName}
              onChange={(event) => setLocalUserName(event.target.value)}
              placeholder='Kozumi'
              style={{ width: 120 }}
            />
          </div>
        </div>

        <div className='mine-button-group'>
          <button type='button' className='mine-group-button schedule-settings-action' onClick={() => {
            setSavedSchedules(listSavedSchedules())
            setIsLocalScheduleModalOpen(true)
          }}>
            选择本地课表
          </button>
        </div>
        <p className='schedule-settings-current-date'>
          当前选择：{selectedLocalSchedule?.name || '未选择'}
        </p>

        <div className='mine-button-group'>
          <button type='button' className='mine-group-button schedule-settings-action' onClick={() => setIsImportModalOpen(true)}>
            添加外部课表
          </button>
        </div>

        <div className='mine-button-group'>
          <div className='mine-group-button mine-theme-family-panel'>
            <div className='mine-theme-mode-header'>
              <span>显示模式</span>
            </div>
            <Select
              style={{ width: '100%', marginTop: 10 }}
              value={displayMode}
              onChange={(value) => setDisplayMode(value)}
              options={[
                { value: 'default', label: '默认' },
                { value: 'availableOnly', label: '显示有空的人' },
                { value: 'unavailableOnly', label: '显示没空的人' },
              ]}
            />
          </div>
        </div>

        <div className='mine-button-group'>
          <div className='mine-group-button mine-theme-family-panel'>
            <div className='mine-theme-mode-header'>
              <span>外部课表列表</span>
              <span className='mine-theme-toggle-meta'>{externalSchedules.length} 个</span>
            </div>
            <div className='schedule-switch-list'>
              {externalSchedules.length === 0 ? (
                <p className='schedule-switch-empty'>暂无外部课表</p>
              ) : (
                externalSchedules.map((item) => (
                  <div key={item.id} className='schedule-switch-row'>
                    <div className='schedule-switch-item'>
                      <span>{item.name}</span>
                      <span className='schedule-switch-meta'>来源：{item.source}</span>
                    </div>
                    <button
                      type='button'
                      className='schedule-switch-delete'
                      onClick={() => setExternalSchedules((previous) => previous.filter((current) => current.id !== item.id))}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className='mine-button-group'>
          <button type='button' className='mine-group-button schedule-settings-action' onClick={handleCalculate}>
            计算并查看临时课表
          </button>
        </div>
      </div>

      <input
        ref={wakeupFileInputRef}
        type='file'
        accept='.wakeup_schedule,.json,.txt,.bin'
        className='schedule-settings-file-input'
        onChange={handleImportWakeup}
      />
      <input
        ref={qmsFileInputRef}
        type='file'
        accept='.qms,.json'
        className='schedule-settings-file-input'
        onChange={handleImportQms}
      />
      <input
        ref={htmlFileInputRef}
        type='file'
        accept='.html,.htm,.txt'
        className='schedule-settings-file-input'
        onChange={handleImportHtmlFile}
      />

      <Modal title='导入外部课表' open={isImportModalOpen} onCancel={() => setIsImportModalOpen(false)} footer={null}>
        <div className='schedule-import-list'>
          <button type='button' className='schedule-import-item' onClick={handleImportWakeupEntry}>从 WakeUp 导入</button>
          <button type='button' className='schedule-import-item' onClick={handleImportHtmlEntry}>从华工教务HTML导入</button>
          <button type='button' className='schedule-import-item' onClick={handleImportPdfEntry}>从华工教务PDF导入</button>
          <button type='button' className='schedule-import-item' onClick={handleImportQmsEntry}>从启梦文件QMS导入</button>
          <button type='button' className='schedule-import-item' onClick={handleImportCompressedQmsFromClipboardEntry}>从剪贴板压缩QMS导入</button>
        </div>
      </Modal>

      <Modal
        title='从华工教务HTML导入'
        open={isHtmlImportMethodModalOpen}
        onOk={() => {
          void handleConfirmHtmlImportMethod()
        }}
        onCancel={() => setIsHtmlImportMethodModalOpen(false)}
        okText='继续'
        cancelText='取消'
      >
        <Select
          style={{ width: '100%' }}
          value={htmlImportMethod}
          onChange={(value) => setHtmlImportMethod(value)}
          options={[
            { value: 'file', label: '从文件导入' },
            { value: 'clipboard', label: '从剪贴板导入' },
            { value: 'input', label: '直接输入' },
          ]}
        />
      </Modal>

      <Modal
        title='直接输入华工教务HTML'
        open={isHtmlInputModalOpen}
        onOk={() => {
          void handleConfirmHtmlInput()
        }}
        onCancel={() => setIsHtmlInputModalOpen(false)}
        okText='确定'
        cancelText='取消'
      >
        <TextArea
          rows={10}
          placeholder='请粘贴华工教务系统课表 HTML'
          value={htmlInputText}
          onChange={(event) => setHtmlInputText(event.target.value)}
        />
      </Modal>

      <Modal
        title='选择本地课表'
        open={isLocalScheduleModalOpen}
        onCancel={() => setIsLocalScheduleModalOpen(false)}
        footer={null}
      >
        <div className='schedule-switch-list'>
          {savedSchedules.length === 0 ? (
            <p className='schedule-switch-empty'>暂无已保存课表</p>
          ) : (
            savedSchedules.map((schedule) => (
              <button
                key={schedule.id}
                type='button'
                className={`schedule-switch-item ${schedule.id === selectedLocalScheduleId ? 'is-active' : ''}`}
                onClick={() => {
                  setSelectedLocalScheduleId(schedule.id)
                  setIsLocalScheduleModalOpen(false)
                }}
              >
                <span>{schedule.name}</span>
                <span className='schedule-switch-meta'>来源：{schedule.source}</span>
              </button>
            ))
          )}
        </div>
      </Modal>

      <Modal
        title='设置课表使用者名称'
        open={isExternalNameModalOpen}
        onOk={handleConfirmExternalName}
        onCancel={() => {
          setPendingExternalSchedule(null)
          setIsExternalNameModalOpen(false)
        }}
        okText='确定'
        cancelText='取消'
      >
        <Input
          value={pendingExternalName}
          onChange={(event) => setPendingExternalName(event.target.value)}
          placeholder={pendingExternalSchedule?.name ?? 'A'}
        />
      </Modal>
    </section>
  )
}

export default ScheduleIntersectionPage
