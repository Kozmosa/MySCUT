# ScheduleIntersectionImpl0304

## 实现日期

- 2026-03-04

## 相关 commit

- `TBD`（当前工作区改动尚未提交）

## 实现目标

- 新增“课表取交集”功能页，支持本地课表与多个外部课表取并集时间块并统计空闲/占用人名。
- 复用现有课表视图展示临时结果，并在退出时询问是否保存。

## 实现细节

- 新增页面：`src/features/mine/pages/ScheduleIntersectionPage.tsx`
  - 页面风格复用课表设置详情页。
  - 支持选择本地课表（默认当前激活课表）。
  - 支持添加外部课表，导入入口与课表设置页保持一致（包含 PDF 占位入口）。
  - 外部课表导入后弹窗要求输入使用者名称，默认按 `A/B/C...` 编号。
  - 支持显示模式：默认 / 显示有空的人 / 显示没空的人。
- 新增交集计算核心：`src/core/schedule/intersection.ts`
  - 按“先占用标记后统计”的方式计算，减少重复遍历。
  - 基于并集预设时间块统计每周/每天/每块的有空与没空人名。
  - 生成 `source='intersection'` 的 `ScheduleData` 结果。
  - “显示没空的人”模式中：全员有空块显示绿色“都有空”，否则红底白字显示没空人名。
- 新增临时结果缓存：`src/core/schedule/intersectionPreview.ts`
  - 使用 `sessionStorage` 在取交集页与预览页之间传递临时课表。
- 复用课表视图：`src/features/courses/CoursesPage.tsx`
  - 新增临时预览路由识别 `/courses/intersection-preview`。
  - 读取临时课表并按 `union` 时间预设展示。
  - 退出临时页时弹窗询问是否保存；保存时询问课表名称，默认值使用 `A/B/.../Z` 格式。
- 路由与入口：
  - `src/app/routes.tsx` 新增 `/mine/schedule-intersection` 与 `/courses/intersection-preview`。
  - `src/features/mine/MinePage.tsx` 新增入口按钮“课表取交集”。
- 时间表与类型扩展：
  - `src/core/schedule/types.ts` 扩展 `source='intersection'`，`timeSlotPresetId='union'`。
  - `src/core/schedule/timeSlotPresets.ts` 新增并集预设（五山/国际/大学城边界并集切分）。
  - `src/core/schedule/storage.ts` 与 `src/core/schedule/importQms.ts` 同步校验枚举。

## 验证记录

- 执行命令：`npm run build`
- 结果：通过

## 关联文档

- [[DATA_STRUCTURE]]
- [[ExportSanitizeImpl0304]]
- [[ChunkLazyloadImpl0304]]
