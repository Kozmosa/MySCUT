> 历史归档：本文不再维护。仓库历史脱敏后，文中记录的旧提交哈希均已失效。

# ExportSanitizeImpl0304

## 实现日期

- 2026-03-04

## 相关 commit

- `TBD`（当前工作区改动尚未提交）

## 实现目标

- 为导出课表新增“抹除详细信息”折叠卡片。
- 支持按开关抹去作息时间、课程名称、教师名称、教室位置。

## 实现细节

- 导出弹窗新增状态与交互：`src/features/mine/pages/ScheduleSettingsPage.tsx`
  - 主开关：`抹除详细信息`，默认关闭。
  - 主开关开启时展开子选项，子开关顺序为：
    1. 抹去绑定的作息时间
    2. 抹去课程名称
    3. 抹去教师名称
    4. 抹去教室位置
  - 主开关每次从关切到开时，四个子开关均重置为开启。
- 导出数据处理：`src/core/schedule/export.ts`
  - 新增 `ExportSanitizeOptions` 与 `sanitizeScheduleForExport`。
  - 在导出前生成脱敏副本，覆盖 WakeUp/QMS/压缩QMS 三种导出路径。
  - 对 wakeup raw 同步清理对应字段，避免原始与导出结构不一致。
- 样式更新：`src/index.css`
  - 新增导出脱敏卡片及展开选项区域样式。

## 验证记录

- 执行命令：`npm run build`
- 结果：见本次会话验证输出。

## 关联文档

- [[QMS_Schema]]
- [[CompressedQmsImpl0304]]
- [[PROJECT_BASIS#工程编码风格与规范]]
- [[PROJECT_BASIS#3) 技能约定：保存实现文档]]
