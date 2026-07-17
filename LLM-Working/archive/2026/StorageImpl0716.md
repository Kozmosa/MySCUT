> 历史归档：本文不再维护。仓库历史脱敏后，文中记录的旧提交哈希均已失效。

# 持久化存储分层与课表 SQLite 迁移实现

## 实现日期

- 2026-07-16

## 相关 commit hash

- `f22785888f11685a1ca18376af70e54852b7721d`

## 实现目标

- 抽象 `PreferenceStore`、`PersistentStore`、`SecretStore`，统一类型化 Key、Codec、错误语义和测试 Fake。
- 将课表库从 localStorage 迁移到 Web/PWA、Android、iOS 可长期持久化的 SQLite 存储。
- 保留 OHOS 可运行能力，暂时通过 localStorage Adapter 实现 `PersistentStore`。

## 实现细节

- `src/core/storage/` 提供三类 Store Interface、`StorageError`、JSON Codec、迁移日志接口以及内存 Fake；本阶段未迁移课表以外的 localStorage 调用方。
- `src/platform/storage/` 提供 SQLite 和 localStorage Adapter。SQLite 使用 `persistent_records` 保存版本化聚合文档，使用 `storage_migrations` 记录迁移完成状态。
- Web 端注册 `jeep-sqlite`，数据库持久化到 IndexedDB，并在每次提交后调用 `saveToStore()`；Vite 将匹配版本的 `sql-wasm.wasm` 发布到 `assets/`。
- `ScheduleRepository` 在 React 挂载前加载经过 Codec 校验的课表快照，读取保持同步，所有修改变为串行异步写入；只有持久化成功后才替换内存快照。
- 旧数据迁移优先读取 `scheduleLibrary`，否则兼容 `scheduleData`。写入 SQLite 后回读校验并记录迁移，成功后仅删除两个课表数据 Key，保留配色、学期日期等偏好设置。
- SQLite 初始化或迁移失败时，应用使用可读取的旧数据进入只读模式，所有课表写操作被 Repository 拒绝，并通过顶部错误条提供重试入口。
- 未引入 ORM；课表库第一阶段仍以单个 `ScheduleLibrary` 聚合文档持久化，不进行关系化拆表。

## 依赖兼容性

- 使用 `@capacitor-community/sqlite@8.1.0`、`jeep-sqlite@2.8.0` 和 `sql.js@1.11.0`。
- 实际 Chromium 验证发现 `jeep-sqlite@2.8.0` 发布产物中的 sql.js 胶水代码与 `sql.js@1.14.1` WASM ABI 不兼容，因此按其构建基线锁定 1.11.0，避免 Web 启动时出现 WebAssembly `LinkError`。
- Android/iOS 插件包含 SQLCipher；发版前必须确认应用商店加密声明和目标市场的出口合规要求。

## 验证记录

- `yarn test`：14 个测试文件、66 项测试通过。
- `npx tsc -b`：通过。
- `npx vite build`：Web 主应用生产构建通过，`sql-wasm.wasm` 已复制到产物。
- PWA、Android、iOS、OHOS 的 Vite 目标构建通过；PWA service worker 正常生成。
- `npx cap sync android`、`npx cap sync ios`：通过，两个原生工程均识别 `@capacitor-community/sqlite@8.1.0`。
- Android `gradlew.bat assembleDebug`：通过，SQLCipher 原生库成功打入 Debug APK。
- Chromium 实际页面验证：WakeUp 课表成功写入 IndexedDB，localStorage 中不存在 `scheduleLibrary`/`scheduleData`，刷新后仍可读取“测试课表”。
- `npm audit --omit=dev`：生产依赖 0 个已知漏洞。
- `npm run build:web` 完整通过。此前报告的 `medical_care_assets/转诊须知.jpg` 缺失并非原文或图片路径错误，而是主仓构建回退到了旧手册提交；同步新版手册后，该图片已正确生成到 `dist/web/docs/assets/转诊须知.*.jpg`。

## 已知边界

- `PreferenceStore`、`SecretStore` 当前只有 Interface 和内存 Fake，尚无生产 Adapter。
- OHOS 暂未接入 relationalStore。
- 当前 Windows 环境未提供 Xcode 与 OHOS Hvigor CLI，因此 iOS 完成 Capacitor/SPM 同步、OHOS 完成目标前端构建，未执行对应平台的原生编译。
- Playwright CLI 关闭会话时会清理临时浏览器 Profile，因此自动验证覆盖页面刷新，不将 CLI 会话重建结果视作真实用户浏览器的数据保留行为。

## 关联文档

- [[ReleaseFlow#七、注意事项]]
- [[ScheduleImpl0226#主要改动点]]
- [[ScheduleImportThemeImpl0716#实现细节]]
- [[PROJECT_BASIS#架构解耦要求]]
