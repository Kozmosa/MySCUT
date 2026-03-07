# OpenHarmonyMigrationImpl0307

## 实现日期

- 2026-03-07

## 相关 commit hash

- `251e8ba`
- `9183fa9`
- `3c7d445`

## 实现细节

- 目标：落地鸿蒙初版迁移，先打通“Web 主功能可加载、可构建、可定位产物”的最小可用路径。
- 加载链路改造（白屏修复关键）：
  - 将 OHOS 资源承载从 `rawfile/app` 调整为 `resfile/apps/<bundleName>/www`。
  - Web 入口改为 `file://.../apps/<bundleName>/www/index.html`。
  - 在 `WebviewController` 绑定后调用 `setPathAllowingUniversalAccess([wwwDir])`，解决 file 协议下 JS/CSS 被 CORS 拦截导致的白屏。
- 构建脚本重构：
  - `scripts/buildOhosWeb.mjs` 根据 `ohos/AppScope/app.json5` 的 `bundleName` 自动确定同步目录。
  - 移除对 `index.html` 的 `arkweb://` 重写与 `crossorigin` 清理，保留标准相对路径构建产物。
  - 新增 `scripts/printOhosArtifacts.mjs` 与 `build:ohos-artifacts`，用于快速输出本地 `.hap/.app` 产物路径。
- 工程与调试配套：
  - `ohos/entry/src/main/ets/pages/Index.ets` 增加 `onPageBegin/onPageEnd/onConsole/onErrorReceive` 关键日志，便于继续做运行态诊断。
  - `ohos/entry/.gitignore` 补充 `src/main/resources/resfile/apps`，避免构建同步目录误入版本控制。

## 主要文件

- `scripts/buildOhosWeb.mjs`
- `scripts/printOhosArtifacts.mjs`
- `package.json`
- `vite.config.ts`
- `ohos/entry/src/main/ets/pages/Index.ets`
- `ohos/entry/.gitignore`

## 验证结果

- 本地 `assembleHap` 编译通过。
- 运行后页面正常显示，不再出现初始白屏。
- 产物可定位：`ohos/entry/build/default/outputs/default/entry-default-unsigned.hap`。
