/**
 * somaticEmergency — AI 问答助手的躯体急症本地拦截（减害强化 · 仅 zh）
 *
 * 与 crisisSupport.ts 平级、同构：用户输入命中规则 → 不等 AI，AIAssistant 立即
 * 本地渲染躯体急症卡（同时照常把消息发给端点 —— 服务端本就有急症引导 prompt）。
 * 本地卡治的是**模型侧残余方差**（实测 ~4%，六模型 × 五次实跑证据见
 * docs/ai-safety-probe-free-google-gemini-3-6-flash-free-google-gemini-3-5-flash-2026-07-29.md），
 * 不是替代提示词或站内内容 —— 三者是叠加防护。
 *
 * SPEC: docs/specs/ai-chat-somatic-emergency.md（§1 正则定稿，§6 探针集为验收门槛）
 *
 * 红线：
 * · 纯 substring / 正则合取，零 NLP、零模型判定、零运行时自适应（同 containsCrisisKeyword）。
 * · 匹配纯本地进行，不上报、不落任何 analytics、不记录命中计数（CLAUDE.md 红线）。
 * · 规则是「部位 + 限定词 + 症状」的合取式并带否定排除 —— 躯体症状词（头疼/腿疼/累）
 *   在 HRT 日常提问里极常见，宽召回会造成警报疲劳，让干预净效果为负（SPEC §0.3）。
 * · 词表任何改动必须重跑 `npm run verify:somatic`（30 条断言），不得降低门槛。
 *
 * ── 停药句 SSOT 对齐表（SPEC §2；卡片只能复述站内已过审的同通路停药指令，不得新创）──
 * | 规则      | 停药句出处（文件:行号）                                              | 进卡片 |
 * |-----------|----------------------------------------------------------------------|--------|
 * | R-DVT     | src/content/blog/zh/hrt-emergency-symptoms.mdx:34 顶部【紧急提示】    | ✅ 停药 |
 * | R-PE      | 无 —— PE 章节只说「立即拨打 120」，不含停药指令                       | ❌ 不加 |
 * | R-NEURO   | mdx:136「立即停止使用色普龙（CPA）」针对**渐进性**头痛，非本规则场景  | ❌ 不复述 |
 * | R-LIVER   | src/content/blog/zh/hrt-emergency-symptoms.mdx:89 +                   | ✅ 停药 |
 * |           | src/data/blood-ranges.json:153（id=alt notes「建议立即停药并就医治疗」） |        |
 * | R-HYPERK  | src/data/blood-ranges.json:186（id=k 红区 label「建议停用螺内酯」）    | ✅ 停药 |
 * 文案实际落地位置：SomaticEmergencyCard.tsx（该处逐条重标行号，SSOT 改动可反查）。
 */

export type SomaticRuleId = 'R-DVT' | 'R-PE' | 'R-NEURO' | 'R-LIVER' | 'R-HYPERK';
export type SomaticTier = 'tier1-120' | 'tier2-today';

export interface SomaticHit {
  ruleId: SomaticRuleId;
  tier: SomaticTier;
  downgrade?: boolean; // 仅 R-PE 慢性已知诊断降级使用
}

/** 白名单常量 —— storage.ts 的 sanitizeMessage 与探针脚本共用同一真值源。 */
export const SOMATIC_RULE_IDS: readonly SomaticRuleId[] = [
  'R-DVT', 'R-PE', 'R-NEURO', 'R-LIVER', 'R-HYPERK',
];
export const SOMATIC_TIERS: readonly SomaticTier[] = ['tier1-120', 'tier2-today'];
/** localStorage 里单条消息最多保留几条命中（防手改塞垃圾数据），= 规则总数。 */
export const MAX_SOMATIC_HITS = 5;

/* =========================================================================
   R-DVT（深静脉血栓）— Tier-2（当天就医）
   ========================================================================= */

// 部位词：远端 + 近端两级，近端受注射部位否定排除保护
const DVT_BODY_DISTAL = /小腿|脚踝|脚背|踝(?!.*(?:印|本))/;
const DVT_BODY_PROXIMAL = /大腿|髋|腹股沟|整条腿|整只腿/;

// 单侧限定词（含自然口语「那条腿/那边」）
/* ⚠️ 本词表与 DVT_BODY_PROXIMAL 是**耦合**的，改一处必须查另一处。
   SPEC §1 裁决 3 把部位词从「仅远端」扩到含 大腿/髋/腹股沟，但**没有同步扩这里** ——
   原表只有 `左腿|右腿|左小腿|右小腿`，于是「左大腿肿得走不了路」这种近端 DVT 的
   最自然说法**永远不命中**（缺单侧限定 → 不达判定条件）。
   近端 DVT 比小腿 DVT 更易脱落成栓，正是裁决 3 要覆盖的那类，结果反而漏掉。
   改为 [左右] × 部位 的组合式，一次覆盖全部远端+近端；idiom 部分保持原样。
   精度不受影响：「左/右 + 具体部位」本身就是强单侧信号，无过召回风险。 */
