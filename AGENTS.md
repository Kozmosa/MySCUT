# AGENTS.md

本文件只描述仓库操作规则。产品目标、架构边界和数据职责以 `PROJECT_BASIS.md` 为准。

## 环境与包管理

- 使用 Node.js 22.13.0 或更高版本，推荐 Node 22 LTS。
- npm 是唯一包管理器，`package-lock.json` 是依赖解析的唯一来源。
- 全新或 CI 安装使用 `npm ci`。
- 只有修改依赖时使用 `npm install`，并提交同步变化的 `package.json` 与 `package-lock.json`。
- 不要生成或提交其他包管理器锁文件。

## 常用命令

```bash
npm run dev
npm run typecheck
npm test
npm run build:app
npm run check:docs
npm run audit:public-data
npm run check
```

单个 Vitest 文件或用例：

```bash
npm exec vitest -- path/to/file.test.ts
npm exec vitest -- path/to/file.test.ts -t "test name"
```

## 构建目标与风险

- `build:app` 只构建主应用到 `dist/app`，不拉取或构建手册，是基础构建验证。
- `build:web` 会初始化并尝试拉取手册子模块、安装手册依赖、生成手册快照并写入 `dist/web`；它依赖网络和上游状态，不是 deterministic build。
- `build:pwa` 生成 PWA 发布产物。
- `build:android`、`build:ios` 和 Capacitor sync 可能修改跟踪的原生工程文件；运行前后必须检查 `git status`。
- `build:ohos-web` 可能写入 OpenHarmony 工程资源目录。
- `build:full` 默认只汇总各目标结果并容忍失败，不能作为成功证明。需要严格验证时使用对应目标构建，或显式设置 `BUILD_FULL_STRICT=1` 与 `BUILD_FULL_REQUIRED`。

按变更风险选择验证范围：普通核心逻辑至少运行 `npm run check`；平台相关变更再运行相应严格构建和设备烟雾测试。

## 代码约定

- TypeScript/TSX 使用单引号，不写分号；CSS 保留分号。
- 保持 `strict`、`noUnusedLocals`、`noUnusedParameters` 和 `noFallthroughCasesInSwitch` 通过。
- 使用函数组件；UI 只负责展示与事件分发，业务逻辑放入 core、service、hook 或平台适配层。
- 不静默吞掉异常；逻辑层提供可行动错误，用户文案留在 UI 层。
- 保留 `src/main.tsx` 中的 `antd/dist/reset.css`，避免无必要的全局样式覆盖。

## 隐私、发布与文档

- 不得提交真实课表、个人标识、群号、Cookie、Token、私钥、开发机绝对路径或其他凭据。
- APK、IPA 和发布中间产物不得进入 Git；使用 `artifacts/release/`、GitHub Releases 和可选 R2。
- 修改公开 fixture 后必须运行 `npm run audit:public-data`。
- `docs/` 保存当前权威技术文档，`LLM-Working/` 仅为历史归档。
- 普通实现由 commit 和 Pull Request 记录，不要求创建 Impl 文档，也不要求文档记录自身 commit hash。
- 只有长期有效且需要解释取舍的决策进入 `docs/adr/`。
- `.agents/skills` 是技能源，`.claude/skills` 是生成镜像；不得双份手工修改，`npm run check:docs` 会检查一致性。

## 历史安全与远端操作

- 公开 Git 历史已于 2026-07-17 重写并强推；重写前的 commit ID、clone、fork、bundle 和补丁均视为不可信旧历史。
- 不得从重写前历史执行 merge、rebase、cherry-pick、push 或恢复已删除的分支、标签和安装包 blob。需要旧实现时只能人工审阅并在脱敏后重新实现。
- 处理现有 checkout 前先确认 `main` 基于当前 `origin/main`；无法确认时删除或加密归档旧 clone，再从远端重新克隆并初始化子模块。
- 不得绕过 `main` 分支保护，不得在未完成当前树和全 refs 敏感扫描时 force push、重写标签或恢复备份 refs。
- GitHub 缓存、detached object、fork 和第三方 clone 不受普通 force push 控制；不得宣称历史重写已经从所有外部副本中彻底清除数据。
- 未经维护者明确授权，不得代表项目提交 GitHub Support 请求。安全问题使用 Private Vulnerability Reporting 私下处理，不得在公开 Issue 中粘贴敏感值。
- 历史清理状态、重新克隆要求和风险边界以 `docs/HISTORY_SANITIZATION.md` 为准。

## Git 工作流

- 提交前检查现有模式和工作树，不覆盖用户的无关改动。
- 提交首行使用英文 Conventional Commits；需要正文时用中文 Markdown 无序列表说明原因与影响。
- 不以未执行的 lint、测试或构建作为完成证明。
