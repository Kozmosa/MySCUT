# MySCUT 全面 Review：CI/CD 发版流程 & 工程组织

> 日期：2026-07-15 | 项目版本：v0.4.7  
> 方法：双 subagent 独立审查 + 人工综合

---

## 总体评分

| 维度 | 评分 | 简述 |
|---|---|---|
| **CI/CD 流水线** | **4.8/10** | 有一站式 `npm run release` 脚本，但 CI 覆盖率极低、原生构建完全手工 |
| **发版流程** | **6.0/10** | 版本管理和 artifact 双源是好设计；缺失回滚机制、发布说明质量差 |
| **工程组织** | **6.3/10** | 分层清晰、TypeScript 严格；缺少 lockfile、测试覆盖率低、大组件待拆分 |
| **综合** | **5.8/10** | 个人项目达到这个水平不错，但要开放协作需要补锁文件、CI、和架构解耦 |

---

## 一、CI/CD 流水线（4.8/10）

### 1.1 评分明细

| 子维度 | 分数 | 关键发现 |
|---|---|---|
| 自动化完备度 | 6/10 | ~60% 流程自动化，但 APK/IPA 构建完全手工（IDE + 人工确认） |
| CI 覆盖 | **2/10** | 只有 1 个 release workflow；**零 PR CI、零 lint/typecheck/test 自动化** |
| Release Workflow | 5/10 | 支持 workflow_dispatch + 双模式 release notes，但只 attach 预构建产物 |
| Build 脚本质量 | 7/10 | 结构良好，try/catch 隔离 + finally 清理，但无缓存/并行 |
| 多平台交付 | 5/10 | 5 种构建变体有独立脚本；但 Android/iOS 原生编译需手动 IDE，仅 OHOS 有自动复制 |
| 错误处理与回滚 | **4/10** | 前置检查充分，但**没有任何回滚机制** — 失败后遗留 orphan tag/R2 对象 |

### 1.2 关键问题

1. **无 PR CI** — `tsc -b` / `vitest run` / lint 从未自动执行，每个 PR 可能引入类型错误、lint 违规、测试失败而不被 CI 拦截
2. **原生构建纯手工** — `npm run release` 打开 Android Studio / Xcode 后等待人工确认，是整个发布流程中最耗时且最易出错的环节
3. **无回滚能力** — `git push --tags` 后失败会遗留 orphan tag；R2 上传成功后 git push 失败产生孤立对象；没有任何自动清理脚本
4. **发布说明质量差** — infra 支持 Markdown + 自动生成，但实际发布记录如 `修复若干问题`、`修复更新问题` 基本无信息量

### 1.3 改进建议（优先级排序）

| 优先级 | 改进项 | 工作量 | 影响 |
|---|---|---|---|
| **P0** | 添加 PR CI workflow: `tsc -b` + `vitest run` + ESLint | 小 | 最高性价比 — 拦截回归 |
| **P1** | 实现发布回滚能力：rollback.mjs 脚本 + R2 生命周期规则 | 中 | 消除发布风险 |
| **P1** | 添加 artifact 完整性校验：SHA256 + size 写入 versions.json | 小 | 客户端可验证下载 |
| **P2** | 用 `./gradlew assembleRelease` 替代手动 Android Studio | 中-高 | 消除最大手工瓶颈 |

---

## 二、发版流程（6.0/10）

### 2.1 评分明细

| 子维度 | 分数 | 关键发现 |
|---|---|---|
| 版本管理 | 8/10 | 严格 semver + 单调递增校验；跨平台一致性通过 syncNativeVersion 强制保证 |
| Artifact 管理 | 7/10 | 双源（GitHub + R2）source-list 结构设计优雅，但缺失 integrity 校验 |
| 安全性 | 6/10 | R2_ENV gitignored + env var 回退合理，但使用长期静态凭据、无 OIDC |
| 发布说明 | **4/10** | 基础设施完善，但实际说明质量极低 |
| 子模块处理 | 6/10 | 功能完整但逻辑散落在 4 个文件中；`--remote` pull 可能引入意外变更 |
| 文档 | 7/10 | CI.md 详实（114 行），但缺少故障排查和恢复流程 |

### 2.2 关键问题

1. **release notes 实际质量低** — v0.4.4 `修复若干问题`、v0.4.5 `修复更新问题`，完全不提供用户有用的变更信息
2. **子模块状态管理分散** — `main.mjs`、`buildApp.mjs`、`manualAssets.mjs`、`manualSubmoduleUtils.mjs` 都操作子模块，职责边界不清晰
3. **发布中途失败无保护** — 提交子模块成功但主仓推送失败时，子模块超前于主仓（orphan state）
4. **无 --dry-run 模式** — 无法预览发布变更而不产生副作用

### 2.3 改进建议

| 优先级 | 改进项 | 工作量 |
|---|---|---|
| P1 | 实施 release note 质量门禁（至少 3 个 bullet point）| 小 |
| P1 | 集成 `conventional-changelog` 从 commit 自动生成 notes | 中 |
| P2 | 添加 `--dry-run` 模式校验所有条件但不执行写入 | 小 |
| P2 | 子模块操作收拢到一个 module，减少四处分散 | 中 |

---

## 三、工程组织（6.3/10）

### 3.1 评分明细

