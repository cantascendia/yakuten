import { useState, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';

type Locale = 'zh' | 'en' | 'ja';

function getLocale(): Locale {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/en')) return 'en';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ja')) return 'ja';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ko')) return 'en';
  return 'zh';
}

const UI_COPY = {
  zh: {
    regionLabel: '风险自评工具',
    title: '风险自评工具',
    disclaimerBanner: '本工具不能替代专业医疗评估。结果仅供参考，不构成诊断或用药建议。',
    start: '开始评估',
    startDesc: '回答 7 个简短问题，了解你的个人 HRT 风险因素概况。所有计算在浏览器本地完成，不上传任何数据。',
    next: '下一步',
    prev: '上一步',
    viewResults: '查看结果',
    retake: '重新评估',
    progress: '进度',
    resultTitle: '你的风险概况',
    resultDesc: '以下是根据你的回答生成的风险因素概况。请将此结果带给你的医疗服务提供者讨论。',
    learnMore: '了解更多',
    riskLow: '低风险',
    riskModerate: '需关注',
    riskHigh: '高风险',
    riskVeryHigh: '极高风险',
    q1_title: '年龄段',
    q1_desc: '年龄影响心血管和 VTE 风险',
    q1_a: '25 岁以下',
    q1_b: '25–35 岁',
    q1_c: '35–45 岁',
    q1_d: '45 岁以上',
    q2_title: '吸烟状态',
    q2_desc: '吸烟显著增加口服雌激素的 VTE 风险',
    q2_a: '从不吸烟',
    q2_b: '已戒烟',
    q2_c: '目前吸烟',
    q3_title: 'BMI 范围',
    q3_desc: '体重指数影响 VTE 和心血管风险',
    q3_a: 'BMI < 25（正常）',
    q3_b: 'BMI 25–30（超重）',
    q3_c: 'BMI 30–35（肥胖 I 级）',
    q3_d: 'BMI > 35（肥胖 II+ 级）',
    q4_title: '家族史',
    q4_desc: 'DVT/肺栓塞/中风的家族史',
    q4_a: '无相关家族史',
    q4_b: '有一级亲属（父母/兄弟姐妹）相关病史',
    q5_title: '当前抗雄药物',
    q5_desc: '不同抗雄药物有不同的风险特征',
    q5_a: '未使用抗雄药物',
    q5_b: '螺内酯',
    q5_c: '比卡鲁胺',
    q5_d: 'CPA ≤ 12.5 mg/天',
    q5_e: 'CPA > 12.5 mg/天',
    q5_f: 'GnRH 激动剂',
    q6_title: '肝脏病史',
    q6_desc: '某些药物具有肝毒性风险',
    q6_a: '无肝脏疾病史',
    q6_b: '曾有肝炎或 ALT/AST 升高',
    q6_c: '当前有活动性肝病',
    q7_title: '偏头痛类型',
    q7_desc: '先兆型偏头痛是口服雌激素的禁忌',
    q7_a: '无偏头痛',
    q7_b: '偏头痛（无先兆）',
    q7_c: '偏头痛（有先兆：视觉闪光/盲点）',
    cat_vte: 'VTE（血栓）风险',
    cat_liver: '肝脏风险',
    cat_meningioma: '脑膜瘤风险',
    cat_cardiovascular: '心血管风险',
  },
  en: {
    regionLabel: 'Risk screener',
    title: 'Risk Screener',
    disclaimerBanner: 'This tool cannot replace professional medical evaluation. Results are for reference only and do not constitute diagnosis or medication advice.',
    start: 'Start Assessment',
    startDesc: 'Answer 7 short questions to understand your personal HRT risk profile. All calculations run locally in your browser — no data is transmitted.',
    next: 'Next',
    prev: 'Previous',
    viewResults: 'View Results',
    retake: 'Retake',
    progress: 'Progress',
    resultTitle: 'Your Risk Profile',
    resultDesc: 'Below is a risk factor summary based on your answers. Please share this with your healthcare provider for discussion.',
    learnMore: 'Learn more',
    riskLow: 'Low risk',
    riskModerate: 'Monitor',
    riskHigh: 'High risk',
    riskVeryHigh: 'Very high risk',
    q1_title: 'Age Range',
    q1_desc: 'Age affects cardiovascular and VTE risk',
    q1_a: 'Under 25',
    q1_b: '25–35',
    q1_c: '35–45',
    q1_d: 'Over 45',
    q2_title: 'Smoking Status',
    q2_desc: 'Smoking significantly increases VTE risk with oral estrogen',
    q2_a: 'Never smoked',
    q2_b: 'Former smoker',
    q2_c: 'Current smoker',
    q3_title: 'BMI Range',
    q3_desc: 'Body mass index affects VTE and cardiovascular risk',
    q3_a: 'BMI < 25 (Normal)',
    q3_b: 'BMI 25–30 (Overweight)',
    q3_c: 'BMI 30–35 (Obese class I)',
    q3_d: 'BMI > 35 (Obese class II+)',
    q4_title: 'Family History',
    q4_desc: 'Family history of DVT / PE / stroke',
    q4_a: 'No relevant family history',
    q4_b: 'First-degree relative with relevant history',
    q5_title: 'Current Anti-androgen',
    q5_desc: 'Different anti-androgens carry different risk profiles',
    q5_a: 'Not using anti-androgen',
    q5_b: 'Spironolactone',
    q5_c: 'Bicalutamide',
    q5_d: 'CPA ≤ 12.5 mg/day',
    q5_e: 'CPA > 12.5 mg/day',
    q5_f: 'GnRH agonist',
    q6_title: 'Liver History',
    q6_desc: 'Some medications carry hepatotoxicity risk',
    q6_a: 'No liver disease history',
    q6_b: 'Previous hepatitis or elevated ALT/AST',
    q6_c: 'Current active liver disease',
    q7_title: 'Migraine Type',
    q7_desc: 'Migraine with aura is a contraindication for oral estrogen',
    q7_a: 'No migraine',
    q7_b: 'Migraine without aura',
    q7_c: 'Migraine with aura (visual flashes/blind spots)',
    cat_vte: 'VTE (Thrombosis) Risk',
    cat_liver: 'Liver Risk',
    cat_meningioma: 'Meningioma Risk',
    cat_cardiovascular: 'Cardiovascular Risk',
  },
  ja: {
    regionLabel: 'リスク自己評価ツール',
    title: 'リスク自己評価ツール',
    disclaimerBanner: 'このツールは専門的な医療評価の代替にはなりません。結果は参考情報のみであり、診断や処方の助言を構成するものではありません。',
    start: '評価を開始',
    startDesc: '7つの質問に答えて、あなたのHRTリスクプロファイルを把握しましょう。すべての計算はブラウザ内で完結し、データは送信されません。',
    next: '次へ',
    prev: '前へ',
    viewResults: '結果を見る',
    retake: 'やり直す',
    progress: '進捗',
    resultTitle: 'あなたのリスクプロファイル',
    resultDesc: '以下は回答に基づくリスク要因の概要です。医療提供者との相談にお役立てください。',
    learnMore: '詳細を見る',
    riskLow: '低リスク',
    riskModerate: '要注意',
    riskHigh: '高リスク',
    riskVeryHigh: '極めて高いリスク',
    q1_title: '年齢層',
    q1_desc: '年齢は心血管およびVTEリスクに影響します',
    q1_a: '25歳未満',
    q1_b: '25〜35歳',
    q1_c: '35〜45歳',
    q1_d: '45歳以上',
    q2_title: '喫煙状況',
    q2_desc: '喫煙は経口エストロゲンのVTEリスクを著しく増加させます',
    q2_a: '喫煙歴なし',
    q2_b: '禁煙済み',
    q2_c: '現在喫煙中',
    q3_title: 'BMI範囲',
    q3_desc: 'BMIはVTEおよび心血管リスクに影響します',
    q3_a: 'BMI < 25（正常）',
    q3_b: 'BMI 25〜30（過体重）',
    q3_c: 'BMI 30〜35（肥満I度）',
    q3_d: 'BMI > 35（肥満II度以上）',
    q4_title: '家族歴',
    q4_desc: 'DVT/肺塞栓/脳卒中の家族歴',
    q4_a: '関連する家族歴なし',
    q4_b: '一親等（両親/兄弟姉妹）に関連病歴あり',
    q5_title: '現在の抗アンドロゲン薬',
    q5_desc: '抗アンドロゲン薬ごとにリスクプロファイルが異なります',
    q5_a: '抗アンドロゲン薬未使用',
    q5_b: 'スピロノラクトン',
    q5_c: 'ビカルタミド',
    q5_d: 'CPA ≤ 12.5 mg/日',
    q5_e: 'CPA > 12.5 mg/日',
    q5_f: 'GnRHアゴニスト',
    q6_title: '肝臓の既往歴',
    q6_desc: '一部の薬剤には肝毒性リスクがあります',
    q6_a: '肝疾患の既往なし',
    q6_b: '肝炎またはALT/AST上昇の既往あり',
    q6_c: '現在活動性の肝疾患あり',
    q7_title: '片頭痛のタイプ',
    q7_desc: '前兆を伴う片頭痛は経口エストロゲンの禁忌です',
    q7_a: '片頭痛なし',
    q7_b: '前兆なし片頭痛',
    q7_c: '前兆あり片頭痛（視覚的閃光/暗点）',
    cat_vte: 'VTE（血栓）リスク',
    cat_liver: '肝臓リスク',
    cat_meningioma: '髄膜腫リスク',
    cat_cardiovascular: '心血管リスク',
  },
} as const;

