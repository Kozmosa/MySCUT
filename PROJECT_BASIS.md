# PROJECT_BASIS

## 项目目标与当前边界

- 本项目当前采用：`Yarn + Vite + React + Ant Design`。

## LLM 协作与文档目录约定

- 所有由 LLM 生成或维护的 Markdown 文档，统一放在 `LLM-Working/` 目录中。
- 文档分为两类：

### 1) 每日工作日志 / 进度记录

- 命名格式：`YYYYMMDD.md`
- 示例：`20260225.md`
- 内容建议包含：
  - 当日完成项
  - 当前状态
  - 阻塞项
  - 下一步计划

### 2) 持久化约定与说明文档

- 用于保存讨论沉淀出的长期有效内容，例如：
  - 工程规范
  - 数据结构约定
  - 接口说明
  - 领域术语与业务规则
- 文件名使用语义化全大写下划线命名，示例：
  - `DATA_STRUCTURE.md`
  - `API_CONTRACT.md`
  - `FRONTEND_CONVENTIONS.md`

### 3) 技能约定：保存实现文档

- 技能名：`保存实现文档`
- 每次完成一个明确实现模块后，必须在 `LLM-Working/` 新增或更新实现说明文档。
- 文件命名格式：`<实现模块>Impl<MMDD>.md`
  - 示例：`ThemeImpl0226.md`
  - `MMDD` 取实现日期（月日）。
- 文档内容至少包含：
  - 实现日期
  - 相关 commit hash（可多个，使用无序列表）
  - 实现细节（核心改动点、文件位置、关键设计取舍）
- 建议在文中使用 Obsidian 双链格式，关联 `LLM-Working/` 下其他文档相关章节，便于跳转查阅。
  - 示例：`[[DATA_STRUCTURE#7. 课表配色方案结构]]`
  - 示例：`[[ScheduleImpl0226#主要改动点]]`

## 工程编码风格与规范

### 语言与工具

- 主要语言：TypeScript（React TSX）
- 运行时与构建：Vite
- 包管理：Yarn
- UI 组件库：Ant Design 5

### TypeScript 约束（已落地）

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `moduleResolution: "Bundler"`
- `jsx: "react-jsx"`

### 代码风格（当前项目约定）

- 使用 ES Module。
- 默认使用单引号字符串。
- 默认不写分号（遵循现有代码风格）。
- 优先编写函数式 React 组件。
- 尽量保持组件与页面简洁，避免过早抽象。
- 非必要不添加注释；仅在复杂、非显而易见逻辑处补充说明。
- 样式基线：
  - 入口引入 `antd/dist/reset.css`
  - 项目全局样式放在 `src/index.css`

### 架构解耦要求

- 编写代码时，必须保证 UI 层与核心业务逻辑良好解耦。
- 组件职责建议：
  - 展示组件（UI）：只负责渲染、样式、交互事件分发，不直接承载复杂业务逻辑。
  - 逻辑层（Core）：通过 hooks / service / domain 模块承载状态管理、数据转换、业务规则与副作用。
- 禁止在页面组件中堆叠不可复用的重业务逻辑；复杂逻辑应可在 Web UI 之外复用。
- 设计目标：为后续迁移到 React Native 保留空间，尽可能复用核心逻辑，仅替换平台 UI 实现。
- 与平台相关能力（DOM、浏览器 API、路由细节）应隔离在适配层，避免污染核心逻辑模块。

## 目录建议

- 推荐在现有最小骨架基础上，逐步演进为以下结构：
- `src/core/`：平台无关的核心业务逻辑（domain、use cases、数据转换、通用校验）。
- `src/features/`：按业务域组织功能模块，每个 feature 包含该域的 UI、hooks、状态、组装逻辑。
- `src/platform/web/`：Web 平台适配层（浏览器 API、路由实现、Web 专属集成）。
- `src/components/`：跨 feature 的通用展示组件（尽量保持“哑组件”属性）。
- `src/services/`：对外部系统访问封装（HTTP client、缓存、鉴权注入等）。
- `src/types/`：共享类型定义。

> 建议原则：核心业务逻辑默认放 `src/core/`，UI 层只做装配与展示，平台差异统一收口到 `src/platform/*`。

## 技术栈与文档链接（LLMS/Reference）

> 说明：优先维护带 `llms.txt` 的链接；如官方未提供 `llms.txt`，记录权威 reference 链接。

- Ant Design（UI 组件库）
  - llms: `https://ant.design/llms.txt`
- React（核心库）
  - reference: `https://react.dev/reference/react`
- Vite（构建器）
  - llms: `https://vite.dev/llms.txt`
  - llms-full: `https://vite.dev/llms-full.txt`

## 开发与验证命令

- 安装依赖：`yarn install`
- 本地开发：`yarn dev`
- 生产构建：`yarn build`
- 本地预览：`yarn preview`

## Git 提交信息约定

- commit 首行使用 Conventional Commits，使用英文简要描述主要变更。
- 建议格式：`feat: ...` / `fix: ...` / `refactor: ...` / `docs: ...` / `chore: ...`。
- commit message 正文使用中文，说明本次修改细节、影响范围与必要的背景。
- 正文必须使用 Markdown 无序列表（`- `）分点描述，优先说明“为什么改”和“改了什么”。
- 整个 commit message 应按 Markdown 书写，并尽量减少格式使用；除纯文本与无序列表外，尽量少用或不用加粗、斜体等格式。
- 需要换行时，使用多个 `-m` 参数或 heredoc 方式提交；不要在字符串中写字面量 `\n` 作为换行。

## 变更维护原则

- 修改工程约定时，优先更新本文件。
- 新增长期有效规范时，在 `LLM-Working/` 下新增对应主题文档，并在本文件中补充索引。
- 每次会话结束建议同步当天 `YYYYMMDD.md`，保证进度连续可追踪。
