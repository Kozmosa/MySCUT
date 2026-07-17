# OpenHarmony 运行 Runbook

OpenHarmony 目标当前是实验性 WebView 容器。主应用构建后会同步到 bundle 对应的 `resfile/apps/<bundleName>/www`。

## 构建 Web 资源

```bash
npm ci
npm run build:ohos-web
```

脚本从 `ohos/AppScope/app.json5` 读取 `bundleName`，构建到 `dist/ohos`，再替换平台工程中的 `www` 目录。该操作会修改跟踪的 OpenHarmony 资源，运行前后必须检查 `git status`。

## 查看本地产物

```bash
npm run build:ohos-artifacts
```

实际 HAP/APP 编译依赖本机 DevEco Studio、SDK 与签名配置，不应把开发机绝对路径写入仓库。

## 白屏与加载错误

本地环境变量和 SDK 路径放在忽略的 `scripts/local/` 脚本中。优先抓取 WebView 关键日志：

```powershell
hdc shell hilog | Select-String -Pattern "ARKWEB-CONSOLE|OnLoadError|OnRequestError|ResourceURLLoader|NWebHandlerDelegate"
```

排查顺序：

1. `OnLoadError` 与 `OnRequestError` 的完整 URL 和错误码；
2. `ARKWEB-CONSOLE` 的 JavaScript、CSS 或运行错误；
3. `ResourceURLLoader` 的资源命中和状态码。

不要根据 thermal、sceneboard、appspawn 等系统噪声直接判断 WebView 根因。

## 存储差异

OpenHarmony 当前通过 `LocalStoragePersistentStore` 实现核心 `PersistentStore` 契约；Web、Android 和 iOS 默认使用 SQLite。平台迁移不得改变领域层的存储接口或静默丢弃 schemaVersion 校验。
