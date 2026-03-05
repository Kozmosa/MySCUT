# R2ReleaseImpl0305

## 实现日期

- 2026-03-05

## 相关 commit

- `728d0a8`（主仓：release 脚本接入 R2 参数、配置与上传流程）
- `1fceb33`（主仓：App 更新检查兼容多源资产结构）
- `de5691c`（子模块：app-release 插件与 AppLanding 下载链接解析重构）
- `5c07dce`（主仓：更新手册子模块指针）

## 实现目标

- 为发布脚本增加可选安装包源参数，支持将安装包发布到 Cloudflare R2。
- 将 `versions.json` 中 `apk/ipa` 字段升级为多源列表结构（`source + url`）。
- 重构 App 端更新检查与手册 app-landing 链接解析逻辑，兼容新旧结构并优先使用 R2。

## 实现细节

- 发布脚本能力扩展：
  - `scripts/release/options.mjs` 新增 `--asset-source r2` 参数解析。
  - `scripts/release/r2Config.mjs` 新增 R2 配置读取，优先 `R2_ENV`，不存在时回退环境变量。
  - `scripts/release/r2.mjs` 新增 R2 上传能力（S3 兼容 API）。
  - `scripts/release/main.mjs` 在发版流程中接入 R2 上传，并将 R2 URL 写入版本元数据。
  - `.gitignore` 增加 `R2_ENV`，防止敏感配置误入库。
- 版本元数据结构升级：
  - `scripts/release/versioning.mjs` 将 `assets.apk` / `assets.ipa` 从字符串改为列表结构。
  - 默认保留 `github` 源；启用 R2 时写入 `r2 + github` 双源，供客户端按策略选择。
- 客户端更新逻辑兼容：
  - `src/services/update/checkForUpdate.ts` 兼容 `string | Array<{source,url}>`。
  - 对 `github` 源继续应用 provider（fastgit/jsdelivr 等）策略；`r2` 与其他源直接使用原链接。
- 手册子模块 app-landing 重构：
  - `docs/.vuepress/plugins/app-release/index.js` 移除 ManualPrj 强制替换，改为按来源列表解析候选链接。
  - `docs/.vuepress/config.js` 更新版本清单来源并配置来源优先级（`r2` 优先）。
  - `docs/.vuepress/components/AppLanding.vue` 调整为兼容解析结果和候选列表。

## 关联文档

- [[CI#当前发布链路]]
- [[CI#产物源参数规则]]
- [[CI#R2 配置读取规则]]
- [[ReleaseImpl0304#实现细节]]
