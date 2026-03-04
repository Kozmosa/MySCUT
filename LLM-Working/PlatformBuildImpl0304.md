# PlatformBuildImpl0304

## 实现日期

- 2026-03-04

## 相关 commit

- `1477bc7`（基线）
- `TBD`（当前工作区改动尚未提交）

## 实现目标

- 解耦 iOS 与 Android 平台构建流程，避免 iOS 构建依赖 Android 平台同步。
- 保持现有 Android 发布流程可用且语义更明确。

## 实现细节

- 将通用构建与平台同步职责拆分：
  - `scripts/buildFull.mjs` 移除硬编码的 `npx cap sync android`，仅负责通用构建产物（主应用 + docs）。
- 新增平台专用构建脚本：
  - `scripts/buildAndroid.mjs`：执行 `npm run build:full` 后执行 `npx cap sync android`。
  - `scripts/buildIos.mjs`：执行 `npm run build:full` 后执行 `npx cap sync ios`。
- 调整 npm scripts：
  - `package.json` 中 `build:android` 与 `build:ios` 改为分别调用新脚本，不再共同指向 `build:full`。
- 修正发布流程脚本绑定：
  - `scripts/release.mjs` 中构建命令从 `npm run build:full` 改为 `npm run build:android`，与后续 `cap open android` 保持一致。

## 验证记录

- 执行命令：`for f in scripts/buildAndroid.mjs scripts/buildIos.mjs scripts/buildFull.mjs scripts/release.mjs; do node --check "$f"; done`
- 结果：通过
- 执行命令：`npm run build:ios`
- 结果：通过（最终执行 `cap sync ios`，未触发 Android 同步）

## 已知边界

- `build:android` 的可用性依赖本地 Android 平台工程状态（与本次解耦改动无关）。
- 当前脚本链路仍使用 npm 命令调用，未在本次改动中切换为 Yarn。

## 关联文档

- [[PROJECT_BASIS#工程编码风格与规范]]
- [[PROJECT_BASIS#3) 技能约定：保存实现文档]]
- [[ReleaseImpl0228]]
