import { useState } from 'react'
import { DatePicker, Modal, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { getSemesterStartDate, saveSemesterStartDate } from '../../../core/scheduleSettings'

function ScheduleSettingsPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)
  const [semesterStartDate, setSemesterStartDate] = useState(() => getSemesterStartDate())
  const [pendingDate, setPendingDate] = useState(semesterStartDate)

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
          onClick={() => navigate('/mine')}
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
      </div>

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
    </section>
  )
}

export default ScheduleSettingsPage
