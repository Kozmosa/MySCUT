# 发布流程

安装包不进入 Git。发布脚本在本地构建和校验版本文件，把 APK/IPA 放入忽略目录，随后上传 GitHub Release，并可选同步 Cloudflare R2。

## 前置条件

- 位于干净的 `main` 工作树；
- Node.js 22.13.0 或更高版本，依赖已通过 `npm ci` 安装；
- `gh auth status` 成功且有仓库 Release 权限；
- 手册子模块已固定到需要发布的 gitlink；脚本只检出固定提交，不自动追踪远端最新提交；
- Android Studio、Xcode 和签名环境按目标平台可用；
- 可选 R2 使用本地忽略的 `R2_ENV` 或等价环境变量。

## Dry run

```bash
npm run release -- <next-version> --android --dry-run --note-file=path/to/notes.md
```

Dry run 校验版本递增、分支、tag、干净工作树、GitHub CLI 登录、note 文件和可选 R2 配置，并预览平台、跟踪文件与资产清单。它不修改版本文件、不创建产物、不上传、不提交、不打 tag。

## 正式发布

```bash
npm run release -- <next-version> --android --note-file=path/to/notes.md
npm run release -- <next-version> --platform=android,ios --asset-source=r2 --note-file=path/to/notes.md
```

脚本执行顺序：

1. 校验 main、tag、干净工作树和 `gh auth status`。
2. 固定检出子模块，更新 `package.json`、`package-lock.json` 与 `versions.json`。
3. 同步 Android `versionCode/versionName` 和 iOS `CURRENT_PROJECT_VERSION/MARKETING_VERSION`。
4. 运行 `npm run check` 与选定平台构建。
5. 等待维护者在 Android Studio 或 Xcode 完成签名产物。
6. 复制为 `artifacts/release/qmm-v<next-version>.apk` 或 `.ipa`，计算 size 与 SHA256，并写回清单。
7. 可选上传 R2；通过 S3 HEAD、自定义 SHA256 metadata、公开 HEAD 与公开下载 hash 复验。
8. 只暂存 package、lock、manifest、原生版本文件、可选 release note 和已明确变更的子模块 gitlink。出现其他跟踪改动即中止。
9. 创建 release commit 和 tag，显式推送 main 与该 tag。
10. 使用 `gh release create` 或 `gh release upload --clobber` 上传 APK/IPA 与 `versions.json`，核对 GitHub 返回的 size、digest 和下载 URL。
11. 成功后删除本地 `artifacts/release/`。

发布 commit 不得包含 APK 或 IPA。多行 Markdown 应使用 `--note-file`，不要依赖 shell 引号传递长正文。

## versions.json

新资产记录包含 `source`、`url`、`size` 和 `sha256`。客户端继续兼容历史字符串 URL 和缺少校验字段的旧记录。已确认 404 且无法恢复的历史资产不保留死链；没有资产的历史版本可以只保留版本元数据。

默认更新清单顺序是 R2 稳定入口，然后回退主仓 `main/versions.json`。清单请求直连；provider URL 变换只用于 GitHub 安装包下载。

## 失败处理

任何公共数据审计、构建、R2 验证、GitHub digest 验证或意外工作树变化都应中止发布。若失败发生在 tag 推送后，应先保留证据并修复 Release 元数据；不要通过把安装包提交进 Git 来补救。
