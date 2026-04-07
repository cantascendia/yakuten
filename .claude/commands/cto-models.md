# 模型列表更新

根据平台变更更新 ai-playbook 中的所有模型引用点。

## 变更描述

$ARGUMENTS

## 需要同步更新的位置

1. `CLAUDE.md` — 模型路由表
2. `playbook/handbook.md` — §1.2 Claude Code 模型表
3. `playbook/handbook.md` — §5.1 Antigravity 模型表
4. `playbook/handbook.md` — §5.2 Codex 模型表
5. `playbook/handbook.md` — §14 决策框架表
6. `CTO-PLAYBOOK.md` — 模型速查区
7. `.claude/commands/cto-refresh.md` — 模型提醒段落（如有）

## 验证清单

- [ ] 所有位置的模型列表完全一致
- [ ] 新模型名在 §14 决策框架中有对应推荐场景
- [ ] CTO-PLAYBOOK.md 版本历史追加记录
- [ ] 无编码乱码
- [ ] templates/CLAUDE.md 中的路由说明仍然正确