/* ================================
   Question Definitions
   ================================ */

interface Question {
  id: string;
  titleKey: string;
  descKey: string;
  options: { key: string; value: string }[];
}

const QUESTIONS: Question[] = [
  { id: 'age', titleKey: 'q1_title', descKey: 'q1_desc', options: [
    { key: 'q1_a', value: 'under25' }, { key: 'q1_b', value: '25-35' },
    { key: 'q1_c', value: '35-45' }, { key: 'q1_d', value: 'over45' },
  ]},
  { id: 'smoking', titleKey: 'q2_title', descKey: 'q2_desc', options: [
    { key: 'q2_a', value: 'never' }, { key: 'q2_b', value: 'former' },
    { key: 'q2_c', value: 'current' },
  ]},
  { id: 'bmi', titleKey: 'q3_title', descKey: 'q3_desc', options: [
    { key: 'q3_a', value: 'normal' }, { key: 'q3_b', value: 'overweight' },
    { key: 'q3_c', value: 'obese1' }, { key: 'q3_d', value: 'obese2' },
  ]},
  { id: 'family', titleKey: 'q4_title', descKey: 'q4_desc', options: [
    { key: 'q4_a', value: 'none' }, { key: 'q4_b', value: 'yes' },
  ]},
  { id: 'antiandrogen', titleKey: 'q5_title', descKey: 'q5_desc', options: [
    { key: 'q5_a', value: 'none' }, { key: 'q5_b', value: 'spiro' },
    { key: 'q5_c', value: 'bica' }, { key: 'q5_d', value: 'cpa_low' },
    { key: 'q5_e', value: 'cpa_high' }, { key: 'q5_f', value: 'gnrh' },
  ]},
  { id: 'liver', titleKey: 'q6_title', descKey: 'q6_desc', options: [
    { key: 'q6_a', value: 'none' }, { key: 'q6_b', value: 'history' },
    { key: 'q6_c', value: 'active' },
  ]},
  { id: 'migraine', titleKey: 'q7_title', descKey: 'q7_desc', options: [
    { key: 'q7_a', value: 'none' }, { key: 'q7_b', value: 'no_aura' },
    { key: 'q7_c', value: 'with_aura' },
  ]},
];

