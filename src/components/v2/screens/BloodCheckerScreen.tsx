/**
 * BloodCheckerScreen — 血检 HUD（直尺刻度 + 即时红绿灯 + 总判读）
 * 视觉移植自 design_files/ui_kits/yakuten/blood-checker-screen.jsx (142 行)
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  ⚠️ 本屏【刻意不照抄原型的医学逻辑】—— 三处偏离，均有据，请见 PR 说明
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 1) 阈值来源：用仓库 SSOT，不用原型硬编码的 5 项
 *    原型 :13-24 内联了 5 个指标，且 grade() 只判 `v > red`（【没有下限红区】）。
 *    对照仓库 SSOT（BloodTestChecker.tsx，classic 工具在用）：
 *      · E2 有 redBelow:20 —— 原型会把 E2=10 判成「偏离/注意」，SSOT 判【红区】
 *      · 少 hb（血红蛋白）与 ddimer（D-二聚体）—— 后者是【血栓标志物】，
 *        在一个 VTE 是头号风险的 HRT 安全站上漏掉它不可接受
 *      · 红区缺逐指标急救文案（SSOT 的 RED_WARNINGS 是四语的）
 *    CONSTITUTION §1：「任何代码/设计决策若可能造成用户身体伤害（剂量计算错误…），
 *    直接否决，无 PR 妥协空间」→ 照抄原型的 grade() 会正落在这一条上。
 *    → 本屏 import BLOOD_RANGES / evaluate / barBounds（同一份 SSOT，classic 与 v2 共用，
 *      不复制、不漂移）。视觉模板 100% 用原型的（RangeGauge + SealStamp + 冷判定）。
 *
 * 2) 首屏不再假警报
 *    原型 :9 默认 { e2:128, t:68, prl:22, alt:142, k:4.6 } —— ALT 红线是 120，
 *    142 > 120 → 每个访客一进来就看到冷判定「1 项危险指标 / 停药并尽快就医」，
 *    用的是他从没输入过的数字。演示原型无所谓，生产医疗站上这是狼来了。
 *    → 初始为【空】，有输入才判读。
 *
 * 3) 不写 localStorage
 *    原型 :11 写 `yak_blood`（血检数值！）。但设计包自己的 README「Interactions」写着
 *    「血检/对比/注射工具输入均为纯前端计算，零上传；【输入值不持久化（隐私）】，
 *    对比选择除外」，State Management 段也只列 yak_theme/yak_phase/yak_compare。
 *    → 原型代码违反了它自己的规格。以 README 为准，也与 CLAUDE.md
 *      「blood checker classic mode: pure frontend JS, zero storage」一致。
 */
import { useState } from 'react';
import { hrefFor } from '../routes';
import {
  BLOOD_RANGES, evaluate, barBounds, RED_WARNINGS,
  type RangeSpec, type Level,
} from '../../interactive/BloodTestChecker';
import { PageHead, InkCard, RangeGauge, SealStamp, Icon } from '../Primitives';

/** 判读态 → 印章文案 + 颜色。
   review #3：逐行印章不再统一喊「停药」—— 高 T 该调抗雄、低 E2 该加量、低 Hb 是贫血，
   都不是「停药」。改为中性的「偏高·就医」/「偏低·就医」，保留上/下限方向信息；
   「停不停哪个药」交给下方逐指标 RED_WARNINGS 与医生。 */
function stampFor(level: Level, value: number, spec: RangeSpec): [string, string] {
  if (level === 'red') {
    /* 区分上/下限红区 —— 原型没有下限概念（E2=10 与 E2=600 都是红区，含义完全不同）。 */
    const isLow = spec.redBelow !== undefined && value <= spec.redBelow;
    return [isLow ? '偏低·就医' : '偏高·就医', 'var(--danger)'];
  }
  if (level === 'green') return ['目标', 'var(--mint-deep)'];
  return ['注意', 'var(--honey)'];
}

