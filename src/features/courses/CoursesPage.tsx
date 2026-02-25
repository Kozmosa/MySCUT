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

function CoursesPage() {
  const currentDate = new Date()
  const semesterStartDate = getSemesterStartDate()
  const dateText = getCurrentDateText(currentDate)
  const currentWeek = getWeekNumber(currentDate, semesterStartDate)
  const monthLabel = `${currentDate.getMonth() + 1}月`

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

      <section className='schedule-scroll-area' aria-label='课程表'>
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
                  const colorClass = COURSE_BLOCK_COLORS[(lessonNumber + dayIndex) % COURSE_BLOCK_COLORS.length]

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
      </section>
    </div>
  )
}

export default CoursesPage