/* ================================
   Risk Scoring
   ================================ */

const RISK_ANCHORS: Record<Locale, { vte: string; liver: string; meningioma: string; cardiovascular: string }> = {
  zh: {
    vte: '#深静脉血栓-dvt',
    liver: '#肝功能损伤',
    meningioma: '#脑膜瘤',
    cardiovascular: '#心血管并发症',
  },
  en: {
    vte: '#deep-vein-thrombosis-dvt',
    liver: '#hepatic-injury',
    meningioma: '#meningioma',
    cardiovascular: '#cardiovascular-complications',
  },
  ja: {
    vte: '#深部静脈血栓症-dvt',
    liver: '#肝障害',
    meningioma: '#髄膜腫',
    cardiovascular: '#心血管系合併症',
  },
};

type RiskLevel = 'low' | 'moderate' | 'high' | 'very_high';

interface RiskResult {
  category: string;
  categoryKey: string;
  level: RiskLevel;
  factors: string[];
  anchor: string;
}

function computeRisks(answers: Record<string, string>, locale: Locale): RiskResult[] {
  const ui = UI_COPY[locale];
  const results: RiskResult[] = [];

  // VTE Risk
  let vteScore = 0;
  const vteFactors: string[] = [];
  if (answers.age === 'over45') { vteScore += 2; vteFactors.push(ui.q1_d); }
  else if (answers.age === '35-45') { vteScore += 1; vteFactors.push(ui.q1_c); }
  if (answers.smoking === 'current') { vteScore += 3; vteFactors.push(ui.q2_c); }
  else if (answers.smoking === 'former') { vteScore += 1; vteFactors.push(ui.q2_b); }
  if (answers.bmi === 'obese2') { vteScore += 2; vteFactors.push(ui.q3_d); }
  else if (answers.bmi === 'obese1') { vteScore += 1; vteFactors.push(ui.q3_c); }
  if (answers.family === 'yes') { vteScore += 2; vteFactors.push(ui.q4_b); }
  if (answers.antiandrogen === 'cpa_high' || answers.antiandrogen === 'cpa_low') {
    vteScore += 1; vteFactors.push(answers.antiandrogen === 'cpa_high' ? ui.q5_e : ui.q5_d);
  }
  if (answers.migraine === 'with_aura') { vteScore += 1; vteFactors.push(ui.q7_c); }

  const anchors = RISK_ANCHORS[locale];
  results.push({
    category: ui.cat_vte,
    categoryKey: 'vte',
    level: vteScore >= 5 ? 'very_high' : vteScore >= 3 ? 'high' : vteScore >= 1 ? 'moderate' : 'low',
    factors: vteFactors,
    anchor: anchors.vte,
  });

  // Liver Risk
  let liverScore = 0;
  const liverFactors: string[] = [];
  if (answers.liver === 'active') { liverScore += 3; liverFactors.push(ui.q6_c); }
  else if (answers.liver === 'history') { liverScore += 1; liverFactors.push(ui.q6_b); }
  if (answers.antiandrogen === 'cpa_high' || answers.antiandrogen === 'cpa_low') {
    liverScore += 1; liverFactors.push(answers.antiandrogen === 'cpa_high' ? ui.q5_e : ui.q5_d);
  }
  if (answers.antiandrogen === 'bica') { liverScore += 1; liverFactors.push(ui.q5_c); }

  results.push({
    category: ui.cat_liver,
    categoryKey: 'liver',
    level: liverScore >= 4 ? 'very_high' : liverScore >= 3 ? 'high' : liverScore >= 1 ? 'moderate' : 'low',
    factors: liverFactors,
    anchor: anchors.liver,
  });

  // Meningioma Risk
  let meningiomaScore = 0;
  const meningiomaFactors: string[] = [];
  if (answers.antiandrogen === 'cpa_high') { meningiomaScore += 4; meningiomaFactors.push(ui.q5_e); }
  else if (answers.antiandrogen === 'cpa_low') { meningiomaScore += 1; meningiomaFactors.push(ui.q5_d); }

  results.push({
    category: ui.cat_meningioma,
    categoryKey: 'meningioma',
    level: meningiomaScore >= 4 ? 'very_high' : meningiomaScore >= 2 ? 'high' : meningiomaScore >= 1 ? 'moderate' : 'low',
    factors: meningiomaFactors,
    anchor: anchors.meningioma,
  });

  // Cardiovascular Risk
  let cvScore = 0;
  const cvFactors: string[] = [];
  if (answers.age === 'over45') { cvScore += 2; cvFactors.push(ui.q1_d); }
  else if (answers.age === '35-45') { cvScore += 1; cvFactors.push(ui.q1_c); }
  if (answers.smoking === 'current') { cvScore += 2; cvFactors.push(ui.q2_c); }
  if (answers.bmi === 'obese2') { cvScore += 2; cvFactors.push(ui.q3_d); }
  else if (answers.bmi === 'obese1') { cvScore += 1; cvFactors.push(ui.q3_c); }
  if (answers.family === 'yes') { cvScore += 1; cvFactors.push(ui.q4_b); }

  results.push({
    category: ui.cat_cardiovascular,
    categoryKey: 'cardiovascular',
    level: cvScore >= 5 ? 'very_high' : cvScore >= 3 ? 'high' : cvScore >= 1 ? 'moderate' : 'low',
    factors: cvFactors,
    anchor: anchors.cardiovascular,
  });

  return results;
}

