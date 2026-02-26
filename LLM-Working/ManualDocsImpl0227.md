# ManualDocsImpl0227

## 实现日期

- 2026-02-27

## 相关 commit

- `8d2d0e2`
- `1052aee`
- `a8782dd`
- `b705c1a`
- `eddfe3e`

## 实现细节

- 新增“手册”平级视图与路由：`/manual`，并将底部导航扩展为三栏（课程 / 手册 / 我的）。
- 接入独立子站方案：将 `survive-in-scut` 作为 submodule 挂载在 `external/survive-in-scut`。
- 新增全量构建脚本 `build:full`：先构建 React 主站，再执行 submodule 的 `docs:build:platform`，最后将 `vue-platform-dist` 合并到主项目 `dist/docs`。
- 更新 `build:android`，确保 Android 构建默认包含文档子站静态资源。
- 将“手册”页面从占位态升级为入口态，点击可直接跳转 `/docs/`。

## 设计取舍

- 选择“独立子站 `/docs/`”而不是 iframe 内嵌，避免路由、手势返回和资源路径冲突。
- 日常 `build` 保持不变，仅 `build:full` 与 `build:android` 包含文档构建，减少日常迭代等待时间。
- 构建脚本中对 submodule 依赖做兜底安装（`node_modules` 缺失时自动 `npm install`），降低首次拉取后的使用门槛。

## 关联文档

- [[DATA_STRUCTURE]]
