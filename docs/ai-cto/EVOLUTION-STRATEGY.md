# HRT药典 优化到最强状态 — 进化战略路线图

**生成**: 2026-06-09 · 17-agent ultracode 研究工作流（14 研究并列 + 3 敌对批判：医疗安全/事实 · SEO-AEO · 完整性+优先级）
**方法**: 国内外指南 + 竞品（MtF Wiki / Transfeminine Science / Shizu / 社区）+ 药物/主题/工具缺口 + 技术 SEO + AEO，全部联网核实，敌对验证剔除弱来源。

---

## 0. 一句话定位（防御性护城河）

hrtyaku 是「**安全底线 + 循证治理（证据分级+DOI）+ 工具集 + 中国本地化 + 零服务端数据**」的**窄而深**站；MtF Wiki 是「全流程开放百科」但**无医学审稿/证据分级/更新日期**。**不要去拼广度，要把循证严谨 + 中国就医现实 + 隐私即信任做成可见的信任与 AEO 资产。**

---

## 1. 完整性批判：14 个研究维度集体漏掉的 8 个盲点（落地前必读）

1. **量化基线缺失（最大漏洞）**: 所有"强 SEO/AEO"判断都是先验推测——**第一步必须读 GSC 导出 + Pagefind 站内零结果词**，否则优先级是拍脑袋。（操作者侧：导出 GSC。）
2. **维护成本 / 内容腐烂**: 57 docs + 9 工具 + 4 语言已是单人项目；研究层已发现 3 处过时声明。规模翻倍前必须先建**内容生命周期治理**（见 G-1）。
3. **性能预算**: 新增 React 工具 island / 图表库 / 多语言会冲击 LCP/INP/CLS（YMYL 排名含 CWV）。新工具前定预算（G-2）。
4. **可访问性回归**: 分诊浮层/sticky 条/折叠阅读/图表都是高 a11y 风险，须把 WCAG AA 列为新交互验收门。
5. **合规/法律红线**: china-access / 断药应急 / 就医路径点名医生 提案离"教规避监管/协助购药/个性化医疗"很近——中国语境下是项目存续级风险，须独立合规审查门（G-3）。
6. **测量闭环**: 无 Umami 事件埋点（急症 CTA 点击/工具完成/分诊触发），做完无法验证 ROI（G-4）。
7. **去重/IA 膨胀**: 14 维度各自重复提同一提案 3-4 次（三指南表 ×4、具名医师 schema ×3、骨健康 ×3、生育 ×3、相互作用 ×4）→ 不去重会造成自我 keyword cannibalization。已去重为下方清单。
8. **信源分层**: 会议摘要（ENDO 2026）、转引数据、竞品未核实数字不可作 A/B 级声明。

## 2. 敌对验证剔除/降权的来源（不可直接用）

- ❌ **「71% 用药者不知 HRT 影响生育力」** — 来源 givelegacy.com（商业精子库，非同行评审）→ **剔除**。
- ⚠️ **「E2 200-300 pg/mL≈抑 T 90%；~500≈95%」** — 来自竞品 Shizu 二次来源 → 落地前**回原始文献核实**，勿搬竞品数字。
- ⚠️ **「89% 医疗查询被 AI Overviews 覆盖」** — 三手来源 → 仅作方向参考，不当硬数据。
- ⚠️ 比卡鲁胺肝毒性 medrxiv、黄体酮 +37% EPATH 新闻稿、ENDO 2026 → **预印本/会议级，须标注"待同行评审"，不进 A/B 声明**。

---

## 3. Top 10 动作（最高杠杆，按执行序）