/* ================================
   Styles
   ================================ */

const LEVEL_COLORS: Record<RiskLevel, string> = {
  low: 'var(--color-safe)',
  moderate: 'var(--color-caution)',
  high: 'var(--color-danger)',
  very_high: 'var(--color-danger-dark)',
};

const s: Record<string, CSSProperties> = {
  container: {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: 'var(--glass-border)',
    clipPath: 'var(--clip-corner)',
    padding: 'var(--space-xl)',
    marginBlock: 'var(--space-xl)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-md)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  iconBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    color: 'var(--color-accent)',
  },
  disclaimerBar: {
    background: 'var(--color-danger-alpha-10)',
    borderLeft: '4px solid var(--color-danger)',
    padding: 'var(--space-sm) var(--space-md)',
    marginBottom: 'var(--space-lg)',
    color: 'var(--color-danger)',
    fontWeight: 600,
    fontSize: '0.8125rem',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.6,
  },
  startBox: {
    textAlign: 'center' as const,
    padding: 'var(--space-2xl) var(--space-xl)',
  },
  startDesc: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.875rem',
    lineHeight: 1.6,
    marginBottom: 'var(--space-xl)',
    fontFamily: 'var(--font-body)',
    maxWidth: '500px',
    marginInline: 'auto',
  },
  startBtn: {
    padding: 'var(--space-md) var(--space-xl)',
    background: 'var(--color-primary)',
    color: 'var(--color-text-on-dark)',
    border: 'none',
    fontFamily: 'var(--font-body)',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    clipPath: 'var(--clip-corner-sm)',
    transition: 'opacity var(--transition-fast)',
  },
  progressBar: {
    height: '4px',
    background: 'var(--color-bg-container)',
    marginBottom: 'var(--space-xl)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--color-primary)',
    transition: 'width var(--transition-normal)',
  },
  questionCard: {
    minHeight: '280px',
  },
  questionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-xs)',
  },
  questionDesc: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
    marginBottom: 'var(--space-lg)',
    fontFamily: 'var(--font-body)',
  },
  optionLabel: {
    display: 'block',
    padding: 'var(--space-md)',
    marginBottom: 'var(--space-sm)',
    background: 'var(--color-bg-container)',
    border: '1px solid var(--color-outline-20)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    color: 'var(--color-text-primary)',
    transition: 'border-color var(--transition-fast), background var(--transition-fast)',
    lineHeight: 1.6,
  },
  optionSelected: {
    display: 'block',
    padding: 'var(--space-sm) var(--space-md)',
    marginBottom: 'var(--space-sm)',
    background: 'var(--color-primary-alpha-10)',
    border: '1px solid var(--color-primary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    color: 'var(--color-text-primary)',
    transition: 'border-color var(--transition-fast), background var(--transition-fast)',
    lineHeight: 1.6,
  },
  hiddenRadio: {
    position: 'absolute' as const,
    opacity: 0,
    width: 0,
    height: 0,
  },
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 'var(--space-xl)',
    gap: 'var(--space-md)',
  },
  navBtn: {
    padding: 'var(--space-sm) var(--space-lg)',
    background: 'var(--color-bg-container)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-outline)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
  },
  navBtnPrimary: {
    padding: 'var(--space-sm) var(--space-lg)',
    background: 'var(--color-primary)',
    color: 'var(--color-text-on-dark)',
    border: 'none',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity var(--transition-fast)',
  },
  navBtnDisabled: {
    padding: 'var(--space-sm) var(--space-lg)',
    background: 'var(--color-bg-container)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-outline-20)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 'var(--space-lg)',
    marginTop: 'var(--space-lg)',
  },
  resultCard: {
    background: 'var(--color-bg-container)',
    border: '1px solid var(--color-outline-20)',
    clipPath: 'var(--clip-corner-sm)',
    padding: 'var(--space-md)',
  },
  resultCategory: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: 'var(--color-text-muted)',
    marginBottom: 'var(--space-sm)',
    fontFamily: 'var(--font-body)',
  },
  resultLevel: {
    fontSize: '1.25rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    marginBottom: 'var(--space-sm)',
  },
  resultFactors: {
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.6,
    fontFamily: 'var(--font-body)',
  },
  resultLink: {
    display: 'inline-block',
    marginTop: 'var(--space-sm)',
    fontSize: '0.75rem',
    color: 'var(--color-primary)',
    textDecoration: 'underline',
    fontFamily: 'var(--font-body)',
  },
  resultDesc: {
    color: 'var(--color-text-secondary)',
    fontSize: '0.8125rem',
    lineHeight: 1.6,
    fontFamily: 'var(--font-body)',
    marginBottom: 'var(--space-md)',
  },
  riskBar: {
    height: '8px',
    background: 'linear-gradient(to right, var(--color-safe), var(--color-caution), var(--color-danger))',
    position: 'relative' as const,
    marginTop: 'var(--space-sm)',
    marginBottom: 'var(--space-sm)',
  } as CSSProperties,
  riskMarker: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '14px',
    height: '14px',
    background: '#fff',
    borderRadius: '50%',
    boxShadow: '0 0 6px rgba(0,0,0,0.5)',
  } as CSSProperties,
  retakeBtn: {
    padding: 'var(--space-sm) var(--space-xl)',
    background: 'var(--color-bg-container)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-outline)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    marginTop: 'var(--space-xl)',
  },
};

