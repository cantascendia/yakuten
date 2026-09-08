---
name: "source-command-cto-audit"
description: "Playbook 自审质检 — 检查交叉引用 / 命令清单一致性 / 章节计数 / 术语统一性"
---

# source-command-cto-audit

Use this skill when the user asks to run the migrated source command `cto-audit`.

## Command Template

# Playbook 自审质检

对 ai-playbook 仓库本身进行完整质量审核。

## 审核步骤

1. **读取所有文件**：
   - CTO-PLAYBOOK.md（入口）
   - playbook/handbook.md（完整手册）
   - AGENTS.md（系统提示词）
   - templates/AGENTS.md（项目模板）
   - 所有 .Codex/commands/*.md
   - 所有 .agents/skills/*/SKILL.md

2. **按以下维度审核**：
   - **一致性**：入口文件目录 vs 手册实际章节是否匹配；AGENTS.md 中的铁律/模型列表是否与手册一致
   - **完整性**：手册章节范围（如 §1-§42）是否完整无遗漏；所有交叉引用（"详见 §X"）是否指向正确章节
   - **可用性**：斜杠命令是否能正确引导 CTO 执行对应流程
   - **时效性**：模型列表是否与最新工具版本一致；外部链接是否仍可访问
   - **风格一致性**：快捷命令表、emoji 使用、章节编号格式是否统一
   - **编码**：是否有异常字符或 mojibake

3. **输出格式**：
   按严重程度分类（🔴 Critical / 🟠 Major / 🟡 Minor / 🔵 Innovation），
   每条含：具体文件名 + 问题描述 + 建议修复方案。
   最后输出优先级排序的变更清单。
