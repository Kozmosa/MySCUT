# 发布流程

安装包不进入 Git。发版以 GitHub Actions 为主路径：stable 版本由维护者触发 workflow 发布，nightly 版本在 main 推送后自动构建。本地交互式脚本保留为应急路径。设计决策见 [ADR 0003](adr/0003-dual-channel-release-pipeline.md)。

## Stable 发版（CI，主路径）

前置条件（一次性配置，见文末「仓库设置清单」）：

- `release` environment 已创建并配置 required reviewers；
- `KEYSTORE_STABLE` / `KEYSTORE_STABLE_PASS`（environment secrets）与 `R2_*`（repo secrets）已录入；
- 仓库 ruleset 已为 GitHub Actions 配置 push bypass；
- R2 bucket 已配置 `releases/nightly/history/` 前缀 7 天生命周期规则。

操作步骤：

1. 确认 `.release-notes/v<版本>.md` 已提交（release note 由发版维护者撰写）；
2. Actions → Stable Release → Run workflow，输入版本号（需大于当前 `package.json` 版本；首个 CI 版本为 0.8.0），可选填 `min_version`；
3. 等待 environment 审批（Kozmosa 或 Bluevect 任一人批准）；
4. workflow 执行 `scripts/release/ci.mjs <版本>`：`npm run check` → manual 漂移自动预提交 → gradle `assembleStableRelease` 构建并签名（证书指纹固定校验）→ R2 上传（版本化 APK、版本化清单、latest 清单，均含 Cache-Control）→ bump commit 与 tag 推回 main → GitHub Release 资产上传与 digest 核验 → 清理 R2 上一版前缀。

`min_version` 写入 versions.json 的 `latest.minVersion`：低于该值的已安装版本在检查更新时会收到「卸载重装」迁移提示，不再尝试原地升级。该逻辑仅对包含此功能的客户端版本生效。

## Nightly 发版（CI，自动）

- main 分支每次推送（自带 check 通过）或手动 workflow_dispatch 触发；
- 独立包名 `com.manual.univ.nightly`（应用名 MySCUT Nightly），用 repo 级 `KEYSTORE_NIGHTLY` 签名，`versionName` 为 `0.0.0-nightly.<yyyymmdd>.<sha7>`，`versionCode` 用 workflow run_number，与 stable 互不约束；
- 每次构建创建一个长期存档的 GitHub prerelease（tag `nightly-<yyyymmdd>-<sha7>`）；
- R2 布局与保留：`nightly/history/<stamp>/` 为版本化产物（7 天生命周期清除），`nightly/latest/qmm-nightly.apk` 与 `nightly/versions.json` 为永久覆盖的当前指针（放在 history 前缀之外，不受生命周期影响）；
- nightly 应用内更新走 R2 单源清单，无 jsDelivr 回退（清单不进仓库）；R2 不可达时测试者到 GitHub Releases 页人工下载。

## versions.json

stable 清单新资产记录包含 `source`、`url`、`size` 和 `sha256`；`latest.minVersion` 为可选字段。客户端继续兼容历史字符串 URL 和缺少校验字段的旧记录。已确认 404 且无法恢复的历史资产不保留死链；没有资产的历史版本可以只保留版本元数据。

stable 更新清单默认顺序是 R2 稳定入口，然后回退主仓 `main/versions.json`（jsDelivr 镜像）。清单请求直连；provider URL 变换只用于 GitHub 安装包下载。nightly 清单仅 R2 单源。

R2 保留策略：stable 仅保留最新版本目录（发版成功后自动清理上一版前缀）；nightly 历史在 GitHub 长期存档，R2 侧只留 7 天。

## 签名密钥与存量迁移

- v0.6.2 ~ v0.7.3 的发布 APK 由历史 debug keystore 签名（已退役，备份在维护者本地）；
- v0.8.0 起使用正式 release keystore（CI 环境变量注入，指纹在 release.yml 中固定校验）；stable 与 nightly 各一把独立密钥；
- 更换密钥后，存量用户无法原地升级（Android 拒绝跨签名安装）。迁移方式：用户先在「课表设置 → 导出课表」备份，卸载旧应用，从发布页安装新版本。首次发新密钥版本的 release note 与 README 需包含该说明；
- 新密钥之后的版本恢复正常的原地升级路径。

## 仓库设置清单（一次性）

| 项 | 位置 | 内容 |
| --- | --- | --- |
| environment `release` | Settings → Environments | required reviewers：Kozmosa、Bluevect |
| KEYSTORE_STABLE / KEYSTORE_STABLE_PASS | environment `release` secrets | 正式密钥 base64 与密码（备份在维护者本地 `myscut_keyback`，含上传命令） |
| KEYSTORE_NIGHTLY / KEYSTORE_NIGHTLY_PASS | repo secrets | nightly 密钥 base64 与密码 |
| R2_ACCOUNT_ID / R2_BUCKET / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_PUBLIC_BASE_URL / R2_KEY_PREFIX / R2_S3_ENDPOINT | repo secrets | 与本地 `R2_ENV` 等价；token 按 bucket 范围签发 |
| ruleset bypass | Settings → Rules → Rulesets | 为 Actions（GitHub Actions app）添加对 main 的 bypass，允许 release workflow 推回 bump commit |
| R2 生命周期规则 | Cloudflare R2 → bucket → Settings | `releases/nightly/history/` 前缀 7 天后删除 |

## 本地应急发版

交互式流程（需要 Android Studio 手动构建）：

```bash
npm run release -- <next-version> --android --asset-source=r2 --note-file=path/to/notes.md
```

注意：构建变体化后，Android Studio 的 Build Variants 需选择 **Stable Release**；CLI 等价任务为 `gradlew assembleStableRelease`，产物名为 `app-stable-release.apk`。其余步骤与 CI 相同。

非交互 CLI（与 CI 完全一致，可在配齐环境变量的本地执行）：

```bash
npm run release:ci -- <next-version> --note-file=path/to/notes.md
```

Dry run（仅交互式流程支持）：

```bash
npm run release -- <next-version> --android --dry-run --note-file=path/to/notes.md
```

Dry run 校验版本递增、分支、tag、干净工作树、GitHub CLI 登录、note 文件和可选 R2 配置。它不修改版本文件、不创建产物、不上传、不提交、不打 tag。

## 失败处理

任何公共数据审计、构建、R2 验证、GitHub digest 验证或意外工作树变化都应中止发布。若失败发生在 tag 推送后，应先保留证据并修复 Release 元数据；不要通过把安装包提交进 Git 来补救。R2 对象按相同键重传即覆盖，CI 中途失败可直接重跑整个 workflow。
