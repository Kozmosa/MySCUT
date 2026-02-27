# GlobalThemeImpl0227

## 实现日期

- 2026-02-27

## 相关 commit

- `f050241`
- `8914512`
- `2e5e5d0`

## 实现目标

- 将全局主题从“单一亮/暗配色”升级为“主题套装 + 亮暗模式”的二维模型。
- 保留亮色/暗色/跟随系统模式不变，在此基础上支持切换整套主题。
- 先提供两套主题：默认（Default）与宫墙红梅（PalacePlum）作为占位方案。

## 主要改动

- `src/core/theme/types.ts`
  - 新增 `GlobalThemeFamily`，当前取值：`default | palacePlum`。
  - `GlobalThemePreset` 新增 `family` 字段。

- `src/core/theme/globalThemePresets.ts`
  - 将原亮/暗配色归类为 `DEFAULT_LIGHT_THEME_PRESET` 与 `DEFAULT_DARK_THEME_PRESET`。
  - 新增 `PALACE_PLUM_LIGHT_THEME_PRESET` 与 `PALACE_PLUM_DARK_THEME_PRESET`。
  - 新增 `GLOBAL_THEME_FAMILY_OPTIONS`，供设置页渲染套装列表。
  - `getGlobalThemePreset` 改为按 `mode + family` 取值。

- `src/core/theme/globalThemeStorage.ts`
  - 新增主题套装持久化键：`globalThemeFamily`。
  - 提供 `get/set/getPreferredGlobalThemeFamily`。

- `src/platform/web/theme/GlobalThemeProvider.tsx`
  - Context 新增 `themeFamily` 与 `setThemeFamily`。
  - 主题应用流程改为读取 `themeFamily + resolvedMode`。
  - 根节点 `data-global-theme` 改为 `family-mode` 组合标识。

- `src/features/mine/MineDetailPage.tsx`
  - 在“全局设置”页新增“主题套装”切换区。
  - 保留并复用亮色/暗色/跟随系统切换能力。
  - 与“启用本地手册”开关合并在同一设置页。

- `src/features/mine/MinePage.tsx`
  - 移除首页中的全局主题模式大面板，减少主页复杂度。

- `src/index.css`
  - 新增主题套装切换相关样式（`mine-theme-family-*`）。
  - 补充切换动画覆盖项，保证主题切换过渡一致性。

## 设计取舍

- 保留“主题模式”概念，避免破坏现有亮暗/系统行为；新增“套装”作为并行维度。
- 套装切换只改变配色变量，不改变页面结构，保证既有布局稳定。
- 先用宫墙红梅作为占位验证扩展性，后续可平滑添加更多套装（如 Cyan）。

## 关联文档

- [[DATA_STRUCTURE]]
- [[ManualDocsImpl0227]]
