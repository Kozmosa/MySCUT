import {
  type CSSProperties,
  type ReactNode,
  type TouchEvent,
  type TransitionEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  CloseOutlined,
  EllipsisOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { Input, Modal, message } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { RoundedSquareIconButton } from '../../components/buttons/RoundedSquareIconButton'
import { ANIMATED_BACK_EVENT, type AnimatedBackRequestDetail } from '../../core/navigation/animatedBack'
import { clearIntersectionPreviewPayload, loadIntersectionPreviewPayload } from '../../core/schedule/intersectionPreview'
import {
  buildWeekScheduleRenderData,
  createEmptyWeekScheduleRenderData,
  getCellCourses,
  getCellRowSpan,
  isCellCovered,
  type WeekScheduleRenderData,
} from '../../core/schedule/selectors'
import { getAutoSimplifyScheduleHintEnabled } from '../../core/schedule/displaySettings'
import { simplifyCourseName, simplifyRoomText, simplifyTeacherText } from '../../core/schedule/displayTextSimplifier'
import { loadActiveScheduleEntry, saveScheduleDataWithOptions } from '../../core/schedule/storage'
import { resolveScheduleTimeSlotsByPreset } from '../../core/schedule/timeSlotPresets'
import { getScheduleThemePreset } from '../../core/schedule/themeStorage'
import type { ScheduleThemePreset } from '../../core/schedule/themePresets'
import type { ScheduleLesson, TimeSlotPresetId, WakeupTimeSlot, WeekCellCourse } from '../../core/schedule/types'
import { getSemesterStartDate } from '../../core/scheduleSettings'

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const MAX_LESSON_COUNT = 12
const TIME_PLACEHOLDER = '--:--'
const SCROLL_HINT_THRESHOLD = 2
const PRELOAD_WEEK_RADIUS = 3
const EMPTY_WEEK_RENDER_DATA = createEmptyWeekScheduleRenderData()
const INTERSECTION_PREVIEW_PATH = '/courses/intersection-preview'

type LessonTime = {
  startTime: string
  endTime: string
}

type ScheduleScrollPaneProps = {
  children: ReactNode
}

function ScheduleScrollPane({ children }: ScheduleScrollPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showTopHint, setShowTopHint] = useState(false)
  const [showBottomHint, setShowBottomHint] = useState(false)
  const [topOcclusion, setTopOcclusion] = useState(0)
  const [bottomOcclusion, setBottomOcclusion] = useState(0)

  const getTopOcclusion = (element: HTMLDivElement) => {
    const topHeader = document.querySelector<HTMLElement>('.courses-header')
    if (!topHeader) {
      return 0
    }

    const elementRect = element.getBoundingClientRect()
    const headerRect = topHeader.getBoundingClientRect()
    const overlap = Math.min(elementRect.bottom, headerRect.bottom) - Math.max(elementRect.top, headerRect.top)

    return Math.max(0, overlap)
  }

  const getBottomOcclusion = (element: HTMLDivElement) => {
    const bottomNav = document.querySelector<HTMLElement>('.bottom-nav')
    if (!bottomNav) {
      return 0
    }

    const elementRect = element.getBoundingClientRect()
    const navRect = bottomNav.getBoundingClientRect()
    const overlap = Math.min(elementRect.bottom, navRect.bottom) - Math.max(elementRect.top, navRect.top)

    return Math.max(0, overlap)
  }

  const updateHintVisibility = () => {
    const element = scrollRef.current
    if (!element) {
      return
    }

    const topOcclusion = getTopOcclusion(element)
    const bottomOcclusion = getBottomOcclusion(element)
    setTopOcclusion(topOcclusion)
    setBottomOcclusion(bottomOcclusion)

    const effectiveTop = element.scrollTop + topOcclusion
    const effectiveBottom = element.scrollTop + element.clientHeight - bottomOcclusion

    const scrollRect = element.getBoundingClientRect()
    const courseCards = Array.from(element.querySelectorAll<HTMLElement>('.course-card'))

    if (courseCards.length === 0) {
      setShowTopHint(false)
      setShowBottomHint(false)
      return
    }

    let hasTopCourse = false
    let hasBottomCourse = false

    for (const card of courseCards) {
      const cardRect = card.getBoundingClientRect()
      const cardTop = cardRect.top - scrollRect.top + element.scrollTop
      const cardBottom = cardRect.bottom - scrollRect.top + element.scrollTop

      if (cardTop < effectiveTop - SCROLL_HINT_THRESHOLD) {
        hasTopCourse = true
      }

      if (cardBottom > effectiveBottom + SCROLL_HINT_THRESHOLD) {
        hasBottomCourse = true
      }

      if (hasTopCourse && hasBottomCourse) {
        break
      }
    }

    setShowTopHint(hasTopCourse)
    setShowBottomHint(hasBottomCourse)
  }

  const handleScroll = () => {
    updateHintVisibility()
  }

  useEffect(() => {
    updateHintVisibility()

    const element = scrollRef.current
    if (!element) {
      return
    }

    const handleResize = () => {
      updateHintVisibility()
    }

    window.addEventListener('resize', handleResize)

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }

    const bottomNav = document.querySelector<HTMLElement>('.bottom-nav')
    const topHeader = document.querySelector<HTMLElement>('.courses-header')

    const resizeObserver = new ResizeObserver(() => {
      updateHintVisibility()
    })

    resizeObserver.observe(element)
    if (bottomNav) {
      resizeObserver.observe(bottomNav)
    }
    if (topHeader) {
      resizeObserver.observe(topHeader)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
    }
  }, [children])

  return (
    <div className='schedule-scroll-pane'>
      {showTopHint && (
        <div className='schedule-scroll-hint schedule-scroll-hint--top' style={{ top: `${topOcclusion + 8}px` }}>
          上方还有课程哦
        </div>
      )}

      <div ref={scrollRef} className='schedule-scroll-area' onScroll={handleScroll}>
        {children}
      </div>

      {showBottomHint && (
        <div
          className='schedule-scroll-hint schedule-scroll-hint--bottom'
          style={{ bottom: `${bottomOcclusion + 8}px` }}
        >
          下方还有课程哦
        </div>
      )}
    </div>
  )
}

