# QmsV2Impl0304

## 实现日期

- 2026-03-04

## 相关 commit

- `TBD`（当前工作区改动尚未提交）

## 实现目标

- 修复导入时间表中的冗余节点问题。
- 将 QMS 导出升级到 v2，减少冗余体积并支持按预设写入时间表。
- 为导出弹窗新增“自定义写入的时间表”控制卡片。

## 实现细节

- 时间表裁剪：
  - 新增 `src/core/schedule/timeSlotTrim.ts`。
  - 规则：顺序遍历相邻 `endTime`，命中差值 `10min` 后，丢弃命中对及其后续节点。
  - 应用于 WakeUp 导入与 QMS 导入。
- QMS v2：
  - `src/core/schedule/export.ts` 将 QMS 导出版本升级到 `2`。
  - v2 只导出规范化字段，不导出 `raw`。
  - 非 `builtIn` 只写 `timeSlotPresetId`；`builtIn` 附带完整 `timeSlots`。
  - 新增导出前时间表绑定函数：`applyTimeSlotPresetForExport`。
- QMS 导入：
  - `src/core/schedule/importQms.ts` 支持 `v1/v2` 双版本解析。
  - v2 导入时恢复 `timeSlotPresetId`，并构造可用的 `ScheduleData`。
- 导出界面：
  - `src/features/mine/pages/ScheduleSettingsPage.tsx` 新增“自定义写入的时间表”卡片。
  - 复用时间表预设选择控件。
  - `wakeup/qms/压缩qms` 都受该设置影响。
  - 当“抹去绑定的作息时间”开启时，优先抹除。
## 验证记录

- 执行命令：`npm run build`
- 结果：通过。

## 关联文档

- [[QMS_Schema]]
- [[DATA_STRUCTURE#7. QMS 导出结构（交换层）]]
- [[ImportStrategy#QMS 导入要点（v1/v2）]]
- [[PROJECT_BASIS#3) 技能约定：保存实现文档]]
