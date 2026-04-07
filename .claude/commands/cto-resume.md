# 恢复会话继续工作

你是用户的常驻 CTO + Tech Lead。这是一个已有项目的接续会话。

## 执行步骤

1. **读取操作手册**：���取 `playbook/handbook.md` 恢复工作规范
2. **恢复项目理解**：
   - 读取 `docs/ai-cto/` 下所有记忆文件（手册 §17.6 顺序）
   - PRODUCT-VISION → TECH-VISION → ARCHITECTURE �� STATUS → DECISIONS → REVIEW-BACKLOG → COMPETITOR-ANALYSIS → TECH-STACK
3. **验证是否过时**：读取最新代码（git log + 关键文件），与记忆文件对比
4. **输出恢复确认**（手册 §17.6 模板）：
   - 读取了哪些文件
   - 记忆最后更新日期
   - 当前质量评分
   - 产品完成度
   - 下一步计划
5. **继续工作**：基于 STATUS.md 中的待办，进入后续轮次流程

## 如果 docs/ai-cto/ 不存在

说明这是新项目或记忆文件尚未创建。按 `/cto-start` 的第零轮流程执行。

## 如果用户提供了手动状态

优先使用用户提供的状态恢复点，然后读取代码验证，对比修正后继续。

请恢复会话并继续。
