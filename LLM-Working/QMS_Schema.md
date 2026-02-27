# QMS_Schema

## 1. 目标与定位

- QMS（QiMeng Schedule）是启梦课表导出/导入的自有交换格式。
- QMS 设计目标是“完整、可回放、可扩展”：不仅包含课表业务字段，也包含与课表绑定的主题和学期起始日期等上下文。
- QMS 导出单位是“单个已保存课表”。

## 2. 文件与编码约定

- 扩展名：`.qms`
- 内容编码：UTF-8
- 内容类型：JSON 文本

## 3. 顶层结构（Schema v1）

```ts
type QmsExportV1 = {
  schema: 'qms'
  version: 1
  exportedAt: number
  schedule: SavedSchedule
}
```

字段说明：

- `schema`：固定为 `'qms'`，用于快速识别文件类型
- `version`：QMS 格式版本号，当前为 `1`
- `exportedAt`：导出时间戳（毫秒）
- `schedule`：完整的已保存课表实体（详见第 4 节）

## 4. `schedule` 结构定义

```ts
type SavedSchedule = {
  id: string
  name: string
  source: 'wakeup' | 'scutHtml'
  themeId: string
  semesterStartDate: string
  createdAt: number
  scheduleData: ScheduleData
}
```

说明：

- `id`：导出时的原课表 ID，仅作为信息保留；导入时应重新分配新 ID
- `name`：课表显示名
- `source`：原始来源标识（WakeUp 或华工 HTML）
- `themeId`：课表绑定的配色方案 ID
- `semesterStartDate`：课表绑定的学期起始日期（`YYYY-MM-DD`）
- `createdAt`：原课表创建时间戳
- `scheduleData`：规范化课表主体，结构与应用内部一致

## 5. `scheduleData` 要求

`scheduleData` 直接复用当前内部定义（`ScheduleData`）：

- `version` 必须为 `1`
- `source` 为 `'wakeup' | 'scutHtml'`
- 包含 `table/timeSlots/courses/lessons/raw`
- `raw.kind` 与 `source` 应保持一致

参考：[[DATA_STRUCTURE#6. 持久化存储（多课表）]]

## 6. 示例

```json
{
  "schema": "qms",
  "version": 1,
  "exportedAt": 1772160000000,
  "schedule": {
    "id": "schedule-1772150000000-ab12cd",
    "name": "2025-2026-2",
    "source": "wakeup",
    "themeId": "skyBlue",
    "semesterStartDate": "2026-02-23",
    "createdAt": 1772150000000,
    "scheduleData": {
      "version": 1,
      "source": "wakeup",
      "importedAt": 1772150000000,
      "table": {
        "id": 1,
        "name": "2025-2026-2",
        "campus": "华南理工大学",
        "school": "华南理工大学",
        "maxWeek": 20,
        "nodes": 11,
        "startDate": "2026-02-23",
        "showSat": true,
        "showSun": false,
        "timeTable": 2
      },
      "timeSlots": [],
      "courses": [],
      "lessons": [],
      "raw": {
        "kind": "wakeup",
        "meta": {},
        "timeSlots": [],
        "tableConfig": {},
        "courses": [],
        "lessons": []
      }
    }
  }
}
```

## 7. 解析方法（导入侧建议）

建议按以下顺序处理：

1. 读取文本并 `JSON.parse`
2. 校验顶层：`schema === 'qms'`、`version === 1`
3. 校验 `schedule` 基本字段：`id/name/source/themeId/semesterStartDate/createdAt/scheduleData`
4. 校验 `scheduleData` 至少满足内部最小结构校验（`version/source/table/courses/lessons`）
5. 通过当前存储 API 写入课表库：
   - 以 `schedule.scheduleData` 为主体
   - 以 `schedule.themeId/semesterStartDate/name` 作为导入选项
   - 导入后分配新的本地 `schedule.id`

错误处理建议：

- 顶层 `schema`/`version` 不匹配：提示“QMS 文件版本不受支持”
- 字段缺失或类型错误：提示“QMS 文件结构无效”
- 存储失败：提示“导入失败，请检查浏览器存储空间”

## 8. 向后兼容与演进

- 新版本应递增 `version`，并保留 v1 解析器。
- 若新增字段，优先采用“可选字段 + 默认值”策略，避免破坏旧导入逻辑。
- 若未来引入加密/签名，可在顶层追加 `integrity` 或 `signature` 字段，不影响 v1 基础结构。
