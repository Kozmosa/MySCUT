import { type TouchEvent, type TransitionEvent, useMemo, useState } from 'react'
import { getSemesterStartDate } from '../../core/scheduleSettings'

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const LESSON_INDEXES = Array.from({ length: 11 }, (_, index) => index + 1)
const COURSE_BLOCK_COLORS = [
  'course-block--blue',
  'course-block--green',
  'course-block--orange',
  'course-block--rose',
  'course-block--purple',
  'course-block--cyan',
  'course-block--yellow',
]

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

function renderScheduleTable(weekNumber: number) {
  const today = new Date()
  const monthLabel = `${today.getMonth() + 1}月`

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
              const colorClass = COURSE_BLOCK_COLORS[(weekNumber + lessonNumber + dayIndex) % COURSE_BLOCK_COLORS.length]

              return (
                <td key={`${lessonNumber}-${weekday}`} className='schedule-cell'>
                  <div className={`course-block ${colorClass}`} />
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
  const [weekOffset, setWeekOffset] = useState(0)
  const [swipeDirection, setSwipeDirection] = useState<'prev' | 'next' | null>(null)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [gestureAxis, setGestureAxis] = useState<'undecided' | 'horizontal' | 'vertical'>('undecided')
  const [dragOffsetX, setDragOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

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

    event.preventDefault()
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

  return (
    <div className='courses-page'>
      <header className='courses-header'>
        <div className='courses-date-panel'>
          <p className='courses-date'>{dateText}</p>
          <p className='courses-week'>第 {currentWeek} 周</p>
        </div>

        <button type='button' className='courses-menu-button' aria-label='更多操作'>
          ...
        </button>
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
            <div className='schedule-scroll-area'>{renderScheduleTable(swipeState.prevWeek)}</div>
          </div>
          <div className='schedule-swipe-page'>
            <div className='schedule-scroll-area'>{renderScheduleTable(swipeState.currentWeek)}</div>
          </div>
          <div className='schedule-swipe-page'>
            <div className='schedule-scroll-area'>{renderScheduleTable(swipeState.nextWeek)}</div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default CoursesPage
