# ScutJwImportImpl0304

- 实现日期：2026-03-04
- 相关 commit hash：
  - 待提交

## 主要改动点

- 新增安卓专用导入入口：`src/features/mine/pages/ScheduleSettingsPage.tsx`
  - 在“导入课表”弹窗中，新增“从教务系统导入”选项。
  - 入口仅在 `Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'` 时显示。
- 新增教务系统内置浏览器导入页：`src/features/mine/pages/ScutJwImportPage.tsx`
  - 使用 `@capacitor/inappbrowser` 打开 `http://xsjw2018.jw.scut.edu.cn/`。
  - 页面首次进入弹出引导提示，要求用户登录后进入“个人课表查询”栏目。
  - 监听 `browserPageNavigationCompleted` 记录当前浏览页面 URL。
  - 点击“开始导入当前页面”后，使用 `CapacitorCookies + CapacitorHttp` 获取对应页面 HTML。
  - HTML 解析与存储复用现有“华工教务HTML导入”逻辑（`parseScutScheduleHtml + saveScheduleDataWithOptions`）。
- 新增路由：`src/app/routes.tsx`
  - 增加 `/mine/import-scut-jw` 页面路由。
- 样式补充：`src/index.css`
  - 新增提示卡片与状态卡片样式，保持与课表设置页视觉一致。
- 依赖更新：`package.json`
  - 新增 `@capacitor/inappbrowser`。

## 设计取舍

- 由于 InAppBrowser 官方 API 不直接提供页面 DOM 注入/读取能力，采用“记录当前导航 URL + 基于原生 Cookie 会话重新请求 HTML”的方式实现导入。
- 为避免影响其他平台体验，入口与页面均按安卓原生环境做显式限制。

## 关联文档

- [[ImportStrategy]]
- [[DATA_STRUCTURE#5. 华工教务 HTML 导入映射]]
