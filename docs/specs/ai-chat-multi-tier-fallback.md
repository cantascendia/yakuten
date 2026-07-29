# SPEC — AI 问答端点：三层供应商降级 + 精准耗尽记忆 + 思考模式

> 状态：实施中（2026-07-29）
> 授权：owner 2026-07-23「模型改成最新的 3.6flash，用完了自动切换模型，用免费额度」
> + 2026-07-29「现在用的免费的 google ai key，如果超过限制，换成另一个付费 key
> （用每个月谷歌 pro 会员送的 10 美元额度）。如果 10 美元额度也用光了，换成
> deepseek v4 的保底。关键是降低出错率。并且确保最大化白嫖额度。」
> + 「增加思考模式让用户自己选，不需要思考的简单问题比如寒暄可以自动降级。」
> `api/` 为 forbidden 路径（CONSTITUTION §4）。本文为双签第一签，实施后由
> codex + Antigravity gemini 跨模型审补第二签。

---

## 0. Supersede 声明

本 spec 显式取代以下条款。被取代条款原文**保留不删**（决策考古 + §2「基于实际，
不编造」要求变更留痕），仅在原位置加 supersede 指针。

| 被取代条款 | 原文 | 取代范围 | 理由 |
|---|---|---|---|
| `docs/specs/ai-chat-model-fallback.md` §「不做」第 1 条 | 「付费 key / 多 key 轮换（owner：用免费额度）」 | **完全取代** | 该 non-goal 记录的是 2026-07-23 owner「用免费额度」的**授权边界**，不是技术禁令。owner 已于 2026-07-29 重新授权付费层 + 保底层。原判断在其当时前提下正确，前提已变 |
| 同上 §机制③ | 「无跨请求记忆，Edge 实例间零协调」 | **取代**（改为尽力而为的冷却记忆） | 当时所有候选都免费，探测成本只有延迟；加付费层后，免费额度耗尽期间每请求都要重跑 6 次注定失败的探测才到付费层。见 §4 的 Pareto 论证 |
| `docs/ai-cto/SPEC-2026-05-26-security-hardening.md` §3 | 「Do NOT add new env vars beyond `ALLOWED_ORIGINS`」 | **仅就 `GOOGLE_PAID_API_KEY` / `DEEPSEEK_API_KEY` / `AI_COOLDOWN_DISABLED` / `AI_TIERS` 四个变量取代**。该 §3 其余 non-goal（不动 SYSTEM_PROMPT / 不弱化限流 / 不动消息校验 / 不新建 api/ 下文件）**全部继续有效** | 该约束的立法意图是防止安全 PR 范围蔓延，不是禁止端点未来新增配置。本 spec 走了同等级（双签 + spec-driven）流程，满足其立法意图 |
| `docs/ai-cto/DECISIONS.md` D002 | 「不迁移到 Claude / OpenAI」 | **不取代，仅界定射程** | D002 的字面主张与本 spec 不冲突（DeepSeek 既非 Claude 也非 OpenAI），主供应商仍是 Google。被修订的是其隐含的「单供应商」架构假设 → 见 D018 |

**未被取代且本 spec 明确继承的约束**：CONSTITUTION §1（用户生命安全，含医疗免责
声明不可弱化）、§4（forbidden 路径 spec-driven + 双签）、§6（不存储对话）；
SYSTEM_PROMPT 基线文本；限流 5 req/min/IP；messages 校验上限；temperature 0.3；
Origin 白名单；不在 `api/` 下新建文件。

---

## 1. 免费额度事实（2026-07 核实）

来源：ai.google.dev/gemini-api/docs/models、docs/rate-limits、docs/billing。

- 免费层覆盖 Flash 与 Flash-Lite 全系（Pro 已移入付费）
- **配额是 per-project-per-model**（`GenerateRequestsPerDayPerProjectPerModel-FreeTier`）
  → 6 个模型 = 6 份独立 ~1500 RPD ≈ **9000 次/天**
- Flash 与 Flash-Lite 的 RPM 池亦独立
- **启用 billing 会让该项目免费额度立即消失**（与其他 GCP 服务不同）
  → 免费与付费**必须是两个独立 GCP 项目 / 两把 key**。这是硬前提，写进部署清单