const DVT_UNILATERAL =
  /单侧|一侧|一边|[左右](腿|小腿|大腿|脚|踝|髋|侧(腿|下肢))|只有一(边|侧)|另一(条|只)腿没|那条腿|那(一)?边/;

// 否定：明确双侧 → 直接排除（双侧水肿多为体液潴留，非 DVT 特征）
const DVT_BILATERAL_NEGATION = /两条腿都|两边都|双侧/;

// 症状词三类（要求 >= 2 类）
const DVT_SWELL = /肿|肿胀|肿起来|鼓起来/;
const DVT_PAIN = /痛|疼|胀痛|刺痛/;
/* 「走不了路 / 走不动 / 站不住 / 迈不开」是实施验收时发现的漏检（SPEC §1 定稿词表
   只有「不能走/站」与「走路发紧/绷紧/吃力/困难」）。「我左小腿肿得走不了路」这种
   极自然的中文说法只命中 1 类症状 → 不达 ≥2 类阈值 → 真阳性被漏掉。
   这是 P0 安全规则的召回缺口，非样式问题，故补入并同步加探针 TP-6。
   补的是**症状强度更高**的表述，不放宽任何精度约束。 */
const DVT_HEAT_PIT_WALK =
  /发红|发烫|发热|按下去.{0,4}(坑|凹|窝)|凹陷性?水肿|走路(发紧|绷紧|吃力|困难)|不能(走|站)|走不(了路|动)|站不(住|稳)|迈不开/;

// 注射部位否定排除（部位词扩展到大腿/髋后的必需项，非可选加固 —— SPEC §1 裁决 3）
const INJECTION_SITE_MARKER = /针眼|打针|注射|扎针|屁股针|针剂打的地方/;
/* 与 DVT_HEAT_PIT_WALK 同步补入行走障碍表述：「大腿打针的地方肿得走不了路」
   是真正的整肢扩散，不该被当成局部注射反应排除掉。两处词表必须同改 ——
   只改上面那处会让该句既算 2 类症状、又被注射部位排除掉，净结果仍是漏检。 */
const SPREAD_MARKER =
  /整条腿|整只腿|走路(发紧|绷紧|吃力|困难)|不能(走|站)|走不(了路|动)|站不(住|稳)|迈不开|下肢(肿|痛)|小腿(也|都)(肿|痛)/;

function matchDVT(text: string): boolean {
  if (DVT_BILATERAL_NEGATION.test(text)) return false;
  const isInjectionSiteOnly = INJECTION_SITE_MARKER.test(text) && !SPREAD_MARKER.test(text);
  if (isInjectionSiteOnly) return false;

  const hasBodyPart = DVT_BODY_DISTAL.test(text) || DVT_BODY_PROXIMAL.test(text);
  const hasUnilateral = DVT_UNILATERAL.test(text);
  const symptomClassCount =
    [DVT_SWELL, DVT_PAIN, DVT_HEAT_PIT_WALK].filter((r) => r.test(text)).length;

  return hasBodyPart && hasUnilateral && symptomClassCount >= 2;
}

/* =========================================================================
   R-PE（肺栓塞 / 心血管急症）— Tier-1（立即 120）
   ------------------------------------------------------------------------
   与惊恐发作的重叠是**临床现实，不是缺陷**：呼吸困难 + 胸闷 + 心悸 + 眩晕是
   PE 与惊恐发作共有的核心四联征，急诊科同样先做客观检查排除 PE 再诊断惊恐障碍。
   把这类描述导向「去做一次检查」是正确的默认动作。降级规则只服务于
   「已自述慢性诊断」的复发场景，避免对长期焦虑症患者反复强插红卡。
   ========================================================================= */

const PE_BODY = /胸|胸口|胸部|心|心脏/;
const PE_RESP_SYMPTOM =
  /喘不上气|呼吸困难|喘不过气|气短|上不来气|咳血|痰(里|中)带血/;
const PE_HEMODYNAMIC =
  /晕厥|昏过去|眼前发黑|冒冷汗.{0,6}(苍白|发白)|心跳(突然)?(变快|加速|乱|不齐)/;

// 慢性已知诊断降级：不阻断触发，但触发时用软化文案（内联提示条）而非强插红卡
const PE_CHRONIC_KNOWN_DX =
  /确诊(焦虑症|惊恐障碍)|每次发作都这样|老毛病了|吃了(阿普唑仑|劳拉西泮|奥沙西泮)/;

function matchPE(text: string): { hit: boolean; downgrade: boolean } {
  const hit = (PE_BODY.test(text) && PE_RESP_SYMPTOM.test(text)) || PE_HEMODYNAMIC.test(text);
  const downgrade = hit && PE_CHRONIC_KNOWN_DX.test(text);
  return { hit, downgrade };
}

/* =========================================================================
   R-NEURO（卒中样急性神经系统症状）— Tier-1（立即 120）
   ------------------------------------------------------------------------
   刻意不设否定排除（含偏头痛先兆假阳性）：时间代价不对称 —— 卒中每延误一分钟
   组织都在坏死，偏头痛患者多做一次检查的代价远低于此。覆盖卒中 / 垂体卒中 /
   急性颅内出血三条通路：鉴别诊断不同但**急诊处置动作相同**（立即影像学检查）。
   ========================================================================= */

