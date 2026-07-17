> 历史归档：本文不再维护。仓库历史脱敏后，文中记录的旧提交哈希均已失效。

# GlobalThemeImpl0228

## 实现日期

- 2026-02-28

## 相关 commit

- `4ae9eaf`

## 实现目标

- 扩展全局主题套装数量，补齐与课表预设风格一致的多套全局主题。
- 将“全局主题套装”切换控件升级为可复用的垂直平移滑块。
- 保持主题切换时的全局过渡动画一致性。

## 主要改动

- `src/core/theme/types.ts`
  - 扩展 `GlobalThemeFamily`：新增 `bambooGrove`、`mistyJiangnan`、`luoyangPeony`、`dunhuangApsaras`、`autumnOsmanthus`。

- `src/core/theme/globalThemeStorage.ts`
  - 更新主题套装合法性校验，支持新增 family 的本地持久化读写。

- `src/core/theme/globalThemePresets.ts`
  - 扩展 `GLOBAL_THEME_FAMILY_OPTIONS` 到 7 套。
  - 新增 5 套主题的 `light/dark` 双模式变量：
    - 清雅竹林
    - 烟雨水乡
    - 洛都牡丹
    - 敦煌飞天
    - 金秋丹桂
  - 更新 `PRESET_MAP`，实现所有套装按 `family + mode` 解析。

- `src/components/VerticalSlideSelector.tsx`
  - 新增可复用垂直平移滑块控件。
  - 支持受控值、选项列表、激活态滑块 `translateY` 动画与 `aria` 标注。

- `src/features/mine/MineDetailPage.tsx`
  - “全局主题套装”切换改为 `VerticalSlideSelector`。
  - 保留当前套装名称展示和现有 `setThemeFamily` 逻辑。

- `src/features/mine/pages/ScheduleSettingsPage.tsx`
  - 课表配色切换从“按钮打开模态框”改为页面内联的 `VerticalSlideSelector`。
  - 移除课表主题弹窗状态与“自定义占位按钮”逻辑，简化交互路径。
  - 导入/切换/删除课表时同步更新页面内当前主题状态，保持展示一致。

- `src/index.css`
  - 新增 `vertical-slide-selector` 相关样式。
  - 将新控件纳入 `.theme-transitioning` 过渡覆盖，确保切换主题时动效统一。
  - 新增 `schedule-theme-selector` 尺寸变量，适配课表设置页的密集选项展示。

## 设计取舍

- 垂直滑块抽成独立组件，避免把交互细节绑死在页面内，后续可直接复用到其他上下分布选项切换。
- 主题变量保持与现有命名体系一致，避免修改消费层代码，仅通过变量值扩展视觉风格。
- 主题模式（亮/暗/系统）沿用现有分段控件，避免在一次改动中混入额外交互改造。

## 验证

- 执行 `npm run build`（本地环境未安装 Yarn）。
- 构建通过。

## 关联文档

- [[GlobalThemeImpl0227]]
- [[DATA_STRUCTURE]]
