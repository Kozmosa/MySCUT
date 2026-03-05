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
  source: 'wakeup' | 'scutHtml' | 'intersection'
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
  raw:
    | {
        kind: 'wakeup'
        meta: WakeupMeta
        timeSlots: WakeupTimeSlot[]
        tableConfig: WakeupTableConfig
        courses: WakeupCourse[]
        lessons: WakeupLesson[]
      }
    | {
        kind: 'scutHtml'
        html: string
      }
}
```

说明：

- `version`：结构版本号，当前为 `1`
- `source`：数据来源标识，当前支持 `'wakeup' | 'scutHtml'`
- `source='intersection'`：课表取交集计算生成的临时/可保存课表
- `importedAt`：导入时间戳（毫秒）
- `table/timeSlots/courses/lessons`：规范化后的业务字段
- `raw`：按来源保留原始结构
  - `kind='wakeup'`：完整保留 WakeUp 原始五行结构
  - `kind='scutHtml'`：保留原始 HTML 文本

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
  endNode: number
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

## 5. 华工教务 HTML 导入映射

导入来源为教务系统周视图 HTML（`table1`）：

- 从 `td.td_wrap[id]` 提取课程单元格
- `id` 解析星期与起始节次（示例：`4-1`）
- `rowspan` 作为跨节参考
- `.timetable_con` 作为课程块（同格多课程逐条入库）

字段提取规则：

- 课程名：`.title` 文本
- 教室：包含 `.glyphicon-map-marker` 的段落
- 教师：包含 `.glyphicon-user` 的段落
- 周次：从文本匹配 `x-y周` 或 `x周`

导入后结构映射：

- `source = 'scutHtml'`
- `raw.kind = 'scutHtml'`
- `raw.html` 保存原始 HTML
- `timeSlots` 使用统一默认预设（来自 WakeUp 样例的 1-11 节）

## 6. 持久化存储（多课表）

当前使用课表库模型存储：

```ts
type SavedSchedule = {
  id: string
  name: string
  source: 'wakeup' | 'scutHtml'
  themeId: string
  timeSlotPresetId: TimeSlotPresetId
  semesterStartDate: string
  createdAt: number
  scheduleData: ScheduleData
}

type TimeSlotPresetId = 'builtIn' | 'universityTown' | 'wushan' | 'international' | 'union'

type ScheduleLibrary = {
  version: 1
  activeScheduleId: string
  schedules: SavedSchedule[]
}
```

存储 key：

- `scheduleLibrary`：当前主存储
- `scheduleData`：历史单课表 key（保留迁移兼容）

行为说明：

- 新导入课表会追加到 `schedules[]`
- 默认设为当前活动课表（更新 `activeScheduleId`）
- 切换课表时会恢复该课表绑定的 `themeId`、`semesterStartDate` 与 `timeSlotPresetId`
- 若仅存在历史 `scheduleData`，首次读取会自动迁移进 `scheduleLibrary`

时间表预设说明：

- `timeSlotPresetId = 'builtIn'`：使用课表自带 `timeSlots`
- `timeSlotPresetId = 'universityTown' | 'wushan' | 'international'`：使用内置校区预设时间
- `timeSlotPresetId = 'union'`：使用并集预设（五山/国际/大学城边界并集切分）
- 该字段按课表条目保存，不是全局设置

## 7. QMS 导出结构（交换层）

QMS 为导出/导入交换格式，当前主版本为 `v2`（保留 `v1` 导入兼容）。

```ts
type QmsExportV2 = {
  schema: 'qms'
  version: 2
  exportedAt: number
  schedule: {
    name: string
    source: 'wakeup' | 'scutHtml' | 'intersection'
    themeId: string
    semesterStartDate: string
    createdAt: number
    timeSlotPresetId: TimeSlotPresetId
    scheduleData: {
      version: 1
      source: 'wakeup' | 'scutHtml' | 'intersection'
      importedAt: number
      table: ScheduleData['table']
      timeSlots?: WakeupTimeSlot[]
      courses: ScheduleCourse[]
      lessons: ScheduleLesson[]
    }
  }
}
```

说明：

- `v2` 不再导出 `raw`。
- `timeSlotPresetId === 'builtIn'` 时附带完整 `timeSlots`；其他预设只写预设 ID。
- 导入 `v1/v2` 时都会执行时间表裁剪：命中相邻 `endTime` 相差 10 分钟后，丢弃该命中对及其后续节点。
- 详细字段说明见：`LLM-Working/QMS_Schema.md`。

### 7.1 压缩QMS（Clipboard 交换编码）

- 压缩QMS不是新的 schema 版本，而是对 QMS 文本的编码层。
- 编码：`base64(zstd(qmsJsonTextUtf8))`
- 解码：`qmsJsonTextUtf8 = zstd^-1(base64^-1(compressedText))`
- 仅影响剪贴板传输方式，不改变 QMS / ScheduleData 数据结构。

## 8. 渲染辅助结构

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

## 9. 课表配色方案结构

课表配色方案与课表数据本体解耦，独立存储于 `themePresets` 与 `themeStorage` 模块。

### 8.1 配色预设结构

```ts
type ScheduleThemeId =
  | 'skyBlue'
  | 'bambooGrove'
  | 'palacePlum'
  | 'mistyJiangnan'
  | 'luoyangPeony'
  | 'dunhuangApsaras'
  | 'autumnOsmanthus'

type ScheduleThemePreset = {
  id: ScheduleThemeId
  name: string
  primaryColor: string
  textColorPrimary: string
  textColorSecondary: string
  textColorBadge: string
  mode: 'wakeup' | 'preset'
  fallbackColors: string[]
}
```

说明：

- `id`：配色方案唯一标识
- `name`：用于设置界面展示
- `primaryColor`：用于配色按钮主题色展示
- `textColorPrimary`：课程名文字颜色
- `textColorSecondary`：课程副文本（教室/教师）颜色
- `textColorBadge`：冲突计数 `+N` 颜色
- `mode`：颜色解析策略
  - `wakeup`：优先使用课程原始色
  - `preset`：忽略课程原始色，按预设色组统一着色
- `fallbackColors`：当课程无颜色或颜色无效时的兜底色组

### 8.2 配色持久化

- `localStorage` key：`scheduleThemeId`
- 存储内容：当前选中的 `ScheduleThemeId`
- 默认值：`skyBlue`

### 8.3 当前预设

当前已内置 7 套课表配色预设：

- `skyBlue`（默认）
- `bambooGrove`（清雅竹林）
- `palacePlum`（宫墙红梅）
- `mistyJiangnan`（烟雨水乡）
- `luoyangPeony`（洛都牡丹）
- `dunhuangApsaras`（敦煌飞天）
- `autumnOsmanthus`（金秋丹桂）
