> 历史归档：本文不再维护。仓库历史脱敏后，文中记录的旧提交哈希均已失效。

# QMS_Schema

## 1. 目标与定位

- QMS（QiMeng Schedule）是启梦课表导出/导入的交换格式。
- 当前主版本为 `v2`，保留 `v1` 导入兼容。
- v2 的核心目标：
  - 保留渲染所需的规范化课表字段
  - 减少冗余体积（移除 `raw`，并按预设策略写入时间表）

## 2. 文件与编码约定

- 扩展名：`.qms`
- 编码：UTF-8
- 内容：JSON 文本

## 3. 顶层结构

```ts
type QmsExportV2 = {
  schema: 'qms'
  version: 2
  exportedAt: number
  schedule: QmsScheduleV2
}
```

字段说明：

- `schema`：固定 `'qms'`
- `version`：当前为 `2`
- `exportedAt`：导出时间戳（毫秒）
- `schedule`：单个课表实体（见第 4 节）

## 4. `schedule` 结构（v2）

```ts
type QmsScheduleV2 = {
  name: string
  source: 'wakeup' | 'scutHtml' | 'intersection'
  themeId: string
  semesterStartDate: string
  createdAt: number
  timeSlotPresetId: 'builtIn' | 'universityTown' | 'wushan' | 'international' | 'union'
  scheduleData: {
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
    timeSlots?: WakeupTimeSlot[]
    courses: ScheduleCourse[]
    lessons: ScheduleLesson[]
  }
}
```

注意：

- v2 不再导出 `raw`。
- 时间表写入规则：
  - `timeSlotPresetId !== 'builtIn'`：仅写预设 ID，不写 `scheduleData.timeSlots`
  - `timeSlotPresetId === 'builtIn'`：写预设 ID，并写 `scheduleData.timeSlots`

## 5. 导入兼容策略

- 继续支持 `v1` 文件导入。
- `v1`：读取 `schedule`（旧结构）并兼容映射。
- `v2`：按第 4 节结构解析。
- 两者导入后都执行时间表裁剪逻辑（见第 6 节）。

## 6. 时间表裁剪规则

- 导入阶段会顺序遍历 `timeSlots`。
- 一旦发现相邻两项 `endTime` 的分钟差值为 `10`，即判定进入冗余段。
- 命中后，触发对及其后续全部丢弃（保留命中位置之前的节点）。

## 7. 压缩QMS（Clipboard）

- 压缩QMS不是新的 schema 版本，仅是传输编码层。
- 编码：`base64(zstd(qmsJsonTextUtf8))`
- 解码：`qmsJsonTextUtf8 = zstd^-1(base64^-1(compressedText))`

## 8. 抹除详细信息与时间表优先级

- 导出流程支持“抹除详细信息”。
- 当“抹去绑定的作息时间”开启时，优先抹除，不写入时间表。
- 导出界面的“自定义写入的时间表”仅在未抹去作息时间时生效。

## 9. 历史版本说明

- `v1`：导出 `SavedSchedule` 完整结构，包含 `raw`。
- `v2`：改为精简交换结构，移除 `raw`，并按预设策略写入时间表。
