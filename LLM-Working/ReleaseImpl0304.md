# ReleaseImpl0304

## 实现日期

- 2026-03-04

## 相关 commit

- `TBD`（当前工作区改动尚未提交）

## 实现目标

- 扩展发布命令参数，支持平台选择与自定义 Release Note。
- 平台默认仅 Android，支持 `--android` 与 `--ios` 组合发布。
- 解除“通用构建”和“平台构建/产物提交流程”的耦合。

## 实现细节

- 更新 `scripts/release.mjs` 参数解析：
  - 支持 `npm run release <version> --android --ios --note "..."`。
  - 支持 `--platform android,ios` 与 `--note=<markdown>` 形式。
  - 默认平台策略：未传平台参数时仅启用 Android。
- 发布流程重排：
  - 先执行一次 `npm run build:full`（通用静态网站构建）。
  - 再按平台执行 `cap sync` 与 IDE 打开：
    - Android: `npx cap sync android` + `npx cap open android`。
    - iOS: `npx cap sync ios` + `npx cap open ios`。
- 产物处理增强：
  - Android 继续产出 `qmm-v<version>.apk`。
  - iOS 新增 `qmm-v<version>.ipa`，支持手动输入绝对路径或自动扫描。
- `versions.json` 结构扩展：
  - `assets` 保留 `versions`，按平台可选增加 `apk` 与 `ipa`。
- Release Note 支持 Markdown：
  - 传入 `--note` 时写入 `.release-notes/v<version>.md`，并纳入发布提交。
  - 未传 `--note` 时仍走自动生成 release notes。
- 同步工作流更新：
  - `.github/workflows/release-on-tag.yml` 动态收集 `apk/ipa/versions.json`。
  - 若存在 `.release-notes/v<tag>.md` 则使用 `body_path`；否则 `generate_release_notes: true`。

## 关联文档

- [[PROJECT_BASIS#工程编码风格与规范]]
- [[PROJECT_BASIS#3) 技能约定：保存实现文档]]
- [[ReleaseImpl0228]]
- [[PlatformBuildImpl0304]]
