# MySCUT

MySCUT 是一个面向华南理工大学使用场景的非官方、跨平台课表与校园手册应用。项目重点是本地数据管理、教务课表导入、课表展示，以及将独立维护的校园手册嵌入应用。

> 本项目由社区维护，与华南理工大学及其教务系统没有隶属、授权或背书关系。学校名称和相关标识仅用于描述兼容场景。

## 平台状态

| 平台 | 状态 | 说明 |
| --- | --- | --- |
| Web | 可构建 | Vite SPA；部分原生教务导入能力不可用 |
| PWA | 可构建 | 提供独立 PWA 构建与预览命令 |
| Android | 主要支持 | 使用 Capacitor；安装包通过 GitHub Releases 发布 |
| iOS | 构建支持 | 需要 macOS、Xcode 与签名环境 |
| OpenHarmony | 实验性 | 提供 Web 资源同步与本地运行手册 |

## 下载

- 最新安装包：[GitHub Releases](https://github.com/Kozmosa/MySCUT/releases/latest)
- 版本清单：[Cloudflare R2](https://pub-2d4ca40983644b4295125ec388670de9.r2.dev/kozmos/releases/versions.json)

历史版本可能只有版本记录而没有可恢复的安装包；项目不会为缺失资产伪造下载链接。

## 本地开发

要求 Node.js 22.13.0 或更高版本，推荐 Node 22 LTS。仓库只使用 npm，`package-lock.json` 是依赖解析的唯一来源。

```bash
git clone --recurse-submodules https://github.com/Kozmosa/MySCUT.git
cd MySCUT
npm ci
npm run dev
```

> 公开 Git 历史已于 2026-07-17 重写并强推。重写前创建的 clone 不得继续 merge、rebase、cherry-pick 或 push；请删除或加密归档旧 clone 后重新克隆。详情见 [Repository history sanitization](docs/HISTORY_SANITIZATION.md)。

确认创建于历史重写之后的已有 clone 可执行：

```bash
git submodule update --init --recursive
```

常用验证命令：

```bash
npm run typecheck
npm test
npm run build:app
npm run check
```

- `build:app` 只构建主应用，不拉取或构建手册。
- `build:web` 会尝试更新手册子模块、构建手册并复制到 `dist/web/docs`。
- 原生构建和 Capacitor sync 可能修改跟踪的原生工程文件，执行后请检查工作树。
- 完整命令与风险边界见 [AGENTS.md](AGENTS.md)。

## 数据与网络行为

- 课表、头像、显示偏好、手册来源设置和可选 AI 服务配置保存在当前浏览器或设备本地。
- 更新检查默认访问 Cloudflare R2，失败时访问本仓库的公开 `versions.json`。
- 教务导入仅在用户主动选择和发起时访问相应教务地址，并可能处理该会话的 Cookie。
- 配置 OpenAI 兼容服务后，用户提交给 AI 功能的数据会发送到该服务商。
- 当前版本不包含遥测、行为分析或广告跟踪。

完整说明见 [PRIVACY.md](PRIVACY.md)。

## 参与贡献

提交代码或文档前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)、[SECURITY.md](SECURITY.md) 和 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。请勿提交真实课表、学号、教师信息、群号、Cookie、Token、私钥或安装包。

## 许可证与手册边界

主项目代码和主仓文档采用 [MIT License](LICENSE)。`external/survive-in-scut` 是独立上游手册子模块，不受本仓 MIT 许可证覆盖。该上游当前同时存在 CC0、`CC` 与 CC-BY-SA 2.0 表述，分发者必须核实所用上游提交及具体素材的授权条件。详情见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
