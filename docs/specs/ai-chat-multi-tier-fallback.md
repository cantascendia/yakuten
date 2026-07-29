# SPEC — AI 问答端点：四层供应商降级 + 精准耗尽记忆 + 思考模式

> 状态：实施中（2026-07-29）
> 授权：owner 2026-07-23「模型改成最新的 3.6flash，用完了自动切换模型，用免费额度」
> + 2026-07-29「现在用的免费的 google ai key，如果超过限制，换成另一个付费 key
> （用每个月谷歌 pro 会员送的 10 美元额度）。如果 10 美元额度也用光了，换成
> deepseek v4 的保底。关键是降低出错率。并且确保最大化白嫖额度。」
> + 「增加思考模式让用户自己选，不需要思考的简单问题比如寒暄可以自动降级。」
> + 2026-07-29 追加：owner 开通 OpenAI 每日免费额度（数据共享换取，Tier 1）
> → 新增第四层 `free-oai`（§2.1 / §2.2 / §2.6b）；限额语义由「日限额」改为
> **5 小时 + 每周两级滚动窗口**（Claude 模式，§2.8）；补客户端 GA 用量埋点与
> 服务端成功路径日志（§3 / §3.1）。
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
| `docs/ai-cto/SPEC-2026-05-26-security-hardening.md` §3 | 「Do NOT add new env vars beyond `ALLOWED_ORIGINS`」 | **仅就 `GOOGLE_PAID_API_KEY` / `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` / `AI_COOLDOWN_DISABLED` / `AI_TIERS` 五个变量取代**。该 §3 其余 non-goal（不动 SYSTEM_PROMPT / 不弱化限流 / 不动消息校验 / 不新建 api/ 下文件）**全部继续有效** | 该约束的立法意图是防止安全 PR 范围蔓延，不是禁止端点未来新增配置。本 spec 走了同等级（双签 + spec-driven）流程，满足其立法意图 |
| `docs/ai-cto/DECISIONS.md` D002 | 「不迁移到 Claude / OpenAI」 | **部分取代**（2026-07-29 修订） | 初版本 spec 只加 DeepSeek 时，D002 的字面主张不冲突。**2026-07-29 owner 开通 OpenAI 每日免费额度后，本 spec 显式引入 OpenAI 作为降级链的一层** —— 但 D002 的立法意图是「不做单供应商迁移 / 不为 OpenAI 付费」，而这里 OpenAI 只是**免费额度层**，主供应商仍是 Google，付费层仍是 Google credits，OpenAI 排在付费层之前正是为了不花钱。D002 中「不迁移」继续有效，「不使用」被取代 |

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

#### ⚠️ 模型可用性必须实打验证（2026-07-29 实测修订）

**`ListModels` 会列出已对新用户下架的模型** —— 只有真正发一次 `generateContent`
才会暴露。任何靠读文档或读模型列表做的核对都发现不了这一类问题。

用本地 `.env.local` 的免费 key 逐模型实打：

| 模型 | 结果 |
|---|---|
| `gemini-3.6-flash` | ✅ 200 |
| `gemini-3.5-flash` | ✅ 200 |
| `gemini-3-flash-preview` | ✅ 200 |
| `gemini-3.5-flash-lite` | ✅ 200 |
| `gemini-3.1-flash-lite` | ✅ 200 |
| `gemini-3.1-flash-lite-preview` | ✅ 200 |
| ~~`gemini-2.5-flash`~~ | ❌ 404 `no longer available to new users` |
| ~~`gemini-2.5-flash-lite`~~ | ❌ 404 同上 |

故候选链的第 3 顺位由 2.5 系替换为对应 preview：
`gemini-2.5-flash → gemini-3-flash-preview`、
`gemini-2.5-flash-lite → gemini-3.1-flash-lite-preview`。
两者均 200 且接受图片输入（顺带为 #136 验证了视觉能力）。
**替换后各池仍是 3 个模型，「6 模型 ≈ 9000 次/天」的容量前提得以保住。**

不修的后果（这不是「反正 404 会降级」那么轻）：
1. 免费容量被高估 1/3（实际只有 4 个活模型 ≈ 6000 次/天）；
2. **`MAX_PROBES = 5` 被两个死模型吃掉 2 格** —— medical 链冷启动时
   `3.6-flash → 3.5-flash → 2.5-flash(必404) → 3.5-flash-lite → 3.1-flash-lite`
   即耗尽预算，**永远走不到 OpenAI 层**。冷却记忆只能在同实例内自愈，而 Edge
   实例短命、冷启动频繁 → 新加的 OpenAI 层在相当比例的请求里根本不可达；
3. 每次冷启动多两次注定失败的往返，抬高出错率与延迟。

