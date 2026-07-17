# 课表数据与持久化模型

本文描述当前代码中的权威课表模型。类型定义以 `src/core/schedule/types.ts` 和 `src/core/storage/contracts.ts` 为准。

## ScheduleData

`ScheduleData` 是导入器、课表交集和持久化层之间的平台无关数据结构：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `version` | `1` | 数据结构版本 |
| `source` | `wakeup \| scutHtml \| intersection` | 数据来源 |
| `importedAt` | `number` | 导入时间戳，单位为毫秒 |
| `table` | object | 学期、校区、周数、节数和显示配置 |
| `timeSlots` | `WakeupTimeSlot[]` | 节次与起止时间映射 |
| `courses` | `ScheduleCourse[]` | 去重后的课程定义 |
| `lessons` | `ScheduleLesson[]` | 具体上课实例 |
| `raw` | union | 导入源的兼容信息；QMS v2 不依赖它恢复业务字段 |

`table` 包含 `id`、`name`、`campus`、`school`、`maxWeek`、`nodes`、`startDate`、`showSat`、`showSun` 和 `timeTable`。

## Course 与 Lesson

`ScheduleCourse` 包含 `id`、`tableId`、`name`、`color`、`credit` 和 `note`。

`ScheduleLesson` 包含：

- 稳定实例标识 `instanceId`；
- `courseId`、`tableId`；
- `day`、`startNode`、`endNode`；
- `startWeek`、`endWeek`、`weekStep`，其中 `weekStep = 2` 表示单双周；
- `ownTime`、`startTime`、`endTime`；
- `room`、`teacher` 和可选 `detailText`；
- 兼容字段 `type`、`level`。

同一课程可以有多个 Lesson；多周段会拆成多个 Lesson，多教师文本保留为导入源提供的合并字符串。

## SavedSchedule 与 ScheduleLibrary

`SavedSchedule` 在 `ScheduleData` 外增加用户管理字段：`id`、`name`、`source`、`themeId`、`timeSlotPresetId`、`semesterStartDate` 和 `createdAt`。

课表库结构为：

```text
ScheduleLibrary
├── version: 1
├── activeScheduleId
└── schedules: SavedSchedule[]
```

`timeSlotPresetId` 当前允许 `builtIn`、`universityTown`、`wushan`、`international` 和 `union`。缺失或未知值会降级为 `builtIn`。

## PersistentStore

领域层通过 `PersistentStore` 契约访问持久化数据：

- `get`、`set`、`remove`；
- 串行化的原子 `update`；
- 每个 `PersistentKey` 显式声明 namespace、name、codec 和 schemaVersion。

Web、Android 和 iOS 默认使用 `SqlitePersistentStore`。Web 通过 `jeep-sqlite` 保存 SQLite 数据；原生平台通过 Capacitor SQLite。OpenHarmony 当前使用 `LocalStoragePersistentStore` 适配同一契约。SQLite 表为 `persistent_records` 与 `storage_migrations`，而不是把整个课表对象直接写入组件状态或页面代码。

存储初始化失败时，应用进入可见的只读/错误状态，不应静默丢弃数据或假装写入成功。

## 隐私约束

课表数据可能包含个人日程、教师和教室信息。公开 fixture 必须使用 `TEST-*` 合成标识；导出时可选择移除课程名、教师、教室和绑定时间表。进一步的数据处理说明见 [../PRIVACY.md](../PRIVACY.md)。
