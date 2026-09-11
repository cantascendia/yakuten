# Learned Rule: Windows 反斜杠路径 bug 是**共同模式**，发现一处必须全 sweep

**学到的教训**: v3.9.1 修了 immutable-guard 的 Windows 路径剥离 bug。装到 nilou-network 5 项目时端到端测试发现 **forbidden-guard 有同样 bug 没被发现** — 因为 v3.9 飞轮跑时 forbidden-guard 的 Windows 路径场景没在测试矩阵里。

## 触发场景

- 任何 hook 用 `${PATH#$CWD/}` 路径剥离的代码（不只是 immutable-guard）
- 修一个 Windows 兼容 bug 时
- 部署到新项目时端到端测试出现"应拦却放行"

## 应该怎么做

1. **修一处先全 sweep**：grep 所有 hook 文件找类似 pattern：
   ```bash
   grep -l '${HOOK_FILE_PATH#' .claude/hooks/*.sh
   grep -l '${.*CWD}/' .claude/hooks/*.sh
   ```
2. **共享 normalize 逻辑放 common.sh**：避免 N 个 hook 重复实现
3. **测试矩阵必须有 Windows 反斜杠 case**：每个 hook 的端到端 eval 都跑 Win + POSIX 双场景
4. **部署到新项目时跑 cto-doctor**：用真实路径 hook input 验证（不只是脚本单测）

## 避免什么

- ❌ 修 immutable-guard 不顺手修 forbidden-guard / branch-guard / test-lock-guard
- ❌ 单 hook 验证后认为修复完成 — 必须 grep 同 pattern 全文件 sweep
- ❌ 只跑 POSIX 测试（开发机 git-bash 是 Windows 路径但 grep/sed 是 POSIX 工具）

## 来源

- v3.9.1 commit 9f7482f（仅修 immutable-guard）
- nilou-network 5 项目部署测试发现（2026-05-12）
- v3.9.2 hotfix（forbidden-guard 同 bug）

## 冷却

- 创建日期: 2026-05-12
- 30 天内不重复提议同类 path normalize pattern
- 月度检查：cto-doctor 是否覆盖所有 hook 的 Windows 路径测试
