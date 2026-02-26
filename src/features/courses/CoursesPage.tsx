import { type CSSProperties, type TouchEvent, type TransitionEvent, useMemo, useState } from 'react'
import { Modal } from 'antd'
import { useNavigate } from 'react-router-dom'
import { buildWeekCellCourseMap, getCellCourses } from '../../core/schedule/selectors'
import { loadScheduleData } from '../../core/schedule/storage'
import { getScheduleThemePreset } from '../../core/schedule/themeStorage'
import type { ScheduleThemePreset } from '../../core/schedule/themePresets'
import type { WeekCellCourse } from '../../core/schedule/types'
import { getSemesterStartDate } from '../../core/scheduleSettings'

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const LESSON_INDEXES = Array.from({ length: 11 }, (_, index) => index + 1)
function getCurrentDateText(date: Date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function getWeekNumber(date: Date, startDateText: string) {
  const semesterStart = new Date(startDateText)
  const semesterStartAtMidnight = new Date(
    semesterStart.getFullYear(),
    semesterStart.getMonth(),
    semesterStart.getDate(),
  )
  const dateAtMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const differenceMs = dateAtMidnight.getTime() - semesterStartAtMidnight.getTime()
  const week = Math.floor(differenceMs / (7 * 24 * 60 * 60 * 1000)) + 1

  return Math.max(1, week)
}

function getColorFromWakeup(color: string, fallbackColor: string) {
  if (!color) {
    return fallbackColor
  }

  const value = color.trim()

  if (/^#[0-9a-fA-F]{8}$/.test(value)) {
    const alpha = Number.parseInt(value.slice(1, 3), 16) / 255
    const red = Number.parseInt(value.slice(3, 5), 16)
    const green = Number.parseInt(value.slice(5, 7), 16)
    const blue = Number.parseInt(value.slice(7, 9), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`
  }

  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value
  }

  return fallbackColor
}

function getCourseCardColor(
  themePreset: ScheduleThemePreset,
  day: number,
  lessonNumber: number,
  courseId: number,
  courseColor: string,
) {
  const fallbackColor = themePreset.fallbackColors[(courseId + day + lessonNumber) % themePreset.fallbackColors.length]

  if (themePreset.mode === 'wakeup') {
    return getColorFromWakeup(courseColor, fallbackColor)
  }

  if (themePreset.mode === 'preset') {
    return fallbackColor
  }

  return fallbackColor
}

function renderCourseCell(
  themePreset: ScheduleThemePreset,
  day: number,
  lessonNumber: number,
  cellCourses: WeekCellCourse[],
  onOpenDetail: (courses: WeekCellCourse[], day: number, node: number) => void,
) {
  if (cellCourses.length === 0) {
    return null
  }

  const firstCourse = cellCourses[0]
  const extraCount = cellCourses.length - 1
  const backgroundColor = getCourseCardColor(
    themePreset,
    day,
    lessonNumber,
    firstCourse.courseId,
    firstCourse.color,
  )
  const cardTextStyle = {
    '--course-text-primary': themePreset.textColorPrimary,
    '--course-text-secondary': themePreset.textColorSecondary,
    '--course-text-badge': themePreset.textColorBadge,
  } as CSSProperties

  return (
    <button
      type='button'
      className='course-card'
      style={{ backgroundColor, ...cardTextStyle }}
      onClick={() => onOpenDetail(cellCourses, day, lessonNumber)}
    >
      <p className='course-card-name'>{firstCourse.name}</p>
      <p className='course-card-meta'>{firstCourse.room || firstCourse.teacher || '-'}</p>
      {extraCount > 0 && <span className='course-card-more'>+{extraCount}</span>}
    </button>
  )
}

function createSwipeState(currentWeek: number, direction: 'prev' | 'next' | null) {
  const prevWeek = Math.max(1, currentWeek - 1)
  const nextWeek = currentWeek + 1

  return {
    prevWeek,
    nextWeek,
    currentWeek,
    trackClassName: direction ? `schedule-swipe-track is-${direction}` : 'schedule-swipe-track',
  }
}

function renderScheduleTable(
  scheduleData: ReturnType<typeof loadScheduleData>,
  themePreset: ScheduleThemePreset,
  weekNumber: number,
  onOpenDetail: (courses: WeekCellCourse[], day: number, node: number) => void,
) {
  const today = new Date()
  const monthLabel = `${today.getMonth() + 1}月`
  const weekCellMap = scheduleData ? buildWeekCellCourseMap(scheduleData, weekNumber) : new Map()

  return (
    <table className='schedule-table'>
      <thead>
        <tr>
          <th scope='col' className='schedule-month-header'>
            {monthLabel}
          </th>
          {WEEKDAY_LABELS.map((weekday) => (
            <th key={weekday} scope='col' className='schedule-weekday-header'>
              {weekday}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {LESSON_INDEXES.map((lessonNumber) => (
          <tr key={lessonNumber}>
            <th scope='row' className='schedule-lesson-header'>
              {lessonNumber}
            </th>

            {WEEKDAY_LABELS.map((weekday, dayIndex) => {
              const day = dayIndex + 1
              const cellCourses = getCellCourses(weekCellMap, day, lessonNumber)

              return (
                <td key={`${lessonNumber}-${weekday}`} className='schedule-cell'>
                  {renderCourseCell(themePreset, day, lessonNumber, cellCourses, onOpenDetail)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CoursesPage() {
  const navigate = useNavigate()
  const [weekOffset, setWeekOffset] = useState(0)
  const [swipeDirection, setSwipeDirection] = useState<'prev' | 'next' | null>(null)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [gestureAxis, setGestureAxis] = useState<'undecided' | 'horizontal' | 'vertical'>('undecided')
  const [dragOffsetX, setDragOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isCourseDetailOpen, setIsCourseDetailOpen] = useState(false)
  const [selectedCourses, setSelectedCourses] = useState<WeekCellCourse[]>([])
  const [selectedDay, setSelectedDay] = useState(1)
  const [selectedNode, setSelectedNode] = useState(1)
  const scheduleData = useMemo(() => loadScheduleData(), [])
  const scheduleThemePreset = useMemo(() => getScheduleThemePreset(), [])

  const currentDate = new Date()
  const semesterStartDate = getSemesterStartDate()
  const dateText = getCurrentDateText(currentDate)
  const baseWeek = getWeekNumber(currentDate, semesterStartDate)
  const currentWeek = Math.max(1, baseWeek + weekOffset)
  const minWeekOffset = 1 - baseWeek

  const swipeState = useMemo(() => createSwipeState(currentWeek, swipeDirection), [currentWeek, swipeDirection])

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (isAnimating) {
      return
    }

    setSwipeDirection(null)
    setIsResetting(false)
    setDragOffsetX(0)
    setIsDragging(false)
    setGestureAxis('undecided')
    setTouchStartX(event.touches[0]?.clientX ?? null)
    setTouchStartY(event.touches[0]?.clientY ?? null)
  }

  const handleTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (isAnimating || touchStartX === null || touchStartY === null) {
      return
    }

    const touch = event.touches[0]
    if (!touch) {
      return
    }

    const deltaX = touch.clientX - touchStartX
    const deltaY = touch.clientY - touchStartY

    if (gestureAxis === 'undecided') {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
        return
      }

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setGestureAxis('horizontal')
      } else {
        setGestureAxis('vertical')
        return
      }
    }

    if (gestureAxis === 'vertical') {
      return
    }

    setIsDragging(true)

    if (deltaX > 0 && weekOffset <= minWeekOffset) {
      setDragOffsetX(deltaX * 0.35)
      return
    }

    setDragOffsetX(deltaX)
  }

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (isAnimating || touchStartX === null) {
      setTouchStartX(null)
      setTouchStartY(null)
      return
    }

    if (gestureAxis !== 'horizontal') {
      setTouchStartX(null)
      setTouchStartY(null)
      setGestureAxis('undecided')
      setDragOffsetX(0)
      setIsDragging(false)
      return
    }

    const touchEndX = event.changedTouches[0]?.clientX
    if (typeof touchEndX !== 'number') {
      setTouchStartX(null)
      setTouchStartY(null)
      setGestureAxis('undecided')
      setDragOffsetX(0)
      setIsDragging(false)
      return
    }

    const deltaX = touchEndX - touchStartX
    setTouchStartX(null)
    setTouchStartY(null)
    setGestureAxis('undecided')
    setIsDragging(false)
    setDragOffsetX(0)

    if (Math.abs(deltaX) < 56) {
      setIsResetting(true)
      return
    }

    if (deltaX > 0) {
      if (weekOffset <= minWeekOffset) {
        setIsResetting(true)
        return
      }

      setIsAnimating(true)
      setSwipeDirection('prev')
      return
    }

    setIsAnimating(true)
    setSwipeDirection('next')
  }

  const handleSwipeTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') {
      return
    }

    if (isResetting) {
      setIsResetting(false)
      return
    }

    if (!swipeDirection) {
      return
    }

    setWeekOffset((previousOffset) => {
      if (swipeDirection === 'prev') {
        return Math.max(minWeekOffset, previousOffset - 1)
      }

      return previousOffset + 1
    })

    setSwipeDirection(null)
    setIsAnimating(false)
  }

  const trackClassName = useMemo(() => {
    if (swipeDirection) {
      return `schedule-swipe-track is-${swipeDirection}`
    }

    if (isResetting) {
      return 'schedule-swipe-track is-reset'
    }

    if (isDragging) {
      return 'schedule-swipe-track is-dragging'
    }

    return 'schedule-swipe-track'
  }, [isDragging, isResetting, swipeDirection])

  const trackStyle = isDragging ? { transform: `translateX(calc(-33.3333% + ${dragOffsetX}px))` } : undefined

  const handleGoPrevWeek = () => {
    if (isAnimating || isDragging || weekOffset <= minWeekOffset) {
      return
    }

    setIsAnimating(true)
    setSwipeDirection('prev')
  }

  const handleGoNextWeek = () => {
    if (isAnimating || isDragging) {
      return
    }

    setIsAnimating(true)
    setSwipeDirection('next')
  }

  const handleOpenCourseDetail = (courses: WeekCellCourse[], day: number, node: number) => {
    if (courses.length === 0) {
      return
    }

    setSelectedCourses(courses)
    setSelectedDay(day)
    setSelectedNode(node)
    setIsCourseDetailOpen(true)
  }

  const handleCloseCourseDetail = () => {
    setIsCourseDetailOpen(false)
    setSelectedCourses([])
  }

  const selectedWeekday = WEEKDAY_LABELS[selectedDay - 1] ?? ''

  return (
    <div className='courses-page'>
      <header className='courses-header'>
        <div className='courses-date-panel'>
          <p className='courses-date'>{dateText}</p>
          <p className='courses-week'>第 {currentWeek} 周</p>
        </div>

        <div className='courses-actions'>
          <button
            type='button'
            className='courses-menu-button'
            aria-label='上一周'
            onClick={handleGoPrevWeek}
          >
            <span className='courses-menu-arrow' aria-hidden='true'>
              {'<'}
            </span>
          </button>
          <button
            type='button'
            className='courses-menu-button'
            aria-label='下一周'
            onClick={handleGoNextWeek}
          >
            <span className='courses-menu-arrow' aria-hidden='true'>
              {'>'}
            </span>
          </button>
          <button
            type='button'
            className='courses-menu-button'
            aria-label='更多操作'
            onClick={() => navigate('/mine/schedule-settings')}
          >
            <span className='courses-menu-dots' aria-hidden='true'>
              ...
            </span>
          </button>
        </div>
      </header>

      <section
        className='schedule-swipe-viewport'
        aria-label='课程表'
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className={trackClassName} style={trackStyle} onTransitionEnd={handleSwipeTransitionEnd}>
          <div className='schedule-swipe-page'>
            <div className='schedule-scroll-area'>
              {renderScheduleTable(
                scheduleData,
                scheduleThemePreset,
                swipeState.prevWeek,
                handleOpenCourseDetail,
              )}
            </div>
          </div>
          <div className='schedule-swipe-page'>
            <div className='schedule-scroll-area'>
              {renderScheduleTable(
                scheduleData,
                scheduleThemePreset,
                swipeState.currentWeek,
                handleOpenCourseDetail,
              )}
            </div>
          </div>
          <div className='schedule-swipe-page'>
            <div className='schedule-scroll-area'>
              {renderScheduleTable(
                scheduleData,
                scheduleThemePreset,
                swipeState.nextWeek,
                handleOpenCourseDetail,
              )}
            </div>
          </div>
        </div>
      </section>

      <Modal
        title={`课程详情 · 星期${selectedWeekday} 第${selectedNode}节`}
        open={isCourseDetailOpen}
        onCancel={handleCloseCourseDetail}
        footer={null}
      >
        <div className='course-detail-list'>
          {selectedCourses.map((course) => (
            <article key={course.lesson.instanceId} className='course-detail-item'>
              <h3 className='course-detail-name'>{course.name}</h3>
              <p className='course-detail-line'>教室：{course.room || '-'}</p>
              <p className='course-detail-line'>教师：{course.teacher || '-'}</p>
              <p className='course-detail-line'>周次：第{course.lesson.startWeek}-{course.lesson.endWeek}周</p>
              <p className='course-detail-line'>节次：第{course.lesson.startNode}节</p>
            </article>
          ))}
        </div>
      </Modal>
    </div>
  )
}

export default CoursesPage
