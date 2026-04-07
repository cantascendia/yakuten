# AGENTS.md — yakuten (HRT薬典)

> AI Agent 在操作本项目时必须遵守以下规则。详细规范见 SPEC.md（技术）和 CONTENT.md（内容）。

## 项目概要

- **名称**: HRT薬典 / HRT Yakuten
- **定位**: 循証·减害·引导就医 — 面向跨性别女性的 HRT 安全底线信息站
- **技术栈**: Astro 5 + Starlight + React Islands + MDX + Vercel
- **主语言**: 中文（支持 en/ja/ko）
- **视觉风格**: 米哈游「二相乐园」风（绯色粉紫 + 幻月金，毛玻璃卡片，对角切角）

## 代码规范

- TypeScript 严格模式
- Astro 组件 `.astro`，交互组件 `.tsx`
- CSS Variables（见 SPEC.md 第2节），不用 Tailwind，不硬编码颜色
- 组件命名 PascalCase，文件命名 kebab-case
- React Islands 用 `client:visible`（AI 问答除外用 `client:load`）
- 动画仅 `transform` + `opacity`，提供 `prefers-reduced-motion` 回退

## 内容规范

- MDX 必须包含完整 frontmatter（title, description, evidenceLevel, lastReviewed, references）
- **每条医学声明必须附带 `<CitationRef>` 组件**，无引用=不写入
- 不得使用绝对化表述（「一定」→「建议」；「必须」→「通常」）
- 剂量数据必须标注来源指南名称和年份
- 证据等级: A=多项RCT/Meta, B=单项RCT/队列, C=病例/专家意见, X=无证据
- 血检红绿灯判断条件必须与 CONTENT.md 第3节 P6 表格一致

## 视觉规范

- 暗色主题默认，亮色主题通过 `[data-theme="light"]` 覆盖
- 毛玻璃: `backdrop-filter: blur(12px)` + `rgba(26,22,37,0.6)` 背景
- 对角切角: `clip-path: polygon(0 0, calc(100%-16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100%-16px))`
- 紧急横幅: 红色背景 + 白色文字，**不可关闭**
- 所有组件必须支持亮色/暗色双主题

## Git 规范

- 分支: `feature/xxx`, `fix/xxx`, `content/xxx`
- Commit: `type(scope): description`
- 类型: feat, fix, content, style, refactor, docs

## 绝对禁止

- ❌ 包含商业推广链接或药品购买渠道
- ❌ 存储用户健康数据（血检工具必须纯前端计算）
- ❌ 绕过 AI disclaimer 或免责声明
- ❌ 生成具体个人用药方案（"你应该吃 Xmg"）
- ❌ 删除或弱化紧急横幅和危险警告
- ❌ 在内容中使用未经引用的用药建议

## 关键文件

| 文件 | 用途 |
|------|------|
| SPEC.md | 完整技术规范（架构、组件、数据结构、SEO、开发计划） |
| CONTENT.md | 内容规范（页面框架、医学内容、文献库、模板） |
| src/data/drugs.json | 药物结构化数据（Schema 见 SPEC.md §4.1） |
| src/data/blood-ranges.json | 血检参考值（Schema 见 SPEC.md §4.2） |
| src/data/references.json | 文献引用数据库（Schema 见 SPEC.md §4.5） |

## 导航结构速查

```
首页 → P1用药前 → P2路径图(核心) → P3药物详解(6+4+2+1子页)
     → P4剂量红线 → P5乳房发育(差异化) → P6血检(含交互工具)
     → P7风险急症 → P8中国现实 → 附录A/B/C
     → 工具(AI问答/血检自查/剂量模拟/注射换算)
```