/* ================================
   Component
   ================================ */

export default function RiskScreener() {
  const locale = getLocale();
  const ui = UI_COPY[locale];
  const [step, setStep] = useState(-1); // -1 = intro, 0-6 = questions, 7 = results
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswer = useCallback((qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  }, []);

  const risks = useMemo(() => {
    if (step < QUESTIONS.length) return [];
    return computeRisks(answers, locale);
  }, [step, answers, locale]);

  const allAnswered = QUESTIONS.every(q => answers[q.id] !== undefined);
  const currentAnswered = step >= 0 && step < QUESTIONS.length && answers[QUESTIONS[step].id] !== undefined;

  const getRiskLabel = (level: RiskLevel): string => {
    if (level === 'low') return ui.riskLow;
    if (level === 'moderate') return ui.riskModerate;
    if (level === 'high') return ui.riskHigh;
    return ui.riskVeryHigh;
  };

  const risksPagePath = `/${locale}/risks/`;

  // Intro screen
  if (step === -1) {
    return (
      <div style={s.container} role="region" aria-label={ui.regionLabel}>
        <div style={s.title}>
          <span style={s.iconBadge}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          {ui.title}
        </div>
        <div style={s.disclaimerBar} role="alert">{ui.disclaimerBanner}</div>
        <div style={s.startBox}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--color-accent)', marginBottom: 'var(--space-md)' }}>
            {locale === 'zh' ? '7 个问题 · 约 2 分钟' : locale === 'ja' ? '7問 · 約2分' : '7 questions · ~2 minutes'}
          </div>
          <div style={s.startDesc}>{ui.startDesc}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: 'var(--space-sm) var(--space-md)', borderLeft: '2px solid var(--color-accent)', marginTop: 'var(--space-md)', marginBottom: 'var(--space-xl)', textAlign: 'left', maxWidth: '500px', marginInline: 'auto' }}>
            {locale === 'zh' ? '高风险不代表不能使用 HRT，只意味着需要更密切的监测。' : locale === 'ja' ? '高リスク ≠ HRT不可。より注意深いモニタリングが必要という意味です。' : 'High risk ≠ no HRT. It means closer monitoring is needed.'}
          </div>
          <button type="button" style={s.startBtn} onClick={() => setStep(0)}>
            {ui.start}
          </button>
        </div>
      </div>
    );
  }

  // Results screen
  if (step >= QUESTIONS.length) {
    return (
      <div style={s.container} role="region" aria-label={ui.regionLabel}>
        <div style={s.title}>
          <span style={s.iconBadge}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          {ui.resultTitle}
        </div>
        <div style={s.disclaimerBar} role="alert">{ui.disclaimerBanner}</div>
        <div style={s.resultDesc}>{ui.resultDesc}</div>

        <div style={s.resultsGrid}>
          {risks.map(r => (
            <div key={r.categoryKey} style={s.resultCard}>
              <div style={s.resultCategory}>{r.category}</div>
              <div style={{ ...s.resultLevel, color: LEVEL_COLORS[r.level] }}>
                {getRiskLabel(r.level)}
              </div>
              {/* Gradient risk bar */}
              <div style={s.riskBar}>
                <div style={{
                  ...s.riskMarker,
                  left: r.level === 'low' ? '15%' : r.level === 'moderate' ? '45%' : r.level === 'high' ? '70%' : '90%',
                }} />
              </div>
              {r.factors.length > 0 && (
                <div style={s.resultFactors}>
                  {r.factors.map((f, i) => (
                    <span key={i}>
                      {i > 0 && ' · '}
                      {f}
                    </span>
                  ))}
                </div>
              )}
              <a href={risksPagePath + r.anchor} style={s.resultLink}>
                {ui.learnMore} →
              </a>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' as const, justifyContent: 'center' }}>
          <button type="button" style={s.retakeBtn} onClick={() => window.print()}>
            {locale === 'zh' ? '打印/保存结果' : locale === 'ja' ? '結果を印刷' : 'Print results'}
          </button>
          <button type="button" style={s.retakeBtn} onClick={() => { setStep(-1); setAnswers({}); }}>
            {ui.retake}
          </button>
        </div>
      </div>
    );
  }

  // Question screen
  const q = QUESTIONS[step];
  const uiAny = ui as Record<string, string>;

  return (
    <div style={s.container} role="region" aria-label={ui.regionLabel}>
      <div style={s.title}>
        <span style={s.iconBadge}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
        {ui.title}
      </div>
      <div style={s.disclaimerBar} role="alert">{ui.disclaimerBanner}</div>

      {/* Progress */}
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-accent)', marginBottom: 'var(--space-xs)' }}>
        Q{step + 1}/{QUESTIONS.length}
      </div>
      <div style={{ height: '3px', background: 'var(--color-outline-20)', marginBottom: 'var(--space-xl)', overflow: 'hidden' }} role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={QUESTIONS.length} aria-label={ui.progress}>
        <div style={{ height: '100%', background: 'var(--color-primary)', transition: 'width var(--transition-normal)', width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
      </div>

      {/* Question */}
      <div style={s.questionCard}>
        <div style={s.questionTitle}>
          {step + 1}. {uiAny[q.titleKey]}
        </div>
        <div style={s.questionDesc}>{uiAny[q.descKey]}</div>

        <div role="radiogroup" aria-label={uiAny[q.titleKey]}>
          {q.options.map(opt => {
            const isSelected = answers[q.id] === opt.value;
            return (
              <label
                key={opt.value}
                style={isSelected ? s.optionSelected : s.optionLabel}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => handleAnswer(q.id, opt.value)}
                  style={s.hiddenRadio}
                />
                {uiAny[opt.key]}
              </label>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div style={s.navRow}>
        <button
          type="button"
          style={step === 0 ? s.navBtnDisabled : s.navBtn}
          onClick={() => step > 0 && setStep(step - 1)}
          disabled={step === 0}
        >
          {ui.prev}
        </button>
        {step < QUESTIONS.length - 1 ? (
          <button
            type="button"
            style={currentAnswered ? s.navBtnPrimary : s.navBtnDisabled}
            onClick={() => currentAnswered && setStep(step + 1)}
            disabled={!currentAnswered}
          >
            {ui.next}
          </button>
        ) : (
          <button
            type="button"
            style={allAnswered ? s.navBtnPrimary : s.navBtnDisabled}
            onClick={() => allAnswered && setStep(QUESTIONS.length)}
            disabled={!allAnswered}
          >
            {ui.viewResults}
          </button>
        )}
      </div>
    </div>
  );
}
