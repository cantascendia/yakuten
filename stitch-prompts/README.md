# HRT药典 Stitch 设计指令包

## 使用方法

### 方式 A：Stitch 网页端（stitch.google.com）

1. 打开 https://stitch.google.com
2. 对每个工具，将 `00-DESIGN-SYSTEM.md` 的内容 + 对应工具文件的内容合并粘贴到 Stitch prompt 框
3. 模型选择 **Gemini 3**
4. 生成后选择满意的变体

### 方式 B：Antigravity + Stitch MCP

1. 在 Antigravity 中安装 Stitch MCP（需要 API Key）
2. 创建 Stitch 项目，将 `00-DESIGN-SYSTEM.md` 作为设计基础
3. 对每个工具用 agent 指令生成设计

### 方式 C：直接在 Antigravity 中用 Gemini 3.1 Pro 转写

1. 将所有 prompt 文件 + DESIGN.md 一起提供给 Gemini
2. 指令：对每个工具生成 React TSX 组件 + CSS-in-JS
3. 输出交给 Claude Code 审核规范

## 文件列表

| 文件 | 内容 | 优先级 |
|------|------|--------|
| `00-DESIGN-SYSTEM.md` | 通用设计语言（每个 prompt 前缀） | — |
| `01-drug-comparator.md` | 药物对比器 | 🔴 |
| `02-risk-screener.md` | 风险自评 | 🔴 |
| `03-blood-test-checker.md` | 血检自查 | 🟡 |
| `04-drug-cards.md` | 速查卡片 | 🟡 |
| `05-brand-index.md` | 品牌索引 | 🟡 |
| `06-dose-simulator.md` | 剂量模拟器 | 🟡 |
| `07-ai-assistant.md` | AI 问答助手 | 🟡 |

## 设计完成后

将设计稿/生成的代码交给 Claude Code 做：
- React TSX 规范审核
- 接入 drugs.json / blood-ranges.json 等数据源
- i18n 翻译（zh/en/ja/ko）
- CSS 变量对齐 global.css
- Starlight 兼容性（prose margin 等）
- 构建验证 + 部署
