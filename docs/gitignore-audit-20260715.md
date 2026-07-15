# .gitignore 审计报告

> 日期: 2026-07-15

---

## 当前 .gitignore 体系

项目使用 4 层 .gitignore，覆盖不同目录：

| 层级 | 文件 | 职责 |
|---|---|---|
| 根目录 | `.gitignore` | 项目通用模式 (node_modules, dist, logs, secrets, env) |
| Android | `android/.gitignore` | Android 构建产物、Gradle 缓存、IDE 文件 |
| iOS | `ios/.gitignore` | iOS 构建产物、Pods、Capacitor 生成文件 |
| OHOS | `ohos/.gitignore` + `ohos/entry/.gitignore` | OHOS 构建产物、oh_modules、hvigor 缓存 |

---

## 审计结果

### ✅ 已正确覆盖

| 类别 | 条目 | 说明 |
|---|---|---|
| 依赖安装 | `node_modules` | 全子目录匹配 |
| 构建输出 | `dist` | 所有平台构建产物 |
| 二进制产物 | `*.apk`, `*.ipa`, `*.aab`, `*.dex`, `*.class` | Android/iOS 安装包 |
| 编辑器 | `.idea/`, `.vscode/`, `*.sw?`, `*.suo` | IDE 配置 |
| TypeScript | `*.tsbuildinfo` | 增量编译缓存 |
| 日志 | `*.log`, `npm-debug.log*`, `yarn-debug.log*` | 调试日志 |
| 凭据 | `R2_ENV`, `GITHUB_TOKEN.SEC`, `local.properties` | 密钥文件 |
| 本地工具 | `scripts/local/` | 开发机本地脚本 |
| Capacitor 生成 | `android/.../capacitor.config.json` | Android 平台 |
| Capacitor 生成 | `ios/App/App/capacitor.config.json` | iOS 平台 |
| OHOS 构建 | `oh_modules`, `.hvigor` | OHOS 依赖与缓存 |
| OHOS 运行时 | `src/main/resources/rawfile/app`, `src/main/resources/resfile/apps` | OHOS 同步产物 |
| 测试数据 | `LLM-Working/*.qms`, `LLM-Working/*.json`, `LLM-Working/*.html` | 本地导入测试文件 |

### 🔴 已修复

| 问题 | 修复 |
|---|---|
| `.env` 未忽略 | 新增 `.env` 到根 gitignore |
| `.env.*.local` 未忽略 | 新增 `.env.*.local` 到根 gitignore |

> 注: `.env.local` 已由 `*.local` 模式覆盖，`.env.example` 不匹配 `.env.*.local`（因 `example` ≠ `local`）因此仍可被追踪。

### 📌 注意点（非问题，但需了解）

| 项目 | 说明 |
|---|---|
| `LLM-Working/26Spring_scut_html.html` 被追踪 | 33KB 测试用 HTML，在 `LLM-Working/*.html` 规则前已入库。不敏感，但可考虑 `git rm --cached` |
| `ohos/oh-package-lock.json5` 被追踪 | OHOS 的 lockfile，与 `package-lock.json` 类似，建议保留 |
| `src/generated/todoSnapshot.ts` 被追踪 | 生成文件但作为编译时常量使用，建议保留 |
| `docs/backend/GatewayImpl0226.md` 含占位密钥 | `ZHIPU_API_KEY = "你的智谱API密钥"` — 占位符，非真实密钥，安全 |

### ✅ 各目录未被追踪的文件验证

```
node_modules/       → 忽略 ✓
dist/               → 忽略 ✓
*.apk / *.ipa       → 忽略 ✓
*.tsbuildinfo       → 忽略 ✓
ohos/oh_modules/    → 忽略 ✓
ohos/.hvigor/       → 忽略 ✓
.env                → 忽略 ✓ (新加)
```

---

## 结论

**.gitignore 覆盖完整。** 四层架构各司其职，不存在可被意外提交的构建产物或密钥。添加 `.env` 和 `.env.*.local` 后，唯一已覆盖常见陷阱（Vite env 文件、Node 依赖、所有平台构建产物、IDE 配置、凭据文件）。
