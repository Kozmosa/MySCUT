import { CloseOutlined } from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'
import { Input, InputNumber, Select, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { CircleIconButton } from '../../../components/buttons/CircleIconButton'
import { ANIMATED_BACK_EVENT, type AnimatedBackRequestDetail } from '../../../core/navigation/animatedBack'
import { saveScheduleDataWithOptions } from '../../../core/schedule/storage'
import { getSemesterStartDate } from '../../../core/scheduleSettings'
import type { ScheduleData } from '../../../core/schedule/types'

type TransitionStage = 'entering' | 'entered' | 'closing'

const ENTER_ANIMATION_FRAME_MS = 16
const CLOSE_TRANSITION_MS = 220
const WEEKDAYS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
]

function ManualActivityPage() {
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [transitionStage, setTransitionStage] = useState<TransitionStage>('entering')
  const [activityName, setActivityName] = useState('')
  const [day, setDay] = useState(1)
  const [startNode, setStartNode] = useState(1)
  const [endNode, setEndNode] = useState(1)
  const [startWeek, setStartWeek] = useState(1)
  const [endWeek, setEndWeek] = useState(18)
  const [room, setRoom] = useState('')
  const [teacher, setTeacher] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const enterTimerRef = useRef<number | null>(null)
  const isClosingRef = useRef(false)

  const navigateBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/mine/schedule-settings', { replace: true })
  }

  const startClosingTransition = () => {
    if (isClosingRef.current) return false
    isClosingRef.current = true
    setTransitionStage('closing')
    closeTimerRef.current = window.setTimeout(() => navigateBack(), CLOSE_TRANSITION_MS)
    return true
  }

  useEffect(() => {
    enterTimerRef.current = window.setTimeout(() => setTransitionStage('entered'), ENTER_ANIMATION_FRAME_MS)
    const handleAnimatedBack = (event: Event) => {
      const customEvent = event as CustomEvent<AnimatedBackRequestDetail>
      if (customEvent.detail.handled) return
      customEvent.detail.handled = startClosingTransition()
    }
    window.addEventListener(ANIMATED_BACK_EVENT, handleAnimatedBack)
    return () => {
      window.removeEventListener(ANIMATED_BACK_EVENT, handleAnimatedBack)
      if (enterTimerRef.current !== null) window.clearTimeout(enterTimerRef.current)
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  const handleSave = async () => {
    if (!activityName.trim()) {
      messageApi.error('请输入活动名称')
      return
    }

    setIsSaving(true)
    try {
      const courseId = 1
      const scheduleData: ScheduleData = {
        version: 1,
        source: 'manual',
        importedAt: Date.now(),
        table: {
          id: 1,
          name: activityName.trim(),
          campus: '',
          school: '华南理工大学',
          maxWeek: Math.max(endWeek, 18),
          nodes: 12,
          startDate: getSemesterStartDate(),
          showSat: true,
          showSun: true,
          timeTable: 2,
        },
        timeSlots: [],
        courses: [
          { id: courseId, tableId: 1, name: activityName.trim(), color: '#722ed1', credit: 0, note: '' },
        ],
        lessons: [
          {
            instanceId: `manual-${Date.now()}`,
            courseId,
            tableId: 1,
            day: day as 1 | 2 | 3 | 4 | 5 | 6 | 7,
            startNode,
            endNode: Math.max(startNode, endNode),
            startWeek,
            endWeek: Math.max(startWeek, endWeek),
            weekStep: 1,
            ownTime: false,
            startTime: '',
            endTime: '',
            room: room.trim(),
            teacher: teacher.trim(),
            type: 99,
            level: 0,
          },
        ],
        raw: { kind: 'scutHtml', html: '' },
      }

      const result = await saveScheduleDataWithOptions(scheduleData, {
        themeId: 'skyBlue',
        timeSlotPresetId: 'builtIn',
        semesterStartDate: getSemesterStartDate(),
        preferredName: activityName.trim(),
        setActive: true,
      })

      if (!result.ok) {
        messageApi.error('活动保存失败，请稍后重试')
        return
      }

      messageApi.success(`活动"${activityName.trim()}"已添加到课表`)
      navigate('/courses', { replace: true })
    } catch {
      messageApi.error('活动保存失败，请稍后重试')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={`schedule-settings-page settings-view-transition settings-view-transition--${transitionStage}`}>
      {contextHolder}

      <header className='schedule-settings-header'>
        <div>
          <p className='schedule-settings-title'>添加自定义活动</p>
          <p className='schedule-settings-subtitle'>Add Manual Activity</p>
        </div>
        <CircleIconButton ariaLabel='关闭页面' icon={<CloseOutlined />} onClick={startClosingTransition} />
      </header>

      <div className='schedule-settings-content'>
        <div className='mine-button-group'>
          <div className='mine-group-button ai-settings-form-panel'>
            <p className='mine-detail-card-title'>添加一个非教务系统的自定义活动或班会课</p>

            <div className='ai-settings-field'>
              <span className='ai-settings-label'>活动名称</span>
              <Input value={activityName} onChange={(e) => setActivityName(e.target.value)} placeholder='班会课 / 社团活动 / 复习课' />
            </div>

            <div className='ai-settings-field'>
              <span className='ai-settings-label'>日期</span>
              <Select value={day} onChange={setDay} options={WEEKDAYS} style={{ width: '100%' }} />
            </div>

            <div className='ai-settings-field'>
              <span className='ai-settings-label'>起始节次</span>
              <InputNumber value={startNode} onChange={(v) => setStartNode(v ?? 1)} min={1} max={12} style={{ width: '100%' }} />
            </div>

            <div className='ai-settings-field'>
              <span className='ai-settings-label'>结束节次</span>
              <InputNumber value={endNode} onChange={(v) => setEndNode(v ?? 1)} min={1} max={12} style={{ width: '100%' }} />
            </div>

            <div className='ai-settings-field'>
              <span className='ai-settings-label'>起始周</span>
              <InputNumber value={startWeek} onChange={(v) => setStartWeek(v ?? 1)} min={1} max={30} style={{ width: '100%' }} />
            </div>

            <div className='ai-settings-field'>
              <span className='ai-settings-label'>结束周</span>
              <InputNumber value={endWeek} onChange={(v) => setEndWeek(v ?? 18)} min={1} max={30} style={{ width: '100%' }} />
            </div>

            <div className='ai-settings-field'>
              <span className='ai-settings-label'>教室（选填）</span>
              <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder='A1301' />
            </div>

            <div className='ai-settings-field'>
              <span className='ai-settings-label'>教师/负责人（选填）</span>
              <Input value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder='张老师' />
            </div>
          </div>
        </div>

        <div className='mine-button-group'>
          <button type='button' className='mine-group-button schedule-settings-action' onClick={() => { void handleSave() }} disabled={isSaving}>
            {isSaving ? '保存中...' : '添加活动'}
          </button>
        </div>
      </div>
    </section>
  )
}

export default ManualActivityPage
