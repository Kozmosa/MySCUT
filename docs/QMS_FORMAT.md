# QMS 交换格式

QMS 是 MySCUT 的 JSON 课表交换格式。当前写出版本为 v2，导入器继续兼容 v1。

## v2 顶层结构

```json
{
  "schema": "qms",
  "version": 2,
  "exportedAt": 0,
  "schedule": {
    "name": "TEST-SCHEDULE",
    "source": "scutHtml",
    "themeId": "default",
    "semesterStartDate": "2026-09-07",
    "createdAt": 0,
    "timeSlotPresetId": "builtIn",
    "scheduleData": {
      "version": 1,
      "source": "scutHtml",
      "importedAt": 0,
      "table": {},
      "timeSlots": [],
      "courses": [],
      "lessons": []
    }
  }
}
```

所有时间戳均为 Unix 毫秒。`table`、`courses` 和 `lessons` 字段见 [DATA_MODEL.md](DATA_MODEL.md)。

## 时间表规则

- `timeSlotPresetId = builtIn` 时，v2 可写入 `scheduleData.timeSlots`。
- 选择校区预设或并集预设时，导出不重复写入可由预设恢复的 `timeSlots`。
- 导入会裁剪多余节次，并将未知预设降级为 `builtIn`。

## v1 兼容

v1 把完整 `SavedSchedule` 放在 `schedule` 字段中。导入器会读取其 `scheduleData`、主题、学期开始日期、名称和时间表预设，然后转换为当前内存模型。新代码不应继续写出 v1。

## 校验与错误

导入边界先把 JSON 解析为 `unknown`，再检查 schema、版本、来源、时间戳、对象和数组字段。无效 JSON、未知版本或结构不完整都会返回可行动错误，不做部分静默导入。

## 隐私导出

导出 UI 支持清除绑定时间表、课程名、教师和教室。清理会同时作用于当前模型和可兼容的 WakeUp raw 数据。即使执行清理，用户仍应在公开 QMS 前人工检查自由文本字段。
