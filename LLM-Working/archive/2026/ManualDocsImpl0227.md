> 历史归档：本文不再维护。仓库历史脱敏后，文中记录的旧提交哈希均已失效。

# ManualDocsImpl0227

## 实现日期

- 2026-02-27

## 相关 commit

- `8d2d0e2`
- `1052aee`
- `a8782dd`
- `b705c1a`
- `eddfe3e`
- `69aaff7`
- `8a9cd94`
- `0a2d480`
- `bf04d5e`
- `c394e7b`

## 实现细节

- 新增“手册”平级视图与路由：`/manual`，并将底部导航扩展为三栏（课程 / 手册 / 我的）。
- 接入独立子站方案：将 `survive-in-scut` 作为 submodule 挂载在 `external/survive-in-scut`。
- 新增全量构建脚本 `build:full`：先构建 React 主站，再执行 submodule 的 `docs:build:platform`，最后将 `vue-platform-dist` 合并到主项目 `dist/docs`。
- 更新 `build:android`，确保 Android 构建默认包含文档子站静态资源。
- 将“手册”页面从占位态升级为内嵌文档态，在 `/manual` 内通过 `iframe` 加载手册站点并保留底栏。
- 构建结束后自动清理 submodule 的临时产物目录，避免 super project 出现 submodule 脏状态。
- 处理 Android 实机目录索引回退问题，手册本地入口改为显式加载 `/docs/index.html`。
- 新增手册来源开关：默认在线加载，远程加载失败或超时时自动提示并切换到本地手册，同时持久化“启用本地手册”状态。

## 设计取舍

- 选择“独立子站 `/docs/`”作为资源边界，在 App 内通过 `iframe` 承载文档以保留底栏导航体验。
- 日常 `build` 保持不变，仅 `build:full` 与 `build:android` 包含文档构建，减少日常迭代等待时间。
- 构建脚本中对 submodule 依赖做兜底安装（`node_modules` 缺失时自动 `npm install`），降低首次拉取后的使用门槛。
- 远程手册作为默认来源，本地手册作为容灾回退来源，兼顾实时内容更新与弱网可用性。

## 关联文档

- [[DATA_STRUCTURE]]
