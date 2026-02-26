# DATA_STRUCTURE

## 1. 目标

本数据结构用于在项目内存储课程表，并满足以下目标：

- 能无损导入 WakeUp 课表文件（`*.wakeup_schedule`）
- 能直接支持前端课表渲染（按周、按天、按节）
- 能稳定持久化到 `localStorage`
- 后续可扩展到其他来源的课表格式

## 2. 顶层结构 `ScheduleData`

```ts
type ScheduleData = {
  version: 1
  source: 'wakeup'
  importedAt: number
  table: {
    id: number
    name: string
    campus: string
    school: string
    maxWeek: number
    nodes: number
    startDate: string
    showSat: boolean
    showSun: boolean
    timeTable: number
  }
  timeSlots: WakeupTimeSlot[]
  courses: ScheduleCourse[]
  lessons: ScheduleLesson[]
  raw: {
    meta: WakeupMeta
    timeSlots: WakeupTimeSlot[]
    tableConfig: WakeupTableConfig
    courses: WakeupCourse[]
    lessons: WakeupLesson[]
  }
}
```

说明：

- `version`：结构版本号，当前为 `1`
- `source`：数据来源标识，当前为 `'wakeup'`
- `importedAt`：导入时间戳（毫秒）
- `table/timeSlots/courses/lessons`：规范化后的业务字段
- `raw`：完整保留 WakeUp 原始五行结构，保证无损

## 3. 核心子结构

### 3.1 `ScheduleCourse`

```ts
type ScheduleCourse = {
  id: number
  tableId: number
  name: string
  color: string
  credit: number
  note: string
}
```

### 3.2 `ScheduleLesson`

```ts
type ScheduleLesson = {
  instanceId: string
  courseId: number
  tableId: number
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7
  startNode: number
  startWeek: number
  endWeek: number
  weekStep: number
  ownTime: boolean
  startTime: string
  endTime: string
  room: string
  teacher: string
  type: number
  level: number
}
```

说明：

- WakeUp 中 `line5` 记录没有稳定唯一主键，因此新增 `instanceId` 作为实例键
- `courseId` 对应 WakeUp `line5.id`
- `weekStep` 对应 WakeUp `line5.step`

## 4. WakeUp 导入映射

WakeUp 文件按 5 行 JSON 处理：

1. `line1` -> `raw.meta`
2. `line2` -> `timeSlots` + `raw.timeSlots`
3. `line3` -> `table` + `raw.tableConfig`
4. `line4` -> `courses` + `raw.courses`
5. `line5` -> `lessons` + `raw.lessons`

字段转换规则：

- `courseName` -> `ScheduleCourse.name`
- `id`(line5) -> `ScheduleLesson.courseId`
- `step` -> `ScheduleLesson.weekStep`
- `tableConfig.startDate` 规范化为 `YYYY-MM-DD` 写入 `table.startDate`

## 5. 持久化存储

- `localStorage` key：`scheduleData`
- 存储内容：`JSON.stringify(ScheduleData)`
- 读取时进行最小结构校验（`version/source/table/courses/lessons`）

## 6. 渲染辅助结构

课表渲染使用 `WeekCellCourse[]`：

```ts
type WeekCellCourse = {
  courseId: number
  name: string
  color: string
  teacher: string
  room: string
  lesson: ScheduleLesson
}
```

并通过 `Map<"day-node", WeekCellCourse[]>` 建立周视图索引。

周匹配规则：

- `currentWeek >= startWeek`
- `currentWeek <= endWeek`
- `(currentWeek - startWeek) % weekStep === 0`