| 子维度 | 分数 | 关键发现 |
|---|---|---|
| 源码模块化 | 7/10 | Feature slicing 清晰，但 routes.tsx 绕过 index.ts 深导入、core 混合存储逻辑 |
| 架构解耦 | 6/10 | 业务逻辑基本在 core/，但无平台适配接口，storage 直接使用 localStorage |
| 代码质量 | **8/10** | TypeScript strict + noUnusedLocals/Parameters，风格一致。23KB 全局 CSS 和缺少 linter 是主要 gap |
| 测试覆盖 | **5/10** | 仅 7 个测试文件，1050 行 CoursesPage.tsx 零测试，无组件测试、无 E2E |
| 开发者体验 | 6/10 | 构建命令覆盖好，但缺少 linter、formatter、pre-commit hook、env 文档 |
| 文档质量 | 7/10 | PROJECT_BASIS 和 AGENTS.md 优秀；缺少 README.md、API 文档、ADR |
| 代码复用 | 6/10 | 共享组件少（4 个），无自定义 hooks，页面过度动画在 4 个页面中重复 |
| 依赖管理 | **5/10** | **无 lockfile**、@ant-design/icons 在 package.json 中缺失、@capacitor/cli 放错位置 |
| 配置管理 | 7/10 | TSConfig 使用 project references + strict 最佳实践，Vite 配置清晰 |
| 子模块管理 | 6/10 | 构建脚本处理完善但无开发者文档、CI 未显式 init 子模块 |

### 3.2 关键问题

1. **无 lockfile（最高风险）** — AGENTS.md 明确 `No lockfile is currently committed`，每次安装非确定性，团队和 CI 各自拿到不同依赖树
2. **依赖配置错误** — `@ant-design/icons` 未声明（依赖 antd 传递）、`@capacitor/cli` 在 dependencies 而非 devDependencies
3. **Core 模块直接耦合 Web API** — 5+ 个 storage 模块直接用 `localStorage`、`animatedBack.ts` 用 `window.dispatchEvent` — 完全违背 PROJECT_BASIS 中的 React Native 可移植目标
4. **大组件未拆分** — `CoursesPage.tsx`（1050 行）、`ScheduleSettingsPage.tsx`（1050 行）混合渲染、动画、日期计算、颜色处理 — 违反单一职责
5. **测试严重不足** — 所有组件、导入解析器（`importScutHtml.ts` 380 行）、导出模块（`export.ts` 310 行）零测试

### 3.3 改进建议

| 优先级 | 改进项 | 工作量 | 影响 |
|---|---|---|---|
| **P0** | 提交 yarn.lock + 修复依赖（补 @ant-design/icons、移动 @capacitor/cli） | 小 | 消除最大确定性风险 |
| **P1** | 定义 StorageAdapter 接口，解耦 core 模块与 localStorage | 中 | 实现 RN 可移植目标 |
| **P1** | 配置 ESLint + Prettier + 更新 vitest 为 jsdom 环境 | 中 | 建立质量基线 |
| **P2** | 拆分 CoursesPage → useSchedulePaging hook + ScheduleTable 展示组件 | 中 | 提高可维护性 |
| **P2** | 添加 root README.md + .env.example + 子模块开发者文档 | 小 | 降低协作门槛 |

---

## 四、综合态势分析

### 优势（保持）

- **版本管理系统完整** — syncNativeVersion 跨 4 个位置（package.json → versions.json → build.gradle → pbxproj）强制一致
- **多源 artifact 设计** — `[{ source, url }]` 数组结构比单一来源更健壮，client 端可 fallback
- **文档意识强** — PROJECT_BASIS.md + AGENTS.md + LLM-Working/ 形成文档体系，CI.md 详实
- **TypeScript 严格模式落地** — strict、noUnusedLocals、noUnusedParameters、noFallthroughCasesInSwitch 全部开启
- **Feature 隔离** — features/ 之间不互相 import，core/ 逻辑大部分为纯函数

### 短板（集中火力）

| 风险级别 | 问题 | 修复难度 |
|---|---|---|
| 🔴 **临界** | 无 lockfile、依赖配置错误 | 小 |
| 🔴 **临界** | 无 PR CI（lint/typecheck/test）| 小 |
| 🟠 **高** | Core 模块直接耦合 Web API | 中 |
| 🟠 **高** | 测试覆盖率极低（<5%） | 大 |
| 🟡 **中** | 原生构建需手工 IDE | 中-大 |
| 🟡 **中** | 无发布回滚机制 | 中 |
| 🟡 **中** | 大组件未拆分 | 中 |
| 🟢 **低** | Release note 质量差 | 小 |
| 🟢 **低** | 缺少 README.md / .env.example | 小 |

### 分阶段行动路线

```
Phase 1（1-2 天，安全基线）
  ├── 提交 yarn.lock
  ├── 修复 package.json 依赖
  ├── 添加 ESLint + Prettier 配置
  ├── 创建 .env.example
  └── 添加 PR CI workflow（lint + tsc -b）

Phase 2（1 周，质量基础）
  ├── vitest 切换 jsdom 环境
  ├── 为纯函数（importScutHtml/export/intersection）添加单元测试
  ├── CoursesPage 提取 useSchedulePaging hook + ScheduleTable 组件
  └── root README.md

Phase 3（2 周，架构提升）
  ├── StorageAdapter 接口 + WebStorageAdapter 实现
  ├── Core 模块注入 adapter 而非直接使用 localStorage
  ├── release rollback 脚本
  └── merged release note + 质量门禁

Phase 4（长期）
  ├── 自动化 Android Gradle build（移除 IDE 步骤）
  ├── 自动化 iOS xcodebuild（需 Apple Developer 证书）
  ├── 组件测试 + E2E 测试
  └── 持续补充 ADR
```

---

> **总结**：这是一个个人项目发展到中等规模后的典型状态 — 核心工程骨架扎实（TypeScript 严格、架构分层清晰、文档意识好），但协作基础设施（lockfile、CI、测试）明显滞后。**最紧迫的 P0 修复（lockfile + PR CI）仅需 1-2 天，即可将项目可靠性提升 2-3 个数量级。**
