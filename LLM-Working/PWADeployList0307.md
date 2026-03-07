# PWADeployList0307

## 部署前检查

- 执行 `yarn build:pwa`，确认生成目录为 `dist/pwa`。
- 确认 `dist/pwa/manifest.webmanifest` 存在，且 `icons` 指向 PNG（`/icons/icon-192.png`、`/icons/icon-1024.png`）。
- 确认 `dist/pwa/sw.js` 与 `dist/pwa/workbox-*.js` 已生成。
- 确认 `dist/pwa/index.html` 包含 `manifest`、`theme-color`、`icon`、`apple-touch-icon`。
- 确认 `dist/pwa/docs/index.html` 存在（手册子站已合并进 PWA 产物）。

## 本地验证

- 执行 `yarn preview:pwa`，访问 `http://localhost:4174`。
- 在 Chrome DevTools -> Application -> Manifest 检查安装信息是否完整。
- 在 Service Workers 面板确认 `sw.js` 已激活。
- 执行一次离线验证：断网后刷新 `/` 应可打开主应用壳。
- 验证手册页 `/docs/` 在离线时可接受降级（按 `NetworkFirst` 策略表现）。

## 静态托管配置

- 平台需配置 SPA fallback：未知路径回退到 `/index.html`。
- 为 `sw.js` 与 `manifest.webmanifest` 设置 `Cache-Control: no-cache` 或短缓存。
- 对 `assets/*` 启用长缓存（文件名带 hash）。
- 保持 HTTPS 与同源部署，确保浏览器允许安装与 SW 生效。

## 发布后核对

- 首次打开页面后确认出现浏览器安装入口（地址栏或菜单）。
- 发布新版本后确认客户端可在刷新后拉取新 SW 资源。
- 访问 `/mine/import-scut-jw` 应重定向到 `/mine/schedule-settings`（Web 隐藏原生导入页）。

## 关联文档

- [[PwaImpl0307#实现细节]]
- [[PROJECT_BASIS#开发与验证命令]]
