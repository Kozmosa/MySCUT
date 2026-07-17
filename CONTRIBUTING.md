# 贡献指南

感谢参与 MySCUT。贡献应保持功能可验证、数据可公开、变更范围清晰。

## 开始之前

1. 使用 Node.js 22.13.0 或更高版本，推荐 Node 22 LTS。
2. 使用 `git submodule update --init --recursive` 初始化手册子模块。
3. 使用 `npm ci` 安装锁定依赖；只有修改依赖时才运行 `npm install`。
4. 不要混用其他包管理器，也不要提交其他锁文件。

## 隐私与安全要求

- 测试课表必须完全合成，并使用明确的 `TEST-*` 标识。
- 不得提交真实姓名、学号、班级、教学班、群号、Cookie、Token、API Key、私钥或开发机绝对路径。
- APK、IPA 和其他发布二进制只能作为 GitHub Release Assets 或 R2 对象发布。
- 发现安全问题时请按 [SECURITY.md](SECURITY.md) 私下报告，不要先创建公开 Issue。

## 开发与验证

```bash
npm run typecheck
npm test
npm run build:app
npm run check:docs
npm run audit:public-data
```

提交前至少运行 `npm run check`。涉及 Android、iOS、PWA 或 OpenHarmony 时，再运行对应严格构建。`build:full` 默认只汇总各目标结果，不能单独作为成功证明。

## 变更组织

- 保持 UI、领域逻辑和平台适配解耦，遵循 [PROJECT_BASIS.md](PROJECT_BASIS.md)。
- 优先提交小而完整的垂直变更，避免夹带无关格式化。
- 提交信息使用 Conventional Commits，例如 `fix: ...`、`feat: ...`、`docs: ...`。
- 长期架构决策写入 `docs/adr/`；普通实现细节由 commit 和 Pull Request 记录。

## Pull Request

Pull Request 应说明问题、方案、风险、验证命令和必要的截图。提交即表示你有权按本仓适用许可证贡献相关内容；第三方素材必须同时注明来源、作者、许可证和复用限制。
