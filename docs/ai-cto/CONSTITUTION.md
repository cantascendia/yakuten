# CONSTITUTION — HRT药典 (yakuten)

- **版本**: v1.0
- **生效日期**: 2026-05-26
- **批准人**: CTO (cantascendia) + AI Tech Lead (Claude Opus 4.7)
- **修订协议**: 见末段「修订协议」

> 本文件是项目最高级别的不可妥协约束（"宪法"），高于 README / SPEC / handbook 任意章节。
> 任何 commit / PR / agent 决策与本宪法冲突的，必须先走「修订协议」修改本文件，否则视为违规。
> 本文件本身受 `.claude/hooks/immutable-guard.sh` 守护 — 未带 `CTO_CONSTITUTION_AMEND=1` + 双签的修改将被 PreToolUse hook 硬阻止。

---

## Preamble — 项目愿景

**HRT药典 (hrtyaku.com)** 是面向中文圈跨性别女性的 HRT 安全底线信息站，基于国际临床指南（WPATH SOC 8 / Endocrine Society 2017 / UCSF）和同行评审文献，为已在用药或即将用药者提供安全参考。

**本站不是**：百科全书、论坛、购药渠道、个人化处方建议。
**本站是**：临床路径式安全底线，每条建议附 DOI + 证据等级，紧急情况识别与引导就医。

因为本站读者会基于内容做实际用药决策，**本站的每一行代码、每一行内容都可能影响读者的身体健康**。这是本宪法存在的根本理由 — 我们对读者负有真实的安全义务，不能 vibe coding。

---

## Article I — 不可妥协的核心原则（Core Principles）

按优先级降序，前者高于后者。

### §1. 用户生命安全 > 一切

- 任何代码 / 内容 / 设计决策若可能造成用户身体伤害（剂量计算错误、危险药物组合提示不显、紧急横幅被淡化、医疗免责声明被弱化），**直接否决**，无 PR 妥协空间。
- 紧急横幅（emergency banner）**不可关闭**，背景红、文字白，永远高于内容层。
- 剂量数据修改必须 cross-validate ≥ 2 独立指南来源（WPATH SOC 8 + Endocrine Society 2017 + UCSF），不可单源引用。
- 血检算法 / 注射计算器修改必须 spec-driven + 双 reviewer 签字（见 §4）。

### §2. 基于实际代码，不编造（铁律 #2）

- 任何 STATUS / AUDIT / 文档中的数字（hook 数量、页面数量、文献条数、skill 数量）必须用 `wc -l` / `find | wc -l` / `jq length` 等命令实测后写入。
- 禁止「凭印象」「大概」「应该是」等模糊描述。
- 发现 hallucination（如 "9 个守护脚本" 实为 8 个）必须立即在同 PR 校正，并在 STATUS.md changelog 留痕。
- AI agent 引用任何文件路径前，必须 Read 验证存在；引用任何函数 / 类前，必须 Grep 验证签名。

### §3. i18n 完整性 — 医疗警告必须用户语言

- **医疗警告 / 紧急横幅 / 剂量提示 / 副作用列表**：四语（zh/en/ja/ko）必须同步上线，不允许「中文先发，其他语言后补」的医疗安全信息。
- 非医疗内容（博客、对比页、编辑治理）可以阶段性 zh-only，但必须在 STATUS.md「已知 i18n 缺口」中显式记录。
- 任何医疗 UI 文本变更必须同时更新四个 locale，提交前用 `npm run astro check` + i18n-enforcement skill 验证。
- 例外：标记为「博客 (blog)」「学术深度内容」的内容可以仅中文（本宪法允许、user MEMORY 已确认）。

### §4. Forbidden 路径必须 spec-driven（铁律 #13）

下列路径下的任何修改必须先有 spec 文档（`docs/specs/<feature>.md`），且需 ≥ 2 独立 reviewer 签字（人 + Codex/Antigravity 跨模型审）：

- `api/`（Edge functions，含 API key 加载 / Edge 限流 / 用户输入处理）
- `auth/` / `payment/` / `billing/` / `secrets/` / `keys/`（当前未存在但作为预防）
- `crypto/` / `migration*/` / `infra/` / `terraform/` / `ansible/`
- `.github/workflows/`（CI 是供应链入口）
- SSOT：`scripts/forbidden-paths.txt`（**只可加，不可删**条目）

紧急 opt-out（仅生产事故 + 同 PR 立 spec 补记）：`export CTO_DOUBLE_SIGNED=1`。

