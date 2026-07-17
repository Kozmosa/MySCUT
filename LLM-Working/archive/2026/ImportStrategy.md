> 历史归档：本文不再维护。仓库历史脱敏后，文中记录的旧提交哈希均已失效。

# ImportStrategy

## 目标

- 统一管理课表导入能力，覆盖 WakeUp 与华工教务 HTML 两类来源。
- 将不同来源的数据收敛为同一套 `ScheduleData` 结构，保证课程页渲染逻辑一致。
- 导入后持久化到本地课表库，并支持后续切换课表。

## 总体架构

- 导入入口位于：`src/features/mine/pages/ScheduleSettingsPage.tsx`
- 导入解析位于：
  - WakeUp：`src/core/schedule/importWakeup.ts`
  - 华工 HTML：`src/core/schedule/importScutHtml.ts`
- 存储层位于：`src/core/schedule/storage.ts`
- 默认时间表预设：`src/core/schedule/defaultTimeSlots.ts`

## WakeUp 导入

### 入口与流程

- 入口按钮：`导入 WakeUp 课表`
- 导入方式：文件导入
- 读取文本后调用 `parseWakeupScheduleText(text)`
- 解析成功后进入统一保存流程（写入课表库并设为当前活动课表）

### 数据解析策略

- 按 WakeUp 五行 JSON 解析：meta / timeSlots / tableConfig / courses / lessons
- 生成统一结构 `ScheduleData`
- 保留 `raw.kind = 'wakeup'` 与完整原始字段，满足无损保留
- 规范化 `startDate` 为 `YYYY-MM-DD`

### 持久化策略

- 保存时记录：
  - `themeId`（导入时当前主题）
  - `semesterStartDate`（导入后生效学期起始日期）
- 写入 `scheduleLibrary`，并默认设为活动课表

## 华工教务 HTML 导入

### 入口与交互

- 入口按钮：`从华工教务HTML导入`
- 第一步弹窗：选择导入方式
  - 从文件导入
  - 从剪贴板导入
  - 直接输入
- 直接输入方式使用多行文本框 Modal，支持粘贴完整 HTML 后确认导入

### 数据解析策略

- 使用 `DOMParser` 解析 HTML
- 目标区域优先匹配 `#kbgrid_table_0` / `#table1 table`
- 从 `td.td_wrap[id]` 中提取课程单元格
  - `id` 解析星期与起始节次（例如 `4-1`）
  - `rowspan` 作为跨节参考
  - `.timetable_con` 作为课程块（同格多课程逐条入库）
- 课程字段提取：
  - 课程名：`.title`
  - 教室：包含 `.glyphicon-map-marker` 的段落
  - 教师：包含 `.glyphicon-user` 的段落
  - 周次：从文本中匹配 `x-y周` 或 `x周`
- 生成统一结构 `ScheduleData`，并标记：
  - `source = 'scutHtml'`
  - `raw.kind = 'scutHtml'`
  - `raw.html` 保存原始 HTML

### 默认预设注入

- 时间表预设：
  - 对华工导入统一使用 `DEFAULT_SCUT_TIME_SLOTS`
  - 该预设来自 `test.wakeup_schedule` 的 1-11 节时段
- 配色预设：
  - 导入时绑定当前主题 `themeId`
  - 后续切换到该课表时恢复该主题

### 切换课表协同

- 切换课表时同时切换：
  - 活动课表数据
  - 该课表保存时的 `themeId`
  - 该课表保存时的 `semesterStartDate`

### 下一步计划

- 提升 HTML 解析健壮性：
  - 增加对更多教务页面变体的兼容（class/id 变化、结构嵌套变化）
  - 为关键提取步骤增加更明确的错误提示与定位信息
- 增加导入预览：
  - 导入前展示课程数量、周范围、异常项统计，用户确认后再保存
- 增加多课表管理能力：
  - 在切换弹窗中支持重命名、删除、按来源筛选
- 增加解析测试样本：
  - 覆盖多课程同格、单周课程、缺失字段、异常 HTML 片段等场景

## 存储模型要点

- 当前存储中心：`scheduleLibrary`
- 结构包含：
  - `activeScheduleId`
  - `schedules[]`
- 每条课表记录包含：
  - `id`
  - `name`
  - `source`
  - `themeId`
  - `timeSlotPresetId`
  - `semesterStartDate`
  - `createdAt`
  - `scheduleData`

## QMS 导入要点（v1/v2）

- 解析入口：`src/core/schedule/importQms.ts`
- 兼容版本：
  - `v1`：旧版完整 `SavedSchedule` 封装
  - `v2`：精简交换结构（不含 `raw`）
- 导入后统一执行时间表裁剪：
  - 顺序遍历 `timeSlots`
  - 命中相邻 `endTime` 相差 `10min` 后，丢弃命中对及其后续节点
- 对 `v2`：
  - `timeSlotPresetId` 非 `builtIn` 时，不依赖文件内 `timeSlots`
  - `timeSlotPresetId = 'builtIn'` 时读取并写入 `timeSlots`

## 关联文档

- [[DATA_STRUCTURE#2. 顶层结构 ScheduleData]]
- [[DATA_STRUCTURE#7. 课表配色方案结构]]
- [[ScheduleImpl0226#主要改动点]]
- [[ThemeImpl0226#主要改动]]
