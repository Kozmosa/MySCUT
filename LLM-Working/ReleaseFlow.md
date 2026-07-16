# Release Flow

> 更新: 2026-07-15 | 对应版本: v0.4.7

---

## 一、总览

```
                  ┌─────────────────────────┐
                  │  npm run release 0.x.y  │
                  │  [--android] [--ios]     │
                  │  [--note "..."]          │
                  │  [--asset-source r2]     │
                  └──────────┬──────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │  阶段 1: 前置校验            │
              │  · 版本格式校验              │
              │  · Tag 冲突检测              │
              │  · Branch 检查（必须 main）   │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │  阶段 2: 版本元数据更新       │
              │  · 更新 submodule 到最新      │
              │  · 更新 package.json version  │
              │  · 更新 versions.json         │
              │  · 写入多源 asset URL         │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │  阶段 3: 全平台构建           │
              │  · npm run build:full        │
              │    ├ web → dist/web          │
              │    ├ android → dist/android  │
              │    ├ ios → dist/ios          │
              │    └ ohos → dist/ohos        │
              │  · syncNativeVersion.mjs     │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │  阶段 4: 平台原生构建（手动）  │
              │  · Android: cap sync +       │
              │    Android Studio → APK      │
              │  · iOS: cap sync +           │
              │    Xcode → IPA               │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │  阶段 5: 发布上传             │
              │  · 上传 APK/IPA 到 R2(可选)   │
              │  · 写入 release note 文件     │
              │  · git commit + tag + push   │
              └──────────┬──────────────────┘
                         │
                         ▼
              ┌─────────────────────────────┐
              │  阶段 6: GitHub Release      │
              │  tag push 触发               │
              │  .github/workflows/          │
              │  release-on-tag.yml          │
              │  → 创建 Release              │
              │  → 上传 APK/IPA/versions.json│
              └─────────────────────────────┘
```

---

## 二、命令速查

### 基本用法

```bash
# Android 发布（默认）
npm run release 0.5.0

# Android + iOS 双平台
npm run release 0.5.0 --android --ios

# 带 Release Note
npm run release 0.5.0 --android --note "- 新增课表分享\n- 修复导入问题"

# 启用 R2 多源发布
npm run release 0.5.0 --android --ios --asset-source r2 --note "## v0.5.0\n- Multi-source assets"
```

### 平台参数

| 参数 | 作用 |
|---|---|
| `--android` | 发布 Android（APK）|
| `--ios` | 发布 iOS（IPA）|
| `--platform android,ios` | 兼容写法 |
| 不传任何平台参数 | 默认仅 Android |

### 可选参数

| 参数 | 作用 |
|---|---|
| `--note "..."` | 自定义 Release Note（Markdown），生成 `.release-notes/v<tag>.md` |
| `--asset-source r2` | 将安装包也上传到 Cloudflare R2，versions.json 写入双源 |

---

## 三、阶段详解

### 阶段 1：前置校验

`scripts/release/options.mjs` 解析参数后，`main.mjs` 依次执行：

```
1. validateTargetVersion(version)
   ├── 格式校验: /^\d+\.\d+\.\d+$/  （仅 semver base，不支持 -alpha/-rc）
   └── 单调递增: 新版本 > 当前版本

2. ensureTagNotExists(tag)
   └── git rev-parse --verify refs/tags/v<version>
       → 本地 tag 已存在则抛出错误

3. ensureMainBranch()
   └── git rev-parse --abbrev-ref HEAD → 必须是 main
```

任一失败 → 立即抛出，不产生副作用。

### 阶段 2：版本元数据更新

```
1. git submodule update --init --recursive
2. git submodule update --remote --recursive
   → 将 external/survive-in-scut 更新到 origin/main 最新

3. updatePackageVersion(packageJson, nextVersion)
   → 写入 package.json

4. extractRepoInfo()
   → git remote get-url origin → { owner, repo }

5. updateVersionsJson({ version, tag, owner, repo,
                       hasAndroidAsset, hasIosAsset,
                       r2AssetUrls })
   → 写入 versions.json
   → assets.apk/ipa 使用列表结构:
     [{ source: "github", url: "..." }]
     或 [{ source: "r2", url: "..." },
         { source: "github", url: "..." }]
```

### 阶段 3：全平台构建

