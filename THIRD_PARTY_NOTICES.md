# 第三方通知与许可证边界

## MySCUT 主项目

本仓主项目代码与主仓文档采用 [MIT License](LICENSE)。`package.json` 的 `private: true` 只表示 npm 不应发布该包，不改变 MIT 授权。

应用内“开源许可证”列表由 `scripts/generateThirdPartyLicenses.mjs` 根据 `package.json` 的生产依赖和 `package-lock.json` 元数据生成。各依赖仍以其上游许可证原文为准。

## survive-in-scut 手册子模块

`external/survive-in-scut` 是独立 Git 上游内容。MySCUT 的 MIT 许可证不覆盖该子模块，也不自动授权其中的文本、图片、PDF、嵌入内容或其他素材。

截至当前固定的上游提交，上游存在未解决的授权表述冲突：

- 根目录 `LICENSE` 是 CC0 1.0 Universal；
- 上游 `package.json` 将许可证写为 `CC`；
- 手册首页和 footer 表述为 CC-BY-SA 2.0；
- 部分页面还有单页授权或第三方素材例外。

本仓不在主项目中替上游选择或修改许可证。构建、打包、镜像或再分发手册前，分发者必须核实所使用的上游提交、具体页面与素材来源，并遵守其中最具体的署名、相同方式共享和第三方权利要求。无法确认时，应排除相关内容或先向上游维护者取得许可。

## 外部服务与商标

GitHub、Cloudflare、华南理工大学及其他名称和商标归各自权利人所有，仅用于说明兼容、托管或下载来源，不表示其对 MySCUT 的赞助或背书。
