# Web/PWA 性能基线

本文件记录 MySCUT Web/PWA 生产构建的首个可复现性能基线。它是纯调查产物，不包含产品代码改动；后续优化应围绕本文给出的瓶颈排序展开，并在此文档中更新对比数据。

## 测量口径

- 构建：`13d8f17`（`feat(ui): introduce Konsta UI and replace bottom nav with iOS-style tabbar`），生产构建，等价于 `build:pwa` 的主应用产物，`vite-plugin-pwa` 以 `generateSW` 生成 Service Worker（预缓存 33 项，2680.77 KiB）。
  - 本次未拉取手册子模块，测量对象为 PWA 主应用壳（首屏关键路径与手册无关，手册按 Network First 异步加载）。
- 本地服务：`vite preview`，`http://127.0.0.1:4174/`，首次访问（无 SW 缓存预热）。
- 工具：Lighthouse 12.8.2，Chrome 稳定版（headless），`--only-categories=performance`。
- 移动端节流：与 Lighthouse mobile 预设一致，`--throttling-method=simulate` 且 `rttMs=150 / throughputKbps=1638.4 / cpuSlowdownMultiplier=4`，视口 412×823（deviceScaleFactor 1.75）。
- 桌面端：`--preset=desktop`。

复现命令（在仓库根目录，先 `npm ci && VITE_PWA=1 VITE_OUT_DIR=dist/pwa VITE_TARGET_PLATFORM=web npm run build:app`）：

```bash
npx vite preview --host 127.0.0.1 --port 4174   # 需带 VITE_OUT_DIR=dist/pwa

npx lighthouse http://127.0.0.1:4174/ --only-categories=performance \
  --form-factor=mobile --screenEmulation.mobile=true \
  --throttling-method=simulate --throttling.rttMs=150 \
  --throttling.throughputKbps=1638.4 --throttling.cpuSlowdownMultiplier=4 \
  --chrome-path="C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --output=json --output-path=mobile.json

npx lighthouse http://127.0.0.1:4174/ --only-categories=performance \
  --preset=desktop --chrome-path="C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --output=json --output-path=desktop.json
```

## 核心指标（2026-08-16）

### 移动端（Fast 4G + 4×CPU，模拟节流，连续两次）

| 指标 | 第 1 次 | 第 2 次 | 口径 |
| --- | --- | --- | --- |
| Performance 得分 | 0.72 | 0.73 | Lighthouse |
| FCP | 2385 ms | 2357 ms | 模拟 |
| **LCP** | **6697 ms** | **6639 ms** | 模拟（远低于 2.5 s 良好阈值） |
| TBT | 168 ms | 144 ms | 良好（阈值 <200 ms） |
| CLS | 0 | 0 | 满分 |
| Speed Index | 2473 ms | 2357 ms | 良好 |
| TTFB | 458 ms | 455 ms | 含模拟 RTT 150 ms |
| 主线程总耗时 | 1.4 s | 1.2 s | 主 chunk 与 jeep-sqlite 执行占主导 |
| 长任务 | 4 个（最长 172 ms） | 4 个（最长 172/128 ms） | 集中在主 chunk 与 jeep-sqlite |

### 桌面端（无节流）

Performance 0.97，FCP 560 ms，LCP 1265 ms，TBT 6 ms，CLS 0，Speed Index 808 ms。桌面流畅，问题集中在移动端。

### INP

**未能测得有效值**。Lighthouse 单次 load 测量无真实交互，不产出 `interaction-to-next-paint` audit；用 CDP 合成点击（headless 与 headful 均验证：路由从 `/courses` 切到 `/mine` 成功）时 Chrome 不产生 Event Timing 条目。因此 INP 需以现场数据（Chrome UX Report / PageSpeed Insights）或真实设备手势回放测量，当前以 TBT 作为主线程阻塞代理指标（移动模拟 168/144 ms，属良好区间）。

## 关键资源传输体积

`dist/pwa/assets` 全部资产（单位 KiB，gzip/brotli 为本地 `zlib` 实测）：

