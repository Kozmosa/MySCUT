# PWA 构建与发布 Runbook

## 构建

```bash
npm ci
npm run build:pwa
```

输出目录是 `dist/pwa`。该命令会构建主应用和手册，因此可能初始化或访问 `external/survive-in-scut`、安装手册依赖并生成手册产物。

## 本地预览

```bash
npm run preview:pwa
```

验证重点：

- 首次在线访问能加载应用与 `/docs/`；
- 安装后图标、名称和启动路径正确；
- 更新 Service Worker 后能刷新到新资源；
- 离线时已缓存的应用壳可打开；
- 手册使用 Network First，不把 APK、IPA 或 source map 打入预缓存；
- 更新检查仍访问远程 R2/GitHub 清单，而不是过期的 Service Worker 副本。

## 发布

PWA 托管必须支持 SPA fallback 到 `index.html`，但 `/docs/` 应优先返回手册静态文件。发布前记录产物来源提交，并运行 `npm run check` 与一次实际浏览器安装/升级烟雾测试。

如果只需验证主应用而不访问手册或网络，使用 `npm run build:app`。
