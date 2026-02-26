# ThemeImpl0226

## 实现日期

- 2026-02-26

## 相关 commit

- adbb59e
- a03678b

## 本次实现目标

- 将课表配色方案从课程页渲染逻辑中解耦到独立配置模块
- 在课表设置页提供“设置课表配色”入口
- 提供可扩展的预设配色选择机制（当前仅“天空蓝”）
- 预留“自定义”入口用于后续功能扩展

## 主要改动

### 1) 配色预设配置

- 新增：`src/core/schedule/themePresets.ts`
- 定义：
  - `ScheduleThemeId`
  - `ScheduleThemePreset`
  - `SCHEDULE_THEME_PRESETS`
  - `getScheduleThemePresetById()`
- 当前预设：`skyBlue`（天空蓝）
- 预设新增三档文字色字段：
  - `textColorPrimary`（课程名）
  - `textColorSecondary`（副文本）
  - `textColorBadge`（`+N`）
- 新增模式区分：
  - `wakeup`：使用课程原始色
  - `preset`：使用主题预设色组

### 2) 配色持久化

- 新增：`src/core/schedule/themeStorage.ts`
- 提供：
  - `getScheduleThemeId()`
  - `setScheduleThemeId()`
  - `getScheduleThemePreset()`
- 存储 key：`scheduleThemeId`

### 3) 课程页配色渲染接入

- 修改：`src/features/courses/CoursesPage.tsx`
- 将课程卡片颜色计算改为主题驱动：
  - 读取当前主题 preset
  - 根据 preset 的 `mode` 选择颜色解析策略
  - 在 `wakeup` 模式下兼容 `#AARRGGBB` 色值并提供 fallback 颜色
- 课程卡片文本颜色改为主题驱动：
  - 通过 CSS 变量注入主文本、副文本与角标颜色
  - 支持按主题统一调整可读性

### 4) 设置页交互

- 修改：`src/features/mine/pages/ScheduleSettingsPage.tsx`
- 新增“设置课表配色”按钮
- 点击后弹出配色设置模态框
- 模态框内容：
  - 纵向预设按钮列表（按钮背景色为主题色）
  - 底部白底黑字“自定义”按钮
- 交互行为：
  - 预设按钮：保存配色并提示成功
  - 自定义按钮：显示 `message.info('即将支持')` 占位提示

### 5) 样式支持

- 修改：`src/index.css`
- 新增配色模态列表与按钮样式：
  - `.schedule-theme-list`
  - `.schedule-theme-button`
  - `.schedule-theme-button--custom`

## 当前结果

- 已实现可配置、可持久化的课表主题框架
- 当前可选预设为“天空蓝”
- `skyBlue` 名称调整为“默认”，并保留 WakeUp 原始色模式
- 自定义入口已留出并具备占位反馈

## 后续建议

- 增加更多预设主题并支持预览
- 实现自定义主题编辑（主色、对比色、透明度、fallback 组）
- 将主题应用范围扩展到课表页头部和细节文本颜色

## 关联文档

- [[DATA_STRUCTURE#7. 课表配色方案结构]]
- [[DATA_STRUCTURE#7.1 配色预设结构]]
- [[ScheduleImpl0226#主要改动点]]
- [[SKILL_保存实现文档#推荐模板]]
