
---
sha: c73dff1
date: 2026-05-29
reviewer: Claude-fallback (§48 codex-bridge Codex不可用→Claude fallback)
mode: claude-fallback
target: chore/agent-review-team — 跨领域评审 agent team 固化 (9 agents + command + eval)
bytes: 33800

## 结论：APPROVE-WITH-NOTES

### 🔴 BLOCK: 无

### 🟠 WARN（已在本 commit 定点修复）:
1. eval trigger 未覆盖 yaml 文件自身 → **已修复**（on_edit 新增 eval yaml 路径）
2. 缺「博客 zh-only 不算 i18n 缺陷」可机测断言 → **已修复**（新增 blog-zh-only-not-i18n-defect assertion）
3. boundary-security 工作流将 src/i18n/ 与 api/ 并列 diff（逻辑错位） → **已修复**（分离为各域职责）

### ✅ PASS:
- 架构一致性（9 agent frontmatter 与 pattern-detector 范式一致）
- 安全合规（所有 agent 严格 read-only，Constitution §1-§7 内化）
- 红线守护（无绕过 hook 表述）
- 医疗内容三档原则与 B 档急症清单（术前停E2/PRL>50判断）准确
- DX 自含性（每 agent prompt 自含，不依赖外部上下文）
- 功能覆盖（覆盖所有核心质量维度，性能/字体加载为 LATER）
- 成本分级设计（默认6人核心，条件3人，纯配置可不起团）

## 2026-06-01 — Codex cross-model review: PR #16 fix/imm-round1-safety

**Reviewer**: codex-gpt5.5 | **Mode**: manual-cross-review | **PR**: #16

### Overall Verdict
**APPROVE with one safety fix** — The patch mostly improves safety and data consistency. One user-safety concern found in the new 7 mg injection dose table rendering.

### 八維評審

1. **アーキテクチャ** ✅ — CitationRef 回退 fallback、SSOT 統合は正しい方向。DrugComparator の完全 SSOT 化は今後の課題として認識済み。
2. **コード品質** ✅ — DoseInfo インターフェース更新、JSON マッピング、型安全性改善。
3. **パフォーマンス** ✅ — 軽微改善（JSON import は tree-shaking で問題なし）。
4. **セキュリティ/プライバシー** ✅ — origin whitelist 修正（hrtyaku.com）、血検データゼロサーバー送信保持確認済み。
5. **テスト検証可能性** ✅ — build+astro check+citation-refs ゲート全通過。SSR 検証実施済み。
6. **開発者体験** ✅ — SSOT コメント追加、引用著者正規化で保守性向上。
7. **機能正確性（医学的安全）** ⚠️ — P2 issue（下記）。医学内容は EMA 原文照合済み、双域複核通過。
8. **UX/ユーザー安全** ✅ — 急救硬指令追加、K⁺ 語気修正、breast-development 去恐慌。

### MUST-FIX
なし

### SHOULD-FIX (P2)
- **[P2] InjectionCalculator.tsx:640 — 7 mg 行の警告色が caution（黄）になっている**
  `injection-doses.json` 側では「不建议：VTE风险显著増加」と危険分類だが、参照テーブルの行ではcautionカラーを使っている。7 mg 以上は danger（赤）を使うべき。
  修正: `row.mg >= 7 ? 'var(--color-danger)' : 'var(--color-caution)'`

### LATER
なし（DrugComparator 完全SSOT化は既知LT項目）

---

## 2026-06-02 — Codex cross-model review: fix/st-batch-parallel

**Reviewer**: codex-gpt5.5 | **Mode**: manual-cross-review | 八维 + 安全

### 发现（4）→ 全部已修
- **[P1] 可视 FAQ = 未引用医疗内容**：使 frontmatter faqs 可见后，含剂量阈值的 FAQ 成为
  需逐条挂引用的正文，但 frontmatter 串无法承载 CitationRef → 违反"无引用不上线"。
  **裁决**：FAQ rich results 自 2023-08 仅限权威机构站，可见性收益已极有限；故**回退**为
  JSON-LD-only（保留 AEO 结构化数据，仓库既有安全模式）。built HTML 实测：可视 faq-section=0、
  FAQPage 节点=1。
- **[P2] FaqSchema 纯文本渲染** `**谷值**`/`&lt;50` 会原样显示 → 随 P1 回退而 moot。
- **[P2] CPA 停药肾上腺声明缺引用**：重新挂回 hembree-2017（与本页 line49 同主题引用一致），
  保留"理论/证据有限"措辞。
- **[P3] bujiale 漏迁移的"舌下含多久"FAQ**：已补回 frontmatter。

### 验证
build ✓ · astro check 0 error · check-citation-refs ✓(1538) · validate-content ✓ · built HTML 实测。
未削弱任何急救/安全警告。