### §5. Test-Lock 不可绕过（铁律 #14）

- AI agent **只能改实现，不能改测试断言**来让测试通过。
- 改测试断言只允许以下场景，且必须在 commit message 显式标注「TEST-LOCK-EXEMPT: <reason>」：
  - 业务需求确认变更（产品决策有 issue/PR 记录）
  - 测试本身有 bug（误报，需 reviewer 同意）
  - 新增测试（不算改断言）
- `.claude/hooks/test-lock-guard.sh` 在 PreToolUse 注入软提醒；commit-msg hook 在 git 层做硬阻止（如已配置）。
- pre-commit 绕过（`--no-verify` / `core.hooksPath=` / `HUSKY=0` / stash 绕过）由 `bypass-guard.sh` 硬阻止，仅 `CTO_BYPASS_ALLOWED=1` 解锁。

### §6. 隐私 — 用户健康数据零服务器存储

- 血检自查工具 classic mode：**纯前端 JS，零存储，零传输**。
- 血检自查工具 sakura mode (v3.2 血检手账)：**仅 localStorage 在用户设备上**，永不上传。
- AI 问答：**不存储对话**（Vercel Edge function，stateless）。
- 任何引入「上传 / sync / account / 第三方追踪」的修改必须更新 SPEC + 走 §4 spec-driven。
- 分析仅限聚合 PV/事件：Vercel Analytics / Speed Insights + Google Analytics 4（`PUBLIC_GA_ID` 控制，均含 `yakuten-dev` opt-out）。**绝不**向分析端点上报健康数据 / 用户输入 / AI 对话 / 血检记录；无 FB/TikTok 等广告社媒像素。GA gtag 在大陆被墙，大陆以 Bing 站长 + Vercel 为准。
  - 备案：2026-06 owner 批准接入 GA4（仅聚合），已同步更新 SPEC §3 技术栈表 / §10.2 安全要求 + CLAUDE.md + ARCHITECTURE.md，满足上一条「更新 SPEC + spec-driven」门槛。

### §7. 引证完整 — 无引用即无医疗内容

- 每条医疗 statement（剂量 / 风险 / 适应证 / 相互作用）必须有 `<CitationRef>` + DOI。
- 证据等级标注：A (RCT/Meta) / B (single RCT/cohort) / C (case/expert) / X (no evidence)。
- 禁用绝对语言：「一定」→「建议」，「必须」→「通常」。
- 禁止商业推广链接 / 购药渠道 / 个人化处方建议（"you should take Xmg"）。

---

## Article II — 不可改的红线指针（Immutable Anchors）

下列文件 / 章节是宪法的具体落地，受 `.claude/hooks/immutable-guard.sh` 硬阻止保护：

| 锚点 | 路径 | 守护方式 |
|---|---|---|
| 14 铁律段 | `CLAUDE.md` 「## 铁律」段（line 17-32 附近） | immutable-guard 检测段落删改 |
| Handbook §32 Vibe Coding 红线 | `playbook/handbook.md` §32 | immutable-guard 检测段落删改 |
| Handbook §33 Forbidden 路径策略 | `playbook/handbook.md` §33 | immutable-guard 检测段落删改 |
| Handbook §34 Harness 八条原则 | `playbook/handbook.md` §34 | immutable-guard 检测段落删改 |
| Handbook §35 Eval-Driven Development | `playbook/handbook.md` §35 | immutable-guard 检测段落删改 |
| Forbidden SSOT | `scripts/forbidden-paths.txt` | **只可加条目，不可删** — `CTO_FORBIDDEN_REMOVE=1` 解锁 |
| Hook 主防御调用 | `.claude/hooks/*.sh` 中 `block_with_reason` / `exit 2` 调用 | 删除/绕过被 immutable-guard 阻止 |
| **本宪法** | `docs/ai-cto/CONSTITUTION.md` | **本文件本身** — 仅 `CTO_CONSTITUTION_AMEND=1` + 双签解锁 |

红线设计原则：**默认拒绝，显式 opt-out + 留痕**。任何 opt-out 变量的使用必须在 PR description 中给出业务理由 + 事后立 spec / 补 review。

---

## Article III — 修订协议（Amendment Protocol）

本宪法的任何修改（含本节）必须满足以下全部条件：