**为什么用 preview 而不用 `gemini-flash-latest` 这类别名**（两者实测也可用）：
别名背后的模型会**静默变化**，而本站的医疗安全探针是针对具体模型验证的 ——
模型换了而我们不知道 = 探针结论过期且无人察觉，医疗产品上不可接受；且别名是否
与目标模型共享同一配额 bucket 无法确认（若共享，加了等于没加，而「最大化白嫖」
正是本 PR 目标之一）。preview 被撤下的风险存在，但它们处在各池**第 3 顺位**
（前两个都失败才轮到），撤下的表现就是 404 → next-model，链本身能吸收。

**per-model 配额独立的直接实证**：同一时刻 `gemini-2.0-flash` 与
`gemini-2.0-flash-lite` 返回 `429 RESOURCE_EXHAUSTED`，而其余模型同时 200。
这比引用文档更硬。
- **启用 billing 会让该项目免费额度立即消失**（与其他 GCP 服务不同）
  → 免费与付费**必须是两个独立 GCP 项目 / 两把 key**。这是硬前提，写进部署清单
- 付费用 **Prepay 预付费**（owner 决策）：余额耗尽 API 直接返错 → 天然触发降级，零超支

---

## 2. 机制

### 2.1 四层凭据（key 存在性 = 唯一开关）

