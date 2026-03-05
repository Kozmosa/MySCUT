# ChunkLazyloadImpl0304

## 实现日期

- 2026-03-04

## 相关 commit

- `TBD`（当前工作区改动尚未提交）

## 实现目标

- 缩小首屏主包体积，避免将非首屏功能（PDF解析、压缩QMS编解码、设置页）提前打包。
- 保持现有功能行为不变，仅调整加载时机。

## 实现细节

- 路由级懒加载：`src/app/routes.tsx`
  - 将课程页、手册页、我的页及设置相关页面改为 `React.lazy`。
  - 使用 `Suspense` 承载异步页面渲染。
- PDF解析按需加载：`src/core/schedule/importScutPdf.ts`
  - `pdfjs-dist` 与 `pdf.worker` 从静态导入改为动态导入。
  - 首次解析PDF时初始化并缓存 runtime，后续复用。
- 压缩QMS按需加载：
  - `src/core/schedule/compressedQms.ts` 改为动态导入 `@hpcc-js/wasm-zstd` 并缓存实例。
  - `src/features/mine/pages/ScheduleSettingsPage.tsx` 在用户触发压缩QMS导入/导出时再动态导入编解码模块。

## 验证记录

- 执行命令：`npm run build`
- 结果：通过
- 构建产物显示主入口被拆分为多个异步 chunk，`pdfjs` 与 `zstd` 均作为按需加载 chunk 输出。

## 关联文档

- [[CompressedQmsImpl0304]]
- [[PlatformBuildImpl0304]]
- [[PROJECT_BASIS#工程编码风格与规范]]
- [[PROJECT_BASIS#3) 技能约定：保存实现文档]]