```
npm run build:full
  ├── build:web       → buildApp.mjs (VITE_TARGET_PLATFORM=web)
  ├── build:android   → buildApp.mjs → cap sync android
  ├── build:ios       → buildApp.mjs → cap sync ios
  └── build:ohos-web  → buildApp.mjs → copy to ohos/resfile/

node scripts/syncNativeVersion.mjs
  ├── 校验 package.json 与 versions.json 版本一致
  └── 写入:
      ├── android/app/build.gradle  (versionName + versionCode)
      └── ios/App/App.xcodeproj/project.pbxproj (MARKETING_VERSION + CURRENT_PROJECT_VERSION)
```

**`buildApp.mjs` 内部流程**（所有平台共享）：
```
1. ensureManualSubmodule()    — 仅在尚未初始化时执行 git submodule init
2. pullLatestManual()          — fetch --depth=1 origin main + switch FETCH_HEAD
3. build:todo-snapshot         — 生成 todoSnapshot.ts
4. tsc -b && vite build        — 核心构建
5. npm ci（package-lock 变更时）— 安装新版手册依赖
6. VitePress 隔离构建         — 临时副本 + /docs/ base → vite-platform-dist
7. copyDocsDist()              — 文档产物合并到 app dist/docs/
8. cleanupDocsArtifacts()      — 清理临时目录与平台产物
9. finally: restoreManualCommit() — 恢复构建前实际检出的手册提交
```

`build:full` 默认宽容模式：单个平台失败不影响其他平台。通过以下 env 可开启严格模式：

```bash
BUILD_FULL_STRICT=1 BUILD_FULL_REQUIRED=web,android npm run build:full
```

### 阶段 4：平台原生构建（手动）

**Android**
```
1. npx cap sync android       — 同步 web 产物到 Android 工程
   CAP_WEB_DIR=dist/android
2. npx cap open android       — 打开 Android Studio
3. ⏸ 等待用户在 Android Studio 中手动 Build → APK
4. 用户输入 y 确认完成
5. prepareAndroidReleaseAsset() — 从 android/app/build/outputs/apk/ 自动发现 APK
   → 优先 release/，fallback debug/
   → 复制到根目录: qmm-v<version>.apk
```

**iOS**
```
1. npx cap sync ios           — 同步 web 产物到 iOS 工程
   CAP_WEB_DIR=dist/ios
2. npx cap open ios           — 打开 Xcode
3. ⏸ 等待用户在 Xcode 中手动 Archive + Export → IPA
4. 用户输入 y 确认完成
5. 可选: 输入 IPA 绝对路径
   或: findLatestIpa() → 自动扫描 ~/Library/Developer/Xcode/DerivedData/ 等路径
6. prepareIosReleaseAsset()   — 复制到根目录: qmm-v<version>.ipa
```

### 阶段 5：发布上传

```
1. R2 上传（仅 --asset-source r2 时）
   for each prepared asset:
     create S3Client → PutObjectCommand(Bucket, Key, Body)
     → 路径: releases/v<version>/qmm-v<version>.apk
   upload versions.json:
     → releases/v<version>/versions.json（版本快照）
     → releases/versions.json（稳定更新入口）

2. 写入 Release Note
   if (--note 已传):
     writeFileSync(.release-notes/v<tag>.md, note)

3. Git 提交主仓
   stageCommitAndTag({ version, tag, noteFilePath })
     → git add package.json versions.json [.release-notes/v<tag>.md]
     → git commit -m "chore(release): prepare v<version>"
     → git tag v<version>
     → git push
     → git push origin v<version>
```

### 阶段 6：GitHub Release（CI）

Tag push 触发 `.github/workflows/release-on-tag.yml`：

```yaml
on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:    # 手动输入 tag 重试
```

流程：
1. checkout at tag ref
2. 解析产物：versions.json（必选） + qmm-v.apk（可选） + qmm-v.ipa（可选）
3. 创建 Release：
   - 有 `.release-notes/v<tag>.md` → body_path
   - 无 → generate_release_notes: true（GitHub 自动生成）
   - `fail_on_unmatched_files: true` → 保证 versions.json 存在

---

## 四、文件结构对照

### 脚本层 (scripts/)

