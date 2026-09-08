---
name: "source-command-cto-vibe-check"
description: "Vibe Coding 红线审计（§33）— 扫描 commit / 代码标记 / experimental 目录 / 依赖幻觉，按三档分级输出"
---

# source-command-cto-vibe-check

Use this skill when the user asks to run the migrated source command `cto-vibe-check`.

## Command Template

# 项目 Vibe Coding 红线审计

按手册 §33 的三档分级，审计本项目是否有违规的 vibe coding 痕迹。

## 执行步骤

### 1. 读取项目状态

- 读取 `AGENTS.md` 中是否定义了 Vibe 允许目录（如 `experimental/`、`spike/`）
- 读取 `docs/ai-cto/CONSTITUTION.md`（若存在）的 Forbidden 路径定义
- 读取 §32.1 高风险路径黑名单（强制人工逐行审）

### 2. 扫描 commit 历史

```bash
git log --oneline -50 | grep -iE "vibe|yolo|accept all|auto-merge|wip|hack"
```

报告：
- 含 vibe 关键词的 commit 数量
- author 是否含 `[bot]` 标签
- 这些 commit 是否触碰了 Forbidden 路径

### 3. 扫描代码标记

```bash
git grep -inE "TODO|FIXME|HACK|XXX|@vibe|@spike|@throwaway"
```

按文件路径分组报告，特别标注：
- 出现在 Forbidden 路径（§32.1）的标记 → 🔴 Critical
- 出现在业务路径（src/、app/）的 → 🟠 Major
- 出现在 experimental/spike/ 的 → 🟢 OK

### 4. 检查 experimental 目录有效期

如果存在 `experimental/`、`spike/` 等 vibe 目录：
- 列出每个文件的最后修改时间
- 标记超过 7 天未清理的（手册 §33.4：vibe 产物有效期 ≤ 7 天）

### 5. 检测幻觉风险

扫描以下高风险信号：
- `package.json` / `composer.json` / `requirements.txt` 中是否有可疑依赖（无 stars / 无下载量 / 名字奇怪）
- 代码中是否有 `import` 了不存在的模块
- 注释或代码中是否有"AI 编造"的 API 调用

### 6. 输出报告

```markdown
## 🚨 Vibe Coding 审计报告

### 概况
- 扫描 commit 数：N
- 扫描文件数：M
- 总体评级：🟢 健康 / 🟡 需关注 / 🔴 高风险

### 发现的违规

#### 🔴 Critical（违反 §33 Forbidden）
- [文件:行号] [描述]

#### 🟠 Major（业务路径 vibe 痕迹）
- [文件:行号] [描述]

#### 🟢 Minor（experimental 目录）
- [文件:行号] [描述]

### 过期 vibe 产物
- [路径] 最后修改 X 天前

### 建议处置
1. 🔴 立即触发 §32 双签机制（CTO + senior + 第二模型）
2. 🟠 改造为 Spec-Driven，开 issue 跟踪
3. 🟢 7 天后自动清理或重写

### 写入记忆
- 更新 `docs/ai-cto/STATUS.md` 的"假设清单"区域，记录所有未验证的代码段
- 重大问题 → 写入 `docs/ai-cto/REVIEW-BACKLOG.md`
```

## 注意

- 不直接修改代码，只输出审计报告
- 涉及 Forbidden 路径的违规必须升级到用户决策，不能 CTO 单独处置
- 保持中立：vibe 不是错，违规进入 main 才是错