- 付费用 **Prepay 预付费**（owner 决策）：余额耗尽 API 直接返错 → 天然触发降级，零超支

---

## 2. 机制

### 2.1 三层凭据（key 存在性 = 唯一开关）

| 变量 | tier | 缺失时 |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY`（现有） | free | 跳过该层（全缺则 503，同现状） |
| `GOOGLE_PAID_API_KEY`（新） | paid | 跳过 |
| `DEEPSEEK_API_KEY`（新） | backup | 跳过 |

**不引入 `ENABLE_*` 独立开关** —— 两个真值源必然漂移，且漂移的失败模式最坏
（key 在但开关关 / 开关开但 key 不在）。单一真值源使「配置了什么」与「启用了
什么」永远一致。回滚 = Vercel 删变量 + Redeploy，不碰代码。

**必须显式传 `apiKey`（P0 安全要求）**：`@ai-sdk/provider-utils` 的 `loadApiKey`
（dist/index.mjs:717-741）在 `apiKey: undefined` 时会**静默回退**读
`process.env.GOOGLE_GENERATIVE_AI_API_KEY`。若付费 key 的 env 名打错，"付费层"
会用免费 key 再跑一遍 —— 响应头显示 paid、实际是 free、$10 永远用不到，全程无声。
因此：构造前判 `typeof v === 'string' && v.trim() !== ''`；`paid === free` 时
拒绝构造付费层并 `console.error`（防同项目开 billing 或填错）；模块启动打印
已装载层清单。

### 2.2 扁平候选链

一维有序数组，顺序探测天然实现「层内穷尽 → 才跨层」，无需显式跨层逻辑。

**医疗级**（默认）：
| # | tier | model |
|---|---|---|
| 1-3 | free | gemini-3.6-flash / gemini-3.5-flash / gemini-2.5-flash |
| 4-6 | free | gemini-3.5-flash-lite / gemini-3.1-flash-lite / gemini-2.5-flash-lite |
| 7 | paid | gemini-3.6-flash |
| 8 | backup | deepseek-v4-flash |

4-6 是**换池**：Flash 全系 RPM 撞墙时 Lite 池仍空闲，仍在免费层内。
7 只放 1 个：付费层的失败几乎必然是余额耗尽，换模型救不了。
8 固定 SYSTEM_PROMPT 命中 DeepSeek 前缀缓存（$0.0028/1M），保底成本近 0。

**寒暄级**：3 个 free lite → free flash → **paid lite**（不是 paid flash，同句
成本差 ~4×）→ backup。

### 2.3 错误分类矩阵

现有 `isFallbackWorthy` 把 401/403 当「立即失败」—— 单 key 时正确，**多 key 下
会让保底层永远走不到**，且表现为「看起来像配置问题的 503」，无告警。三态判决：

| 错误 | 判决 | 冷却 scope/时长 | 理由 |
|---|---|---|---|
| 400 + body 含 `API_KEY_INVALID`/`API key not valid` | next-cred | cred / 10min | **Google 把无效 key 报成 400 INVALID_ARGUMENT，不是 401** |
| 400 其他 | **abort** | — | 坏请求 / 内容策略拒绝。换供应商救不了；更重要的是会把同一份用户输入原样再发给第二个第三方，隐私暴露面翻倍且零收益 |
| 401 | next-cred | cred / 10min | 凭证失效 |
| 403 + body 含 key/credential/suspended/unregistered | next-cred | cred / 10min | key 级 |
| 403 其他 | next-model | model / 30min | 模型级 PERMISSION_DENIED —— 不能因此丢掉整层免费额度 |
| 404 | next-model | model / 30min | 模型名不存在 |
| 429 free + quotaId 含 `PerMinute` | next-model | model / retryDelay+2s，钳 [5s,90s] | 换池仍在免费层，白嫖核心 |
| 429 free + quotaId 含 `PerDay` | next-model | model / 30min | 其他模型各有独立 1500 RPD |
| 429 free 无法解析 quotaId | next-model | model / 60s | 保守取 RPM 时长：误判成 PerDay 会白丢一天免费额度，代价不对称 |
| 429 / 402 paid·backup | next-cred | cred / 15min | 余额耗尽 |
| 5xx 同 cred 首次 | next-model | model / 30s | Gemini overloaded 是 per-model 的 |
| 5xx 同 cred 第 2 次 | next-cred | cred / 2min | 升级为供应商级故障 |
| 408 / 网络 / Abort | next-model | 不记 | 瞬时，不冷却免得误封健康候选 |
| 其他 / 非 APICallError | **abort** | — | 未知错误不轮询（防 bug 变成对上游的重试风暴） |

quotaId 与 retryDelay 必须从 **`err.responseBody` 原始字符串**解析 ——
`@ai-sdk/google` 的 `googleErrorDataSchema` 只解析 `{error:{code,message,status}}`，
`details[]` 被 zod 丢弃。解析时 **minute 优先于 day**（同一个 429 可能列多条
violation，判成 minute 的冷却短，误判代价远小于反向）。

### 2.4 耗尽记忆

模块级 `Map<string, number>`（与现有限流 Map 同款：进程内、Edge 跨实例不共享、
冷启动重置）。key 按错误 scope 派生：`${credId}::${model}` 或 `${credId}::*`。

**为什么安全**：冷却**只会让链变短，永不改变最终成败**。命中（实例温）→ 少探
几次；未命中（冷启动 / 换实例 / 换区域）→ 退化成今天的行为，一次不多一次不少。
**严格 Pareto 改进，最坏等于现状**。这与限流器跨实例不共享的性质完全不同 ——
那是可被绕过的安全漏洞，这只是优化没生效。

**收益最大的场景**：客户端有 `MAX_ATTEMPTS=3` 重试，今天一次 503 会让客户端在
5s 内重试 3 次、每次重跑 6 次免费探测 = 18 次无效上游调用；有冷却后是 6+1+1。

**护栏**：`MAX_COOLDOWN_MS = 30min` 硬上限（把 404 的长冷却压到 30min —— 宁可
每半小时多付一次 ~150ms 的 404，也不接受任何路径能封锁候选半天）；`scope=null`
一律不记；`AI_COOLDOWN_DISABLED=1` 一键回到完全无状态。

**不算太平洋午夜**：需要 Intl 时区 + DST 处理，算错一次会把免费层封锁最多 24h，
而这个 bug 只在跨午夜/DST 时复现、测试几乎抓不到。30min 已吃掉 ~95% 收益。

**内存**：key 来自闭集常量（≤3 cred × ≤6 model + 3 cred key，上界 21 条），
攻击者无法注入新 key —— 与按 IP 索引的开集限流 Map 性质不同。仍提供
`cleanupCooldown()` 与限流清扫并列调用，纯为风格一致。

### 2.5 链长与延迟预算

`MAX_PROBES = 5` + 墙钟 `PROBE_BUDGET_MS = 12000` + `timeout: { chunkMs: 8000 }`。

**必须是 `chunkMs` 对象形式，不是 `timeout: 8000`（number = totalMs 语义）**：
`totalMs` 会把**正在正常流式输出的长回答拦腰截断** —— 医疗站上截断一句剂量红线
或急症引导是真实的患者安全事故。`chunkMs` 只在相邻 chunk 间隔超时时中止，并顺带
修复今天「流中途卡死一直挂到客户端超时」的问题。中止后走现有
`[回复中断，请重试]` 分支，客户端契约零变化。

**保底层豁免**：链的最后一个候选不计入 `MAX_PROBES` 与墙钟 —— 否则「加了保底
反而没保底」。

**空回复只在同 provider 内降级**：Gemini 安全拦截返回空流而非报错。允许降级
一次以降低出错率，但**把 Gemini 拒答的医疗问题转投未验证的 DeepSeek 是医疗
安全反模式**，故跨 provider 时不降级，直接走现有兜底文案。

### 2.6 DeepSeek 接入：零依赖 fetch

`@ai-sdk/deepseek` 全系列依赖 `@ai-sdk/provider@4.x`，与本项目 `ai@6.0.149`
（provider@3.0.8）代际不兼容（已逐版本 `npm view` 核实：3.0.0 起就是 provider@4；
退到 2.x 线钉在 3.0.14 仍不 dedupe）。装它就要把 `ai` 升 v7 + `@ai-sdk/google`
升 v4 —— 在 forbidden 路径、且是**唯一无法本地构建与测试**的文件上做 SDK 大版本
迁移，风险不可接受。

改为直接 fetch OpenAI 兼容端点（~60 行）：
`POST https://api.deepseek.com/chat/completions`，`Authorization: Bearer $KEY`，
`{model, messages:[{role:'system',...},...], stream:true, max_tokens, temperature:0.3}`；
SSE `data: {...}` → `choices[0].delta.content`，`data: [DONE]` 结束。

