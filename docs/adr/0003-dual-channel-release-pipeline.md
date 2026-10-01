# ADR 0003：发版迁移 GitHub Actions，建立 nightly/stable 双通道并更换正式签名密钥

## 状态

Accepted（2026-10-01，issue #53；两位维护者确认）

## 背景

v0.7.3 及之前的发版依赖单一维护者的本机 Windows 环境执行 `scripts/release`：Android Studio 手动构建、人肉确认、本地签名密钥。v0.7.3 发版实际尝试五次，暴露出依赖过期、capacitor 生成文件在 autocrlf 下的纯换行符幻影改动、`git add` 在子模块 gitlink 场景的 Windows 死锁等一类系统性问题。更根本的约束：发布密钥只存在于一台机器，Bluevect 无法发版，Kozmosa 离线时发版阻塞；交互式流程不可自动化、不可委托。

## 决策

1. 发版以 GitHub Actions 为主路径，脱离任何维护者的个人环境；两位维护者均可独立完成 nightly 与 stable 发版。
2. 双通道隔离：stable 保持包名 `com.manual.univ` 与现有更新机制；nightly 通过 `applicationIdSuffix ".nightly"` 获得独立包名、独立签名密钥、独立更新清单（R2 `nightly/versions.json` 单源），版本号与 versionCode 互不约束。nightly 用独立包名而非仅换签名，是为了同时消除签名冲突与 versionCode 单调性两类问题，并允许与正式版并排安装。
3. 触发方式：main 推送（自带 check）自动产出 nightly prerelease；stable 发版分两阶段——维护者本地执行 `release:bump` 提交版本提交（bump commit）并打 tag 推送（不做构建、签名、不接触 keystore），随后 workflow_dispatch 输入相同版本号，CI 校验 tag 指向 bump commit 后从该 tag 构建、签名并发布。CI 不回推 main，tag 即维护者认可的发布点。
4. 权限模型：CI 对仓库只有读与 Release 写权限，无需为 GitHub Actions 配置 ruleset bypass，也不引入 PAT；R2 使用按 bucket 范围签发的 API token；stable 密钥只挂在 environment secrets，nightly 流程不可见。仓库中的 versions.json 由 bump 阶段写入骨架（版本、tag、下载 URL、minVersion，不含 APK 校验和），最终 size/sha256 只写入 R2 清单与 GitHub Release 资产；jsDelivr 回退通道因此下载时不校验哈希，客户端兼容缺失字段。
5. 更换签名密钥：借 CI 化直接生成正式 release keystore（stable/nightly 各一把），v0.8.0 起生效。存量用户无法原地升级，通过 release note 与 README 引导「导出备份 → 卸载重装」迁移；versions.json 增加 `minVersion` 字段，使包含该逻辑之后的客户端永远具备被远程要求迁移的能力。
6. 存储与历史：nightly 完整历史以 GitHub prerelease 长期存档；R2 仅保留最近 7 天 nightly（`history/` 前缀生命周期规则）与最新 stable（发版后清理上一版前缀）。`latest` 指针放在 `history/` 前缀之外，避免被生命周期规则清除。
7. APK 构建弃用 Android Studio 手动步骤，统一为 gradle CLI（`assembleStableRelease`/`assembleNightlyRelease`）+ zipalign + apksigner；manual 子模块漂移由 release 流程自动预提交，消除人工纪律。

## 后果

- 发版从交互式本地流程变为可委托、可审计的 CI 任务；本机 Windows 特有故障面（EOL 幻影、git add 死锁等）不再影响发版。
- 存量 v0.7.3 及更早用户升级 v0.8.0 必须卸载重装，本地课表数据需先导出备份；这是一次性成本，选择在用户量较小的当下完成。
- 构建变体化后，本地交互式发版需在 Android Studio 选择 Stable Release 变体，CLI 任务名从 `assembleRelease` 变为 `assembleStableRelease`。
- nightly 清单为 R2 单源，R2 故障时 nightly 应用内检查更新直接报错（GitHub 页面人工下载兜底）；stable 不受影响。
- 仓库中的 versions.json 只含骨架（无 size/sha256），jsDelivr 回退通道下载不校验哈希；需要时可发布后手动 backfill。bump 推送后、CI 完成前的短窗口内回退通道可能看到指向尚不存在对象的链接。
- 仓库设置新增一次性依赖：environment、secrets、R2 生命周期规则（见 `docs/RELEASE_PROCESS.md` 清单）。

## 替代方案

- 继续本地发版，仅修复 Windows 特有问题：不解决单点密钥与双人发版诉求，且根因（git add 死锁）未定位。
- nightly 仅换签名不换包名：仍需与 stable 协调 versionCode 单调性，且无法与正式版并排安装。
- stable 用 tag 触发 CI：与「bump commit → tag」的既有语义冲突，需倒置流程并处理 tag 重指。
- 引入第三方 OTA 更新（如 @capgo/capacitor-updater）：与 APK 通道并存的版本语义混乱（OTA web bundle 版本与 APK versionName 脱钩），且新增外部依赖；「发版不用人管」由 CI 解决。
- CI 自己推回 bump commit（曾作为初版实现）：需要为 GitHub Actions 配置 main 的 ruleset bypass，形成长期站定的权限豁免；改为维护者本地提交 bump，CI 只构建发布，权限面更小。
- PAT 推回 main：多一个长期凭证，且有过期维护成本。
