# Skill 生态管理

盘点当前项目的 Agent Skill 集合，评估健康状态，推荐安装。

## 执行步骤

1. **扫描已安装 Skills**：读取 `.agents/skills/` 目录，列出所有 Skill 的 name、description、类型

2. **输出清单表**：

| Skill 名 | 用途 | 来源 | 类型 |
|---|---|---|---|
| [name] | [description] | 自建/anthropic/obra/trailofbits/openai/stitch | instruction-only/含脚本 |

3. **健康检查**：
   - 所有 SKILL.md 的 name 字段与目录名一致
   - 所有 description ≤ 1024 字符且描述了触发条件
   - 含 scripts/ 的 Skill 已经过安全审查
   - 无同名 Skill 出现在不同路径

4. **推荐安装**：根据项目特征推荐（手册 §22）
   - 有前端 UI → frontend-design、Stitch Skills
   - 需要 UI 测试 → webapp-testing
   - 涉及安全 → Trail of Bits Security Skills
   - 需要文档 → docx / pdf / pptx / xlsx
   - 需要 MCP → mcp-builder

5. **输出建议**：安装命令 + 预期收益
