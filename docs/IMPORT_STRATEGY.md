# 课表导入策略

导入流程遵循“平台访问、纯解析、统一模型、显式保存”四层边界。

## 数据流

```text
用户选择来源
→ 平台适配层读取文件或访问目标站点
→ core 导入器解析为 ScheduleData
→ UI 展示预览、主题与学期设置
→ ScheduleRepository 写入 PersistentStore
```

页面组件不直接解析大型文件、管理 Cookie 或操作 SQLite。

## 支持来源

### WakeUp 文件

`importWakeup.ts` 解析 WakeUp 多段 JSON 文本，保留兼容 raw 数据并转换为统一的 Course、Lesson 和时间表结构。

### 教务 HTML

`importScutHtml.ts` 从完整课表周视图读取课程、单双周、多周段、教师、教室、学分和教学班详情。原生教务访问由 `scutJwAccess.ts` 与平台浏览器能力负责；解析器只接收 HTML 字符串。

公开回归测试只使用 `tests/fixtures/public/scutSchedule.synthetic.html`。不得从真实教务页面复制数据到仓库。

### PDF

`importScutPdf.ts` 负责 PDF 文本提取和课表推断。PDF.js CMap 可按构建环境选择本地或远程资源。解析失败必须提示具体阶段，不把不完整结果自动保存。

### QMS

`importQms.ts` 校验 v1/v2 后恢复统一模型。格式见 [QMS_FORMAT.md](QMS_FORMAT.md)。

### 课表交集

交集结果由 `intersection.ts` 从已保存课表计算，不经过外部网络。其 `source` 为 `intersection`，空闲段使用专用课程类型生成。

## Cookie 与网络边界

- 只有用户主动发起教务导入时才访问所选目标。
- Cookie 只用于该目标会话，不写入日志、fixture、错误消息或持久化导出。
- Web 平台不伪装支持受原生会话能力限制的教务抓取。
- 目标站点响应在进入 core 前视为不可信输入，必须校验并限制错误展示内容。

## 保存策略

解析成功不等于自动覆盖现有课表。UI 应允许用户确认名称、学期开始日期、主题和时间表预设，再通过仓储层保存并决定是否设为活动课表。
