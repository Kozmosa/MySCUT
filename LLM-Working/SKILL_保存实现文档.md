# SKILL_保存实现文档

## 技能名称

- 保存实现文档

## 适用场景

- 完成一个独立实现模块（例如：课表导入、主题系统、账号登录）后
- 完成一次包含结构性改动的功能迭代后

## 执行要求

- 文档保存目录：`LLM-Working/`
- 文档文件名：`<实现模块>Impl<MMDD>.md`
- 命名示例：`ThemeImpl0226.md`
- 文档必须包含以下部分：
  - 实现日期
  - 相关 commit hash（可多个）
  - 实现细节（核心改动点、关键文件、设计取舍）

## 推荐模板

可直接复制：`LLM-Working/Impl_TEMPLATE.md`

```md
# <实现模块>Impl<MMDD>

## 实现日期

- YYYY-MM-DD

## 相关 commit

- <hash1>
- <hash2>

## 实现细节

- 改动点 1
- 改动点 2
- 改动点 3

## 关联文档

- [[DATA_STRUCTURE#相关章节名]]
- [[<OtherImplMMDD>#相关章节名]]
```

## 双链规范

- 允许使用 Obsidian 风格双链，便于快速跳转到相关文档章节
- 推荐链接到 `LLM-Working/` 下文档的具体章节
- 示例：
  - [[DATA_STRUCTURE#7. 课表配色方案结构]]
  - [[ScheduleImpl0226#主要改动点]]
  - [[ThemeImpl0226#主要改动]]

## 相关约定来源

- [[DATA_STRUCTURE]]
- [[ScheduleImpl0226]]
- [[ThemeImpl0226]]
