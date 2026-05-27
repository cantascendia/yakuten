---
name: forbidden-policy
description: >
  §32.1 Forbidden 路径强制规则。当 Claude 编辑 auth/payment/billing/secrets/keys/migration/
  crypto/infra/terraform/ansible/.github/workflows 路径下文件时自动加载。要求 spec-driven、
  双签、PR 标签 requires-double-review。配套 .claude/hooks/forbidden-guard.sh 硬阻止
  (exit 2)；本 skill 提供 Claude 应如何响应被阻止时的处理流程。
user-invocable: false
paths:
  - "**/auth/**"
  - "**/payment/**"
  - "**/billing/**"
  - "**/secrets/**"
  - "**/keys/**"
  - "**/migration/**"
  - "**/migrations/**"
  - "**/crypto/**"
  - "**/infra/**"
  - "**/terraform/**"
  - "**/ansible/**"
  - ".github/workflows/**"
---

# Forbidden 路径策略 (§32.1 / 铁律 #13)

你正在处理 **forbidden 路径**文件。这些路径属于"任何错误都直接产生用户安全/资金/数据风险"
的高危区域，禁止 vibe coding。

## 本会话必须遵守的强制流程

### 1. spec-driven 优先

如果当前没有 `docs/ai-cto/SPEC.md` 含本次改动的明确条款：
- **不要直接 Edit/Write 代码**（PreToolUse forbidden-guard 会 exit 2 阻止）
- 先运行 `/cto-spec specify` 起草 SPEC.md，包含：
  - 变更目的（why）
  - 输入/输出契约
  - 安全/合规约束（哪条 §32.1 / Constitution 适用）
  - 验收标准

### 2. 第二模型独立 review

- 改完后运行 `/cto-review` 让 codex (gpt-5.5) 或 claude headless 独立审一遍
- 重点维度：架构 / 安全 / 边界条件 / 数据完整性
- review 结果写入 `docs/ai-cto/REVIEW-QUEUE.md`

### 3. commit message 显式引用 SPEC

格式（强制）：
```
<type>(<scope>): <短描述>

Per SPEC.md §<N>: <引用条款>
Reviewed by: <reviewer-id>

<可选详细说明>
```

例：
```
feat(auth): add 2FA TOTP verification

Per SPEC.md §3.2: TOTP 验证窗口 ±30s，5 次失败锁定 15 min
Reviewed by: codex-gpt5.5 (sha=abc1234)
```

### 4. PR 标签 requires-double-review

PR 必须打 `requires-double-review` 标签。CI 会校验此标签存在才能合并到 main。

## 紧急例外（禁止滥用）

当生产事故 / 安全 hotfix 必须立即修复：

```bash
export CTO_DOUBLE_SIGNED=1   # 单次会话有效，audit log 永久记录
```

事后必须：
1. 24h 内补 SPEC.md
2. 写 `docs/ai-cto/INCIDENTS.md` 事故复盘
3. 加 eval 防回归

## 反模式（绝对禁止）

| 反模式 | 后果 |
|---|---|
| ❌ 改测试让其通过（铁律 #14 Test-Lock） | test-lock-guard 会注入提醒 |
| ❌ 用 `--no-verify` 绕过 pre-commit | bypass-guard exit 2 阻止 |
| ❌ 直接在 main branch 上改 | branch-guard exit 2 阻止 |
| ❌ 不读现有代码假设 API | 铁律 #2 |

## 你应当如何回应被 hook 阻止

如果 PreToolUse forbidden-guard 返回 exit 2 stderr：

1. **不要尝试绕过**（不要改文件名、不要 `git add` 别的方式塞进去）
2. 把被阻止的操作完整告诉用户
3. 引导用户走 spec-driven：
   > "🛑 检测到 forbidden 路径改动。需要先走 spec-driven：
   > 我可以帮你起草 SPEC.md，回答 3 个问题：
   > 1. 这次改动想达成什么用户/系统结果？
   > 2. 边界条件和异常处理？
   > 3. 哪些已有数据/接口受影响？"
4. 用户答完 → 跑 `/cto-spec specify` → 才能开始 Edit

## 引用

- handbook §32.1 / §32.5 反模式 / §19 跨模型 review
- CLAUDE.md 铁律 #13
- `.claude/hooks/forbidden-guard.sh`（硬阻止层）
- `scripts/forbidden-paths.txt`（路径 SSOT）
