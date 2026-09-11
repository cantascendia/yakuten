# Learned Rule: immutable-guard 必须区分 ai-playbook 自身 vs 子项目

**学到的教训**: v3.9.1/.2 immutable-guard 把 BASENAME=CLAUDE.md 一律视为 immutable，但 CLAUDE.md 在**子项目里是项目级配置**（用户自己写的项目身份），不是 ai-playbook 14 铁律本身。

部署到 wrist-fc 时，Write CLAUDE.md 被自己的 immutable-guard 拦了 — false positive。

## 触发场景

- 任何项目级 hook 被分发到子项目部署
- hook 的红线列表针对 ai-playbook 主仓的特定文件名（如 CLAUDE.md / handbook.md / 14 铁律段）
- 子项目有同名文件（CLAUDE.md）但语义不同

## 应该怎么做

1. **检测项目类型**：
   ```bash
   IS_AI_PLAYBOOK_SELF=0
   [ -f "${CWD}/playbook/handbook.md" ] && [ -d "${CWD}/playbook" ] && \
     grep -q "## 50\." "${CWD}/playbook/handbook.md" 2>/dev/null && \
     IS_AI_PLAYBOOK_SELF=1
   ```
2. **分层 immutable 列表**：
   - ai-playbook 自身：守 CLAUDE.md / handbook §32-§35 / CONSTITUTION / forbidden SSOT
   - 子项目：只守 CONSTITUTION（如果存在）/ forbidden SSOT 删除
3. **env 强制覆盖**：
   - `CTO_IS_SUBPROJECT=1` — 强制视为子项目
   - `CTO_IS_AI_PLAYBOOK_SELF=1` — 强制视为主仓
4. **新加 hook 时考虑**：红线是项目级（subproject-applicable）还是主仓级（ai-playbook-self only）？

## 避免什么

- ❌ 把 BASENAME=CLAUDE.md 直接当 immutable（忽略子项目场景）
- ❌ 让 hook 假设它在哪个 repo（必须运行时检测）
- ❌ 修一个红线（如 CLAUDE.md）不考虑同 hook 的其他红线是否也有此问题

## 来源

- v3.9.2 部署 wrist-fc 时 Write CLAUDE.md 被自己拦（2026-05-12）
- v3.9.3 hotfix（commit TBD）

## 冷却

- 创建日期: 2026-05-12
- 30 天内不重复提议同类 subproject vs self 检测 pattern
- 月度检查：新加的 hook 是否区分主仓 / 子项目

## 适用范围

- 任何 ai-playbook hook 涉及"项目特定文件名"匹配（CLAUDE.md / handbook / Constitution）
- 跨项目分发的 enforcement 规则
- 部署测试矩阵：每个 hook 必须跑"子项目"场景