| 变量 | tier | provider | cred id | 缺失时 |
|---|---|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY`（现有） | `free` | google | `g-free` | 跳过该层（全缺则 503，同现状） |
| `OPENAI_API_KEY`（新，2026-07-29） | `free-oai` | openai | `oai` | 跳过 |
| `GOOGLE_PAID_API_KEY` | `paid` | google | `g-paid` | 跳过 |
| `DEEPSEEK_API_KEY` | `backup` | deepseek | `ds` | 跳过 |

#### OpenAI 免费额度的条件与前置

**数据共享条件**：OpenAI 的每日免费额度（Tier 1-2）以**开启数据共享**为条件 ——
prompts / outputs 可能被用于模型训练。**owner 已知情并主动开启**，与既有的
Google 免费层、DeepSeek 保底层**同等对待**（三者都是第三方处理用户输入；站点
本身的承诺是「服务器不存储对话」，不是「第三方不处理」）。这一条须与
`aboutPoints` 的隐私说明保持不矛盾。

**⚠️ 上线前置条件（P0，未完成不得配 `OPENAI_API_KEY`）：在 OpenAI project 级
配置 hard spend limit。**
帮助中心的描述是「超出免费额度后按正常费率计费」而非返回错误（该页对抓取器
403，未能逐字验证）。若属实，免费池用尽后请求会**静默转为付费**，没有任何错误
码能触发降级 —— 本文设计的「免费 → 付费 → 保底」链第一跳永远不会发生，账单
却在涨。hard spend limit 把「静默计费」转成可检测的 `429 insufficient_quota`，
正是降级链需要的信号。**没配 spend limit 就上线 = 无声漏钱。**
辅助观测：响应头 `x-ratelimit-remaining-requests` / `-tokens`（Tier 1 为
500 RPM / 500K TPM），端点在逼近上限时打 `AI:ratelimit-low`（纯数字）。

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

### 2.2 候选链：按 (grade, mode) 的显式顺序表

链仍是**扁平一维数组 + 顺序探测**（层内穷尽 → 才跨层，无需显式跨层逻辑），
但顺序**不再是「按 tier 遍历 CREDENTIALS」**：Google 免费层按**请求数**
（RPD/RPM）计量，OpenAI 免费层按 **token** 计量，两者的稀缺性不可通约。故改为
按 (grade, mode) 查一张显式顺序表 `CHAIN_PLANS`；缺失的 cred 整段跳过。

#### GPT-5.6 三档与免费池

| 模型 | 定价 $/1M in-out | 免费池 | 折算次数/天 |
|---|---|---|---|
| `gpt-5.6-sol` | 5 / 30 | 大池 250K tok/天 | ≈ **58**（稀缺） |
| `gpt-5.6-terra` | 2.50 / 15 | 小模型池 2.5M tok/天 | 二者合计 ≈ **580**（充裕） |
| `gpt-5.6-luna` | 1 / 6 | 小模型池 2.5M tok/天 | 同上 |

折算基准：单次请求 ≈ 4.3K token（system ~2.5K + 对话 ~1K + 输出 ~0.8K）。

三者的 context（1.05M）/ max output（128K）/ cutoff / vision / streaming /
Tier 1 RPM·TPM **完全一致**，差异只在价格与能力档。

> ⚠️ **池归属来源是 owner 账号侧观测，不是官方文档**（官方可抓取的部分未记载
> gpt-5.6 系列的池归属，帮助中心相关页面对抓取器 403）。不得当成公开保证；
> 官方调整后以降级链的 `429 insufficient_quota` 实际行为为准。

#### 三张顺序表

**思考模式（`mode:'think'`，用户主动开启）**
| # | tier | model |
|---|---|---|
| 1 | free-oai | `gpt-5.6-sol` |
| 2 | free | `gemini-3.6-flash`（thinkingLevel `high`） |
| 3 | free-oai | `gpt-5.6-terra` |
| 4 | paid | `gemini-3.6-flash` |
| 5 | backup | `deepseek-v4-flash` |

**医疗级（默认 `fast`，非寒暄）**
| # | tier | model |
|---|---|---|
| 1-3 | free | gemini-3.6-flash / 3.5-flash / **3-flash-preview** |
| 4-6 | free | gemini-3.5-flash-lite / 3.1-flash-lite / **3.1-flash-lite-preview** |
| 7-8 | free-oai | `gpt-5.6-terra` → `gpt-5.6-luna` |
| 9 | paid | gemini-3.6-flash |
| 10 | backup | deepseek-v4-flash |

**寒暄级**
| # | tier | model |
|---|---|---|
| 1-2 | free | gemini-3.5-flash-lite / gemini-3.1-flash-lite |
| 3 | free | gemini-3.5-flash |
| 4 | free-oai | `gpt-5.6-luna` |
| 5 | paid | gemini-3.5-flash-lite |
| 6 | backup | deepseek-v4-flash |

第 3 位（免费 flash）是刻意保留的保险：Google lite 双双限流时若直接落到
OpenAI，就会拿 token 池去付一句「你好」，而 9000 次/天的免费 flash 池还空着。
多挂一个免费候选几乎零成本。

#### 为什么是这个顺序

1. **sol 只服务思考模式。** 思考模式由用户主动开启、频次低（估 10-20%，即
   6-70 次/天），质量诉求最高 —— 正好吃满 58 次/天的稀缺大池，且**不会被日常
   问答挤占**。把最稀缺且最优质的资源配给最需要质量的场景。
2. **terra / luna 排在 paid 之前。** 2.5M 小模型池是 use-it-or-lose-it，每天
   不用即作废；放在付费层前面，能让 owner 每月 $10 的 credits 几乎永远动不到
   —— 「最大化白嫖」的直接兑现。
   ⚠️ 注意理由：主用 terra/luna **不是因为单价便宜**，而是它们在 2.5M 池、sol
   在 250K 池，**免费额度差 10 倍**，这比单价重要得多。
3. **日常问答仍以 Google 免费打头。** ~9000 次/天是最大的一份免费额度。
   Google 段内 4-6 位是**换池**：Flash 全系 RPM 撞墙时 Lite 池仍空闲，仍在
   免费层内。
4. 付费层只放 1 个：其失败几乎必然是余额耗尽，换模型救不了。寒暄的付费层用
   lite（同句成本差 ~4×）。backup 固定 SYSTEM_PROMPT 命中 DeepSeek 前缀缓存
   （$0.0028/1M），保底成本近 0。
5. 思考模式的 Google 段只取 `gemini-3.6-flash`：lite 在 `thinkingLevel:'high'`
   下既不省额度也给不出思考深度，放进来只会拖长首字节延迟。

#### 候选项的视觉能力标记（本 PR 只放元数据）

`Candidate` 带一个 `vision: boolean`，按 provider 判定：

| provider | vision | 依据 |
|---|---|---|
| google | `true` | Gemini 全系支持图片输入 |
| openai | `true` | gpt-5.6 sol/terra/luna 官方 features 列表含 `image_input` |
| deepseek | **`false`** | DeepSeek v4 不支持视觉 |

**为什么必须显式标记而非运行时试探**：带图请求若降级到 DeepSeek，会**静默返回
一个无视图片的泛泛回答**（用户问「看看我的化验单」，得到一段套话）—— 没有错误
码、没有异常，是最难被发现的一类故障。带图请求的候选链因此与纯文本**不是同
一条**，必须能按能力过滤。

> ⚠️ 本 PR **只放字段与注释，不实现任何图片路径**（不加图片解析、不改消息校验
> schema、不加图片额度）。过滤逻辑在 #136，见
> `docs/specs/ai-chat-image-input.md`。之所以现在就插字段：候选链是本 PR 的
> 核心数据结构，等它合入后再回来插字段，会与 #136 的行为改动混在一起，评审
> 难以分清哪部分是能力元数据、哪部分是新行为。

#### 非连续 cred 段的护栏

思考模式链里 `free-oai` 出现两次（sol 段与 terra 段被 Google 段隔开）。既有的
「next-cred → 跳过连续同 cred 段」只能跳掉相邻那一段；冷却 Map 通常会补上，但
`AI_COOLDOWN_DISABLED=1` 时不会。故请求内额外维护一个 `deadCreds: Set`，保证
**同一次请求绝不重试已判定失效的 key**。

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
| **openai** `error.code == insufficient_quota`（任何状态码，通常 429） | next-model | **model** / 15min | 见下方「为什么是 model 级」 |
| **openai** 同一 cred 的**全部**候选（且 ≥2 个）都以 `insufficient_quota` 失败 | — | **cred** / 15min | all-quota 收敛，见下 |
| **openai** 其余 429 | next-model | model / 60s | RPM/TPM 限流，是 per-model 维度 |
| **openai** 400 + 参数类报错 | next-model | model / 30min | 见下方说明 |
| 5xx 同 cred 首次 | next-model | model / 30s | Gemini overloaded 是 per-model 的 |
| 5xx 同 cred 第 2 次 | next-cred | cred / 2min | 升级为供应商级故障 |
| 408 / 网络 / Abort | next-model | 不记 | 瞬时，不冷却免得误封健康候选 |
| 其他 / 非 APICallError | **abort** | — | 未知错误不轮询（防 bug 变成对上游的重试风暴） |

**OpenAI 分支只在 `cred.provider === 'openai'` 时生效，Google 既有分支一行不动。**

- **429 必须按 `error.code` 分流**：`insufficient_quota`（官方 spend-limits 页
  逐字确认与 429 绑定）→ 见下；其余 → 限流处理。
  **不硬匹配 `rate_limit_exceeded`** —— 官方 error-codes 页只给了人类可读的
  "Rate limit reached for requests"，未把它列为机器可读 code。按「非
  `insufficient_quota` 即限流」来写。

- **`insufficient_quota` 为什么判 model 级（而不是 cred 级）**：sol 在 250K 大
  池、terra/luna 在 2.5M 小池，**两池独立**，一个池耗尽不代表另一个也耗尽。
  猜错的代价严重不对称：
  | 判定 | 实际是池级 | 实际是账户级 |
  |---|---|---|
  | cred 级 | ❌ 白丢整个 2.5M 免费池，流量落到付费层 —— **真金白银** | ✅ |
  | model 级 | ✅ | 多探 2 次 ≈300ms，且被 all-quota 收敛一轮自愈 |

- **all-quota 收敛**：单条 `insufficient_quota` 判 model 级；但若**某 cred 在本
  次请求里的全部候选**都以该 code 失败，那就不是「某个池空了」而是账户余额 /
  spend limit 到顶 —— 此时升级为 cred 级：加入请求内的 `deadCreds`，**并**写
  一条 15min 的 cred 冷却，使后续请求直接跳过整层。两种真实成因因此都被覆盖：
  池耗尽只跳该模型，账户耗尽在多个模型依次失败后整层退场。

  ⚠️ 升级条件额外要求 **该 cred 在本链中有 ≥2 个候选**。寒暄链里 OpenAI 只有
  `luna` 一个候选，它单条失败只能证明「luna 所在的池空了」，推不出账户级耗尽；
  没有这个护栏，一句问候撞上小池耗尽就会连坐冻结整层 15 分钟（含思考模式要用
  的 sol）—— 正是改判 model 级所要避免的那种连坐。
- **400 参数类报错判 next-model 而非 abort**：Google 的 400 一律 abort 是对的
  （坏请求换供应商救不了），但 OpenAI 侧的参数改名/移除是**模型级**不兼容，
  换下一个候选很可能就通了。这同时是「官方改字段名」这一已知风险的兜底 ——
  即便某个字段被改名，链只是少一个候选，不会整条断掉。
- `401 invalid_api_key` / `404 model_not_found` 已被既有的 `sc===401` /
  `sc===404` 分支覆盖，不需新增。

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

### 2.6b OpenAI 接入：同一个 SSE 引擎，独立的请求体

`openaiCompatStream()` 退化为纯 SSE 引擎（发请求 / 非 2xx 转 `APICallError` /
解析 `choices[0].delta.content`），**请求体由调用方整体传入**。DeepSeek 与
OpenAI 各有一个 `deepseekStream()` / `openaiStream()` 包一层 —— 每家供应商的
字段争议都集中在各自的一个 body 字面量里，改起来只动一处。

**端点走 `/v1/chat/completions`**（官方确认 gpt-5.6 全系仍支持）。官方虽推荐
Responses，但其 raw SSE wire 格式官方文档没有逐字示例，而本项目是**手写解析
器** —— 拿没文档的格式赌线上不划算。风险因此被控制在「参数改名」这一类，而
参数类 400 已有 next-model 兜底。

**禁止携带的字段**（带了是未知风险，去掉一定安全）：

| 字段 | 处置 | 理由 |
|---|---|---|
| `temperature` | **不带** | 官方对 gpt-5.6 是否接受**未记载**（三个 model 页无 supported-parameters 章节，reasoning guide 不提采样参数，5.6 迁移说明也没列为移除项）。推理模型历史上硬拒。想控制风格改用 `verbosity` |
| `top_p` / `presence_penalty` / `frequency_penalty` | **不带** | 同上 |
| `max_tokens` | **不带** | 官方已标 deprecated |

> DeepSeek 与 Google 路径仍固定 `temperature: 0.3`，本站的确定性基线不变。

**必带字段**：

- `max_completion_tokens` —— ⚠️ **把 reasoning tokens 算进上限**。这是接入后
  最常见的「AI 没反应」故障源：给 1024、模型花 900 在思考，用户只看到 124
  token 甚至空白，**症状与 2026-06 修的 `ensureSession` 空 id P0（#132）极难
  分辨**。故实现里强制地板值 `OAI_MIN_COMPLETION_TOKENS = 4096`，并显式压低
  `reasoning_effort`。
- `reasoning_effort` —— 取值集 `none | low | medium | high | xhigh | max`。
  ⚠️ **不要用 `minimal`**，那是 GPT-5 初代的值，5.6 支持列表里没有。
  | 场景 | effort | verbosity |
  |---|---|---|
  | 寒暄 | `low` | `low` |
  | 默认 fast | `low` | `medium` |
  | 思考模式 | `high` | `medium` |
  ⚠️ **寒暄档也是 `low`，不是 `none`** —— 刻意的安全裕度，勿"优化"回去。寒暄
  分级器是一条窄正则，它误判的方向是**把医疗问题当成寒暄**；那种请求若拿到零
  推理，在一个需要交叉核对剂量与禁忌的站点上是**安全问题**，不是性能问题。
  一句问候上 low 与 none 的成本/延迟差异可忽略。
  （Google 侧 `thinkingLevel:'minimal'` 保持不变 —— Gemini 最低档仍产出完整
  回答，行为变化没这么剧烈。）
- `verbosity` —— `low | medium | high`，**顶层字段**（`text.verbosity` 是
  Responses 的形态）。
- `stream_options: { include_usage: true }`。
- `prompt_cache_key` —— 见下。

**prompt caching（白拿）**：自动生效，门槛 ≥1024 token（SYSTEM_PROMPT 够），
cached input 便宜 90%（sol $5→$0.5）。5.6 起 **cache write 收 1.25×**，但同一
prompt 高频复用，净收益明显。`prompt_cache_key` 只放 SYSTEM_PROMPT 的版本标识
（`yakuten-sys-v1`），**绝不放用户内容**（缓存键会进 OpenAI 侧日志）。TTL 固定
30m，无需配置（旧的 `prompt_cache_retention` 已被 `prompt_cache_options.ttl`
替换）。

**计价悬崖**：input > 272K token 的请求，**整个请求**按 2× input / 1.5× output
计价。当前 `MAX_MESSAGES=20` / `MAX_CONTENT_BYTES=4096` / `slice(-10)` 使实际
input ≈ 10-20K token，离悬崖有两个数量级余量 —— **放宽这三个常量时必须重新
核算**。

**SSE 解析容错**：官方参考页**未把 `data: [DONE]` 记载为契约**（尽管实务上
存在）。故终止信号认三种，任一到达即结束：① `[DONE]` 哨兵 ② `finish_reason`
落定 ③ 流自然关闭。`include_usage` 的 usage 只在最后一个 chunk，且官方明确
警告「流中断则收不到」→ **解析器不依赖它**。

### 2.7 思考模式

客户端 body 新增可选 `mode: 'fast' | 'think'`（缺省 fast）。校验白名单需加该字段，
messages 校验其余部分不变。

| 场景 | Gemini 3.x | Gemini 2.5 | DeepSeek | OpenAI | maxTokens |
|---|---|---|---|---|---|
| 寒暄（自动降档） | `thinkingLevel:'minimal'` | `thinkingBudget:0` | `thinking:disabled` | `reasoning_effort:'low'` | 512 |
| 默认 fast | `'low'` | `0` | `disabled` | `'low'` | 2048 |
| 用户开启 think | `'high'` | `-1`（动态） | `enabled` | `'high'` | 4096 |

OpenAI 侧的「思考深度」主要由**选哪个模型**表达（sol / terra / luna，见
§2.2 的三张顺序表），`reasoning_effort` 只做同一模型内的微调；且 OpenAI 的
`max_completion_tokens` 有 4096 地板值（reasoning token 也吃这个预算，见
§2.6b）。

经 `providerOptions.google.thinkingConfig` 传（`@ai-sdk/google@3.0.59` 已内置该
类型，无需升级 SDK）。`thinkingLevel` 与 `thinkingBudget` **不可同时传** ——
按 model id 前缀分派。

**免费额度不受影响**：免费层限的是请求数（RPD/RPM）不是 token 数 → 思考模式
只增延迟不增额度消耗。这让「用户可选深度思考」在免费层几乎零成本。

### 2.8 两级滚动配额（服务端第二道）

> 本节取代原「日限额 30/IP/天 + UTC 日界」设计（owner 2026-07-29 两次修订：
> 先改滚动 24 小时，再改为 **5 小时窗口 + 每周额度**，即 Claude 模式）。

进程内 `Map<ip, {s:{start,used}, w:{start,used}}>`，与限流 Map 同款、同样
尽力而为（Edge 跨实例不共享，冷启动重置）。

| 级别 | 窗口 | 配额 |
|---|---|---|
| `session` | 滚动 5 小时 | `SESSION_LIMIT = 25` |
| `weekly` | 滚动 7 天 | `WEEKLY_LIMIT = 150` |

两级都是**滚动窗口**：从该窗口内第一次使用起算，窗口结束后整体恢复，下次使用
再开新窗口。**不用自然日/自然周对齐** —— 与 Claude 一致，免去时区/DST 处理，
且不会出现「差 10 分钟到午夜 ⇒ 可用量翻倍」的边界套利。

**任一级超限即拒绝，且两级都不累加**（被拒的请求不该扣额度）。响应：
`429` + `x-yk-quota: session|weekly`（`x-yk-daily: exceeded` 保留为既有契约）
+ `Retry-After`（已超限窗口中较近的一个）+ body
`{error, scope, resetInMinutes, sessionResetInMinutes, weeklyResetInMinutes}`。
客户端据 `scope` + `resetInMinutes` 渲染**本地化的动态恢复时间**，绝不复用
分钟级限流的倒计时 UI（否则会把数万秒当秒数显示）。

#### 配额数值的推导

依据 GA4 property `541902985` 近 28 天：日活 ~180-270（近日峰值 510）、28 天
独立用户 4831、回访率仅 15%（近 7 天 new 1619 / returning 287，绝大多数是
一次性访客）。AI 问答此前**无埋点**（本次补上，见 §3.1），只能估算：面板
打开率 3-8% × 发消息转化 ~50% × 平均 3-6 轮 ≈ **60-360 请求/天**，而免费侧
容量 ≈ 9000/天。

→ **限额的目的不是分配稀缺资源，而是防单 IP 刷爆**（现有 5 req/min 允许单 IP
理论 7200/天）。故给真实用户留足余量、只掐异常量：

- **25**：真实深度会话（贴血检数值 + 追问 + 换个说法再问）上限约 15-20 轮，
  25 留 ~25% 余量，正常用户碰不到。
- **150** = 6 个满额 5h 窗口/周。单 IP 最坏持续 ~21 次/天；即使 50 个恶意 IP
  也仅 1050/天，占 9000 免费容量的 12%。

善意用户的主防线仍在客户端计数器（纯本地 `localStorage['yk-ai-usage']`，同结构
两级窗口，带百分比进度条 + 动态恢复时间）；服务端这道只挡简单滥用。客户端读到
旧格式（`{day,used}` 或 `{windowStart,used}`）一律当作「尚未开窗」重新开始 ——
对用户只会更宽松，且不必为一次性迁移引入日期换算。

---

## 3. 可观测性

| 头 | 值 | 说明 |
|---|---|---|
| `x-yk-model` | `gemini-3.6-flash` \| `gpt-5.6-terra` … | **格式不变** —— 它是用户可见 UI（`AIAssistant.tsx` 渲染成 poweredBy 文案） |
| `x-yk-route` | `free/google` \| `free-oai/openai` \| `paid/google` \| `backup/deepseek` | 新增 |
| `x-yk-probes` | `1` … `10` | 新增，本次实际探测次数 |
| `x-yk-quota` | `session` \| `weekly` | 仅 429 配额拒绝时，见 §2.8 |

都是闭集常量拼的 ASCII，不含任何 key 材料（cred id 是符号标签如 `g-paid` /
`oai`，既非 env 名也非 key 值）。失败路径（503 JSON）不加这些头，失败契约不变。

**服务端成功路径日志** `logServed()`（与 `logProbeFailure()` 同级的字段白名单，
**不接触 error 对象，也不接触任何消息内容**）：

```
AI:served route=free/google model=gemini-3.6-flash probes=1 mode=fast ms=1832 msgs=3
```

`msgs` 只记条数不记内容；`ms` 是「进入降级链 → 首 chunk 落袋」的耗时。这行让
Vercel 日志直接回答「各层占比 / 平均探测几次 / p95 延迟」，也是 §6 回滚触发
条件（`backup` 占比异常升高）的观测面。

另有 `AI:ratelimit-low <label> req=<n> tok=<n>`：读 OpenAI 响应头
`x-ratelimit-remaining-*`，仅在逼近上限时打一行，**纯数字**。

### 3.1 客户端用量埋点（GA4）

owner 要求「追踪 AI 助手使用情况用于数据分析」。**硬约束**（CONSTITUTION §6 /
CLAUDE.md「第三方分析只限聚合指标」）：绝不向任何 analytics 端点发送健康数据、
用户输入、AI 对话内容、血检记录。故埋点只能是**纯计数 + 固定枚举值，一个自由
文本字段都不能有**。

| 事件 | 参数 | 触发 |
|---|---|---|
| `ai_chat_open` | `{}` | 面板挂载（用户进入对话界面） |
| `ai_chat_send` | `{ mode: 'fast'\|'think' }` | 用户主动发起一次生成 |
| `ai_chat_reply` | `{ ok: boolean, ms: number }` | 回复完成 / 最终失败；`ms` 取整到 100ms |
| `ai_chat_error` | `{ code: '429'\|'503'\|'timeout'\|'network' }` | 各失败分支 |
| `ai_chat_limit` | `{ window: 'session'\|'weekly' }` | 本机计数恰好用满某一级（`===` 判定 ⇒ 每窗口至多一次），或服务端 429 配额拒绝 |

实现红线（代码处已写死注释）：

- 参数值**必须是源码里写死的字面量或数字**，绝不接受任何来自用户输入或模型
  输出的字符串。
- **不发 `x-yk-route` / `x-yk-model`** —— 那是排障信息，与用户身份关联后可推断
  行为，只走服务端日志。
- 复用 `Head.astro` 已装载的 gtag 通路（同一 `dataLayer`、同一 `ga-disable-`
  开关），不新起 gtag 脚本或 config；`yakuten-dev` opt-out 再显式挡一道。
- ⚠️ 站内目前**没有共享的 GA 封装模块**（`Head.astro` 里是 inline gtag），故
  helper 就地实现在 `AIAssistant.tsx`；日后抽出公共封装时应替换为调用它。

---

## 4. 隐私红线（实施时最易违反的一条）

**`APICallError.requestBodyValues` 携带完整 prompt**（SYSTEM_PROMPT + 全部用户
消息）。任何 `console.error(err)` / `JSON.stringify(err)` / `err.stack` / 记录
`responseBody` 全文，都会把用户的 HRT 用药描述写进 Vercel 日志 —— 对一个明确
承诺「对话零存储」的跨性别医疗站，这是最严重的一类事故。

强制约定：
- **唯一允许接触 error 对象的函数** `logProbeFailure()`，白名单字段：候选 key /
  分类码 / 判决 / 冷却时长 / **经 `scrubForLog()` 处理后的** `err.message`
- `parseGoogleQuota()` 只返回枚举值与数字，不回传原串
- 手写 DeepSeek / OpenAI 客户端的 `requestBodyValues: {}` 刻意留空
- 文件头写死这条 review checklist
- 上线后用 Vercel 日志 grep「HRT药典」「WPATH」确认零命中

### 4.1 `scrubForLog()` —— err.message 的非 ASCII 闸门（2026-07-29 主控复核后追加）

**残余风险**：即便只取 `err.message`（不碰 error 对象、不碰 responseBody），供应商
仍可能在错误文案里**回显触发错误的输入片段** —— 内容策略拒绝类错误尤其可能。
对本站而言那就是用户的 HRT 用药对话。原约定的 `.slice(0,200)` 只限制长度，不限制内容。

**缓解**：记录前**只保留可打印 ASCII**（`/[^\x20-\x7E]/g` → `.`）。

**为什么是白名单而不是「剥掉 CJK」**：本站有 17 个语种。黑名单式地列举中日韩，
会漏掉俄语 / 阿拉伯语 / 泰语 / 印地语 / 越南语用户的输入 —— 而那些用户同样在
描述自己的用药情况。白名单一次覆盖全部非拉丁文字。

实测（`scrubForLog` 单元验证）：

| 输入 | 输出 |
|---|---|
| `Quota exceeded for quota metric 'Generate requests' and limit 'GenerateRequestsPerDayPerProjectPerModel-FreeTier'` | **逐字不变** |
| `API key not valid. Please pass a valid API key.` | **逐字不变** |
| `insufficient_quota: You exceeded your current quota` | **逐字不变** |
| 假想回显（zh）`…: 我今天吃了 4mg 补佳乐，血检 E2 只有 90` | `…: ..... 4mg ...... E2 .. 90` |
| 假想回显（ru）`…: Я принимаю эстрадиол 4мг` | `…: . ........ ......... 4..` |
| 假想回显（ar / th） | 全部剥离 |

→ **零排障损失**：三家供应商的错误文案、配额度量名、模型 id 全是 ASCII。

**诚实的局限：这道闸门不完整。** 数字与拉丁字母会幸存（见上表 zh 行的 `4mg`
与 `E2 .. 90`），西语 / 法语 / 德语等拉丁语系用户的输入也会大部分幸存。
而剥离拉丁字母等于剥离全部排障信息，不可行。
**真正的兜底仍是 §5 的日志 grep 验收项** —— 闸门只是把最大的一块在源头掐掉。

同一函数也用在顶层 catch 的 `console.error('AI Chat error:', …)` 上。

---

## 4.2 配额常量的双副本与其门禁

两级滚动配额的四个常量在**两个文件里各存一份**（`api/ai-chat.ts` 的
`SESSION_LIMIT` / `WEEKLY_LIMIT` / `*_WINDOW_MS`，与 `AIAssistant.tsx` 的
`SESSION_QUOTA` / `WEEKLY_QUOTA` / `*_WINDOW_MS`）。

**副本是刻意的**：不能靠 import 消除 —— `api/` 无法本地构建或测试（§5），
给它引入跨目录模块解析的未知量，任何解析失败都会直接变成线上事故。

**但「靠注释保持同步」在本仓库已被证伪过两次**（`ENABLE_*` 第二真值源、
`business-paths.txt` 漏 `api/`）。漂移的后果是**静默错误**而非崩溃：用户看到的
百分比与服务端实际拦截点不符 —— 进度条显示 60% 却已被 429 拒绝，或显示 100%
却还能继续发。两者都会被当成 bug 报，且很难定位。

→ **`scripts/verify-quota-parity.mjs`**，已挂在 `npm run check` 与 `npm run build`
上（**漂移即阻断部署**）。脚本只对「纯算术表达式」求值，拒绝其他一切内容，
避免门禁本身变成任意代码执行面。

改动配额时的完整清单：两处常量同改 → 跑 `npm run verify:quota-parity` →
更新 §2.8 的数值推导。

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

**已知缺口：探针无法逐模型定向验证。** 探针打的是端点，**由降级链决定实际服务
的模型** → 一次基线只对当时实际被选中的那一两个模型有效，链路变更（换模型、
调顺序、加新层）后基线不自动继承。2026-07-29 用 preview 模型替换 2.5 系后即属
此情形。要做到逐模型门控，需要给端点加一个**仅测试用的模型指定入口** —— 那本
身是新的攻击面（外部可指定模型 = 可绕过分级与配额设计），是另一个安全权衡，
**本轮不做**。当前的实际保障是：SYSTEM_PROMPT 对所有模型同一份，P0 断言是
机器可判定的正则，且链首模型（`gemini-3.6-flash`）覆盖绝大多数真实流量。

---

## 6. 上线与回滚

**分两次部署**：先上代码但不配 `DEEPSEEK_API_KEY` → 确认零回归 → 再配 key
激活保底层。两个动作可独立回滚。OpenAI 层同理（先不配 `OPENAI_API_KEY`）。

**部署清单（每次上线逐条过）**

- [ ] **配 OpenAI project 级 hard spend limit** —— P0 前置，未配不得配置
      `OPENAI_API_KEY`。理由见 §2.1（免费池耗尽可能静默转付费，降级链收不到
      任何信号）。
- [ ] OpenAI 层过 P0 探针组（`npm run verify:ai-safety`）。门控是 **per-provider**
      的，新供应商不因既有层已通过而豁免 —— 见 `scripts/ai-safety-probes.json`。
- [ ] **改动 `SYSTEM_PROMPT` 时，同步升 `OAI_PROMPT_CACHE_KEY` 的版本号**
      （`yakuten-sys-v1` → `-v2`）。不升会让新 prompt 去撞旧前缀的缓存分片，
      命中率下降且难以察觉。该 key 只放版本标识，**绝不掺用户/请求特征**
      （cache key 会落进 OpenAI 侧日志）。
- [ ] 客户端 `SESSION_QUOTA`/`WEEKLY_QUOTA` 与服务端 `SESSION_LIMIT`/
      `WEEKLY_LIMIT` 数值一致（§2.8）。

| 级别 | 动作 | RTO |
|---|---|---|
| L0 | Vercel 删 `DEEPSEEK_API_KEY` → Redeploy | ~1min，owner 可独立操作，不碰代码 |
| L0* | Vercel 删 `OPENAI_API_KEY` → Redeploy | ~1min，退回改造前的三层链 |
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
