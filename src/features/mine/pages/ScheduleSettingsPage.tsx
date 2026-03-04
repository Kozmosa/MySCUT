import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { Capacitor } from '@capacitor/core'
import { DatePicker, Input, Modal, Select, Switch, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import { VerticalSlideSelector } from '../../../components/VerticalSlideSelector'
import {
  getAutoSimplifyScheduleHintEnabled,
  setAutoSimplifyScheduleHintEnabled,
} from '../../../core/schedule/displaySettings'
import { parseQmsScheduleText } from '../../../core/schedule/importQms'
import { parseScutScheduleHtml } from '../../../core/schedule/importScutHtml'
import { parseWakeupScheduleText } from '../../../core/schedule/importWakeup'
import {
  deleteSavedSchedule,
  listSavedSchedules,
  loadActiveScheduleEntry,
  loadSavedScheduleById,
  saveScheduleDataWithOptions,
  setActiveScheduleTimeSlotPreset,
  switchActiveSchedule,
} from '../../../core/schedule/storage'
import {
  applyTimeSlotPresetForExport,
  buildQmsExportText,
  buildWakeupExportText,
  downloadTextFile,
  sanitizeScheduleForExport,
  type ExportSanitizeOptions,
} from '../../../core/schedule/export'
import { getScheduleThemePresetById, SCHEDULE_THEME_PRESETS, type ScheduleThemeId } from '../../../core/schedule/themePresets'
import { resolveNearestPresetThemeIdForWakeup } from '../../../core/schedule/themeMatcher'
import {
  getTimeSlotPresetName,
  resolveNearestCampusTimeSlotPresetId,
  TIME_SLOT_PRESET_OPTIONS,
} from '../../../core/schedule/timeSlotPresets'
import { setScheduleThemeId } from '../../../core/schedule/themeStorage'
import { getSemesterStartDate, saveSemesterStartDate } from '../../../core/scheduleSettings'
import type { ScheduleData, TimeSlotPresetId } from '../../../core/schedule/types'
import { ANIMATED_BACK_EVENT, type AnimatedBackRequestDetail } from '../../../core/navigation/animatedBack'

const { TextArea } = Input

type HtmlImportMethod = 'file' | 'clipboard' | 'input'
type ScheduleExportFormat = 'wakeup' | 'qms' | 'qmsCompressedClipboard'

type SavedScheduleItem = ReturnType<typeof listSavedSchedules>[number]

type TransitionStage = 'entering' | 'entered' | 'closing'

const ENTER_ANIMATION_FRAME_MS = 16
const CLOSE_TRANSITION_MS = 220

const SCHEDULE_THEME_OPTIONS = SCHEDULE_THEME_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.name,
}))

const TIME_SLOT_PRESET_SELECTOR_OPTIONS = TIME_SLOT_PRESET_OPTIONS.map((preset) => ({
  value: preset.id,
  label: preset.name,
}))

function formatExportTimestamp(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0')

  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '_').trim() || 'schedule'
}

const DEFAULT_EXPORT_SANITIZE_OPTIONS: ExportSanitizeOptions = {
  removeBoundTimeSlots: false,
  removeCourseName: false,
  removeTeacherName: false,
  removeRoom: false,
}

const ENABLED_EXPORT_SANITIZE_OPTIONS: ExportSanitizeOptions = {
  removeBoundTimeSlots: true,
  removeCourseName: true,
  removeTeacherName: true,
  removeRoom: true,
}

function ScheduleSettingsPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const wakeupFileInputRef = useRef<HTMLInputElement>(null)
  const qmsFileInputRef = useRef<HTMLInputElement>(null)
  const htmlFileInputRef = useRef<HTMLInputElement>(null)
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isHtmlImportMethodModalOpen, setIsHtmlImportMethodModalOpen] = useState(false)
  const [htmlImportMethod, setHtmlImportMethod] = useState<HtmlImportMethod>('file')
  const [isHtmlInputModalOpen, setIsHtmlInputModalOpen] = useState(false)
  const [htmlInputText, setHtmlInputText] = useState('')
  const [isScheduleSwitchModalOpen, setIsScheduleSwitchModalOpen] = useState(false)
  const [isScheduleDeleteModalOpen, setIsScheduleDeleteModalOpen] = useState(false)
  const [deleteTargetScheduleId, setDeleteTargetScheduleId] = useState('')
  const [deleteTargetScheduleName, setDeleteTargetScheduleName] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isScheduleExportModalOpen, setIsScheduleExportModalOpen] = useState(false)
  const [isExportFormatModalOpen, setIsExportFormatModalOpen] = useState(false)
  const [exportTargetScheduleId, setExportTargetScheduleId] = useState('')
  const [exportFormat, setExportFormat] = useState<ScheduleExportFormat>('wakeup')
  const [isExportCustomTimeSlotEnabled, setIsExportCustomTimeSlotEnabled] = useState(false)
  const [exportTimeSlotPresetId, setExportTimeSlotPresetId] = useState<TimeSlotPresetId>('builtIn')
  const [isExportSanitizeEnabled, setIsExportSanitizeEnabled] = useState(false)
  const [exportSanitizeOptions, setExportSanitizeOptions] = useState<ExportSanitizeOptions>(DEFAULT_EXPORT_SANITIZE_OPTIONS)
  const [savedSchedules, setSavedSchedules] = useState<SavedScheduleItem[]>(() => listSavedSchedules())
  const [isAutoSimplifyHintEnabled, setIsAutoSimplifyHintEnabled] = useState(() => getAutoSimplifyScheduleHintEnabled())
  const [semesterStartDate, setSemesterStartDate] = useState(() => getSemesterStartDate())
  const [pendingDate, setPendingDate] = useState(semesterStartDate)
  const [scheduleName, setScheduleName] = useState(() => loadActiveScheduleEntry()?.name ?? '')
  const [scheduleThemeId, setScheduleThemeIdState] = useState<ScheduleThemeId>(() => {
    const activeSchedule = loadActiveScheduleEntry()
    return getScheduleThemePresetById(activeSchedule?.themeId ?? '').id
  })
  const [timeSlotPresetId, setTimeSlotPresetId] = useState<TimeSlotPresetId>(() => {
    const activeSchedule = loadActiveScheduleEntry()
    return activeSchedule?.timeSlotPresetId ?? 'builtIn'
  })
  const [transitionStage, setTransitionStage] = useState<TransitionStage>('entering')
  const closeTimerRef = useRef<number | null>(null)
  const enterTimerRef = useRef<number | null>(null)
  const isClosingRef = useRef(false)
  const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

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
    setTimeSlotPresetId(activeSchedule?.timeSlotPresetId ?? 'builtIn')
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

  const handleImportScutJwEntry = () => {
    setIsImportModalOpen(false)
    navigate('/mine/import-scut-jw')
  }

  const handleImportCompressedQmsFromClipboardEntry = async () => {
    setIsImportModalOpen(false)

    if (!navigator.clipboard?.readText) {
      messageApi.error('当前环境不支持读取剪贴板')
      return
    }

    try {
      const compressedQmsText = await navigator.clipboard.readText()
      const compressedQmsModule = await import('../../../core/schedule/compressedQms')
      const decodeCompressedQmsText = compressedQmsModule.decodeCompressedQmsText
      const qmsText = await decodeCompressedQmsText(compressedQmsText)
      await handleImportQmsText(qmsText)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '压缩QMS导入失败'
      messageApi.error(errorMessage)
    }
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

  const handleOpenDeleteSchedule = (scheduleId: string, scheduleTitle: string) => {
    setDeleteTargetScheduleId(scheduleId)
    setDeleteTargetScheduleName(scheduleTitle)
    setDeleteConfirmText('')
    setIsScheduleDeleteModalOpen(true)
  }

  const handleOpenScheduleExport = () => {
    const schedules = listSavedSchedules()
    setSavedSchedules(schedules)
    setExportTargetScheduleId('')
    setExportFormat('wakeup')
    setIsExportSanitizeEnabled(false)
    setExportSanitizeOptions(DEFAULT_EXPORT_SANITIZE_OPTIONS)
    setIsScheduleExportModalOpen(true)
  }

  const handleExportSanitizeSwitchChange = (checked: boolean) => {
    setIsExportSanitizeEnabled(checked)
    if (checked) {
      setExportSanitizeOptions(ENABLED_EXPORT_SANITIZE_OPTIONS)
    }
  }

  const handleExportSanitizeOptionSwitchChange = (key: keyof ExportSanitizeOptions, checked: boolean) => {
    setExportSanitizeOptions((previousOptions) => ({
      ...previousOptions,
      [key]: checked,
    }))
  }

  const handleAutoSimplifyHintSwitchChange = (checked: boolean) => {
    const saved = setAutoSimplifyScheduleHintEnabled(checked)
    if (!saved) {
      messageApi.error('设置保存失败，请稍后重试')
      return
    }

    setIsAutoSimplifyHintEnabled(checked)
    messageApi.success('提示信息精简设置已更新')
  }

  const handleSelectTheme = (themeId: ScheduleThemeId) => {
    if (themeId === scheduleThemeId) {
      return
    }

    const isSaved = setScheduleThemeId(themeId)
    if (!isSaved) {
      messageApi.error('课表配色保存失败，请稍后重试')
      return
    }

    setScheduleThemeIdState(themeId)
    messageApi.success('课表配色已更新')
  }

  const handleSelectTimeSlotPreset = (presetId: TimeSlotPresetId) => {
    if (presetId === timeSlotPresetId) {
      return
    }

    const saved = setActiveScheduleTimeSlotPreset(presetId)
    if (!saved) {
      messageApi.error('时间表设置保存失败，请稍后重试')
      return
    }

    setTimeSlotPresetId(presetId)
    messageApi.success('时间表设置已更新')
  }

  const persistImportedSchedule = (
    scheduleData: ScheduleData,
    semesterDate: string,
    themeId: ScheduleThemeId,
    timeSlotPreset: TimeSlotPresetId = 'builtIn',
  ) => {
    const result = saveScheduleDataWithOptions(scheduleData, {
      themeId,
      timeSlotPresetId: timeSlotPreset,
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
      const nextThemeId = resolveNearestPresetThemeIdForWakeup(scheduleData)
      const nextTimeSlotPresetId = resolveNearestCampusTimeSlotPresetId(scheduleData.timeSlots)
      const nextSemesterStartDate = scheduleData.table.startDate || semesterStartDate
      const isSaved = persistImportedSchedule(scheduleData, nextSemesterStartDate, nextThemeId, nextTimeSlotPresetId)
      if (!isSaved) {
        event.target.value = ''
        return
      }

      setScheduleThemeId(nextThemeId)
      setScheduleThemeIdState(nextThemeId)
      setTimeSlotPresetId(nextTimeSlotPresetId)

      saveSemesterStartDate(nextSemesterStartDate)
      setSemesterStartDate(nextSemesterStartDate)
      const matchedThemeName = getScheduleThemePresetById(nextThemeId).name
      const matchedTimeSlotName = getTimeSlotPresetName(nextTimeSlotPresetId)
      messageApi.success(`课表导入成功，已自动匹配配色：${matchedThemeName}，时间表：${matchedTimeSlotName}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '课表导入失败'
      messageApi.error(errorMessage)
    }

    event.target.value = ''
  }

  const handleImportQmsText = async (content: string) => {
    try {
      const parsedQms = parseQmsScheduleText(content)
      const nextThemeId = getScheduleThemePresetById(parsedQms.themeId).id
      const nextSemesterStartDate = parsedQms.semesterStartDate || semesterStartDate

      const result = saveScheduleDataWithOptions(parsedQms.scheduleData, {
        themeId: nextThemeId,
        timeSlotPresetId: parsedQms.timeSlotPresetId,
        semesterStartDate: nextSemesterStartDate,
        preferredName: parsedQms.preferredName,
        setActive: true,
      })

      if (!result.ok) {
        messageApi.error('QMS 课表保存失败，请检查浏览器存储空间')
        return
      }

      setScheduleThemeId(nextThemeId)
      setScheduleThemeIdState(nextThemeId)
      setTimeSlotPresetId(parsedQms.timeSlotPresetId)
      saveSemesterStartDate(nextSemesterStartDate)
      setSemesterStartDate(nextSemesterStartDate)
      refreshScheduleState()
      messageApi.success('QMS 课表导入成功')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'QMS 课表导入失败'
      messageApi.error(errorMessage)
    }
  }

  const handleImportQms = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const content = await file.text()
      await handleImportQmsText(content)
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
      const isSaved = persistImportedSchedule(scheduleData, nextSemesterStartDate, scheduleThemeId)
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
    setScheduleThemeIdState(getScheduleThemePresetById(switchedSchedule.themeId).id)

    if (switchedSchedule.semesterStartDate) {
      saveSemesterStartDate(switchedSchedule.semesterStartDate)
      setSemesterStartDate(switchedSchedule.semesterStartDate)
    }

    refreshScheduleState()
    setIsScheduleSwitchModalOpen(false)
    messageApi.success('课表切换成功')
  }

  const handleConfirmDeleteSchedule = () => {
    const expectedName = deleteTargetScheduleName.trim()
    const inputName = deleteConfirmText.trim()

    if (!deleteTargetScheduleId) {
      messageApi.error('未选择待删除课表，请重新操作')
      return
    }

    if (!inputName) {
      messageApi.error('请输入课表名称以确认删除')
      return
    }

    if (inputName !== expectedName) {
      messageApi.error('输入的课表名称与目标不一致')
      return
    }

    const result = deleteSavedSchedule(deleteTargetScheduleId)
    if (!result.ok) {
      messageApi.error('删除课表失败，请稍后重试')
      return
    }

    const nextActiveSchedule = result.nextActiveSchedule
    if (nextActiveSchedule) {
      setScheduleThemeId(nextActiveSchedule.themeId as ScheduleThemeId)
      setScheduleThemeIdState(getScheduleThemePresetById(nextActiveSchedule.themeId).id)

      if (nextActiveSchedule.semesterStartDate) {
        saveSemesterStartDate(nextActiveSchedule.semesterStartDate)
        setSemesterStartDate(nextActiveSchedule.semesterStartDate)
      }
    }

    refreshScheduleState()
    setDeleteTargetScheduleId('')
    setDeleteTargetScheduleName('')
    setDeleteConfirmText('')
    setIsScheduleDeleteModalOpen(false)
    messageApi.success('课表已删除')
  }

  const handleConfirmExportScheduleTarget = () => {
    if (!exportTargetScheduleId) {
      messageApi.error('请先选择需要导出的课表')
      return
    }

    const targetSchedule = loadSavedScheduleById(exportTargetScheduleId)
    const nextPresetId = targetSchedule?.timeSlotPresetId ?? 'builtIn'
    setExportTimeSlotPresetId(nextPresetId)
    setIsExportCustomTimeSlotEnabled(false)
    setIsScheduleExportModalOpen(false)
    setIsExportFormatModalOpen(true)
  }

  const handleConfirmExportFormat = async () => {
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
      const effectiveTimeSlotPresetId = isExportCustomTimeSlotEnabled ? exportTimeSlotPresetId : targetSchedule.timeSlotPresetId
      const timeSlotBoundSchedule = applyTimeSlotPresetForExport(targetSchedule, effectiveTimeSlotPresetId)
      const exportSchedule = isExportSanitizeEnabled
        ? sanitizeScheduleForExport(timeSlotBoundSchedule, exportSanitizeOptions)
        : timeSlotBoundSchedule

      if (exportFormat === 'wakeup') {
        const wakeupText = buildWakeupExportText(exportSchedule)
        downloadTextFile(`${baseFileName}.wakeup_schedule`, wakeupText)
      } else if (exportFormat === 'qms') {
        const qmsText = buildQmsExportText(exportSchedule)
        downloadTextFile(`${baseFileName}.qms`, qmsText, 'application/json;charset=utf-8')
      } else {
        if (!navigator.clipboard?.writeText) {
          messageApi.error('当前环境不支持写入剪贴板')
          return
        }

        const qmsText = buildQmsExportText(exportSchedule)
        const compressedQmsModule = await import('../../../core/schedule/compressedQms')
        const encodeCompressedQmsText = compressedQmsModule.encodeCompressedQmsText
        const compressedQmsText = await encodeCompressedQmsText(qmsText)
        await navigator.clipboard.writeText(compressedQmsText)
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

        <CircleIconButton
          ariaLabel='关闭课表设置'
          icon={<CloseOutlined />}
          disabled={transitionStage === 'closing'}
          onClick={handleClose}
        />
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
          <button
            type='button'
            className='mine-group-button schedule-settings-action'
            onClick={handleOpenScheduleExport}
          >
            导出课表
          </button>
          <button
            type='button'
            className='mine-group-button schedule-settings-action'
            onClick={handleOpenScheduleSwitch}
          >
            切换课表
          </button>
        </div>
        <p className='schedule-settings-current-date'>
          当前课表：{scheduleName || '未导入'}
        </p>

        <div className='mine-button-group'>
          <div className='mine-group-button mine-theme-family-panel'>
            <div className='mine-theme-mode-header'>
              <span>课表配色</span>
              <span className='mine-theme-toggle-meta'>{getScheduleThemePresetById(scheduleThemeId).name}</span>
            </div>

            <div className='mine-theme-family-list'>
              <VerticalSlideSelector
                value={scheduleThemeId}
                options={SCHEDULE_THEME_OPTIONS}
                onChange={handleSelectTheme}
                ariaLabel='课表主题切换'
                className='schedule-theme-selector'
              />
            </div>
          </div>
        </div>

        <div className='mine-button-group'>
          <div className='mine-group-button mine-theme-family-panel'>
            <div className='mine-theme-mode-header'>
              <span>时间表设置</span>
              <span className='mine-theme-toggle-meta'>{getTimeSlotPresetName(timeSlotPresetId)}</span>
            </div>

            <div className='mine-theme-family-list'>
              <VerticalSlideSelector
                value={timeSlotPresetId}
                options={TIME_SLOT_PRESET_SELECTOR_OPTIONS}
                onChange={handleSelectTimeSlotPreset}
                ariaLabel='课表时间表设置'
                className='schedule-theme-selector'
              />
            </div>
          </div>
        </div>

        <div className='mine-button-group'>
          <div className='mine-group-button mine-setting-row'>
            <div className='mine-setting-copy'>
              <p className='mine-detail-card-title'>自动精简提示信息</p>
              <p className='mine-detail-card-description'>
                开启后会自动精简单元格提示文本（如去除校区前缀）
              </p>
            </div>
            <Switch checked={isAutoSimplifyHintEnabled} onChange={handleAutoSimplifyHintSwitchChange} />
          </div>
        </div>
      </div>

      <input
        ref={wakeupFileInputRef}
        type='file'
        accept='.wakeup_schedule,.json,.txt,.bin'
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
          {isAndroidNative && (
            <button type='button' className='schedule-import-item' onClick={handleImportScutJwEntry}>
              从教务系统导入
            </button>
          )}
          <button type='button' className='schedule-import-item' onClick={handleImportQmsEntry}>
            从启梦文件QMS导入
          </button>
          <button type='button' className='schedule-import-item' onClick={handleImportCompressedQmsFromClipboardEntry}>
            从剪贴板压缩QMS导入
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
              <div key={schedule.id} className='schedule-switch-row'>
                <button
                  type='button'
                  className={`schedule-switch-item ${schedule.isActive ? 'is-active' : ''}`}
                  onClick={() => handleSwitchSchedule(schedule.id)}
                >
                  <span>{schedule.name}</span>
                  <span className='schedule-switch-meta'>
                    来源：{schedule.source === 'wakeup' ? 'WakeUp' : '华工教务HTML'}
                  </span>
                </button>
                <button
                  type='button'
                  className='schedule-switch-delete'
                  aria-label={`删除课表 ${schedule.name}`}
                  onClick={() => handleOpenDeleteSchedule(schedule.id, schedule.name)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal
        title='删除课表确认'
        open={isScheduleDeleteModalOpen}
        onOk={handleConfirmDeleteSchedule}
        onCancel={() => setIsScheduleDeleteModalOpen(false)}
        okText='确认删除'
        cancelText='取消'
      >
        <p className='schedule-switch-empty'>
          该操作无法撤销。请输入课表名称 <strong>{deleteTargetScheduleName || '-'}</strong> 以确认删除。
        </p>
        <Input
          value={deleteConfirmText}
          placeholder='输入课表名称进行确认'
          onChange={(event) => setDeleteConfirmText(event.target.value)}
        />
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
            { value: 'qmsCompressedClipboard', label: '压缩QMS（复制到剪贴板）' },
          ]}
        />

        <div className='schedule-export-sanitize-card'>
          <div className='schedule-export-sanitize-row'>
            <div className='mine-setting-copy'>
              <p className='mine-detail-card-title'>自定义写入的时间表</p>
              <p className='mine-detail-card-description'>开启后可指定导出时写入的时间表预设</p>
            </div>
            <Switch checked={isExportCustomTimeSlotEnabled} onChange={setIsExportCustomTimeSlotEnabled} />
          </div>

          {isExportCustomTimeSlotEnabled && (
            <div className='schedule-export-sanitize-options'>
              <div className='mine-theme-mode-header'>
                <span>导出时间表</span>
                <span className='mine-theme-toggle-meta'>{getTimeSlotPresetName(exportTimeSlotPresetId)}</span>
              </div>

              <div className='mine-theme-family-list'>
                <VerticalSlideSelector
                  value={exportTimeSlotPresetId}
                  options={TIME_SLOT_PRESET_SELECTOR_OPTIONS}
                  onChange={setExportTimeSlotPresetId}
                  ariaLabel='导出时间表设置'
                  className='schedule-theme-selector'
                />
              </div>
            </div>
          )}
        </div>

        <div className='schedule-export-sanitize-card'>
          <div className='schedule-export-sanitize-row'>
            <div className='mine-setting-copy'>
              <p className='mine-detail-card-title'>抹除详细信息</p>
              <p className='mine-detail-card-description'>开启后可按需抹除导出课表中的敏感字段</p>
            </div>
            <Switch checked={isExportSanitizeEnabled} onChange={handleExportSanitizeSwitchChange} />
          </div>

          {isExportSanitizeEnabled && (
            <div className='schedule-export-sanitize-options'>
              <div className='schedule-export-sanitize-option'>
                <span>抹去绑定的作息时间</span>
                <Switch
                  checked={exportSanitizeOptions.removeBoundTimeSlots}
                  onChange={(checked) => handleExportSanitizeOptionSwitchChange('removeBoundTimeSlots', checked)}
                />
              </div>
              <div className='schedule-export-sanitize-option'>
                <span>抹去课程名称</span>
                <Switch
                  checked={exportSanitizeOptions.removeCourseName}
                  onChange={(checked) => handleExportSanitizeOptionSwitchChange('removeCourseName', checked)}
                />
              </div>
              <div className='schedule-export-sanitize-option'>
                <span>抹去教师名称</span>
                <Switch
                  checked={exportSanitizeOptions.removeTeacherName}
                  onChange={(checked) => handleExportSanitizeOptionSwitchChange('removeTeacherName', checked)}
                />
              </div>
              <div className='schedule-export-sanitize-option'>
                <span>抹去教室位置</span>
                <Switch
                  checked={exportSanitizeOptions.removeRoom}
                  onChange={(checked) => handleExportSanitizeOptionSwitchChange('removeRoom', checked)}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </section>
  )
}

export default ScheduleSettingsPage
