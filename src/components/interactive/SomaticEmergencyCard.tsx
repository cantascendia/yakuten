/**
 * SomaticEmergencyCard — 躯体急症卡（本地秒级渲染，不可关闭）
 *
 * SPEC: docs/specs/ai-chat-somatic-emergency.md §3（文案）/ §4.3（渲染顺序与视觉）
 * 检测规则：somaticEmergency.ts（`npm run verify:somatic` 30 条断言守精度）
 *
 * 定位：与 .yk-ai-crisis 同一层级的紧急卡，**危机卡永远在上、本卡紧随其后**
 * （AIAssistant.tsx 渲染点）。两张卡都 **不可关闭** —— CLAUDE.md
 * 「Emergency banners… NOT dismissible」是站点级红线，不是心理危机卡专属。
 *
 * 仅 zh 文案：五条规则的触发词全是中文，命中即说明用户在用中文提问（SPEC §0.2
 * 明确不铺未经临床审校的 16 语躯体症状词）。因此文案不进 aiChatL10n 字典，
 * 就近放在本文件，避免在 17 语字典里留 16 份未审校的医疗文案坑。
 * 唯一与 locale 相关的是急救号码：走 getEmergencyMedicalNumber(locale)，
 * 没有经核验号码的语种**不回退**中国 120，改显示通用指引行。
 *
 * ── 停药句 SSOT（只复述站内已过审、同通路已存在的停药指令，不得新创，SPEC §2）──
 * · Tier-2 停药句 → src/content/blog/zh/hrt-emergency-symptoms.mdx:34
 *   （顶部【紧急提示】「请立即停药」，覆盖全部急症类别）
 *   + src/content/blog/zh/hrt-emergency-symptoms.mdx:89
 *   （「立即停用所有性别肯定激素治疗（HRT）相关药物」）
 *   + src/data/blood-ranges.json:153（id=alt notes「建议立即停药并就医治疗」）
 * · R-HYPERK 停药句 → src/data/blood-ranges.json:186
 *   （id=k 红区 label「存在高钾血症风险，建议停用螺内酯（Spiro）并及时就医评估」）
 * · R-PE / R-NEURO **无停药句** —— 对应 SSOT 本身不含停药指令：
 *   PE 章节只说「立即拨打 120」（叫救护车优先于翻药盒决策）；
 *   mdx:136「立即停止使用色普龙（CPA）」针对的是**渐进性**头痛，与本规则的
 *   **突发**场景不是同一通路，故不复述。
 */

import { getEmergencyMedicalNumber } from './crisisSupport';
import type { SomaticHit, SomaticRuleId } from './somaticEmergency';

/* Tier-1 多条同时命中时只取最高优先级的一条正文（SPEC §3）。 */
const TIER1_PRIORITY: readonly SomaticRuleId[] = ['R-HYPERK', 'R-NEURO', 'R-PE'];
/* Tier-2 可同时列出（两条互不冲突，都是「当天就医」）。 */
const TIER2_ORDER: readonly SomaticRuleId[] = ['R-DVT', 'R-LIVER'];

/** 正文（zh，SPEC §3 逐句对齐）。 */
const REASON: Record<SomaticRuleId, string> = {
  'R-PE':
    '你提到的症状组合（突发喘不上气／胸痛加重／咳血／心律紊乱／晕厥冷汗），提示可能存在需要'
    + '立即排查的紧急情况（肺栓塞或心脏急症）。这类描述光凭文字没法区分是不是虚惊一场，'
    + '但处置是一样的：马上就医。',
  'R-NEURO':
    '突然的剧烈头痛并伴有视力／肢体／言语异常，需要立即排查卒中或颅内急症的可能，不能等。',
  'R-HYPERK':
    '心律紊乱加上四肢无力／发麻，如果你正在使用螺内酯，需要立即排查血钾异常——'
    + '这类情况可能引发致命性心律失常。',
  'R-DVT':
    '你提到的「单侧下肢突然肿、疼、（发红／发烫／按下去有凹陷／走路发紧）」，是深静脉血栓'
    + '（DVT）的警报表现之一，需要医生用超声检查确认，不建议在家观察等待。',
  'R-LIVER':
    '你提到的「眼白／皮肤发黄 + 尿液变深」，可能是肝功能受损的信号，需要抽血检查'
    + ' ALT／AST／胆红素确认。',
};

/** SSOT: blood-ranges.json:186（id=k 红区 label）。仅限螺内酯这一单一药物，非个性化剂量。 */
const HYPERK_STOP =
  '如果你正在服用螺内酯，建议现在先停用这一次剂量，同时立即就医——这是否为高钾血症需要抽血确认。';

/** SSOT: hrt-emergency-symptoms.mdx:34 顶部【紧急提示】+ mdx:89 + blood-ranges.json:153。 */
const TIER2_STOP =
  '建议现在停用你正在使用的所有性别肯定激素治疗相关药物，具体何时／是否恢复用药，'
  + '由接诊医生根据检查结果判断。';

