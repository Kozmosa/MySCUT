# ScutJwImportImplProposal0304

## 日期

- 2026-03-04

## 背景与问题

当前“从华工教务系统导入”流程依赖 InAppBrowser 导航地址 + `CapacitorHttp.get(lastNavigatedUrl)` 拉取页面 HTML 再解析。
该方案在以下场景存在不稳定性：

- 教务页面内容由前端脚本动态 fetch 后渲染，主文档 HTML 不含完整课表数据。
- `@capacitor/inappbrowser` 官方 API 不提供 JS 注入/DOM 读取能力，无法直接获取 WebView 运行后的最终 DOM。
- 当前实现仅开放安卓入口，未覆盖 iOS（但插件官方支持 iOS/Android）。

## 结论

- InAppBrowser 可用于“登录承载 + 会话建立 + 页面导航事件监听”；
- 不适合作为“动态渲染 DOM 抓取器”；
- 推荐改为“接口直连导入”：复用登录态 cookies，直接请求教务真实课表接口（或返回课表片段的接口），再解析为 `ScheduleData`。

---

## 目标

1. 将 In-App 教务导入能力扩展到 iOS 与 Android。
2. 摆脱对“最终渲染 DOM”依赖，提升导入稳定性。
3. 保留当前用户交互路径（打开教务系统 -> 登录 -> 进入课表页 -> 点击导入）。

## 非目标

- 不在本阶段实现自定义原生插件来注入 JS。
- 不在本阶段重构现有 WakeUp/QMS 导入流程。

---

## 现状评估

- 代码位置：`src/features/mine/pages/ScutJwImportPage.tsx`
- 入口按钮：`src/features/mine/pages/ScheduleSettingsPage.tsx`
- 平台判断：仅 `android`
- 核心步骤：
  1) InAppBrowser 打开教务页面
  2) 监听导航 URL
  3) 读取该 URL 的 cookies
  4) `CapacitorHttp.get(url)` 获取 HTML
  5) `parseScutScheduleHtml` 解析并保存

风险点：步骤 4 返回的可能是“壳 HTML”，而非完整课程内容。

---

## 技术方案（推荐）

### A. 平台支持扩展（低风险，先做）

- 将可用平台从“安卓原生”扩展为“安卓或 iOS 原生”。
- 调整导入入口展示条件、错误文案和提示文案：
  - 由“仅支持安卓原生环境导入”改为“仅支持原生应用环境导入（Android/iOS）”。
- 保持当前 `openInWebView + 导航监听` 逻辑不变。

### B. 接口直连导入（核心）

在用户完成登录并导航到课表页面后：

1. 从已导航 URL 读取 cookies（`CapacitorCookies.getCookies`）。
2. 基于已建立会话，直接请求“课表数据接口”（不是仅请求当前页面 HTML）。
3. 将接口返回数据适配到内部 `ScheduleData`。
4. 按现有存储流程保存（主题、学期起始日、激活课表等）。

### C. 解析链路双通道容错

- 主通道：接口直连解析（优先）
- 兜底通道：HTML 解析（现有 `parseScutScheduleHtml`）
- 失败时给出可操作提示（例如“请确保已进入个人课表查询页后再导入”）

---

## 接口发现与接入步骤

1. 在真实教务页面抓取网络请求（推荐先手工定位）：
   - 目标：返回课表核心数据的请求 URL
   - 记录：method、query/body、必需 header（如 Referer）、返回格式
2. 在 App 侧复刻请求：
   - 使用 `CapacitorHttp` + cookies
   - 保持必要 headers 与参数一致
3. 构建 parser：
   - 若接口返回 JSON：直接映射为 `ScheduleData`
   - 若接口返回 HTML 片段：在 parser 中解析片段
4. 集成到 `ScutJwImportPage` 导入按钮流程

---

## 数据映射建议

优先提取以下字段：

- 课程名
- 教师
- 教室
- 周次范围（含单双周）
- 星期
- 起止节次
- 学分（可选）

映射原则：

- 标准化到 `ScheduleData` + `ScheduleLesson`
- 对缺失字段采用空字符串/合理默认值
- 保留原始响应片段（必要时放在 `raw` 扩展字段）便于排障

---

## UI/交互调整建议

- “从华工教务系统导入”入口对 iOS 与 Android 同时显示。
- 导入页提示文案更新为跨平台：
  - “请在内置浏览器完成登录并打开个人课表查询页”
- 状态提示增加阶段性反馈：
  - 已捕获页面
  - 正在请求课表接口
  - 解析成功/失败原因

---

## 风险与应对

1. 教务接口变更频繁
   - 应对：接口解析做版本容错；失败时回落 HTML 解析
2. 会话策略变化（Cookie / CSRF）
   - 应对：补充必要 headers，必要时先请求引导接口获取 token
3. iOS 与 Android WebView 行为差异
   - 应对：统一日志埋点 + 平台分支最小化

---

## 验证计划

### 功能验证

- Android：
  - 打开教务 -> 登录 -> 进入个人课表 -> 导入成功
- iOS：
  - 同流程验证导入成功
- 失败路径：
  - 未登录、未进入课表页、会话失效、接口返回异常

### 数据验证

- 随机抽取课程对比：
  - 课程名、教师、教室、周次、节次准确
- 覆盖单双周与跨节课程

### 构建验证

- `npm run build`

---

## 分阶段实施建议

### Phase 1（1次迭代）
- 平台支持扩展到 iOS
- 文案与入口改造
- 保留现有 HTML 拉取解析

### Phase 2（1-2次迭代）
- 接入课表真实接口请求
- 新增接口解析器与容错链路
- 增加错误提示与日志

### Phase 3（可选）
- 对异常学校页面变体增强兼容
- 增加导入诊断信息面板（供排障）

---

## 预期收益

- iOS 用户可直接使用 In-App 教务导入；
- 动态渲染页面场景下导入稳定性显著提升；
- 减少“页面看得到但导入不到”的失败反馈。