const NEURO_ONSET = /突然|忽然|一下子|今天(突然)?|刚(才)?/;
const NEURO_SEVERE_HEADACHE =
  /头(特别|非常|剧烈)?疼|头痛欲裂|这辈子最(疼|痛)的头|炸裂(般|似)的头痛/;
const NEURO_FOCAL_DEFICIT =
  /看东西.{0,4}(缺|少|黑|模糊)一块|视野(缺损|变窄|盲区)|重影|复视|一侧(手|脚|胳膊|腿|身体).{0,6}(麻|没力气|不听使唤|抬不起来)|说话(不清|含糊|说不出)|嘴角(歪|斜)/;

function matchNeuro(text: string): boolean {
  return NEURO_ONSET.test(text) && (NEURO_SEVERE_HEADACHE.test(text) || NEURO_FOCAL_DEFICIT.test(text));
}

/* =========================================================================
   R-LIVER（急性肝损伤）— Tier-2（当天就医）
   ------------------------------------------------------------------------
   药物上下文（螺内酯 / CPA / 比卡鲁胺）**不作为必需条件** —— 巩膜黄染 + 尿色加深
   本身特异度已很高，普通人极少用这个组合描述别的事情。
   ========================================================================= */

const LIVER_SITE = /眼白|巩膜|皮肤|全身|尿(液)?/;
const LIVER_SYMPTOM = /发黄|变黄|黄了|茶色尿|可乐色(的)?尿|尿(颜色)?(很|特别)?深/;

function matchLiver(text: string): boolean {
  return LIVER_SITE.test(text) && LIVER_SYMPTOM.test(text);
}

/* =========================================================================
   R-HYPERK（高钾血症）— Tier-1（立即 120）
   ------------------------------------------------------------------------
   药物上下文在此**是必需的** —— 普通焦虑性心悸与疲劳极常见，没有螺内酯上下文时
   不该被这条规则捕获。注意「累」刻意**不在**肌无力词表内（「发软 / 抬不起来」是更强的
   运动无力描述，「累」是极常见的日常主诉）。
   ========================================================================= */

const HYPERK_DRUG = /螺内酯|安体舒通|安得利/g;
const HYPERK_ARRHYTHMIA = /心跳(有点)?(乱|不齐|加快|变快)|心悸|心慌/;
const HYPERK_WEAKNESS = /手脚发软|四肢无力|抬不起来|没(力气|劲儿)|发麻/;

/* ⚠️ substring 匹配看不见否定 —— 「我最近压力大总心慌，**没吃**螺内酯」里的
   「螺内酯」照样命中。这条在 SPEC §6.4 探针实跑中被抓到（规格初稿声称它不触发，
   实际触发）。修法：药物上下文成立的条件是「存在至少一处**未被否定**的出现」。

   否定窗口刻意保持窄（要求「否定词 + 服用动词」紧邻）。已知不被捕获的形式：
   「医生说**没必要吃**螺内酯」（「没」与「吃」之间隔了「必要」）。**不放宽** ——
   放宽会误伤「不用担心，我吃螺内酯」这类句子，那是危险方向：漏掉真的高钾血症
   远比多弹一张卡严重。窄规则的失败方向（多弹卡）是安全的。 */
const HYPERK_NEG = /(没|不|未|别|勿)(有)?(在)?(吃|用|服|服用|使用|开始)/;

export function hasHyperkDrugContext(text: string): boolean {
  HYPERK_DRUG.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HYPERK_DRUG.exec(text)) !== null) {
    const window = text.slice(Math.max(0, m.index - 8), m.index);
    if (!HYPERK_NEG.test(window)) return true; // 有一处未被否定 → 上下文成立
  }
  return false;
}

function matchHyperK(text: string): boolean {
  return hasHyperkDrugContext(text) && (HYPERK_ARRHYTHMIA.test(text) || HYPERK_WEAKNESS.test(text));
}

/* ========================================================================= */

/** 纯本地躯体急症关键词检测。返回全部命中规则（可多条），不做互斥选择。 */
export function detectSomaticEmergency(text: string): SomaticHit[] {
  const hits: SomaticHit[] = [];
  if (!text) return hits;
  if (matchDVT(text)) hits.push({ ruleId: 'R-DVT', tier: 'tier2-today' });
  const pe = matchPE(text);
  if (pe.hit) hits.push({ ruleId: 'R-PE', tier: 'tier1-120', downgrade: pe.downgrade });
  if (matchNeuro(text)) hits.push({ ruleId: 'R-NEURO', tier: 'tier1-120' });
  if (matchLiver(text)) hits.push({ ruleId: 'R-LIVER', tier: 'tier2-today' });
  if (matchHyperK(text)) hits.push({ ruleId: 'R-HYPERK', tier: 'tier1-120' });
  return hits;
}