**接口统一**：两条路径都产出 `ReadableStream<string>`，现有首 chunk 探错与手工
re-assemble 逻辑**一行不改**。错误抛 `ai` 包导出的同一个 `APICallError`，使
`classify()` 一套逻辑通吃。**`requestBodyValues` 刻意留空**（见 §5 隐私）。

SSE 解析要点（经典 bug 温床，逐条处理）：复用单个 `TextDecoder` 并
`decode(v,{stream:true})` 防多字节被 chunk 边界切断；`\r\n` 与 `\n` 都要处理；
跳过非 `data:` 行（心跳/event:）；`[DONE]` 哨兵；JSON.parse 失败当半包忽略。

⚠ 模型名用 `deepseek-v4-flash` —— 旧名 `deepseek-chat` 已于 2026-07-24 退役。

### 2.7 思考模式

客户端 body 新增可选 `mode: 'fast' | 'think'`（缺省 fast）。校验白名单需加该字段，
messages 校验其余部分不变。

| 场景 | Gemini 3.x | Gemini 2.5 | DeepSeek | maxTokens |
|---|---|---|---|---|
| 寒暄（自动降档） | `thinkingLevel:'minimal'` | `thinkingBudget:0` | `thinking:disabled` | 512 |
| 默认 fast | `'low'` | `0` | `disabled` | 2048 |
| 用户开启 think | `'high'` | `-1`（动态） | `enabled` | 4096 |