```
scripts/
├── release.mjs                   # 入口 — 直接 delegate 到 release/main.mjs
├── release/
│   ├── main.mjs                  # 核心编排 (6 阶段)
│   ├── options.mjs               # CLI 参数解析 (version/flags/note/source)
│   ├── versioning.mjs            # 版本校验 + package+versions 写入
│   ├── gitFlow.mjs               # Branch/tag 操作 + git commit/push
│   ├── assets.mjs                # APK/IPA 自动发现与重命名
│   ├── notes.mjs                 # Release note 文件写入
│   ├── r2.mjs                    # Cloudflare R2 S3 上传
│   ├── r2Config.mjs              # R2 配置读取 (R2_ENV → env var)
│   ├── repo.mjs                  # Git remote 解析 (owner/repo)
│   ├── prompt.mjs                # 交互式提示 (yes/no, text, hidden)
│   ├── shared.mjs                # execSync/json 工具
│   └── constants.mjs             # 路径常量
├── buildFull.mjs                 # 全平台构建编排
├── buildApp.mjs                  # 通用构建入口 (Vite + docs + submodule)
├── buildAndroid.mjs              # Android 构建
├── buildIos.mjs                  # iOS 构建
├── buildOhosWeb.mjs              # OHOS Web 构建
├── buildPwa.mjs                  # PWA 构建
├── syncNativeVersion.mjs         # 同步版本到 Android/iOS Native 工程
└── manualSubmoduleUtils.mjs      # 子模块生命周期工具
```

### 数据层

```
package.json          → 版本源 (version: "0.4.7")
versions.json         → 发布元数据 (latest + 历史版本 + 多源 assets)
.release-notes/v*     → 发布说明文件 (Markdown)
R2_ENV                → R2 凭据 (gitignored, 不上库)
.env.example          → 环境变量参考
```

---

## 五、版本一致性链路

```
package.json  ──syncNativeVersion──▶  android/app/build.gradle
    │                                    (versionName + versionCode)
    │
    ├──syncNativeVersion──▶  ios/.../project.pbxproj
    │                          (MARKETING_VERSION + CURRENT_PROJECT_VERSION)
    │
    └──updateVersionsJson──▶  versions.json → 子模块 root-assets → AppLanding 页
```

- versionCode 公式: `major * 1,000,000 + minor * 1,000 + patch`
- 约束: `syncNativeVersion.mjs` 在写入 Native 文件前校验 `package.json.version` === `versions.json.latest.version`

---

## 六、R2 资产结构

```
Bucket: kozmos
Key Prefix: releases/

releases/
└── v0.4.7/
    ├── qmm-v0.4.7.apk
    └── qmm-v0.4.7.ipa

Public URL:
  https://<public-base>/releases/v0.4.7/qmm-v0.4.7.apk
```

`versions.json` 中 assets 结构：
```json
{
  "assets": {
    "versions": "https://github.com/.../versions.json",
    "apk": [
      { "source": "r2", "url": "https://..." },
      { "source": "github", "url": "https://..." }
    ]
  }
}
```

---

## 七、注意事项

1. **发布前确保**：当前在 main 分支、本地无未提交修改、目标版本号未被使用
2. **构建是本地执行的** — CI 不做构建，只 attach 产物。确保本地环境（Node、JDK、Xcode）正确
3. **`--remote` 拉子模块**：发布脚本会自动 pull 子模块最新，可能引入意外变更。如不确定，先手动检查
4. **无回滚机制**：发布一旦 `git push` 成功就无法自动撤回。出错需手动 `git tag -d` + `git push --delete origin tag` + 清理 R2 对象
5. **Release note 质量**：现有 infra 支持 Markdown，建议至少结构化描述（新增/修复/变更），避免一句话说明
6. **`--note` 参数中的换行**：Shell 中需要用引号括起来并用 `\n` 表示换行：
   ```bash
   npm run release 0.5.0 --android --note "- 功能A\n- 修复B"
   ```
7. **SQLite 加密合规**：`@capacitor-community/sqlite` 的 Android/iOS 实现包含 SQLCipher。发布移动端前需确认应用商店加密声明、目标市场出口合规要求，并记录审查结论

---

## 八、常见发布场景

### 常规 Android 小版本

```bash
# 开发、测试完成
npm run release 0.4.8 --android

# Android Studio 打开后 → Build → Generate APK → 确认
# 脚本自动完成后续步骤
```

### 双平台大版本 + R2

```bash
npm run release 0.5.0 --android --ios --asset-source r2 \
  --note "## v0.5.0\n\n### 新增\n- 课表分享\n\n### 修复\n- 导入闪退"
```

### 修复已失败的发布

```bash
# 1. 本地清理
git tag -d v0.4.8
git push --delete origin v0.4.8

# 2. 修复问题后重新发布
npm run release 0.4.8 --android
```

---

## 九、相关文档

- [[CI]] — CI 工作流说明
- [[R2ReleaseImpl0305]] — R2 多源实现详情
- [[ReleaseImpl0304]] — 平台选择 + Release Note 实现详情
- [[PROJECT_BASIS#Git 提交信息约定]]