/** 目标区间提示 —— 原型 :14-23 每项手写 hint，此处由 SSOT 的 green 区间派生，避免第二事实源。 */
function hintFor(spec: RangeSpec): string {
  const [lo, hi] = spec.green;
  if (lo === 0) return `正常 <${hi}`;
  return `目标 ${lo}–${hi}`;
}

export default function BloodCheckerScreen() {
  /* 空初始值：未输入 = undefined，不参与判读（对比原型的假数据默认值） */
  const [vals, setVals] = useState<Record<string, number | undefined>>({});

  const entered = BLOOD_RANGES.filter((r) => vals[r.id] != null && !Number.isNaN(vals[r.id]));
  const graded = entered.map((r) => {
    const v = vals[r.id] as number;
    const level = evaluate(r, v);
    const [label, color] = stampFor(level, v, r);
    return { r, v, level, label, color };
  });

  const nRed = graded.filter((g) => g.level === 'red').length;
  const nYellow = graded.filter((g) => g.level === 'yellow').length;
  const nGreen = graded.filter((g) => g.level === 'green').length;
  const hasInput = graded.length > 0;

  /* 总判读（review #2 / #3）：
     · 不再把任意红项聚合成通用「停药」—— 低 E2（剂量不足）、低 Hb（贫血）与
       高钾/严重肝酶异常的正确处置完全不同，统一喊「停药」可能诱导用户
       无监督停掉全部方案。改为中性的「需就医评估」，把「怎么处理/要不要停哪个药」
       留给下方【逐指标】的 RED_WARNINGS（每条都是审核过的、指标特异的行动）与医生。
     · 措辞从「危险指标」这种诊断口吻，改为「对照 HRT 目标区间」的比较口吻 ——
       因为工具不知道你的治疗阶段与实验室 ULN（见顶部上下文横幅）。 */
  const verdict = !hasInput
    ? { empty: true as const }
    : nRed > 0
      ? { cold: true as const, title: `${nRed} 项超出目标区间较多`, body: '请就医评估。下面按指标列出各自的处理方向，带上这页数值给医生看。' }
      : nYellow > 0
        ? { variant: 'gold' as const, icon: 'alert', title: `${nYellow} 项偏离目标区间`, body: '不必恐慌，但下次复查盯紧这些项，必要时与医生讨论。' }
        : { variant: 'mint' as const, icon: 'check', title: '对照区间均在目标内', body: '与目标区间一致。仍以医生对你化验单的判读为准。' };

  /* 红区指标的逐条急救文案 —— 来自 SSOT 的四语 RED_WARNINGS（v2 是 zh-only）。
     原型只有一句通用「停药并尽快就医」，丢掉了「高钾血症可能危及生命」这类
     指标特异的关键信息。 */
  const redNotes = graded.filter((g) => g.level === 'red').map((g) => RED_WARNINGS.zh[g.r.id]).filter(Boolean);

  const counters: Array<[string, number, string]> = [
    ['✓', nGreen, 'var(--mint-deep)'],
    ['!', nYellow, 'var(--honey)'],
    ['✕', nRed, 'var(--danger)'],
  ];

  return (
    <div className="yk-page yk-page--narrow">
      <PageHead
        volume="卷四" tab="血检" kicker="TOOLS · 血检自查"
        tapeColor="var(--mint)" pattern="stripes"
        title="血检" accent="HUD"
        lede="纯前端运行，零数据传输，不保存任何数值。输入血检数值，对照 HRT 目标区间。范围来自 WPATH SOC 8 和 Endocrine Society 2017。"
      />

      {/* 上下文前提（review #2）：本工具用固定阈值，不知道你的【治疗阶段】与【实验室 ULN】。
          用药前 T 偏高、E2 偏低本属正常；不同实验室的肝酶正常上限也不同（通常 >3×ULN 才需停药）。
          明确声明适用前提，避免把「用药前的正常值」或「另一实验室的参考范围」误判成红区裁定。 */}
      <div style={{
        marginTop: 8, padding: '12px 16px', borderRadius: 10,
        background: 'var(--butter)', border: '2px solid var(--ink)',
        fontSize: 12.5, color: 'var(--fg-1)', lineHeight: 1.7,
      }}>
        <strong>用之前先知道：</strong>本工具假设你<strong>正在接受 HRT</strong>，且采用常规实验室参考范围。
        <strong>用药前</strong>的数值（如尚未压制的睾酮）判读标准不同；肝酶等指标应以<strong>你化验单自带的正常上限</strong>为准
        （通常超过 3× 上限才考虑停药）。本工具是快速对照，不替代医生对你化验单的判读。
      </div>

      {/* 总裁定 */}
      {'empty' in verdict ? (
        <InkCard variant="cream" hoverLift={false} style={{ marginTop: 28, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Icon name="drop" size={26} color="var(--ink)" strokeWidth={2.5} />
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 17 }}>输入数值后即时判读</div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}>只填你手上有的项即可，留空的不参与判读。</div>
            </div>
          </div>
        </InkCard>
      ) : 'cold' in verdict ? (
        /* 危险时脱离可爱风：墨底红章，设计红线 */
        <div role="alert" style={{
          marginTop: 28, padding: '18px 20px',
          background: 'var(--ink)', border: '2px solid var(--danger)', borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
        }}>
          {/* 印章「就医」而非「停药」：seek care 是所有红区共通的正确动作；
              「停不停哪个药」因指标而异，交给下方逐指标 RED_WARNINGS 与医生。 */}
          <SealStamp color="var(--danger)" size="lg" rotate={-7}>就医</SealStamp>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 17, color: '#fff' }}>{verdict.title}</div>
            <div style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.6 }}>{verdict.body}</div>
            {/* 逐指标行动 —— SSOT 的 RED_WARNINGS：每条都指标特异（肝酶「建议立即停药并就医」、
                高钾「可能危及生命，请立即就医」、低 E2/Hb 则不含停药），不是通用停药指令。 */}
            {redNotes.length > 0 && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--sakura-blush)', lineHeight: 1.7 }}>
                {redNotes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
            <a href={hrefFor('urgent')} style={{ display: 'inline-block', marginTop: 10, fontFamily: 'var(--font-ui-accent)', fontSize: 12, fontWeight: 700, color: 'var(--sakura-pink)' }}>
              对照六条停药信号 →
            </a>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {counters.map(([s, n, c]) => (
              <span key={s} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 6,
                background: 'var(--ivory)', border: '2px solid var(--ink)',
                fontFamily: 'var(--font-hud)', fontSize: 13, fontWeight: 700, color: c,
                whiteSpace: 'nowrap',
              }}>{s} {n}</span>
            ))}
          </div>
        </div>
      ) : (
        <InkCard variant={verdict.variant} hoverLift={false} style={{ marginTop: 28, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {/* AA：原型用 verdict.color 同时做图标与文字色（honey/mint-deep 落浅底 <2:1）
                → 文字统一墨色；判读语义由卡片底色 + 计数徽章承载。 */}
            <Icon name={verdict.icon} size={26} color="var(--ink)" strokeWidth={2.5} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>{verdict.title}</div>
              <div style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.6 }}>{verdict.body}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {counters.map(([s, n, c]) => (
                <span key={s} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px', borderRadius: 999,
                  background: 'var(--ivory)', border: '2px solid var(--ink)',
                  fontFamily: 'var(--font-hud)', fontSize: 13, fontWeight: 700, color: c,
                  whiteSpace: 'nowrap',
                }}>{s} {n}</span>
              ))}
            </div>
          </div>
        </InkCard>
      )}

      {/* 逐指标输入 + 直尺刻度 + 判读印章 */}
      <InkCard variant="paper" hoverLift={false} style={{ marginTop: 20, padding: '8px 0' }}>
        {BLOOD_RANGES.map((r, idx) => {
          const v = vals[r.id];
          const has = v != null && !Number.isNaN(v);
          const level = has ? evaluate(r, v as number) : null;
          const [label, color] = has ? stampFor(level as Level, v as number, r) : ['—', 'var(--fg-2)'];
          /* domain 由 SSOT 的 barBounds 派生（原型是每项手写 domain）——
             同一函数 classic 也在用，刻度范围两个工具一致。 */
          const [lo, hi] = barBounds(r);
          const yellows: Array<[number, number]> = [r.yellow];
          /* 下限红区：原型的 RangeGauge 只支持「red 以上」单侧。
             低于 green 下界但未到 redBelow 的区段，SSOT 判 yellow → 补一段黄区，
             让刻度与 evaluate() 的判定一致（否则图与判读会自相矛盾）。 */
          if (r.redBelow !== undefined && r.green[0] > r.redBelow) {
            yellows.push([r.redBelow, r.green[0]]);
          }
          return (
            /* grid 布局移到 .yk-blood-row（v2-overrides.css §4a）：
               原型的 inline grid 最小 456px，在 375px 视口下必溢出，
               而 inline style 挂不了媒体查询。桌面端逐像素不变。 */
            <div key={r.id} className="yk-blood-row" style={{
              borderBottom: idx < BLOOD_RANGES.length - 1 ? '1px dashed var(--ink-faint)' : 'none',
            }}>
              <div>
                <label className="yk-field-label" htmlFor={`yk-in-${r.id}`}>
                  <span>{r.label}</span>
                  <span style={{ color: 'var(--fg-2)' }}>{r.unit}</span>
                </label>
                <input
                  id={`yk-in-${r.id}`}
                  className="yk-input"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="—"
                  value={v ?? ''}
                  aria-describedby={`yk-hint-${r.id}`}
                  aria-invalid={level === 'red' || undefined}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setVals((prev) => ({
                      ...prev,
                      /* 空串 → undefined（回到未输入），不再像原型那样 `|| 0` 把空值
                         变成 0 —— 那会让「没填」被判成一个真实的 0 值。 */
                      [r.id]: raw === '' ? undefined : parseFloat(raw),
                    }));
                  }}
                />
              </div>
              <div>
                <RangeGauge
                  value={has ? (v as number) : lo}
                  domain={[lo, hi]}
                  green={r.green}
                  yellows={yellows}
                  red={r.redAbove ?? null}
                />
                <div id={`yk-hint-${r.id}`} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--font-hud)', fontSize: 10, color: 'var(--fg-2)', fontWeight: 500 }}>
                  <span>{Math.round(lo * 10) / 10}</span>
                  <span style={{ color: 'var(--ink)', fontFamily: 'var(--font-ui-accent)', fontWeight: 700, whiteSpace: 'nowrap' }}>{hintFor(r)}</span>
                  <span>{Math.round(hi * 10) / 10}+</span>
                </div>
              </div>
              <div className="yk-blood-row__stamp" style={{ justifySelf: 'end' }}>
                <SealStamp color={color} rotate={-4}>{label}</SealStamp>
              </div>
            </div>
          );
        })}
      </InkCard>

      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <span className="yk-hand-note" style={{ transform: 'rotate(-0.8deg)' }}>
          采血要在谷值：下次注射 / 服药前采，否则数值不可比。
        </span>
      </div>

      <InkCard variant="cream" hoverLift={false} style={{ marginTop: 24, padding: '14px 20px', fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--sakura-pink-text)' }}>声明 ·</strong> 此工具仅供参考，不能替代医生的判读。数据在你的浏览器中计算，不上传任何服务器，也不保存在本地。
      </InkCard>
    </div>
  );
}
