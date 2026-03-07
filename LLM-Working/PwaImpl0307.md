# PwaImpl0307

## 实现日期

- 2026-03-07

## 相关 commit

- 工作区改动（未提交）

## 实现细节

- 新增 PWA 发布脚本：`scripts/buildPwa.mjs`，复用现有 `buildApp` 流程并输出到 `dist/pwa`。
- 更新构建入口：`package.json` 新增 `build:pwa`、`preview:pwa`，并引入 `vite-plugin-pwa` 作为构建期插件依赖。
- 更新 Vite 配置：`vite.config.ts` 增加 `VITE_PWA` 开关，PWA 模式下启用 Workbox；预缓存排除 `docs`，`/docs/**` 使用 `NetworkFirst` 运行时缓存。
- 新增本地预览脚本：`scripts/previewPwa.mjs`，先构建 `dist/pwa`，再以 `npx vite preview` 在 4174 端口启动预览服务。
- 完成图标资源改造：`public/manifest.webmanifest` 与 `index.html` 从 SVG 图标切换为 PNG 图标，新增 `public/icons/icon-192.png`、`public/icons/icon-1024.png`。
- 更新入口与运行时：`index.html` 增加 manifest/theme-color/icon；`src/main.tsx` 在生产 PWA 构建中注册 `sw.js`。
- 调整 Web 端原生能力入口：`src/app/routes.tsx` 在 Web 平台访问 `/mine/import-scut-jw` 时重定向到 `/mine/schedule-settings`。
- 同步约定文档：`PROJECT_BASIS.md` 与 `AGENTS.md` 补充 `yarn build:pwa`、`yarn preview:pwa` 说明。
- 新增部署清单文档：`LLM-Working/PWADeployList0307.md`，用于发布前后核对。

## 关联文档

- [[PROJECT_BASIS#开发与验证命令]]
- [[PlatformBuildImpl0304#实现细节]]
- [[PWADeployList0307#部署前检查]]
