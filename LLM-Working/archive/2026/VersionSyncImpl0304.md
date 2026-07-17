> 历史归档：本文不再维护。仓库历史脱敏后，文中记录的旧提交哈希均已失效。

# VersionSyncImpl0304

## 实现日期

- 2026-03-04

## 相关 commit

- `TBD`（当前工作区改动尚未提交）

## 实现目标

- 让 Capacitor iOS/Android 原生版本号自动与 `package.json` / `versions.json` 保持一致。
- 解决 Android APK 版本长期停留在 `1.0` 的问题。

## 实现细节

- 新增脚本：`scripts/syncNativeVersion.mjs`
  - 读取并校验 `package.json.version`（必须为 `x.y.z`）。
  - 校验 `versions.json.latest.version` 与 `package.json.version` 一致，不一致则中断构建并报错。
  - 构建号规则：`major * 1000000 + minor * 1000 + patch`。
    - 示例：`0.3.2 -> 3002`，`1.12.7 -> 1012007`。
  - 同步 Android：更新 `android/app/build.gradle` 的 `versionName`、`versionCode`。
  - 同步 iOS：更新 `ios/App/App.xcodeproj/project.pbxproj` 的 `MARKETING_VERSION`、`CURRENT_PROJECT_VERSION`。
- 构建流程接入：
  - `scripts/buildAndroid.mjs` 在 `cap sync android` 前调用 `node scripts/syncNativeVersion.mjs`。
  - `scripts/buildIos.mjs` 在 `cap sync ios` 前调用 `node scripts/syncNativeVersion.mjs`。

## 验证记录

- 执行命令：`node --check scripts/syncNativeVersion.mjs`
- 结果：通过
- 执行命令：`node scripts/syncNativeVersion.mjs`
- 结果：通过（输出同步后的版本与构建号）

## 关联文档

- [[PROJECT_BASIS#工程编码风格与规范]]
- [[PROJECT_BASIS#3) 技能约定：保存实现文档]]
- [[PlatformBuildImpl0304]]