## 2026-07-22T17:24:07+09:00 — Cross-Model Review for PR #126 (feat/v2-sakura-journal-rebuild)
**Reviewer**: codex-gpt5.6-sol | **Mode**: manual /cto-cross-review | **Base sha**: d805813

> 触发者：Claude Fable 5。审 origin/master..HEAD 的医学屏（血检/注射/doc/风险）+ 门控。
> 结论：🔴 阻断，找出 4 个 P1 + 若干 ⚠️，均已在后续 commit 修复。codex 表示修复后可作为第二签字人。

```markdown
# PR #126 医学屏独立复核

> 行号按所给内联源码估算。

## 1. 血检 — `BloodCheckerScreen.tsx`

✅ **SSOT 已实际复用**（约 L40–45、L65–73、L205–220）

- 直接导入 `BLOOD_RANGES / evaluate / barBounds / RED_WARNINGS`，没有复制阈值。
- 因此 E2 的 `redBelow: 20` 会进入红区判定。
- 空字符串恢复为 `undefined`，没有再被转换成 0（约 L245–253）。
- `NaN` 不参与汇总判读。

✅ **通用“停药”已移除**（约 L80–103、L148–170）

- 总判读改成“请就医评估”。
- 具体行动按指标读取 `RED_WARNINGS`，方向正确，避免低 E2、贫血等被统一要求停药。

⚠️ **上下文横幅解决了治疗前误判，但仍不完整**（约 L120–136）

它明确说明“用药前 T 判读标准不同”，足以降低题述 `T=500` 的直接误判；但仅写“正在接受 HRT”还不够：

- HRT 起始/滴定期也可能出现尚未压低的 T 或仍较低的 E2。
- 不同治疗目标、非二元目标和采血时点也会改变解释。
- 建议明确限定为“用于已进入稳定方案、按谷值采血的女性化 HRT 目标对照”。

⚠️ **缺少有限值和生理有效性校验**（约 L65、L245–253）

- `Infinity` 会通过 `!Number.isNaN()`。
- 负数也会被当成真实检验值判读。
- 应使用 `Number.isFinite(v)`，并对负数显示“输入无效”，而不是生成医学判读。

结论：核心修复到位，但输入校验和适用阶段仍建议补强。

## 2. 注射 — `InjectToolScreen.tsx`

✅ **曲线本身已去除绝对浓度声称**（约 L178–212）

- 无 pg/mL 数字纵轴。
- 无 100–200 目标带。
- 无 300 风险线。
- ARIA 和正文均明确“相对高度，非绝对浓度”。

页面其他区域仍显示预期谷值及有来源的红线浓度，但不属于曲线纵轴冒充绝对 PK。

🔴 **`shape()/rel()` 归一化错误，曲线被截平失真**（约 L35–46、L66–69）

`shape()` 的 Bateman 差值形状本身没问题；缺少的常数因子在相对归一化后会抵消。单针达峰时间也确实约为：

`ln(KA/KE) / (KA−KE) ≈ 2.37 天`

问题在于：

```ts
const peak = shape(2.4);
const rel = (t) => shape(t) / peak;
```

`shape(2.4)` 是首针峰值，但 `shape(t)` 包含每 7 天重复注射的累积。第二针以后峰值会超过首针峰值；随后 `yOf()` 又把所有 `r > 1` 截为 1，导致多段峰顶被压平，错误展示波动形状。

这是图形核心医学含义错误，属于阻断项。应先计算整个展示周期内的实际最大 `shape(t)` 后归一化，或使用稳态周期形状。

⚠️ **第三条“5 mg/周安全上限”未与所给 `injection.mdx` SSOT 对齐**（约 L226–238）

- ≥10 mg → Rothman：与 SSOT 一致。
- 间隔 <5 天且单次 >5 mg → Kanin：一致。
- “Rothman 建议安全上限为 5 mg/周”：所给 `injection.mdx` 红线段并没有这条声明。

若 Rothman 原文支持，应先把该表述写入并审定 SSOT，再复用；且“安全上限”容易被理解成 ≤5 mg 一定安全，建议改成更保守的“通常不建议起始或常规使用超过 5 mg/周”。

## 3. 文档引用 — `DocScreen.tsx`

✅ **现有 `CitationRef n=X` 与列表编号、DOI 对应正确**（约 L130–225）

- `n=1` → Oriowo，DOI 正确。
- `n=2` → Misakian，DOI 正确。
- `n=3` → Rothman，DOI 正确。
- `n=4` → Herndon，DOI 正确。
- `n=5` → Kanin，DOI 正确。

🔴 **仍有未引用或引用范围不清的医学声明**（约 L128–137）

“注射给药绕过肝脏首过效应，VTE 风险低于口服途径”后没有独立引用；紧随其后的 `n=2` 明显用于“82.6% 单药治疗”，不能同时可靠覆盖前一句。

🔴 **剂量表仍是未经正文 CitationRef 支撑的具体剂量方案**（约 L48–53、L155–181）

表中包含：

- 按月份分阶段的 1–2、2–3、3–5 mg；
- “绝对上限 5 mg/周”；
- Hopkins 2024、ES 2017 等来源文字，但未进入参考列表，也没有 `CitationRef`。

这是具体医学剂量内容，按项目规则“无引用=不写入”，属于阻断项。“绝对上限”措辞也过强。

⚠️ `SC 操作更安全`（约 L188–193）是宽泛比较结论。Herndon 可支持 SC/IM 效果比较，但“更安全”需说明具体结局，不能从“更方便”直接外推总体安全性。

## 4. 风险问卷 — `RiskScreenerScreen.tsx`

✅ **`advice` 中已无具体数字剂量**（约 L83–91）

“下调 CPA 剂量或更换方案，具体剂量由医生决定”没有给出个体化 mg 数值，硬红线修复到位。问题中的 `CPA ≥25 mg/天` 仍有剂量，但它是筛查条件，不在 advice 中。

🔴 **评分模型未经验证，却仍输出“偏高/低”的风险分层**（约 L16–37、L58–75）

代码注释承认权重和阈值来自原型，但页面仍把简单加权结果呈现为四维“风险画像”和“偏高”。这可能被用户理解为经过验证的临床风险预测工具。底部免责声明不足以修复模型有效性问题。

至少应明确标注“非验证量表，不估算实际风险”，并避免输出“低风险”；更稳妥的是仅列出已勾选的风险因素，不做数值分层。

⚠️ advice 中的 `Hudelist 2026`、经皮途径比较等医学声明也需要可见且可核对的引用。

## 5. 构建门控

✅ **flag 关闭时确实不生成路径**（`v2-flag.ts` 约 L29–30；`[...path].astro` 约 L34–38）

`getStaticPaths()` 返回空数组，在静态构建中不会生成 `/zh/v2/**` 页面，因此是构建层面的真实 404，而非仅 `noindex`。

⚠️ **生产仍可因环境变量配置误开**

```ts
import.meta.env.DEV || import.meta.env.PUBLIC_V2_PREVIEW === '1'
```

生产构建时 `DEV` 为 false；但只要 Production 环境也存在 `PUBLIC_V2_PREVIEW=1`，页面就会全部生成。代码没有验证 Vercel 环境为 Preview。

建议同时要求：

```ts
VERCEL_ENV === 'preview' && V2_PREVIEW === '1'
```

并使用非 `PUBLIC_` 的构建变量，降低误配置和暴露范围。

# 结论

**🔴 阻断。需修改后重新复核。**

主要阻断项：

1. 注射重复给药曲线按首针峰值归一化并截断，导致峰顶失真。
2. DocScreen 剂量表包含缺少合规引用的具体剂量与“绝对上限”。
3. DocScreen 仍有无独立引用的 VTE 比较声明。
4. 风险问卷使用未经验证的权重输出“低/偏高”临床风险分层。

本轮我**不愿作为第二签字人**。上述医学逻辑和引用问题修复后，可以再签。
```

### 处理记录
- 🔴 注射曲线首针峰归一化 → 改全窗口真实最大值（峰顶不再截平失真）
- 🔴 DocScreen 剔除无法核实的 Hopkins 2024、去掉无据的「VTE 低于口服」句、剂量表绑定 Rothman/Hembree 引用、加 n=6
- 🔴 风险问卷去掉「偏高/低」临床分层 → 「风险因素清单」+「非验证量表」标注，不输出「低风险」
- ⚠️ 血检 Number.isFinite + 拒负数/Infinity；上下文横幅补稳定期/谷值采血；门控加 VERCEL_ENV=preview 硬门 + 非 PUBLIC 变量；inject「安全上限」措辞软化

## 2026-07-23 终审（合并前把关）sha=7b03dc1 reviewer=codex-gpt5.6-sol bytes=899

范围：c37f427..HEAD 增量（lore 清理 17 文件 + sakura-reskin spec）。
裁决：**VERDICT: MERGE**（P1 无）。P2 四条已全修：
1. Primitives.tsx PageHead 竖排标签 filter(Boolean) 防 undefined
2. spec 页数事实修正（62×17 → 934 页：7 语 62 + 10 语 50）
3. spec「§3 四语同步」提法 → 明确「不改任何本地化内容」
4. spec override 机制矛盾 → 裁决为「双态结构常驻 SSR + html.sakura 作用域 CSS 切换」
原始裁决文本存 scratchpad codex-verdict.txt（899 bytes）。
