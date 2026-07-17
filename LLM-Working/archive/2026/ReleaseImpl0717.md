> 历史归档：本文不再维护。仓库历史脱敏后，文中记录的旧提交哈希均已失效。

# Release 资产边界调整

## 实现日期

- 2026-07-17

## 相关 commit hash

- `9686562e128c6b378f0a15329cb751ff01b6d413`
- `e708bd00095ce5169fe3d2635eb3d786544fbaf5`

## 实现细节

- 移除 release 流程向手册子模块 `docs/.vuepress/public/root-assets` 复制 APK 与 `versions.json` 的旧逻辑。
- 删除不再使用的 `scripts/release/manualAssets.mjs` 及其路径常量。
- APK/IPA 的发布边界统一为主仓 GitHub Release；只有显式指定 `--asset-source r2` 时才额外上传到 R2。
- 手册子模块仍可随主仓更新 gitlink，但不承载安装包二进制或主仓发布元数据。
- R2 发布同时写入版本快照 `releases/v<version>/versions.json` 与稳定入口 `releases/versions.json`，JSON 对象使用 `application/json; charset=utf-8`。
- R2 模式下的 `versions.json` 优先声明 R2 安装包地址；`latest.assets.versions` 指向稳定入口，版本记录指向对应快照。

## 验证结果

- release 参数与 R2 相关测试共 9 项通过。
- `scripts/release/main.mjs`、`constants.mjs` 语法检查通过。
- 新版手册源码不再引用 `qmm-latest.apk` 或内置 `versions.json`。
- `v0.5.0` APK、版本快照和稳定清单均已上传 R2；S3 HEAD 与公开 URL 返回的大小、Content-Type 和版本内容均验证通过。

## 关联文档

- [[ReleaseFlow#阶段 5：发布上传]]
- [[CI#产物与元数据]]
- [[ManualDocsImpl0716#实现细节]]
