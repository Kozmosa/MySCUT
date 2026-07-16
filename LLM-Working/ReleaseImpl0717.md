# Release 资产边界调整

## 实现日期

- 2026-07-17

## 相关 commit hash

- `9686562e128c6b378f0a15329cb751ff01b6d413`

## 实现细节

- 移除 release 流程向手册子模块 `docs/.vuepress/public/root-assets` 复制 APK 与 `versions.json` 的旧逻辑。
- 删除不再使用的 `scripts/release/manualAssets.mjs` 及其路径常量。
- APK/IPA 的发布边界统一为主仓 GitHub Release；只有显式指定 `--asset-source r2` 时才额外上传到 R2。
- 手册子模块仍可随主仓更新 gitlink，但不承载安装包二进制或主仓发布元数据。

## 验证结果

- release 参数与 R2 相关测试共 8 项通过。
- `scripts/release/main.mjs`、`constants.mjs` 语法检查通过。
- 新版手册源码不再引用 `qmm-latest.apk` 或内置 `versions.json`。

## 关联文档

- [[ReleaseFlow#阶段 5：发布上传]]
- [[CI#产物与元数据]]
- [[ManualDocsImpl0716#实现细节]]
