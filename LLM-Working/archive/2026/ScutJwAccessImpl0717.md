> 历史归档：本文不再维护。仓库历史脱敏后，文中记录的旧提交哈希均已失效。

# ScutJwAccessImpl0717

- 实现日期：2026-07-17
- 相关 commit hash：
  - 待提交（本次单 commit 实现）

## 主要改动点

- 新增教务系统访问地址核心模块：`src/core/schedule/scutJwAccess.ts`
  - 定义校园网、校外 WebVPN 和自定义网址三种访问模式。
  - 校园网继续使用 `https://xsjw2018.jw.scut.edu.cn/`。
  - 校外 WebVPN 使用 `https://xsjw2018-jw.webvpn.scut.edu.cn/`。
  - 自定义网址支持自动补充 HTTPS，并限制为 HTTP/HTTPS 协议。
- 更新教务系统导入页：`src/features/mine/pages/ScutJwImportPage.tsx`
  - 新增三项纵向单选卡，页面每次进入默认选择校园网。
  - 自定义模式显示网址输入框及行内校验提示。
  - 切换访问方式、修改自定义网址或重新打开浏览器时清理旧页面捕获状态。
  - 保留现有 InAppBrowser 导航监听、Cookie 获取、HTML 解析与课表保存流程。
- 更新页面样式：`src/index.css`
  - 新增访问方式卡片、选中态、自定义网址输入提示和焦点可访问性样式。
  - 复用项目现有主题变量，兼容现有主题切换和移动端安全区域布局。
- 新增单元测试：`tests/core/schedule/scutJwAccess.test.ts`
  - 覆盖预设网址、自定义网址规范化、非法网址和非 HTTP/HTTPS 协议。

## 关键设计取舍

- 访问方式不持久化，确保每次进入仍以校园网作为默认入口，不改变既有使用习惯。
- 地址解析与校验放在平台无关的 Core 层，页面仅负责交互和 InAppBrowser 调用。
- 切换入口后立即清理已捕获页面，防止用户使用新入口选择误导入旧会话页面。
- 本次仅调整 Android 已有导入入口，不扩展 iOS 支持，也不改变课表解析策略。

## 关联文档

- [[ScutJwImportImpl0304#主要改动点]]
- [[ScutJwImportImplProposal0304#UI/交互调整建议]]
