import { type ChangeEvent, useRef, useState } from 'react'
import { DatePicker, Modal, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { parseWakeupScheduleText } from '../../../core/schedule/importWakeup'
import { loadScheduleData, saveScheduleData } from '../../../core/schedule/storage'
import { SCHEDULE_THEME_PRESETS, type ScheduleThemeId } from '../../../core/schedule/themePresets'
import { getScheduleThemePreset, setScheduleThemeId } from '../../../core/schedule/themeStorage'
import { getSemesterStartDate, saveSemesterStartDate } from '../../../core/scheduleSettings'

function ScheduleSettingsPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [semesterStartDate, setSemesterStartDate] = useState(() => getSemesterStartDate())
  const [pendingDate, setPendingDate] = useState(semesterStartDate)
  const [scheduleName, setScheduleName] = useState(() => loadScheduleData()?.table.name ?? '')
  const [themeName, setThemeName] = useState(() => getScheduleThemePreset().name)

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/mine', { replace: true })
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
    fileInputRef.current?.click()
  }

  const handleOpenThemeModal = () => {
    setIsThemeModalOpen(true)
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

  const handleImportSchedule = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const scheduleData = parseWakeupScheduleText(content)
      const isSaved = saveScheduleData(scheduleData)

      if (!isSaved) {
        messageApi.error('课表保存失败，请检查浏览器存储空间')
        event.target.value = ''
        return
      }

      if (scheduleData.table.startDate) {
        saveSemesterStartDate(scheduleData.table.startDate)
        setSemesterStartDate(scheduleData.table.startDate)
      }

      setScheduleName(scheduleData.table.name)
      messageApi.success('课表导入成功')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '课表导入失败'
      messageApi.error(errorMessage)
    }

    event.target.value = ''
  }

  return (
    <section className='schedule-settings-page'>
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
            导入 WakeUp 课表
          </button>
        </div>
        <p className='schedule-settings-current-date'>
          当前课表：{scheduleName || '未导入'}
        </p>

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
        ref={fileInputRef}
        type='file'
        accept='.wakeup_schedule,.json,.txt'
        className='schedule-settings-file-input'
        onChange={handleImportSchedule}
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
    </section>
  )
}

export default ScheduleSettingsPage
