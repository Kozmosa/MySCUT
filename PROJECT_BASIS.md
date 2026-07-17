# PROJECT_BASIS

## 产品目标

MySCUT 是一个非官方、隐私优先的跨平台校园工具，当前核心职责是：

- 在用户设备本地导入、管理和展示课表；
- 为 Web、Android、iOS 和 OpenHarmony 提供尽可能一致的核心能力；
- 在应用中呈现独立维护的 `survive-in-scut` 校园手册；
- 保持核心逻辑可测试，并降低未来替换平台 UI 的成本。

项目不运营账户、云同步、遥测或由维护者托管的 AI 代理服务。新增此类能力必须先形成明确的产品、安全和隐私决策。

## 支持平台

- Web 与 PWA：Vite SPA，部分原生教务导入能力不可用。
- Android：主要原生目标，使用 Capacitor。
- iOS：支持构建与同步，需要 macOS、Xcode 和签名环境。
- OpenHarmony：实验性目标，复用 Web 应用并通过平台工程承载。

平台差异应通过适配层处理，不得把 DOM、Capacitor、SQLite 或系统 API 细节扩散到领域逻辑。

## 架构边界

- `src/core/`：平台无关的领域模型、转换、校验和用例。
- `src/features/`：按功能组织 UI、页面状态与装配逻辑。
- `src/platform/`：浏览器、Capacitor、持久化和平台生命周期适配。
- `src/services/`：更新检查等外部 I/O 边界。
- `src/components/`：跨功能复用的展示组件。
- `src/generated/`：由脚本生成且可重复构建的源码。

UI 组件负责渲染和交互分发；复杂业务规则、持久化和外部请求必须位于可测试的逻辑或适配模块中。类型边界使用显式类型和 `unknown` 收窄，避免 `any`。

## 数据职责

- 课表、头像、设置和可选 AI 服务凭据默认只保存在当前设备。
- 教务导入只在用户主动发起时访问用户选择的目标，并将 Cookie 限制在该会话和目标站点语义内。
- 仓库中的 fixture 必须完全合成，使用明确的 `TEST-*` 标识。
- 浏览器或平台专属存储必须实现 `src/core/storage` 定义的契约；领域模块不直接依赖具体数据库。

## 手册职责与授权边界

`external/survive-in-scut` 是独立上游 Git 子模块。主仓负责固定提交、构建集成和清晰披露边界，不替上游修改内容或解决授权冲突。MySCUT 的 MIT 许可证不覆盖该子模块；分发要求见 `THIRD_PARTY_NOTICES.md`。

## 权威技术参考

- React: https://react.dev/reference/react
- Ant Design: https://ant.design/llms.txt
- Vite: https://vite.dev/llms.txt
- Capacitor: https://capacitorjs.com/docs
- OpenHarmony: https://developer.huawei.com/consumer/cn/doc/
