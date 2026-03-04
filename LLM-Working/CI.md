# CI

## 目的

- 固化当前项目的发布 CI 使用方式（本地触发 + GitHub Actions 发版）。

## 当前发布链路

- 本地执行 `npm run release <version> [平台参数] [--note "..."]`。
- `scripts/release.mjs` 作为薄入口，实际由 `scripts/release/main.mjs` 编排：
  - `options.mjs`：发布参数解析
  - `versioning.mjs`：版本合法性校验与 `versions.json` 更新
  - `assets.mjs`：Android/iOS 产物发现与重命名
  - `manualAssets.mjs`：手册子模块 root-assets 同步与提交
  - `gitFlow.mjs`：主仓提交、打 tag、推送
- 推送 Tag（`v*`）后，GitHub Actions 工作流 `.github/workflows/release-on-tag.yml` 负责创建/更新 GitHub Release 并上传产物。

## 发布命令

- 基础命令：`npm run release 0.3.2`
- Android 显式指定：`npm run release 0.3.2 --android`
- iOS 显式指定：`npm run release 0.3.2 --ios`
- Android + iOS：`npm run release 0.3.2 --android --ios`
- 带 Release Note（支持 Markdown）：
  - `npm run release 0.3.2 --android --note "- New UI"`
  - `npm run release 0.3.2 --android --ios --note "## 更新\n- New UI\n- Bug fixes"`

## 平台参数规则

- `--android`：发布 Android（生成并上传 APK 相关产物）。
- `--ios`：发布 iOS（打开 Xcode，导出 IPA 后上传）。
- 默认行为：
  - 未传任何平台参数时，默认仅 Android（`android=true`，`ios=false`）。
- 兼容写法：
  - 支持 `--platform android,ios` / `--platform=android,ios`。

## Release Note 规则

- 传入 `--note` 时：
  - 脚本会生成 `.release-notes/v<version>.md`。
  - CI 使用该文件作为 GitHub Release 正文（`body_path`）。
- 未传 `--note` 时：
  - CI 使用 `generate_release_notes: true` 自动生成发布说明。

## 构建与提交流程（已解耦）

- 先执行一次通用构建：`npm run build:full`。
- 再按平台执行：
  - Android：`npx cap sync android`，并打开 Android Studio（人工完成 APK 构建）。
  - iOS：`npx cap sync ios`，并打开 Xcode（人工完成 IPA 导出）。
- 最终统一提交版本文件与产物，创建 Tag 并推送。

## 产物与元数据

- Android 产物：`qmm-v<version>.apk`（按选择平台可选）。
- iOS 产物：`qmm-v<version>.ipa`（按选择平台可选）。
- 元数据：`versions.json`（始终参与发布）。
- `versions.json` 的 `assets` 字段：
  - 始终包含 `versions`。
  - 仅在选中对应平台时写入 `apk` / `ipa`。

## GitHub Actions 工作流行为

- 工作流文件：`.github/workflows/release-on-tag.yml`。
- 触发方式：
  - `push tags: v*`
  - `workflow_dispatch`（手动输入 tag）
- 上传文件策略：
  - 必传 `versions.json`
  - 若存在则附带 `qmm-v<version>.apk`
  - 若存在则附带 `qmm-v<version>.ipa`
  - 若两个平台产物都不存在则失败

## 本地发布前检查建议

- 当前分支应为 `main`。
- 目标版本号应大于当前 `package.json` 版本。
- 本地已安装并可用：Node.js、npm、Git、Capacitor CLI。
- Android 发布需可打开 Android Studio；iOS 发布需可打开 Xcode。

## 常见命令示例

- 默认 Android 发布：`npm run release 0.3.3`
- 双平台并写说明：
  - `npm run release 0.3.3 --android --ios --note "## Release 0.3.3\n- New UI\n- SCUT import improvements"`
