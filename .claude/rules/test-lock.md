# Test-Lock 规则（手册 §20.3 / 铁律 #14）

## 适用文件

- `**/tests/**`
- `**/test/**`
- `**/__tests__/**`
- `**/*.test.ts`、`**/*.test.tsx`、`**/*.test.js`、`**/*.test.jsx`
- `**/*.spec.ts`、`**/*.spec.js`
- `**/*_test.py`、`**/test_*.py`
- `**/*_test.go`

## 强制规则

**测试文件 read-only 锁定后，AI 只能改实现不能改断言**（铁律 #14）。

合法修改场景：
1. ✅ Spec 变更：SPEC.md 中验收标准改了 → 测试相应更新
2. ✅ Bug 修复：发现测试本身有 bug（断言错、edge case 漏）→ 修测试
3. ✅ 新增测试：覆盖之前漏的场景 → 加新 test case
4. ✅ Refactor：测试结构重组（不改断言语义）

非法修改场景：
1. ❌ 实现失败 → 改测试让它通过（"作弊式 TDD"）
2. ❌ AI 不理解期望行为 → 改断言迁就实现
3. ❌ 删除"麻烦的"测试

## 5 条防作弊规则（手册 §20.3）

| # | 规则 | 实施 |
|---|---|---|
| 1 | Test-Lock | hooks 拦截 + 二次确认 |
| 2 | Spec → Test → Code 顺序 | §18.6 强制 |
| 3 | Mutation Gate | Stryker / PIT / mutmut，≥ 80% |
| 4 | Property-based 强制 | fast-check / Hypothesis ≥ 1 条 |
| 5 | 失败回灌（盲修复）| 只把 stderr 喂给 AI，不允许看测试源码 |

## 解锁流程

如确需修改测试（场景 1-4）：
1. 在 SPEC.md / commit message 中明确说明依据
2. 第二模型 review 确认非作弊（手册 §19）
3. 改后跑 mutation testing 验证 ≥ 80%

完整定义见手册 §20.3 AI 时代 TDD 五条防作弊规则。
