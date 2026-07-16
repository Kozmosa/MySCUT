# 主仓手册同步与 VitePress 构建对齐

## 实现日期

- 2026-07-16

## 相关 commit hash

- 主仓：`4ff47e8a526e7063d8416b19b3cbb84419958b6d`
- 手册子模块同步到 `e423bc55bebb0d74457b0fd552eec979e8062f7a`

## 根因

- 主仓原 gitlink 指向旧手册提交，构建时又无条件执行 `git submodule update --init`，会把已经检出的新版手册重置回旧提交。
- 手册拉取只有较短超时；网络失败后主仓继续构建旧版 VuePress 手册，造成 Bun 安装、图片解析失败等次生现象。
- 新版手册已经统一为 npm + `package-lock.json` + VitePress，但仍保留迁移期 `.vuepress` 目录。旧双栈脚本会优先尝试 VuePress，与当前依赖不一致。

## 实现细节

- `.gitmodules` 明确跟踪手册 `main` 分支，并将主仓 gitlink 更新到已验证的新版手册提交。
- 子模块仅在尚未初始化时执行 `git submodule update --init`；已经检出的提交不再被构建流程重置。同步改为 `git fetch --depth=1 origin main` 后切换 `FETCH_HEAD`，并将超时提高到 120 秒。
- 手册依赖严格按 `package-lock.json` 执行 `npm ci`。通过 lock 内容哈希写入依赖戳，避免全平台构建重复安装，并在安装时跳过对子模块无意义的 Git hook 写入。
- 主仓不再调用手册的 VuePress/VitePress 双栈探测脚本，也不再提供 Bun/VuePress 兼容分支。缺少 `package-lock.json` 或 VitePress 配置时直接给出协议错误。
- 新增 VitePress 隔离构建包装器：复制 `docs/` 到子模块内临时目录，将遗留 `.vuepress/public` 同步到临时 `public/`，使用手册本地 VitePress CLI 以 `/docs/` base 构建到 `vite-platform-dist`，最后清理临时目录。
- 构建清理不再运行 `git checkout -- .` 或 `git clean -fd`，避免误删子模块中的用户改动；结束时只清理已知构建产物并恢复构建前提交。

## 验证结果

- `npm test`：17 个测试文件、72 项测试通过，包含协议、VitePress 参数和子模块初始化回归测试。
- `npx tsc -b`、新增脚本 `node --check`、`git diff --check` 均通过。
- `npm run build:web` 完整通过，实际使用 npm + VitePress 2 构建新版手册。
- `dist/web/docs/index.html`、`health/medical_care.html`、`root-assets` 和全局样式均存在，生成链接统一使用 `/docs/` 前缀。
- `medical_care_assets/转诊须知.jpg` 原路径正确，产物为 `dist/web/docs/assets/转诊须知.*.jpg`；此前错误来自旧手册回退，并非文章写错。
- 构建完成后手册临时目录和平台产物被清理，子模块工作树保持干净。

## 关联文档

- [[ManualDocsImpl0227#实现细节]]
- [[ReleaseFlow#三、阶段详解]]
- [[StorageImpl0716#验证记录]]
- [[PROJECT_BASIS#语言与工具]]