1. **环境变量解锁**：commit 时设置 `CTO_CONSTITUTION_AMEND=1`（解锁 immutable-guard）。
2. **双签**：≥ 2 个独立 reviewer 在 PR 上明确签字（CTO + 至少 1 个独立 AI 模型审：Codex GPT-5.5 / Antigravity Gemini 3 / 等）。
3. **版本号 bump**：本文件顶部 version + 生效日期同步更新（v1.0 → v1.1 / v2.0）。
4. **EVOLUTION-LOG 留痕**：在 `docs/ai-cto/EVOLUTION-LOG.md` 添加条目（变更摘要 / 理由 / 双签人 / 日期 / 关联 PR URL）。
5. **handbook 引用同步**：若修订涉及 §1-§7 原则，必须同步检查 `playbook/handbook.md` §32-§37 引用是否需要更新。
6. **冷却期**：连续两次修订间隔 ≥ 7 天（除非 P0 安全事故 — 此时需 CTO 在 PR 中标注「P0-EMERGENCY」）。

**违规后果**：
- 强制 revert 该 PR。
- 在 `docs/ai-cto/AUDIT-violations.md` 记录违规人 / agent / 日期 / 修复 commit。
- 累计 3 次违规 → 重新评估该 agent 的 forbidden-path 操作权限。

---

## Article IV — 与现有规范的关系

| 文件 | 关系 |
|---|---|
| `CLAUDE.md` 14 铁律 | 本宪法 §1-§7 是 14 铁律的「为什么」层；14 铁律是「怎么做」层。冲突时以本宪法为准。 |
| `playbook/handbook.md` | 操作手册，本宪法 §1-§7 是手册之上的「不可移除约束」。手册可被 ai-playbook 仓库更新而本宪法不会自动跟随 — 修订需走 §III 协议。 |
| `docs/ai-cto/PRODUCT-VISION.md` | 产品愿景细节版（用户群 / 差异化 / 完成度），本宪法 Preamble 是其凝练版。 |
| `docs/ai-cto/STATUS.md` | 时点状态快照，受本宪法 §2「不编造」约束 — 任何数字必须实测。 |
| `docs/ai-cto/DECISIONS.md` | 历史架构决策，本宪法生效后的决策不得违反 §1-§7。 |
| `SPEC.md` / `CONTENT.md` | 功能 / 内容规范，本宪法是其约束上限。 |

---

## Article V — 紧急 opt-out 总表

| 场景 | 环境变量 | 守护 hook | 留痕要求 |
|---|---|---|---|
| 改 CLAUDE.md 14 铁律 / handbook §32-§35 / 本宪法 | `CTO_CONSTITUTION_AMEND=1` | `immutable-guard.sh` | EVOLUTION-LOG + 双签 |
| 删 forbidden-paths.txt 条目 | `CTO_FORBIDDEN_REMOVE=1` | `immutable-guard.sh` | 需 CTO PR 决议 |
| 编辑 forbidden 路径文件（spec-driven 已做） | `CTO_DOUBLE_SIGNED=1` | `forbidden-guard.sh` | spec doc + 双签 |
| pre-commit 绕过（仅紧急修复） | `CTO_BYPASS_ALLOWED=1` | `bypass-guard.sh` | 需事后立 spec |
| 在 main/master 上直 Edit（CI 修复等） | `CTO_MAIN_EDIT_ALLOWED=1` | `branch-guard.sh` | 需 PR 内说明 |
| trajectory-logger 完整记录模式（含 input/output） | `CTO_TRAJECTORY_FULL=1` | n/a | 仅本地审计用，禁止入仓 log |

所有 opt-out 变量的使用都会被 trajectory-logger 记录到 `.claude/agent-logs/<date>.jsonl`，月度 retrospective 审查。

---

## Article VI — 生效与版本

- **v1.0** — 2026-05-26
  - 初版宪法落地，含 §I-§V。
  - 触发原因：多 agent 审计发现 immutable-guard 引用了不存在的 CONSTITUTION.md（守了个空 0 字节防御），违反铁律 #2，是 P0 红线。
  - 关联审计：`docs/ai-cto/AUDIT-2026-05-26-harness.md`、`docs/ai-cto/SELF-AUDIT-2026-05-26.md`。
  - 双签：CTO (cantascendia, GitHub @cantascendia) + AI Tech Lead (Claude Opus 4.7 [1M context], session S3 飞轮基建 sub-agent)。
  - 关联 PR: fix/p0-foundation-constitution-flywheel。

---

**本宪法以中文为权威版本。**
**修订记录见 `docs/ai-cto/EVOLUTION-LOG.md`（待创建于后续 PR）。**
