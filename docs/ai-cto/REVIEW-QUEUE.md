
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
