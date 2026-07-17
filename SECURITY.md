# 安全政策

## 支持范围

安全修复优先覆盖 `main` 和最新 GitHub Release。历史版本可能不会获得补丁。

## 私下报告漏洞

请使用 GitHub 的 [Private Vulnerability Reporting](https://github.com/Kozmosa/MySCUT/security/advisories/new) 提交报告。不要在公开 Issue、Discussion、Pull Request 或社交平台披露尚未修复的漏洞。

报告建议包含：

- 受影响版本、平台与提交；
- 可复现步骤和最小证明；
- 影响范围与攻击前提；
- 已知缓解方式；
- 是否涉及凭据、个人数据或第三方服务。

维护者会通过 GitHub Security Advisory 协作、确认影响并协调披露。请勿在未获授权的情况下访问他人账户、真实教务数据或生产凭据。

## 凭据泄露

如果发现已公开的 Token、Cookie、私钥或其他凭据，请立即按上述渠道报告，并在有权限时先撤销或轮换凭据。仅删除当前文件不能清除 Git 历史、fork、旧 clone 或缓存中的副本。

## 历史重写与缓存

本仓公开历史已于 2026-07-17 重写。重写前的 commit ID 和 clone 不得再用于 merge、rebase、cherry-pick 或 push；旧 checkout 应删除或加密归档后重新克隆。

历史重写只能移除当前公开分支和标签对旧对象的引用，不能撤回 fork、第三方 clone、下载副本或平台缓存。项目不会把“当前 refs 已脱敏”表述为“所有外部副本已彻底销毁”。完整状态和操作要求见 [Repository history sanitization](docs/HISTORY_SANITIZATION.md)。

报告旧 raw URL 或缓存对象时只通过 Private Vulnerability Reporting 提交，不要在公开渠道粘贴 URL、commit ID 或个人数据。
