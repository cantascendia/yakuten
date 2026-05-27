---
name: test-lock-rules
description: >
  §20.3 Test-Lock 规则（铁律 #14）。当 Claude 编辑测试文件 (tests/、__tests__/、
  *.test.{ts,tsx,js,jsx,py}、*.spec.*、*_test.{py,go}) 时自动加载。强制：
  AI 只能改实现不能改断言；改测试需符合合法场景之一并显式标注 commit message。
  配套 .claude/hooks/test-lock-guard.sh 注入 PreToolUse 提醒。
user-invocable: false
paths:
  - "**/tests/**"
  - "**/test/**"
  - "**/__tests__/**"
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.test.js"
  - "**/*.test.jsx"
  - "**/*.spec.ts"
  - "**/*.spec.js"
  - "**/*_test.py"
  - "**/test_*.py"
  - "**/*_test.go"
---

# Test-Lock 规则 (§20.3 / 铁律 #14)

你正在编辑测试文件。AI 时代 TDD 最大风险是 **作弊式 TDD**：实现失败 → 改测试让其通过。
本规则强制：**AI 只能改实现，不能改断言**（除非满足下列合法场景）。

## 4 个合法场景（必须在响应或 commit msg 显式标注）

| 场景 | commit msg 标记 | 示例 |
|---|---|---|
| ① Spec 变更 | `spec-change:` | `spec-change: 用户登录失败计数从 3 → 5（per SPEC.md §2.1）` |
| ② Bug 修复 | `bug-fix:` 或 `fix:` | `bug-fix: 测试本身有 bug，断言错了 sign convention` |
| ③ 新增测试 | `test:` （仅添加） | `test: 加 edge case empty input` |
| ④ Refactor | `refactor(test):` | `refactor(test): 提取共用 setup 到 fixture，断言不变` |

## 5 条防作弊规则（手册 §20.3）

| # | 规则 | 你应如何遵守 |
|---|---|---|
| 1 | Test-Lock | 编辑测试文件时显式声明属于哪类合法场景 |
| 2 | Spec → Test → Code 顺序 | 不能先改 test 后改 SPEC（铁律 #2） |
| 3 | Mutation Gate ≥ 80% | 改完跑 Stryker / PIT / mutmut 验证 |
| 4 | Property-based 强制 | fast-check / Hypothesis ≥ 1 条 |
| 5 | 失败回灌 | 把 stderr 给用户，不假设期望行为 |

## 你应当如何响应

### 当 hook test-lock-guard 注入提醒时

1. **不要无视提醒继续 Edit**
2. 在响应里显式说明：
   > "本次编辑 `tests/foo.test.ts` 属于场景 [①/②/③/④]：<具体理由>。
   > commit message 会标 `[spec-change|bug-fix|test|refactor]:`。"
3. 改完后说明：
   - 是否影响其他测试（断言语义有变？）
   - 是否需要补 mutation testing
   - commit message 实际写了什么

### 当用户要求"改测试让它通过"

**直接拒绝 + 引导**：

> "这违反铁律 #14 Test-Lock。改测试让实现通过 = 作弊式 TDD。
> 正确做法：
>   1. 把失败的测试输出告诉我
>   2. 我们一起诊断实现为什么不符合断言期望
>   3. 修实现而不是断言
> 如果断言本身错了（场景 ②），需要先有证据：参考文档/SPEC/原作者意图。"

### 当用户说 "skip tests" / "这个测试不重要"

→ 触发 §33 vibe 警告（vibe-prompt-guard 会拦关键词）。
→ 反问："为什么这个测试不重要？是否有 spec 依据可以删它？"

## 反模式（你必须识别并阻止）

| 反模式 | 识别信号 |
|---|---|
| 改断言数字让通过 | `expect(x).toBe(3)` → `expect(x).toBe(5)` 而实现也改了 |
| 注释掉 failing test | `// it.skip(...)` 或 `xit(...)` 没解释 |
| 删测试文件 | Write tool 写空内容到现有 test file |
| `--passWithNoTests` | jest config 突然加这选项 |

## 引用

- handbook §20.3 全文
- CLAUDE.md 铁律 #14
- `.claude/hooks/test-lock-guard.sh`（注入提醒层）
- `.claude/rules/test-lock.md`（详细 5 条规则）