经 `providerOptions.google.thinkingConfig` 传（`@ai-sdk/google@3.0.59` 已内置该
类型，无需升级 SDK）。`thinkingLevel` 与 `thinkingBudget` **不可同时传** ——
按 model id 前缀分派。

**免费额度不受影响**：免费层限的是请求数（RPD/RPM）不是 token 数 → 思考模式
只增延迟不增额度消耗。这让「用户可选深度思考」在免费层几乎零成本。

### 2.8 日限额（服务端第二道）

进程内 `Map<ip, {day, count}>`，与限流 Map 同款、同样尽力而为。配额 30/IP/天
（免费 9000 ÷ 目标支撑 300 人/天，单人最多占 0.33%）。超限 429 +
`x-yk-daily: exceeded`，文案区分于分钟级限流。善意用户的主防线在客户端计数器
（纯本地、带百分比进度条），服务端这道只挡简单滥用。

---

## 3. 可观测性

| 头 | 值 | 说明 |
|---|---|---|
| `x-yk-model` | `gemini-3.6-flash` | **格式不变** —— 它是用户可见 UI（`AIAssistant.tsx` 渲染成 poweredBy 文案） |
| `x-yk-route` | `free/google` \| `paid/google` \| `backup/deepseek` | 新增 |
| `x-yk-probes` | `1` … `6` | 新增，本次实际探测次数 |

三者都是闭集常量拼的 ASCII，不含任何 key 材料（cred id 是符号标签如 `g-paid`，
既非 env 名也非 key 值）。失败路径（503 JSON）不加这些头，失败契约不变。

---

## 4. 隐私红线（实施时最易违反的一条）

**`APICallError.requestBodyValues` 携带完整 prompt**（SYSTEM_PROMPT + 全部用户
消息）。任何 `console.error(err)` / `JSON.stringify(err)` / `err.stack` / 记录
`responseBody` 全文，都会把用户的 HRT 用药描述写进 Vercel 日志 —— 对一个明确
承诺「对话零存储」的跨性别医疗站，这是最严重的一类事故。

