# SPEC: AI 问答端点 — 任务分级路由 + 免费额度六级降级链

> 状态：已实施（owner 2026-07-23 两次授权：「模型改成最新的3.6flash，用完了自动
> 切换模型，用免费额度」+「了解最新的所有有免费额度的模型，进行降级……简单的
> 困难的任务分级」）。api/ 为 forbidden 路径（§4），本 spec 为双签第一签，
> 实施后由 codex 跨模型 review 补第二签。

## 免费额度模型清单（2026-07-23 官方核实）

来源：ai.google.dev/gemini-api/docs/models + rate-limits。免费层覆盖 Flash 与
Flash-Lite 全系（Pro 已移入付费）；Flash 与 Flash-Lite 配额池独立
（参考量级：Flash ~10 RPM / 1500 RPD，Flash-Lite ~15 RPM / 1500 RPD / 1M TPM，
实际以 AI Studio 项目实况为准）。

| 模型 ID | 系 | 位置 |
|---|---|---|
| gemini-3.6-flash | Flash（最新稳定） | 主力链头 |
| gemini-3.5-flash | Flash | 降级 2 |
| gemini-2.5-flash | Flash | 降级 3 |
| gemini-3.5-flash-lite | Flash-Lite（最新） | 降级 4 / 寒暄链头 |
| gemini-3.1-flash-lite | Flash-Lite | 降级 5 |
| gemini-2.5-flash-lite | Flash-Lite | 降级 6 |

## 机制

### ① 任务分级路由
- **寒暄**（≤14 字符 且 命中寒暄词全匹配正则 且 无其他内容）→ LITE_CHAIN，
  maxOutputTokens 512。价值：不浪费 Flash 主力配额。
- **其余一切 → FLASH_CHAIN**，maxOutputTokens 2048。医疗站原则：判定保守
  窄召回 —— 宁可把寒暄给主力模型，绝不把医疗问题给 lite。

### ② 六级降级
复用既有「首 chunk 探错」（返回 200 前发生，客户端契约零变化）：
404（模型名不可用）/ 429（额度耗尽）/ 5xx → 链内下移。Flash 系耗尽自动落
Flash-Lite 系（独立配额 = 天然后备池）。全链失败 → 503（原行为）。

### ③ 无状态
每请求从链头开始：额度耗尽时段内每请求多付一次失败探测（~百 ms），
换取额度恢复后自动回到最新模型；无跨请求记忆，Edge 实例间零协调。

## 安全边界不变

SYSTEM_PROMPT / 限流（5 req/min/IP）/ 消息校验（MAX_MESSAGES 20、
MAX_CONTENT_BYTES 4096）/ temperature 0.3 全部原样。

## 不做

- 付费 key / 多 key 轮换（owner：用免费额度）
- 客户端模型选择（模型是服务端实现细节）
- 医疗问题的「省额度降级」——分级只对寒暄生效
