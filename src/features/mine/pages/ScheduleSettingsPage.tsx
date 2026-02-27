import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { DatePicker, Input, Modal, Select, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { parseQmsScheduleText } from '../../../core/schedule/importQms'
import { parseScutScheduleHtml } from '../../../core/schedule/importScutHtml'
import { parseWakeupScheduleText } from '../../../core/schedule/importWakeup'
import {
  listSavedSchedules,
  loadActiveScheduleEntry,
  loadSavedScheduleById,
  saveScheduleDataWithOptions,
  switchActiveSchedule,
} from '../../../core/schedule/storage'
import { buildQmsExportText, buildWakeupExportText, downloadTextFile } from '../../../core/schedule/export'
import { getScheduleThemePresetById, SCHEDULE_THEME_PRESETS, type ScheduleThemeId } from '../../../core/schedule/themePresets'
import { getScheduleThemeId, getScheduleThemePreset, setScheduleThemeId } from '../../../core/schedule/themeStorage'
import { getSemesterStartDate, saveSemesterStartDate } from '../../../core/scheduleSettings'
import type { ScheduleData } from '../../../core/schedule/types'
import { ANIMATED_BACK_EVENT, type AnimatedBackRequestDetail } from '../../../core/navigation/animatedBack'

const { TextArea } = Input

type HtmlImportMethod = 'file' | 'clipboard' | 'input'
type ScheduleExportFormat = 'wakeup' | 'qms'

type SavedScheduleItem = ReturnType<typeof listSavedSchedules>[number]

type TransitionStage = 'entering' | 'entered' | 'closing'

const ENTER_ANIMATION_FRAME_MS = 16
const CLOSE_TRANSITION_MS = 220

function formatExportTimestamp(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0')

  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '_').trim() || 'schedule'
}

function ScheduleSettingsPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const wakeupFileInputRef = useRef<HTMLInputElement>(null)
  const qmsFileInputRef = useRef<HTMLInputElement>(null)
  const htmlFileInputRef = useRef<HTMLInputElement>(null)
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isHtmlImportMethodModalOpen, setIsHtmlImportMethodModalOpen] = useState(false)
  const [htmlImportMethod, setHtmlImportMethod] = useState<HtmlImportMethod>('file')
  const [isHtmlInputModalOpen, setIsHtmlInputModalOpen] = useState(false)
  const [htmlInputText, setHtmlInputText] = useState('')
  const [isScheduleSwitchModalOpen, setIsScheduleSwitchModalOpen] = useState(false)
  const [isScheduleExportModalOpen, setIsScheduleExportModalOpen] = useState(false)
  const [isExportFormatModalOpen, setIsExportFormatModalOpen] = useState(false)
  const [exportTargetScheduleId, setExportTargetScheduleId] = useState('')
  const [exportFormat, setExportFormat] = useState<ScheduleExportFormat>('wakeup')
  const [savedSchedules, setSavedSchedules] = useState<SavedScheduleItem[]>(() => listSavedSchedules())
  const [semesterStartDate, setSemesterStartDate] = useState(() => getSemesterStartDate())
  const [pendingDate, setPendingDate] = useState(semesterStartDate)
  const [scheduleName, setScheduleName] = useState(() => loadActiveScheduleEntry()?.name ?? '')
  const [themeName, setThemeName] = useState(() => getScheduleThemePreset().name)
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

  const refreshScheduleState = () => {
    const activeSchedule = loadActiveScheduleEntry()
    setScheduleName(activeSchedule?.name ?? '')
    setSavedSchedules(listSavedSchedules())
  }

  const handleClose = () => {
    startClosingTransition()
  }

  const handleOpenDateModal = () => {
    setPendingDate(semesterStartDate)
    setIsDateModalOpen(true)
  }

  const handleCloseDateModal = () => {
    setIsDateModalOpen(false)
  }

  const handleConfirmDate = () => {
    if (!pendingDate) {
      messageApi.error('请先选择日期')
      return
    }

    const isSaved = saveSemesterStartDate(pendingDate)
    if (!isSaved) {
      messageApi.error('保存失败，请稍后重试')
      return
    }

    setSemesterStartDate(pendingDate)
    setIsDateModalOpen(false)
    messageApi.success('学期起始时间已保存')
  }

  const handleOpenImport = () => {
    setIsImportModalOpen(true)
  }

  const handleImportWakeupEntry = () => {
    setIsImportModalOpen(false)
    wakeupFileInputRef.current?.click()
  }

  const handleImportHtmlEntry = () => {
    setIsImportModalOpen(false)
    handleOpenHtmlImportMethod()
  }

  const handleImportPdfEntry = () => {
    setIsImportModalOpen(false)
    navigate('/mine/import-scut-pdf')
  }

  const handleImportQmsEntry = () => {
    setIsImportModalOpen(false)
    qmsFileInputRef.current?.click()
  }

  const handleOpenHtmlImportMethod = () => {
    setHtmlImportMethod('file')
    setIsHtmlImportMethodModalOpen(true)
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
      await handleImportScutHtml(clipboardText)
    } catch {
      messageApi.error('无法读取剪贴板，请检查浏览器权限')
    }
  }

  const handleOpenScheduleSwitch = () => {
    setSavedSchedules(listSavedSchedules())
    setIsScheduleSwitchModalOpen(true)
  }

  const handleOpenThemeModal = () => {
    setIsThemeModalOpen(true)
  }

  const handleOpenScheduleExport = () => {
    const schedules = listSavedSchedules()
    setSavedSchedules(schedules)
    setExportTargetScheduleId('')
    setExportFormat('wakeup')
    setIsScheduleExportModalOpen(true)
  }

  const handleCloseThemeModal = () => {
    setIsThemeModalOpen(false)
  }

  const handleSelectTheme = (themeId: ScheduleThemeId) => {
    const isSaved = setScheduleThemeId(themeId)
    if (!isSaved) {
      messageApi.error('课表配色保存失败，请稍后重试')
      return
    }

    const selectedTheme = SCHEDULE_THEME_PRESETS.find((preset) => preset.id === themeId)
    setThemeName(selectedTheme?.name ?? getScheduleThemePreset().name)
    setIsThemeModalOpen(false)
    messageApi.success('课表配色已更新')
  }

  const handleCustomTheme = () => {
    messageApi.info('即将支持')
  }

  const persistImportedSchedule = (scheduleData: ScheduleData, semesterDate: string) => {
    const currentThemeId = getScheduleThemeId() || 'skyBlue'

    const result = saveScheduleDataWithOptions(scheduleData, {
      themeId: currentThemeId,
      semesterStartDate: semesterDate,
      preferredName: scheduleData.table.name,
      setActive: true,
    })

    if (!result.ok) {
      messageApi.error('课表保存失败，请检查浏览器存储空间')
      return false
    }

    refreshScheduleState()
    return true
  }

  const handleImportSchedule = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const scheduleData = parseWakeupScheduleText(content)
      const nextSemesterStartDate = scheduleData.table.startDate || semesterStartDate
      const isSaved = persistImportedSchedule(scheduleData, nextSemesterStartDate)
      if (!isSaved) {
        event.target.value = ''
        return
      }

      saveSemesterStartDate(nextSemesterStartDate)
      setSemesterStartDate(nextSemesterStartDate)
      messageApi.success('课表导入成功')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '课表导入失败'
      messageApi.error(errorMessage)
    }

    event.target.value = ''
  }

  const handleImportQms = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const parsedQms = parseQmsScheduleText(content)
      const nextThemeId = getScheduleThemePresetById(parsedQms.themeId).id
      const nextSemesterStartDate = parsedQms.semesterStartDate || semesterStartDate

      const result = saveScheduleDataWithOptions(parsedQms.scheduleData, {
        themeId: nextThemeId,
        semesterStartDate: nextSemesterStartDate,
        preferredName: parsedQms.preferredName,
        setActive: true,
      })

      if (!result.ok) {
        messageApi.error('QMS 课表保存失败，请检查浏览器存储空间')
        event.target.value = ''
        return
      }

      setScheduleThemeId(nextThemeId)
      const selectedTheme = getScheduleThemePresetById(nextThemeId)
      setThemeName(selectedTheme.name)
      saveSemesterStartDate(nextSemesterStartDate)
      setSemesterStartDate(nextSemesterStartDate)
      refreshScheduleState()
      messageApi.success('QMS 课表导入成功')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'QMS 课表导入失败'
      messageApi.error(errorMessage)
    }

    event.target.value = ''
  }

  const handleImportHtmlFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const html = await file.text()
      await handleImportScutHtml(html)
    } finally {
      event.target.value = ''
    }
  }

  const handleImportScutHtml = async (htmlText: string) => {
    try {
      const scheduleData = parseScutScheduleHtml(htmlText, {
        fallbackSemesterStartDate: semesterStartDate,
      })

      const nextSemesterStartDate = scheduleData.table.startDate || semesterStartDate
      const isSaved = persistImportedSchedule(scheduleData, nextSemesterStartDate)
      if (!isSaved) {
        return
      }

      saveSemesterStartDate(nextSemesterStartDate)
      setSemesterStartDate(nextSemesterStartDate)
      messageApi.success('华工教务课表导入成功')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '华工教务课表导入失败'
      messageApi.error(errorMessage)
    }
  }

  const handleConfirmHtmlInput = async () => {
    if (!htmlInputText.trim()) {
      messageApi.error('请输入 HTML 内容')
      return
    }

    await handleImportScutHtml(htmlInputText)
    setIsHtmlInputModalOpen(false)
    setHtmlInputText('')
  }

  const handleSwitchSchedule = (scheduleId: string) => {
    const switchedSchedule = switchActiveSchedule(scheduleId)
    if (!switchedSchedule) {
      messageApi.error('切换课表失败，请稍后重试')
      return
    }

    setScheduleThemeId(switchedSchedule.themeId as ScheduleThemeId)
    const switchedTheme = getScheduleThemePresetById(switchedSchedule.themeId)
    setThemeName(switchedTheme.name)

    if (switchedSchedule.semesterStartDate) {
      saveSemesterStartDate(switchedSchedule.semesterStartDate)
      setSemesterStartDate(switchedSchedule.semesterStartDate)
    }

    refreshScheduleState()
    setIsScheduleSwitchModalOpen(false)
    messageApi.success('课表切换成功')
  }

  const handleConfirmExportScheduleTarget = () => {
    if (!exportTargetScheduleId) {
      messageApi.error('请先选择需要导出的课表')
      return
    }

    setIsScheduleExportModalOpen(false)
    setIsExportFormatModalOpen(true)
  }

  const handleConfirmExportFormat = () => {
    if (!exportTargetScheduleId) {
      messageApi.error('未选择导出课表，请重新选择')
      setIsExportFormatModalOpen(false)
      return
    }

    const targetSchedule = loadSavedScheduleById(exportTargetScheduleId)
    if (!targetSchedule) {
      messageApi.error('未找到目标课表，请重新选择')
      setIsExportFormatModalOpen(false)
      return
    }

    try {
      const baseFileName = `${sanitizeFileName(targetSchedule.name)}_${formatExportTimestamp(new Date())}`

      if (exportFormat === 'wakeup') {
        const wakeupText = buildWakeupExportText(targetSchedule)
        downloadTextFile(`${baseFileName}.wakeup_schedule`, wakeupText)
      } else {
        const qmsText = buildQmsExportText(targetSchedule)
        downloadTextFile(`${baseFileName}.qms`, qmsText, 'application/json;charset=utf-8')
      }

      messageApi.success('课表导出成功')
      setIsExportFormatModalOpen(false)
      setExportTargetScheduleId('')
    } catch {
      messageApi.error('课表导出失败，请稍后重试')
    }
  }

  return (
    <section className={`schedule-settings-page settings-view-transition settings-view-transition--${transitionStage}`}>
      {contextHolder}

      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>课表设置</p>
          <p className='schedule-settings-subtitle'>Class Schedule Settings</p>
        </div>

        <button
          type='button'
          className='schedule-settings-close-button'
          aria-label='关闭课表设置'
          disabled={transitionStage === 'closing'}
          onClick={handleClose}
        >
          ×
        </button>
      </header>

      <div className='schedule-settings-content'>
        <div className='mine-button-group'>
          <button
            type='button'
            className='mine-group-button schedule-settings-action'
            onClick={handleOpenDateModal}
          >
            设置学期起始时间
          </button>
        </div>
        <p className='schedule-settings-current-date'>当前已设置：{semesterStartDate}</p>

        <div className='mine-button-group'>
          <button
            type='button'
            className='mine-group-button schedule-settings-action'
            onClick={handleOpenImport}
          >
            导入课表
          </button>
        </div>
        <p className='schedule-settings-current-date'>
          当前课表：{scheduleName || '未导入'}
        </p>

        <div className='mine-button-group'>
          <button
            type='button'
            className='mine-group-button schedule-settings-action'
            onClick={handleOpenScheduleSwitch}
          >
            切换课表
          </button>
        </div>

        <div className='mine-button-group'>
          <button
            type='button'
            className='mine-group-button schedule-settings-action'
            onClick={handleOpenScheduleExport}
          >
            导出课表
          </button>
        </div>

        <div className='mine-button-group'>
          <button
            type='button'
            className='mine-group-button schedule-settings-action'
            onClick={handleOpenThemeModal}
          >
            设置课表配色
          </button>
        </div>
        <p className='schedule-settings-current-date'>当前配色：{themeName}</p>
      </div>

      <input
        ref={wakeupFileInputRef}
        type='file'
        accept='.wakeup_schedule,.json,.txt'
        className='schedule-settings-file-input'
        onChange={handleImportSchedule}
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

      <Modal
        title='设置学期起始时间'
        open={isDateModalOpen}
        onOk={handleConfirmDate}
        onCancel={handleCloseDateModal}
        okText='确定'
        cancelText='取消'
      >
        <DatePicker
          style={{ width: '100%' }}
          format='YYYY-MM-DD'
          placeholder={semesterStartDate}
          onChange={(_, dateString) => {
            if (Array.isArray(dateString)) {
              return
            }

            setPendingDate(dateString)
          }}
        />
      </Modal>

      <Modal
        title='设置课表配色'
        open={isThemeModalOpen}
        onCancel={handleCloseThemeModal}
        footer={null}
      >
        <div className='schedule-theme-list'>
          {SCHEDULE_THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type='button'
              className='schedule-theme-button'
              style={{ backgroundColor: preset.primaryColor }}
              onClick={() => handleSelectTheme(preset.id)}
            >
              {preset.name}
            </button>
          ))}

          <button
            type='button'
            className='schedule-theme-button schedule-theme-button--custom'
            onClick={handleCustomTheme}
          >
            自定义
          </button>
        </div>
      </Modal>

      <Modal
        title='导入课表'
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        footer={null}
      >
        <div className='schedule-import-list'>
          <button type='button' className='schedule-import-item' onClick={handleImportWakeupEntry}>
            从 WakeUp 导入
          </button>
          <button type='button' className='schedule-import-item' onClick={handleImportHtmlEntry}>
            从华工教务HTML导入
          </button>
          <button type='button' className='schedule-import-item' onClick={handleImportPdfEntry}>
            从华工教务PDF导入
          </button>
          <button type='button' className='schedule-import-item' onClick={handleImportQmsEntry}>
            从启梦文件QMS导入
          </button>
        </div>
      </Modal>

      <Modal
        title='从华工教务HTML导入'
        open={isHtmlImportMethodModalOpen}
        onOk={handleConfirmHtmlImportMethod}
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
        onOk={handleConfirmHtmlInput}
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
        title='切换课表'
        open={isScheduleSwitchModalOpen}
        onCancel={() => setIsScheduleSwitchModalOpen(false)}
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
                className={`schedule-switch-item ${schedule.isActive ? 'is-active' : ''}`}
                onClick={() => handleSwitchSchedule(schedule.id)}
              >
                <span>{schedule.name}</span>
                <span className='schedule-switch-meta'>
                  来源：{schedule.source === 'wakeup' ? 'WakeUp' : '华工教务HTML'}
                </span>
              </button>
            ))
          )}
        </div>
      </Modal>

      <Modal
        title='导出课表'
        open={isScheduleExportModalOpen}
        onOk={handleConfirmExportScheduleTarget}
        onCancel={() => setIsScheduleExportModalOpen(false)}
        okText='下一步'
        cancelText='取消'
      >
        <div className='schedule-switch-list'>
          {savedSchedules.length === 0 ? (
            <p className='schedule-switch-empty'>暂无已保存课表</p>
          ) : (
            savedSchedules.map((schedule) => (
              <button
                key={schedule.id}
                type='button'
                className={`schedule-switch-item ${schedule.id === exportTargetScheduleId ? 'is-active' : ''}`}
                onClick={() => setExportTargetScheduleId(schedule.id)}
              >
                <span>{schedule.name}</span>
                <span className='schedule-switch-meta'>
                  来源：{schedule.source === 'wakeup' ? 'WakeUp' : '华工教务HTML'}
                </span>
              </button>
            ))
          )}
        </div>
      </Modal>

      <Modal
        title='选择导出格式'
        open={isExportFormatModalOpen}
        onOk={handleConfirmExportFormat}
        onCancel={() => setIsExportFormatModalOpen(false)}
        okText='导出'
        cancelText='取消'
      >
        <Select
          style={{ width: '100%' }}
          value={exportFormat}
          onChange={(value) => setExportFormat(value)}
          options={[
            { value: 'wakeup', label: 'WakeUp 兼容格式（.wakeup_schedule）' },
            { value: 'qms', label: '启梦格式 QMS（.qms）' },
          ]}
        />
      </Modal>
    </section>
  )
}

export default ScheduleSettingsPage
