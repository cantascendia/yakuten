# SPEC — AI 问答本机会话历史(设备端 opt-in 持久化)

- 状态:Draft → 待双签
- 作者:CTO(Fable5)
- 日期:2026-07-24
- 关联:CONSTITUTION §6(用户数据零服务器存储 / AI 对话不落库 / 无账号)、SPEC.md §5·§6、`src/utils/blood/storage.ts`(已获宪法批准的设备端 localStorage 先例)
- forbidden 路径:**不涉及**(纯前端;后端 `api/ai-chat.ts` 一字不改)

## 1. 背景与动机

`AIAssistant.tsx` 当前刻意不落任何存储 —— 刷新即丢失全部对话。这既是隐私红线的体现,也是当前"产品级 chat 体验"的核心缺口:用户无法保留、回看、管理多轮对话。

本 spec 定义一个**设备端、opt-in、零上传**的会话历史层,把"像 claude.ai/chatgpt 一样保留会话"这一产品诉求落到与血检手账 v3.2 完全同构的隐私纪律上。

## 2. 目标 / 非目标

**目标**
- 多会话:新建、切换、重命名、删除、全部清空、导出。
- 刷新 / 重开浏览器后会话不丢(仅本设备)。
- 默认行为与今日**完全一致(零存储)**;仅用户显式开启后才落盘。

**非目标(明确排除)**
- ❌ 任何服务器存储 / 上传 / 同步 / 账号(撞 CONSTITUTION §6,需修宪,见附录)。
- ❌ 跨设备同步。
- ❌ 后端契约变更(上下文窗口仍由端点 `slice(-10)` 决定)。

## 3. 数据模型

localStorage,版本化 key(镜像 `BC_STORAGE_KEY = 'yakuten_blood_records_v2'`):

```ts
AI_CHAT_KEY         = 'yakuten_ai_chat_v1'        // 会话数据
AI_CHAT_CONSENT_KEY = 'yakuten_ai_chat_consent_v1'// opt-in 同意标志（'1' = 开）

interface StoredMessage { role: 'user' | 'assistant'; content: string; crisis?: boolean }
interface ChatSession   { id: string; title: string; createdAt: number; updatedAt: number; messages: StoredMessage[] }
interface ChatStoreV1   { version: 1; sessions: ChatSession[]; activeId: string | null }
```

- **只持久化展示文本** `content` 与布尔 `crisis`;**绝不持久化** `apiContent`(含页面上下文前缀,仅发送时临时拼接)。
- `id` = `crypto.randomUUID()`、时间戳 = `Date.now()`,均仅在浏览器侧生成(SSR 不触达)。

## 4. opt-in 同意模型(隐私红线落地)

- **默认 OFF**:未写 `AI_CHAT_CONSENT_KEY` 时,组件行为 = 今日(纯内存、零 localStorage 写入)。
- UI 内显式「在此设备保存对话历史」开关:
  - 打开 → 写 `consent='1'`,此后会话落盘。
  - 关闭 → 删除 `consent` **并删除** `AI_CHAT_KEY`(关闭即抹除已存对话,符合"撤回同意即遗忘")。
- 这把 CONSTITUTION §6"引入存储须用户级同意"落成**可核验的 opt-in**,而非默默开启。

## 5. 存储上限与裁剪(写前预算,避免撑爆 ~5MB 配额)

`aiSaveStore` 写盘前裁剪并返回实际持久化后的 store(内存与磁盘保持一致):
- `MAX_SESSIONS = 30`:超出按 `updatedAt` 淘汰最旧。
- `MAX_MESSAGES_PER_SESSION = 120`:超出裁掉最早消息。
- 软预算 `MAX_CHARS ≈ 1.5e6`:`JSON.stringify` 长度超标则循环淘汰最旧会话(至少留 1 个)。
- `setItem` 抛异常(配额/被禁)→ 先再淘汰一个最旧会话重试一次 → 再失败**静默降级**(镜像 `bcSaveRecords` 的 `catch {}`)。

## 6. 隐私与宪法对齐

- 服务器仍 **stateless** —— 复用血检手账已获批准的"设备端 localStorage"先例,**不需修宪**,按 §6"更新 SPEC + spec-driven"处理即可。
- 危机拦截链路零改动:持久化只存 `content/crisis`,重渲染仍本地秒级出热线卡。

## 7. 免责文案同步点(必须一致,只强化不弱化)

| 位置 | 现状 | 改为 |
|---|---|---|
| `src/components/ui/ToolDisclaimer.astro`(`ai-no-history`) | "我们不存储任何对话" | "服务器不存储任何对话;仅在你开启『在此设备保存』后,历史保存在本设备浏览器,可随时一键清空" |
| `src/content/docs/{17}/tools/ai-assistant.mdx` frontmatter `description` + warning-box bullet | "我们不存储任何对话" / "AI 通常无法查看你的历史提问" | 同步为"服务器不存储;设备端历史仅在你开启后本机保存" |
| `SPEC.md` §5·§6 隐私行 | "AI 问答不存储对话" | "服务器不存储;设备端历史 opt-in 本机保存(`yakuten_ai_chat_v1`,默认关)" |
| 组件内 opt-in 开关旁说明 | — | 新增:默认关闭、仅本设备、不上传、可清空 |

## 8. 验收标准

1. 未开启 opt-in:任何操作后 `localStorage` 无 `yakuten_ai_chat_v1`(承诺不破)。
2. 开启后发消息 → 刷新页 → 会话与消息完整恢复,`activeId` 正确。
3. 关闭 opt-in → `yakuten_ai_chat_v1` 与 consent 均被删除。
4. 新建/切换/重命名/删除/清空/导出均落盘且 UI 同步。
5. 灌 >30 会话 → 最旧被淘汰;`setItem` 抛错时不崩(静默降级)。
6. SSR/`astro build` 无 `window`/`crypto` 报错。
7. 危机拦截在持久化重渲染后仍出卡。

## 9. later(不进本次)

跨设备云同步、对话分支树、导入对话、服务端扩上下文窗口(属 §4 后端改动)。

## 附录:云端同步为何需修宪
云同步需账号 + 服务器存 HRT 敏感对话,直接反转 §6"不存储/无账号",属改变宪法既定事实 → 走 Article III(`CTO_CONSTITUTION_AMEND=1` + 双签 + 版本 bump + `EVOLUTION-LOG.md` + ≥7 天冷却)。评估结论:不推荐,单独立案。
