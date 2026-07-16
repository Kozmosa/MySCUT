# 课表导入配色统一实现

## 实现日期

2026-07-16

## 相关 commit hash

- 当前改动尚未提交，工作区基于 `a600fb2c14f7c97b2621156d0bb76e25c388aeff`

## 问题原因

- WakeUp 导入会根据文件内课程颜色调用 `resolveNearestPresetThemeIdForWakeup`，覆盖用户在课表设置页选择的预设配色。
- 教务 HTML 导入使用设置页状态，原生教务导入使用持久化状态，三条调用链没有共享同一个回退规则。

## 实现细节

- 在 `src/core/schedule/themePresets.ts` 新增 `resolveScheduleImportThemePreset`，统一执行“使用当前选择，无有效选择则使用第一项预设”的规则。
- WakeUp 导入不再进行颜色相似度匹配，改用课表设置页当前选中的配色；时间表预设仍继续自动匹配。
- 华工教务 HTML 导入使用相同解析函数，并在成功提示中展示实际应用的配色。
- 进入原生教务导入页前先持久化当前选择，原生导入保存时再次通过统一解析函数读取。
- 删除不再使用的 `src/core/schedule/themeMatcher.ts`，避免旧自动配色规则被后续调用。

## 验证

- 新增 `tests/core/schedule/importTheme.test.ts`，覆盖有效选择保持以及空值、无效值回退第一项预设。
- 修复前定向测试失败，修复后 2 项测试通过。
- `npm test`：11 个测试文件、50 项测试全部通过。
- `npx tsc -b` 通过。
- `npx vite build`：主应用生产构建通过。

## 关联文档

- [[ScheduleImpl0226#主要改动点]]
- [[ScheduleWeekNavigationImpl0716#实现细节]]