const DISCLAIMER =
  '这条提示由关键词自动识别触发，不是诊断。我们无法通过聊天内容判断你的实际情况，只能基于'
  + '你描述的关键词提醒你就医——哪怕最后排查结果是虚惊一场，也建议这次去检查一次。';

/** R-PE 慢性已知诊断降级：**不强插 Tier-1 红卡**，改内联提示条（非红、非全屏）。 */
const PE_DOWNGRADE_HINT =
  '如果这次的感觉和你平时的发作不一样（比如更疼、更喘、或者第一次伴有晕厥／口唇发紫），'
  + '仍建议这次去医院排查一次，不要默认是老毛病。';

interface Props {
  hits: SomaticHit[];
  locale: string;
}

export default function SomaticEmergencyCard({ hits, locale }: Props) {
  if (!hits || hits.length === 0) return null;

  const emergency = getEmergencyMedicalNumber(locale);
  const num = emergency?.number ?? null;

  /* R-PE + downgrade 的那一条不进红卡（SPEC §3），只出内联提示条。 */
  const carded = hits.filter((h) => !(h.ruleId === 'R-PE' && h.downgrade === true));
  const showDowngradeHint = hits.some((h) => h.ruleId === 'R-PE' && h.downgrade === true);

  /* 档位一律由 ruleId 反推，**不信任传入的 tier 字段** —— 该字段可能来自被手改过的
     localStorage（storage.ts 只做枚举白名单，不校验 ruleId↔tier 的对应关系）。
     ruleId 是代码里的静态事实，失败方向也安全（错档只会往 Tier-1 升，不会降）。 */
  const tier1Id = TIER1_PRIORITY.find((id) => carded.some((h) => h.ruleId === id));
  const tier2Ids = TIER2_ORDER.filter((id) => carded.some((h) => h.ruleId === id));
  const hasCard = Boolean(tier1Id) || tier2Ids.length > 0;
  const tier = tier1Id ? 'tier1-120' : 'tier2-today';

  const title = tier1Id
    ? (num ? `这类描述建议现在就打 ${num}` : '这类描述建议现在就去急诊')
    : '建议你今天去一趟医院';

  const action = tier1Id
    ? (num
      ? `请现在拨打 ${num} 叫救护车，或立即由人陪同前往最近医院急诊科。`
      : '请立即拨打你所在地区的急救电话叫救护车，或立即由人陪同前往最近医院急诊科。')
      + '不需要等症状「再观察观察」，这类情况耽误的每一分钟都有意义。'
    : '建议今天挂号或前往急诊科；如果出现突然的呼吸困难、胸痛加重或咳血（可能提示血栓脱落），'
      + (num ? `请立即改为拨打 ${num}。` : '请立即改为拨打你所在地区的急救电话。');

  /* 停药句：只在对应通路命中时出现。R-PE / R-NEURO 不带（SSOT 本身不含）。 */
  const stopLines: string[] = [];
  if (carded.some((h) => h.ruleId === 'R-HYPERK')) stopLines.push(HYPERK_STOP);
  if (tier2Ids.length > 0) stopLines.push(TIER2_STOP);

  return (
    <>
      {/* 与 ChatSessionSidebar 同一惯例：组件自带样式，默认（二相乐园）基线在此，
          sakura 覆盖在 sakura-ai.css §7b。 */}
      <style>{SOMATIC_CSS}</style>

      {hasCard && (
        <div className="yk-ai-somatic" data-tier={tier} role="group" aria-label={title}>
          <p className="yk-ai-somatic__title">{title}</p>
          {tier1Id && <p className="yk-ai-somatic__body">{REASON[tier1Id]}</p>}
          {tier2Ids.map((id) => (
            <p key={id} className="yk-ai-somatic__body">{REASON[id]}</p>
          ))}
          <p className="yk-ai-somatic__action">{action}</p>
          {num && emergency && (
            <a className="yk-ai-somatic__line" href={emergency.href}>
              <span className="yk-ai-somatic__name">{emergency.name}</span>
              <span className="yk-ai-somatic__num">{num}</span>
            </a>
          )}
          {stopLines.map((s) => (
            <p key={s} className="yk-ai-somatic__stop">{s}</p>
          ))}
          <p className="yk-ai-somatic__note">{DISCLAIMER}</p>
        </div>
      )}

      {showDowngradeHint && (
        <p className="yk-ai-somatic-soft">{PE_DOWNGRADE_HINT}</p>
      )}
    </>
  );
}