1. **建量化基线**（GSC 导出 + 站内零结果词）— 所有后续优先级的前提。
2. **FAQPage 去重 + HowTo schema 注入 guides/**（`JsonLd.astro` 与 `FaqSchema.astro` 互斥；guides 三页文案现成）— **零内容成本解锁富结果 + AI 步骤引用**，最高确定性技术杠杆。
3. **黄体酮 RCT 纠偏**（`breast-development.mdx` L239 / `progesterone.mdx`「缺乏 RCT」→「已有小型 RCT 提示获益但样本有限」，引 Amsterdam UMC 2023 BMC）— **站内最明显过时声明**，准确性是铁律。
4. **具名医师 reviewedBy schema**（`JsonLd.astro` L243-244 Organization→`Physician` + name/specialty/sameAs）— YMYL 域 AI 最看重"谁审的"。（卡点：须顾问授权挂名。）
5. **单位换算器**（E2 pg/mL↔pmol/L ×3.671；T ×0.0347）— 中国实验室报 pmol/L、站内只认 pg/mL 的最高频错配。
6. **生育保存专页** — SOC8「启动前必谈」+ 停药后部分恢复 + 国内冻精/单身限制现实 — 指南级硬缺口、不可逆决策。
7. **「没有血检时症状导向」分诊页** — 高E/低E/睾酮未压制信号→动作+红旗就医（HowTo schema）— 社区最高频痛点、几乎无竞品、双铁律契合、强 AEO。
8. **三指南差异对照表** — 同一监测项并排 SOC8/Endo2017/UCSF 数值+年份+证据级 — 收口 4 个维度重复提案为**一张**权威表，全网独有。
9. **内容生命周期治理（G-1）+ 全站就医 mini-CTA** — 规模翻倍前装「防腐烂」机制 + 零成本兑现「引导就医」铁律。
10. **药物相互作用聚合页 + 速查** — 散落各页的高钾/肝酶/CYP 交互聚合成减害安全网。

---

## 4. 分档清单（去重后：4 治理门 + 16 项）

### 立即（S 成本 / 零医学风险 / 本周）
| # | 行动 | 类型 |
|---|------|------|
| I-2 | FAQPage 去重（每页恰一 FAQPage） | SEO-tech |
| I-3 | HowTo schema 注入 guides/{首次注射,换抗雄,换E2途径} | SEO/AEO |
| I-4 | x-default hreflang 补尾斜杠 + 一致性 | SEO-tech |
| I-5 | 黑话↔规范名术语对照表页（补佳乐=戊酸雌二醇 等） | 内容/SEO |
| I-6 | 全站常驻「带血检找友好医院」mini-CTA | UX |
| I-7 | 隐私可验证页 `/privacy/no-server`（人话+链 GitHub 源码） | 差异化/UX |
| I-8 | 单位换算器（pg/mL↔pmol/L） | 工具/AEO |
| A3 | methodology 页加稳定锚点 + Article schema | AEO/E-E-A-T |

### 短期（M / 需医学人审 / 1-4 周，补指南级硬缺口）
| # | 行动 | 安全 |
|---|------|------|
| S-1 | 生育保存专页（须先补 references.json 引用） | 强人审 |
| S-2 | 骨健康/DEXA 页（E2 护骨机制+去势/停药监测） | 人审 |
| S-3 | 黄体酮乳房发育 RCT 纠偏（Amsterdam UMC 2023 BMC） | 强人审 |
| S-4 | 「E2 靶值 100-200 循证边界」框（Winston-McPherson 2025 系统综述） | 人审 |
| S-5 | 术后/去势激素管理页（停抗雄/维持 E2 护骨） | 人审 |
| S-6 | 药物相互作用聚合页 + 速查工具 | 全人审 |
| S-7 | 三指南差异对照表（SOC8/Endo/UCSF） | 人审 |
| S-8 | 「没有血检时症状导向」分诊页（HowTo） | 强人审 |
| S-9 | GnRH 拮抗剂页（relugolix 口服/degarelix） | 人审 |
| S-10 | 采血时机助手 + 工具内联气泡 | 人审 |
| S-11 | 具名医师 reviewedBy schema | 需顾问授权挂名 |
| S-12 | zh-Hant 繁体中文（简转繁+术语，零边际医学审） | 免审（术语校） |

### 长期（M+ / 1-3 月，深度护城河）
| # | 行动 | 安全 |
|---|------|------|
| L-1 | 注射酯 PK 曲线浏览器（参数全挂 DOI，须回原始文献） | 人审 + 性能预算 |
| L-2 | 正文 chunk 化 + 关键数据强制表格化（提升 AI 抽取率） | 复用已审数据 |
| L-3 | ja/ko 补全 9 篇缺口（中立减害定位） | 人审（沿用 zh 声明） |
| L-4 | 中国可及性结构化实体 `/china/access`（全网独有，**合规风险最高**） | 强人审 + 合规审查 |
| L-5 | methodology 升级为可引用实体（证据分级定义+利益冲突+更新机制） | 人审 |
| L-6 | 机制深挖长文 2-3 篇（低剂量 CPA 足够 / 凝胶途径 / E2 单药 2025 RCT） | 人审 |

### 贯穿全程的 4 个治理门（不是清单项，是门）
- **G-1 内容生命周期**: 每页 `lastReviewed` 到期自动告警 + 季度复审队列。
- **G-2 性能预算门**: 每个新工具 island 设 LCP/INP/CLS + 包体上限，超标不合并。
- **G-3 合规审查门**: china-access / 断药 / 就医路径 提案过"是否触红线"独立审查。
- **G-4 测量闭环**: Umami 事件埋点（急症 CTA / 工具完成 / 分诊触发）。

---

## 5. 验证过的内容缺口（可循证、可落地）

**新药物页**（"药典"应补）: GnRH 拮抗剂（relugolix 口服 / degarelix）· Estetrol E4（仅做"实验性"小卡，强标证据不足）。
**新主题页**（指南级硬缺口）: 生育保存 · 骨健康/DEXA · 术后/去势激素管理 · 药物相互作用聚合。
**循证时效纠偏**: 黄体酮乳房发育（Amsterdam RCT）· E2 单药压睾酮（misakian-2025/2025 Kaiser RCT 82.6%）· E2 靶值边界（Winston-McPherson 2025）。
**新工具**（守红线、纯前端零存储、不输出个性化剂量）: 单位换算 · 采血时机助手 · 指南对照查询 · 药物相互作用速查 · 注射 PK 曲线。

## 6. SEO / AEO 要点
- **AEO（被 AI 答案引擎引用）**: TL;DR 直答块（每节首 40-150 字自包含）· FaqSchema/HowTo schema · 关键数据强制 `<table>`（AI 整块抽取）· 具名 Physician E-E-A-T · 方法论/来源透明。
- **技术 SEO**: 补 HowTo（全站为零）· FAQPage 去重 · hreflang 一致 · Table/Dataset schema。
- **中文侧**: 黑话↔规范名术语表 · china-reality NMPA 深度 · 繁体中文。
- **红线**: 不标题党、不制造恐慌、不为流量牺牲医学准确；每篇 SEO 内容把用户导向更安全主内容。

## 7. 刻意排除（避免资源错配）
- 暂缓 en 全量投入（英语红海，只维护现有 50 篇）。
- 不再扩投 llms.txt（已实证边际收益极低）。
- E4 仅"实验性"小卡（跨性别证据极少，防社区盲从）。
- PK 曲线浏览器压到长期（须回原始文献 + 图表性能/a11y 风险，不可仓促）。

---

## 关键文件（落地入口）
- `src/components/seo/JsonLd.astro`（L243-244 reviewedBy、FAQPage 发射、HowTo 缺失）· `src/components/seo/FaqSchema.astro`（去重点）
- `src/content/docs/zh/breast-development.mdx`（L239 过时）· `.../progestogens/progesterone.mdx`（黄体酮纠偏）
- `src/data/references.json`（缺 fertility/bone/estetrol/relugolix/winston-mcpherson/amsterdam-RCT）
- `src/content/docs/zh/blood-tests.mdx`（骨密度行空解释/采血时机/单位）· `.../medical-advisors.mdx`（具名医师 schema 源）· `.../methodology.mdx`（可引用实体升级）· `.../guides/`（HowTo 注入）
