# CompressedQmsImpl0304

## 实现日期

- 2026-03-04

## 相关 commit

- `TBD`（当前工作区改动尚未提交）

## 实现目标

- 为课表导入与导出新增“压缩QMS”模式。
- 压缩QMS定义：`base64(zstd(QMS文本))`。

## 实现细节

- 新增核心模块：`src/core/schedule/compressedQms.ts`
  - 基于 `@hpcc-js/wasm-zstd` 实现 zstd 压缩与解压。
  - 提供 `encodeCompressedQmsText` 与 `decodeCompressedQmsText`。
  - 统一处理 base64 编解码，解码前会移除空白字符。
  - 失败时区分错误类型：base64 无效 / zstd 解压失败。
- 更新课表设置页：`src/features/mine/pages/ScheduleSettingsPage.tsx`
  - 导入弹窗新增入口：`从剪贴板压缩QMS导入`。
  - 导出格式新增选项：`压缩QMS（复制到剪贴板）`。
  - 压缩QMS导入流程：剪贴板读取 -> 解码解压 -> 复用现有 QMS 解析与保存流程。
  - 压缩QMS导出流程：生成普通QMS文本 -> 压缩+base64 -> 写入剪贴板。
- 依赖更新：`package.json` 新增 `@hpcc-js/wasm-zstd`。

## 验证记录

- 执行命令：`yarn build`
- 结果：见本次会话验证输出。

## 关联文档

- [[QMS_Schema]]
- [[PROJECT_BASIS#工程编码风格与规范]]
- [[PROJECT_BASIS#3) 技能约定：保存实现文档]]