/* =========================================================================
   样式 —— 结构对标 .yk-ai-crisis（红底白字 / 44px 触控目标 / :focus-visible 轮廓），
   前缀 .yk-ai-somatic，**.yk-ai-crisis 一行不动**。

   ⚠️ 档位配色的无障碍修正（SPEC §4.3 原文要求 Tier-2 用 `--color-danger`）：
   `--color-danger` = #F44336，白字在其上只有 **3.68:1**，13px 正文过不了 WCAG AA
   （需 4.5:1）。而「红底白字」是 CLAUDE.md 的站点级红线，不能改成深色字。
   所以两档都以 `--color-danger-dark`（#D32F2F，白字 4.98:1 ✓）为底，Tier-2 叠一层
   站内既有的深红遮罩 `--color-danger-bg-low` → 更深、更低饱和（白字对比只升不降），
   读作「同一危险家族里更沉稳的一档」，配合边框亮度与标题文案共同区分两档。
   **方向刻意是「更深」而不是「更淡」** —— 更淡会同时削弱对比度和危险语义。
   动画：本组件刻意零动画（紧急信息不该有入场动效抢注意力），故无 reduced-motion 分支。

   ⚠️ 选择器**必须带 `.yk-ai-somatic` / `.yk-ai` 祖先前缀**，不能写裸 `.yk-ai-somatic__title`：
   AI 工具页的对话主体挂在 Starlight 的 `.sl-markdown-content` 里，那里有
   `.sl-markdown-content p { color: … }`（sakura 侧是 `html.sakura .sl-markdown-content p`，
   特异度 (0,2,2)）会压过 (0,2,1) 的裸 class 规则 → 卡片正文变成墨色写在墨底上。
   实测过：sakura 皮下 `.yk-ai-crisis__title/__body/__note` 现在就是 ink-on-ink 不可读
   （既有缺陷，本次不动危机卡，已单独上报）。加前缀后本卡是 (0,2,0)/(0,3,1)，稳定胜出。
   sakura-ai.css §6 的链接卡注释记的是同一个坑。
   ========================================================================= */
const SOMATIC_CSS = `
.yk-ai .yk-ai-somatic { background: var(--color-danger-dark, #D32F2F); border:1px solid var(--color-danger); color:#fff; padding:10px 12px; font-family: var(--font-body); display:flex; flex-direction:column; gap:6px; align-self:stretch; }
.yk-ai .yk-ai-somatic[data-tier='tier2-today'] { background-image: linear-gradient(var(--color-danger-bg-low), var(--color-danger-bg-low)); border-color: var(--color-danger-border); }
.yk-ai-somatic .yk-ai-somatic__title{ font-weight:700; font-size:.9375rem; color:#fff; margin:0; }
.yk-ai-somatic .yk-ai-somatic__body,
.yk-ai-somatic .yk-ai-somatic__action{ margin:0; font-size:.8125rem; line-height:1.6; color:#fff; }
.yk-ai-somatic .yk-ai-somatic__action{ font-weight:700; }
.yk-ai-somatic .yk-ai-somatic__line{ display:flex; align-items:center; justify-content:space-between; gap:8px; min-block-size:44px; padding:2px 8px; border:1px solid rgba(255,255,255,.55); color:#fff; text-decoration:underline; text-underline-offset:2px; }
.yk-ai-somatic .yk-ai-somatic__line:focus-visible{ outline:3px solid #fff; outline-offset:2px; }
.yk-ai-somatic .yk-ai-somatic__name{ font-size:.75rem; line-height:1.4; }
.yk-ai-somatic .yk-ai-somatic__num{ font-family: var(--font-mono, monospace); font-weight:700; font-size:.875rem; white-space:nowrap; }
.yk-ai-somatic .yk-ai-somatic__stop{ margin:0; font-size:.8125rem; line-height:1.6; color:#fff; padding-inline-start:8px; border-inline-start:2px solid rgba(255,255,255,.55); }
.yk-ai-somatic .yk-ai-somatic__note{ margin:0; font-size:.75rem; line-height:1.5; color:#fff; }
/* 降级提示条（R-PE 慢性已知诊断）：刻意非红、非卡片 —— 分量比 .yk-ai-error 还低一档，
   只做「这次别默认是老毛病」的轻提醒，不与真红卡争夺注意力。 */
/* 底色用 --color-caution-alpha-08（与 .yk-ai-banner--offline 同一低分量 token，
   两套主题下都可见；--color-white-alpha-03 在亮态奶油底上等于不存在）。
   文字用 --color-text-secondary：亮态 #5A5270 on #FAF7F2 ≈6.8:1、
   暗态 #CBC2DD on #191521 ≈10:1，均过 AA。 */
.yk-ai .yk-ai-somatic-soft { align-self:stretch; margin:0; padding:8px 12px; font-family: var(--font-body); font-size:.8125rem; line-height:1.6; color: var(--color-text-secondary); background: var(--color-caution-alpha-08); border-inline-start:3px solid var(--color-caution); }
`;