function getCurrentDateText(date: Date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function parseLocalDate(dateText: string) {
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }

  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function addDays(baseDate: Date, days: number) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + days)
}

function formatMonthDay(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${month}/${day}`
}

function formatMonthLabel(date: Date) {
  return `${date.getMonth() + 1}月`
}

function formatTimeText(timeText: string) {
  const match = timeText.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) {
    return TIME_PLACEHOLDER
  }

  return `${Number.parseInt(match[1], 10)}:${match[2]}`
}

function formatCourseCredit(credit: number) {
  if (!Number.isFinite(credit) || credit <= 0) {
    return '-'
  }

  return `${credit}`
}

function getWeekdayDateLabels(startDateText: string, weekNumber: number) {
  const semesterStart = parseLocalDate(startDateText)
  if (!semesterStart) {
    return WEEKDAY_LABELS.map(() => '--/--')
  }

  const weekStartDate = addDays(semesterStart, (weekNumber - 1) * 7)
  return WEEKDAY_LABELS.map((_, index) => formatMonthDay(addDays(weekStartDate, index)))
}

function getWeekMonthLabel(startDateText: string, weekNumber: number, fallbackDate: Date) {
  const semesterStart = parseLocalDate(startDateText)
  if (!semesterStart) {
    return formatMonthLabel(fallbackDate)
  }

  const weekStartDate = addDays(semesterStart, (weekNumber - 1) * 7)
  return formatMonthLabel(weekStartDate)
}

function getScheduleLessonCount(lessonCountFromTable: number, timeSlots: WakeupTimeSlot[], lessons: ScheduleLesson[]) {
  const maxNodeInTimeSlots = timeSlots.reduce((max, slot) => Math.max(max, slot.node), 0)
  const maxNodeInLessons = lessons.reduce((max, lesson) => Math.max(max, lesson.endNode), 0)
  const maxNode = Math.max(lessonCountFromTable, maxNodeInTimeSlots, maxNodeInLessons, 1)

  return Math.min(MAX_LESSON_COUNT, maxNode)
}

function getWeekNumber(date: Date, startDateText: string) {
  const semesterStart = parseLocalDate(startDateText)
  if (!semesterStart) {
    return 1
  }

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

function isColorLiteral(colorText: string) {
  const value = colorText.trim()
  return /^#[0-9a-fA-F]{6}$/.test(value) || /^rgba?\(/.test(value)
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

  if (isColorLiteral(courseColor)) {
    return courseColor
  }

  if (themePreset.mode === 'preset') {
    return fallbackColor
  }

  return fallbackColor
}

function renderCourseCell(
  themePreset: ScheduleThemePreset,
  autoSimplifyHintEnabled: boolean,
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
  const displayCourseName = simplifyCourseName(firstCourse.name)
  const displayRoom = autoSimplifyHintEnabled ? simplifyRoomText(firstCourse.room) : firstCourse.room
  const displayTeacher = simplifyTeacherText(firstCourse.teacher)
  const isIntersectionCard = firstCourse.lesson.type === 99
  const isRedCard = backgroundColor === '#d4380d'
  const resolvedCardTextStyle = isRedCard
    ? {
        ...cardTextStyle,
        '--course-text-primary': '#ffffff',
        '--course-text-secondary': '#ffffff',
        '--course-text-badge': '#ffffff',
      }
    : cardTextStyle

  return (
    <button
      type='button'
      className='course-card'
      style={{ backgroundColor, ...resolvedCardTextStyle }}
      onClick={() => onOpenDetail(cellCourses, day, lessonNumber)}
    >
      <p className='course-card-name'>{displayCourseName}</p>
      {!isIntersectionCard && <p className='course-card-meta'>{displayRoom || '-'}</p>}
      {!isIntersectionCard && <p className='course-card-meta'>{displayTeacher || '-'}</p>}
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
  themePreset: ScheduleThemePreset,
  autoSimplifyHintEnabled: boolean,
  weekRenderData: WeekScheduleRenderData,
  lessonIndexes: number[],
  lessonTimes: LessonTime[],
  weekdayDateLabels: string[],
  monthLabel: string,
  onOpenDetail: (courses: WeekCellCourse[], day: number, node: number) => void,
) {
  return (
    <table className='schedule-table'>
      <thead>
        <tr>
          <th scope='col' className='schedule-month-header'>
            {monthLabel}
          </th>
          {WEEKDAY_LABELS.map((weekday, dayIndex) => (
            <th key={weekday} scope='col' className='schedule-weekday-header'>
              <span className='schedule-weekday-label'>{weekday}</span>
              <span className='schedule-weekday-date'>{weekdayDateLabels[dayIndex] ?? '--/--'}</span>
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {lessonIndexes.map((lessonNumber, lessonIndex) => (
          <tr key={lessonNumber}>
            <th scope='row' className='schedule-lesson-header'>
              <span className='schedule-lesson-index'>{lessonNumber}</span>
              <span className='schedule-lesson-time'>{lessonTimes[lessonIndex]?.startTime ?? TIME_PLACEHOLDER}</span>
              <span className='schedule-lesson-time'>{lessonTimes[lessonIndex]?.endTime ?? TIME_PLACEHOLDER}</span>
            </th>

            {WEEKDAY_LABELS.map((weekday, dayIndex) => {
              const day = dayIndex + 1
              if (isCellCovered(weekRenderData, day, lessonNumber)) {
                return null
              }

              const cellCourses = getCellCourses(weekRenderData, day, lessonNumber)
              const rowSpan = getCellRowSpan(weekRenderData, day, lessonNumber)

              return (
                <td key={`${lessonNumber}-${weekday}`} className='schedule-cell' rowSpan={rowSpan}>
                  {renderCourseCell(
                    themePreset,
                    autoSimplifyHintEnabled,
                    day,
                    lessonNumber,
                    cellCourses,
                    onOpenDetail,
                  )}
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
  const location = useLocation()
  const [messageApi, contextHolder] = message.useMessage()
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
  const [expandedCourseDetailMap, setExpandedCourseDetailMap] = useState<Record<string, boolean>>({})
  const persistedActiveScheduleEntry = useMemo(() => loadActiveScheduleEntry(), [])
  const isIntersectionPreviewMode = location.pathname === INTERSECTION_PREVIEW_PATH
  const intersectionPreviewPayload = isIntersectionPreviewMode ? loadIntersectionPreviewPayload() : null
  const activeScheduleEntry = isIntersectionPreviewMode
    ? intersectionPreviewPayload
      ? {
          ...persistedActiveScheduleEntry,
          id: 'intersection-preview',
          name: '课表取交集',
          source: 'intersection',
          themeId: persistedActiveScheduleEntry?.themeId ?? 'skyBlue',
          timeSlotPresetId: 'union' as const,
          semesterStartDate: persistedActiveScheduleEntry?.semesterStartDate ?? getSemesterStartDate(),
          createdAt: Date.now(),
          scheduleData: intersectionPreviewPayload.scheduleData,
        }
      : null
    : persistedActiveScheduleEntry
  const scheduleData = activeScheduleEntry?.scheduleData ?? null
  const scheduleTimeSlotPresetId: TimeSlotPresetId = activeScheduleEntry?.timeSlotPresetId ?? 'builtIn'
  const scheduleThemePreset = useMemo(() => getScheduleThemePreset(), [])
  const autoSimplifyHintEnabled = useMemo(() => getAutoSimplifyScheduleHintEnabled(), [])

  const currentDate = new Date()
  const semesterStartDate = getSemesterStartDate()
  const dateText = getCurrentDateText(currentDate)
  const baseWeek = getWeekNumber(currentDate, semesterStartDate)
  const currentWeek = Math.max(1, baseWeek + weekOffset)
  const minWeekOffset = 1 - baseWeek

  const swipeState = useMemo(() => createSwipeState(currentWeek, swipeDirection), [currentWeek, swipeDirection])

  const activeTimeSlots = useMemo(() => {
    if (!scheduleData) {
      return []
    }

    return resolveScheduleTimeSlotsByPreset(scheduleData, scheduleTimeSlotPresetId)
  }, [scheduleData, scheduleTimeSlotPresetId])

  const lessonCount = useMemo(() => {
    if (!scheduleData) {
      return MAX_LESSON_COUNT
    }

    return getScheduleLessonCount(scheduleData.table.nodes, activeTimeSlots, scheduleData.lessons)
  }, [activeTimeSlots, scheduleData])

  const lessonIndexes = useMemo(
    () => Array.from({ length: lessonCount }, (_, index) => index + 1),
    [lessonCount],
  )

  const lessonTimes = useMemo(() => {
    const timeSlotMap = new Map<number, WakeupTimeSlot>()
    activeTimeSlots.forEach((slot) => {
      if (!timeSlotMap.has(slot.node)) {
        timeSlotMap.set(slot.node, slot)
      }
    })

    return lessonIndexes.map((lessonNumber) => {
      const slot = timeSlotMap.get(lessonNumber)
      return {
        startTime: formatTimeText(slot?.startTime ?? ''),
        endTime: formatTimeText(slot?.endTime ?? ''),
      }
    })
  }, [activeTimeSlots, lessonIndexes])

  const prevWeekdayDateLabels = useMemo(
    () => getWeekdayDateLabels(semesterStartDate, swipeState.prevWeek),
    [semesterStartDate, swipeState.prevWeek],
  )
  const currentWeekdayDateLabels = useMemo(
    () => getWeekdayDateLabels(semesterStartDate, swipeState.currentWeek),
    [semesterStartDate, swipeState.currentWeek],
  )
  const nextWeekdayDateLabels = useMemo(
    () => getWeekdayDateLabels(semesterStartDate, swipeState.nextWeek),
    [semesterStartDate, swipeState.nextWeek],
  )

  const prevMonthLabel = useMemo(
    () => getWeekMonthLabel(semesterStartDate, swipeState.prevWeek, currentDate),
    [currentDate, semesterStartDate, swipeState.prevWeek],
  )
  const currentMonthLabel = useMemo(
    () => getWeekMonthLabel(semesterStartDate, swipeState.currentWeek, currentDate),
    [currentDate, semesterStartDate, swipeState.currentWeek],
  )
  const nextMonthLabel = useMemo(
    () => getWeekMonthLabel(semesterStartDate, swipeState.nextWeek, currentDate),
    [currentDate, semesterStartDate, swipeState.nextWeek],
  )

  const weekRenderDataCache = useMemo(() => {
    const cache = new Map<number, WeekScheduleRenderData>()

    if (!scheduleData) {
      return cache
    }

    const weekStart = Math.max(1, currentWeek - PRELOAD_WEEK_RADIUS)
    const weekEnd = currentWeek + PRELOAD_WEEK_RADIUS

    for (let week = weekStart; week <= weekEnd; week += 1) {
      cache.set(week, buildWeekScheduleRenderData(scheduleData, week, lessonCount))
    }

    return cache
  }, [currentWeek, lessonCount, scheduleData])

  const getWeekRenderData = (weekNumber: number) => weekRenderDataCache.get(weekNumber) ?? EMPTY_WEEK_RENDER_DATA

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
    setExpandedCourseDetailMap({})
    setIsCourseDetailOpen(true)
  }

  const handleCloseCourseDetail = () => {
    setIsCourseDetailOpen(false)
    setSelectedCourses([])
    setExpandedCourseDetailMap({})
  }

  const handleToggleCourseDetail = (instanceId: string) => {
    setExpandedCourseDetailMap((previousMap) => ({
      ...previousMap,
      [instanceId]: !previousMap[instanceId],
    }))
  }

  const selectedWeekday = WEEKDAY_LABELS[selectedDay - 1] ?? ''
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false)
  const [isSaveNameModalOpen, setIsSaveNameModalOpen] = useState(false)
  const [saveNameInput, setSaveNameInput] = useState('')

  const finalizePreviewExit = () => {
    clearIntersectionPreviewPayload()
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/mine/schedule-intersection', { replace: true })
  }

  const handleRequestExitPreview = () => {
    if (!isIntersectionPreviewMode) {
      navigate('/mine/schedule-settings')
      return
    }

    setIsExitConfirmOpen(true)
  }

  useEffect(() => {
    if (!isIntersectionPreviewMode) {
      return
    }

    const handleAnimatedBack = (event: Event) => {
      const customEvent = event as CustomEvent<AnimatedBackRequestDetail>
      if (customEvent.detail.handled) {
        return
      }

      setIsExitConfirmOpen(true)
      customEvent.detail.handled = true
    }

    window.addEventListener(ANIMATED_BACK_EVENT, handleAnimatedBack)
    return () => {
      window.removeEventListener(ANIMATED_BACK_EVENT, handleAnimatedBack)
    }
  }, [isIntersectionPreviewMode])

  const handleConfirmSavePreview = () => {
    if (!intersectionPreviewPayload) {
      setIsExitConfirmOpen(false)
      finalizePreviewExit()
      return
    }

    setSaveNameInput(intersectionPreviewPayload.defaultSaveName)
    setIsExitConfirmOpen(false)
    setIsSaveNameModalOpen(true)
  }

  const handleSubmitSaveName = () => {
    if (!intersectionPreviewPayload) {
      setIsSaveNameModalOpen(false)
      finalizePreviewExit()
      return
    }

    const preferredName = saveNameInput.trim() || intersectionPreviewPayload.defaultSaveName || '课表取交集'
    const saveResult = saveScheduleDataWithOptions(intersectionPreviewPayload.scheduleData, {
      themeId: activeScheduleEntry?.themeId ?? 'skyBlue',
      semesterStartDate: getSemesterStartDate(),
      timeSlotPresetId: 'union',
      preferredName,
      setActive: true,
    })

    if (!saveResult.ok) {
      messageApi.error('课表保存失败，请检查浏览器存储空间')
      return
    }

    setIsSaveNameModalOpen(false)
    finalizePreviewExit()
  }

  return (
    <div className='courses-page'>
      {contextHolder}
      <header className='courses-header'>
        <div className='courses-date-panel'>
          <p className='courses-date'>{dateText}</p>
          <p className='courses-week'>第 {currentWeek} 周</p>
        </div>

        <div className='courses-actions'>
          <RoundedSquareIconButton
            ariaLabel='上一周'
            icon={<LeftOutlined />}
            onClick={handleGoPrevWeek}
          />
          <RoundedSquareIconButton
            ariaLabel='下一周'
            icon={<RightOutlined />}
            onClick={handleGoNextWeek}
          />
          <RoundedSquareIconButton
            ariaLabel={isIntersectionPreviewMode ? '关闭临时课表' : '更多操作'}
            icon={isIntersectionPreviewMode ? <CloseOutlined /> : <EllipsisOutlined />}
            onClick={handleRequestExitPreview}
          />
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
            <ScheduleScrollPane>
              {renderScheduleTable(
                scheduleThemePreset,
                autoSimplifyHintEnabled,
                getWeekRenderData(swipeState.prevWeek),
                lessonIndexes,
                lessonTimes,
                prevWeekdayDateLabels,
                prevMonthLabel,
                handleOpenCourseDetail,
              )}
            </ScheduleScrollPane>
          </div>
          <div className='schedule-swipe-page'>
            <ScheduleScrollPane>
              {renderScheduleTable(
                scheduleThemePreset,
                autoSimplifyHintEnabled,
                getWeekRenderData(swipeState.currentWeek),
                lessonIndexes,
                lessonTimes,
                currentWeekdayDateLabels,
                currentMonthLabel,
                handleOpenCourseDetail,
              )}
            </ScheduleScrollPane>
          </div>
          <div className='schedule-swipe-page'>
            <ScheduleScrollPane>
              {renderScheduleTable(
                scheduleThemePreset,
                autoSimplifyHintEnabled,
                getWeekRenderData(swipeState.nextWeek),
                lessonIndexes,
                lessonTimes,
                nextWeekdayDateLabels,
                nextMonthLabel,
                handleOpenCourseDetail,
              )}
            </ScheduleScrollPane>
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
          {selectedCourses.map((course) => {
            const isExpanded = Boolean(expandedCourseDetailMap[course.lesson.instanceId])

            return (
              <article key={course.lesson.instanceId} className='course-detail-item'>
                <h3 className='course-detail-name'>{course.name}</h3>
                <p className='course-detail-line'>学分：{formatCourseCredit(course.credit)}</p>
                <p className='course-detail-line'>教室：{course.room || '-'}</p>
                <p className='course-detail-line'>教师：{course.teacher || '-'}</p>
                <p className='course-detail-line'>周次：第{course.lesson.startWeek}-{course.lesson.endWeek}周</p>
                <p className='course-detail-line'>
                  节次：
                  {course.lesson.startNode === course.lesson.endNode
                    ? `第${course.lesson.startNode}节`
                    : `第${course.lesson.startNode}-${course.lesson.endNode}节`}
                </p>

                <button
                  type='button'
                  className='course-detail-toggle'
                  onClick={() => handleToggleCourseDetail(course.lesson.instanceId)}
                >
                  {isExpanded ? '点击收起详情' : '点击展开详情'}
                </button>

                {isExpanded && (
                  <div className='course-detail-extra'>
                    <p className='course-detail-line'>课程详情：{course.lesson.detailText || '暂无课程详情'}</p>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </Modal>

      <Modal
        title='保存交集课表'
        open={isExitConfirmOpen}
        onOk={handleConfirmSavePreview}
        onCancel={() => {
          setIsExitConfirmOpen(false)
          finalizePreviewExit()
        }}
        okText='保存'
        cancelText='不保存'
      >
        <p className='schedule-switch-empty'>退出临时课表前，是否保存本次取交集结果？</p>
      </Modal>

      <Modal
        title='设置保存名称'
        open={isSaveNameModalOpen}
        onOk={handleSubmitSaveName}
        onCancel={() => setIsSaveNameModalOpen(false)}
        okText='确定保存'
        cancelText='取消'
      >
        <Input
          value={saveNameInput}
          placeholder={intersectionPreviewPayload?.defaultSaveName ?? 'A/B/Z'}
          onChange={(event) => setSaveNameInput(event.target.value)}
        />
      </Modal>
    </div>
  )
}

export default CoursesPage