| 文件 | raw | gzip | brotli | 加载时机 |
| --- | ---: | ---: | ---: | --- |
| pdf.worker-BA9kU3Pw.mjs | 1978.1 | 388.7 | 301.4 | 懒加载 |
| sql-wasm.wasm | 653.0 | 319.7 | 275.9 | **首屏 Fetch（关键路径）** |
| pdf-CE_K4jFx.js | 445.5 | 131.4 | 109.6 | 懒加载 |
| **index-BuG39pNd.js（主入口）** | **421.2** | **139.7** | **118.8** | **首屏（关键路径）** |
| jeep-sqlite.entry-BhLxjDqq.js | 300.1 | 84.3 | 73.2 | **首屏（关键路径）** |
| index-O2-pqwH-.js | 243.6 | 186.8 | 184.7 | 懒加载（压缩率仅 23%，内含高熵数据，待查） |
| ScheduleSettingsPage | 136.7 | 44.2 | 38.5 | 懒加载 |
| importScutHtml | 125.7 | 43.3 | 37.6 | 懒加载 |
| index-C1KV4fI-.css | 116.9 | 19.4 | 16.3 | **首屏（渲染阻塞）** |
| 其余 21 个 JS/CSS | — | — | — | 合计 raw < 300 KiB |
| **首屏传输合计** | — | **约 968 KiB** | — | Lighthouse total-byte-weight |

首屏实际传输拆解（第 2 次移动端，transfer bytes）：`sql-wasm.wasm` 653.2 KB、主 chunk 140.3 KB、jeep-sqlite 84.9 KB、CSS 19.9 KB，其余为 12 个小脚本与图标（合计约 70 KB）。主入口 chunk gzip 139.7 kB 与 issue 预估的 ~140 kB 一致。

## 前三大瓶颈与建议排序

1. **LCP 6.7 s：存储初始化位于首屏关键路径**
   首屏在 Fast 4G 下需传输约 968 KiB，其中 `sql-wasm.wasm`（653 KB）占 67%，`jeep-sqlite.entry` 85 KB 紧随其后——SQLite（sql.js + 原生适配）在应用启动时初始化，阻塞了 LCP 元素（课表页日期文本）的呈现。653 KB 单文件在 1.6 Mbps 下约需 3.2 s 传输，是 LCP 的最大构成。
   - 建议：把数据库初始化移出启动关键路径（首帧渲染后再异步初始化）；评估替代方案（sqlite3-wasm + OPFS 体积更小、或按需初始化）；与 issue #4（启动白屏）共享同一根因，可一并处理。
   - 预估收益：LCP 有望从 6.7 s 降到 3 s 以内（移走 738 KB 关键传输 + 128 ms 长任务）。

2. **主 chunk 139.7 kB gzip 存在未用代码，且首屏即加载**
   `unused-javascript` 估算可省 103 KiB：主 chunk 43 KiB、jeep-sqlite 60 KiB。react-dom + antd + cssinjs 全量进入关键路径，启动执行产生 172 ms 长任务。
   - 建议：antd 组件按需引入与 tree-shaking 复核；图标与不常用组件从主 chunk 拆出；jeep-sqlite 改为动态导入。
   - 预估收益：主 chunk 可再降 30–50%，同时缩短启动 JS 执行长任务。

3. **渲染阻塞 CSS 与启动 JS 执行**
   唯一渲染阻塞资源 `index-C1KV4fI-.css`（20 KB gzip）浪费 305 ms；主 chunk + jeep-sqlite 的同步执行合计约 300 ms 长任务，紧随其后是 4 个 50–172 ms 长任务。
   - 建议：首屏critical CSS 内联或按路由拆分；非首屏 chunk 延后执行（动态 import / `modulepreload` 策略复核）；启动阶段的存储与持久化读写异步化。

## 记录与后续

- 本次基线建立于 `13d8f17`，纯调查、无产品代码改动；原始 Lighthouse JSON 未入库，命令与数字见上，可完整复现。
- 待补项：INP 现场数据（CrUX/PSI 或真实设备）、`index-O2-pqwH-.js` 高熵内容核查、Brotli 部署确认（若托管端仅 gzip，首屏传输按 gzip 列计）。
- 后续每轮优化合入后，用相同命令重测并回填本表对比。