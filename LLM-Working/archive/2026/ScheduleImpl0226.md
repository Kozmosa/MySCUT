> 历史归档：本文不再维护。仓库历史脱敏后，文中记录的旧提交哈希均已失效。

# ScheduleImpl0226

## 本次实现概览

日期：2026-02-26

## 后续状态（2026-03 校准）

- 本文记录的是 0226 阶段快照，部分“已知边界”已被后续实现覆盖。
- 当前已支持多课表管理与切换（不再是“暂未提供”）。
- 当前课表渲染节次上限已从 11 调整为动态推导并封顶 12。
- 以当前实现为准请优先参考：`LLM-Working/DATA_STRUCTURE.md`、`LLM-Working/GlobalThemeImpl0228.md`、`src/core/schedule/storage.ts`、`src/core/schedule/selectors.ts`。

本次实现完成了课程表从导入到展示的基础闭环：

1. 设计并落地统一课程表数据结构
2. 实现 WakeUp 文件导入（兼容 + 无损保留）
3. 实现 localStorage 持久化存储
4. 在课程页按当前周真实渲染课程

## 主要改动点

### 1) 核心模型与导入逻辑

- 新增：`src/core/schedule/types.ts`
- 新增：`src/core/schedule/importWakeup.ts`

实现内容：

- 定义 `ScheduleData` 与相关类型
- 支持解析 WakeUp 五行 JSON
- 建立规范化字段映射（table/timeSlots/courses/lessons）
- 保留 `raw` 原始结构，保证无损导入
- 规范化 `startDate` 为 `YYYY-MM-DD`

### 2) 持久化存储

- 新增：`src/core/schedule/storage.ts`

实现内容：

- `loadScheduleData()` 读取并校验结构
- `saveScheduleData()` 持久化保存
- `clearScheduleData()` 清理存储

### 3) 课程筛选与网格映射

- 新增：`src/core/schedule/selectors.ts`

实现内容：

- 按周筛选课程记录
- 构建 `Map<day-node, WeekCellCourse[]>`
- 提供单元格读取方法

### 4) 课表设置页导入入口

- 修改：`src/features/mine/pages/ScheduleSettingsPage.tsx`

实现内容：

- 新增“导入 WakeUp 课表”按钮
- 支持 `*.wakeup_schedule/*.json/*.txt` 文件导入
- 导入后保存到 `localStorage`
- 若文件内含 `startDate`，同步更新学期起始时间
- 增加当前课表名称展示

### 5) 课程页真实显示

- 修改：`src/features/courses/CoursesPage.tsx`
- 修改：`src/index.css`

实现内容：

- 在原有左右滑动切周基础上接入真实课程数据
- 单元格显示逻辑：第一门课 + `+N` 提示其余冲突课程
- 支持 WakeUp 颜色（含 `#AARRGGBB`）到 CSS 颜色转换
- 无课单元格保持浅色占位块

## 交互结果

- 导入后刷新页面数据仍在
- 在课程页左右滑动切换周次时，课程内容随周变化
- 同一单元格多门课时显示“第一门 + 计数”

## 当前已知边界

- 当前课程网格按 11 节渲染，超过 11 节的记录暂不显示
- 单元格仅展示第一条课程详情，其余通过 `+N` 提示
- 暂未提供导入历史与多课表切换

## 下一步建议

1. 增加课程详情弹层（点击单元格可查看全部冲突课程）
2. 支持导出当前课表（可回写 WakeUp 文本）
3. 增加多课表管理与切换能力