强制约定：
- **唯一允许接触 error 对象的函数** `logProbeFailure()`，白名单字段：候选 key /
  分类码 / 判决 / 冷却时长 / `err.message.slice(0,200)`（Google 的 message 是
  固定模板文案）
- `parseGoogleQuota()` 只返回枚举值与数字，不回传原串
- 手写 DeepSeek 客户端的 `requestBodyValues: {}` 刻意留空
- 文件头写死这条 review checklist
- 上线后用 Vercel 日志 grep「HRT药典」「WPATH」确认零命中

---

## 5. 验证

见 `docs/ai-cto/` 同批产物与 PR description。要点：

- 本地无法跑该端点（`astro dev` 不伺服 `api/`，CI 也不编译它）→ 只能 Vercel
  preview；preview 域不在白名单，须带 `Origin: https://hrtyaku.com`
- 最低类型保障：`npx tsc --noEmit -p tsconfig.json`（过滤 api/ai-chat 相关）
- **制造故障的技巧**：把 key 换成**已吊销的旧 key**（产生 400/401）—— 零成本、
  确定性、秒级、完全可逆，同时验证「降级链走通」与「凭证故障被保底覆盖」
- **付费层验证不能只看响应头**：还须确认付费项目的 AI Studio 用量计数 +1
  （防 §2.1 的静默回退）
- **DeepSeek 医疗安全探针**（`npm run verify:ai-safety`）：P0-A 禁个性化剂量、
  P0-B 躯体急症引导（**本次核心**）3/3 硬门控，失败即不上该层。依据：
  `src/components/interactive/crisisSupport.ts` 的本地拦截只有自杀/自伤词表，
  心理危机有不可关闭热线卡兜底，**躯体急症（血栓/肝损/高钾/视野缺损）纯靠
  SYSTEM_PROMPT** —— 这是唯一可直接致身体伤害且无任何其他层能补救的路径。
  Gemini 也跑一遍做基线（否则无法区分「DeepSeek 差」与「断言写错」）

---

## 6. 上线与回滚

**分两次部署**：先上代码但不配 `DEEPSEEK_API_KEY` → 确认零回归 → 再配 key
激活保底层。两个动作可独立回滚。

| 级别 | 动作 | RTO |
|---|---|---|
| L0 | Vercel 删 `DEEPSEEK_API_KEY` → Redeploy | ~1min，owner 可独立操作，不碰代码 |
| L0' | 再删 `GOOGLE_PAID_API_KEY` | ~1min，退回纯免费单 key = 改造前行为 |
| L0'' | `AI_COOLDOWN_DISABLED=1` | 关掉记忆回到无状态 |
| L1 / L2 | Vercel Instant Rollback / `git revert` | ~1min / ~5min |

**等价性断言**（回滚方案的全部基础，必须实测不能推断）：当 `GOOGLE_PAID_API_KEY`
与 `DEEPSEEK_API_KEY` 均未设置时，端点的可观测行为（status / `x-yk-model` /
上游调用序列 / 日志）**与本次改造前一致**。

**回滚触发条件**（预先定义避免临场犹豫）：任一 P0 探针在生产复现失败 → 立即 L0；
`x-yk-route: backup` 占比异常升高 → 查 + L0；端点错误率 > 基线 2 倍 → L1。

---

## 7. 不做

- 付费层的「省额度降级」—— 分级只对寒暄生效，医疗问答不为省额度降质量
- 客户端模型选择（模型是服务端实现细节）
- 输出侧内容过滤 —— SYSTEM_PROMPT 本就要求给出指南剂量范围，以数字为特征的
  检测器误报率接近 100%；且规则判定需缓冲全文，首字节延迟从 ~1s 变 ~5s
- 外部状态存储（KV/Redis）—— 冷却与日计数都定位为尽力而为；真被刷爆再上
- `.github/workflows/` 的 CI 集成 —— 那是另一条 forbidden 路径，且会把
  `DEEPSEEK_API_KEY` 暴露面从 Vercel 扩到 GitHub
