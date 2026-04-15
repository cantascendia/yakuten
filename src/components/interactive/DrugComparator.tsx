import { useState, useMemo, type ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { getDrugPageUrl, getLocaleFromPath } from '../../utils/drugLinks';

type Locale = 'zh' | 'en' | 'ja';

function getLocale(): Locale {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/en')) return 'en';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ja')) return 'ja';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ko')) return 'en';
  return 'zh';
}

const UI_COPY = {
  zh: {
    regionLabel: '药物比较器',
    title: '药物比较器',
    selectDrug: '选择药物',
    addThird: '+ 添加第三个',
    removeThird: '移除',
    category: '分类',
    route: '给药途径',
    doseStart: '起始剂量',
    doseMaintenance: '维持剂量',
    doseMax: '最大剂量',
    frequency: '给药频率',
    halfLife: '半衰期',
    bioavailability: '生物利用度',
    vteRisk: 'VTE 风险',
    vteRR: '相对风险 (RR)',
    evidenceLevel: '证据等级',
    monitoringTests: '监测项目',
    contraindications: '绝对禁忌',
    catEstrogen: '雌激素',
    catAntiandrogen: '抗雄激素',
    catProgestogen: '孕激素',
    riskLow: '低',
    riskModerate: '中等',
    riskHigh: '高',
    riskVeryHigh: '极高',
    cat5ari: '5α-还原酶抑制剂',
    disclaimer: '本工具仅供比较药物特性参考，不构成用药建议。请结合个人情况咨询医疗专业人员。',
  },
  en: {
    regionLabel: 'Drug comparator',
    title: 'Drug Comparator',
    selectDrug: 'Select medication',
    addThird: '+ Add third',
    removeThird: 'Remove',
    category: 'Category',
    route: 'Route',
    doseStart: 'Starting dose',
    doseMaintenance: 'Maintenance dose',
    doseMax: 'Maximum dose',
    frequency: 'Frequency',
    halfLife: 'Half-life',
    bioavailability: 'Bioavailability',
    vteRisk: 'VTE risk',
    vteRR: 'Relative risk (RR)',
    evidenceLevel: 'Evidence level',
    monitoringTests: 'Monitoring',
    contraindications: 'Absolute contraindications',
    catEstrogen: 'Estrogen',
    catAntiandrogen: 'Anti-androgen',
    catProgestogen: 'Progestogen',
    riskLow: 'Low',
    riskModerate: 'Moderate',
    riskHigh: 'High',
    riskVeryHigh: 'Very high',
    cat5ari: '5\u03b1-Reductase Inhibitor',
    disclaimer: 'This tool is for comparing drug characteristics only and does not constitute medical advice. Consult a healthcare professional for personalized guidance.',
  },
  ja: {
    regionLabel: '薬物比較ツール',
    title: '薬物比較ツール',
    selectDrug: '薬剤を選択',
    addThird: '+ 3つ目を追加',
    removeThird: '削除',
    category: '分類',
    route: '投与経路',
    doseStart: '開始用量',
    doseMaintenance: '維持用量',
    doseMax: '最大用量',
    frequency: '投与頻度',
    halfLife: '半減期',
    bioavailability: '生物学的利用率',
    vteRisk: 'VTEリスク',
    vteRR: '相対リスク (RR)',
    evidenceLevel: 'エビデンスレベル',
    monitoringTests: 'モニタリング',
    contraindications: '絶対禁忌',
    catEstrogen: 'エストロゲン',
    catAntiandrogen: '抗アンドロゲン',
    catProgestogen: 'プロゲストーゲン',
    riskLow: '低',
    riskModerate: '中等',
    riskHigh: '高',
    riskVeryHigh: '極めて高い',
    cat5ari: '5α還元酵素阻害薬',
    disclaimer: 'このツールは薬物特性の比較のみを目的としており、医学的助言を構成するものではありません。個別の指導については医療専門家にご相談ください。',
  },
} as const;

/* ================================
   Drug Data (inlined from drugs.json, excluding banned)
   ================================ */

interface DrugCompare {
  id: string;
  names: { zh: string; en: string; ja: string };
  category: 'estrogen' | 'antiandrogen' | 'progestogen' | '5ari';
  route: { zh: string; en: string; ja: string };
  doseStart: string;
  doseMaintenance: string;
  doseMax: string;
  frequency: { zh: string; en: string; ja: string };
  halfLife: string;
  bioavailability: string;
  vteRR: number;
  evidenceLevel: string;
  monitoring: string[];
  contraindications: { zh: string[]; en: string[]; ja: string[] };
}

const DRUGS: DrugCompare[] = [
  {
    id: 'estradiol-oral',
    names: { zh: '口服雌二醇', en: 'Oral Estradiol', ja: '経口エストラジオール' },
    category: 'estrogen',
    route: { zh: '口服', en: 'Oral', ja: '経口' },
    doseStart: '2 mg/天',
    doseMaintenance: '2–4 mg/天',
    doseMax: '10 mg/天',
    frequency: { zh: '每日1-2次', en: '1-2x daily', ja: '1日1-2回' },
    halfLife: '12–20h',
    bioavailability: '~5%',
    vteRR: 1.48,
    evidenceLevel: 'A',
    monitoring: ['E2', 'T', 'ALT/AST'],
    contraindications: {
      zh: ['活动性DVT/PE', '凝血障碍', '雌激素依赖性肿瘤', '严重肝病'],
      en: ['Active DVT/PE', 'Coagulation disorder', 'Estrogen-dependent tumor', 'Severe liver disease'],
      ja: ['活動性DVT/PE', '凝固障害', 'エストロゲン依存性腫瘍', '重度肝疾患'],
    },
  },
  {
    id: 'estradiol-sublingual',
    names: { zh: '舌下含服雌二醇', en: 'Sublingual Estradiol', ja: '舌下エストラジオール' },
    category: 'estrogen',
    route: { zh: '舌下含服', en: 'Sublingual', ja: '舌下' },
    doseStart: '1–2 mg/天',
    doseMaintenance: '2–4 mg/天',
    doseMax: '8 mg/天',
    frequency: { zh: '每日2-3次', en: '2-3x daily', ja: '1日2-3回' },
    halfLife: '6–8h',
    bioavailability: '~25%',
    vteRR: 1.48,
    evidenceLevel: 'B',
    monitoring: ['E2', 'T'],
    contraindications: {
      zh: ['活动性DVT/PE', '凝血障碍', '雌激素依赖性肿瘤'],
      en: ['Active DVT/PE', 'Coagulation disorder', 'Estrogen-dependent tumor'],
      ja: ['活動性DVT/PE', '凝固障害', 'エストロゲン依存性腫瘍'],
    },
  },
  {
    id: 'estradiol-patch',
    names: { zh: '雌二醇贴片', en: 'Estradiol Patch', ja: 'エストラジオール貼付剤' },
    category: 'estrogen',
    route: { zh: '经皮（贴片）', en: 'Transdermal (patch)', ja: '経皮（パッチ）' },
    doseStart: '50 µg/天',
    doseMaintenance: '100–200 µg/天',
    doseMax: '400 µg/天',
    frequency: { zh: '每3.5天更换', en: 'Every 3.5 days', ja: '3.5日ごと交換' },
    halfLife: '—',
    bioavailability: '~10%',
    vteRR: 0.97,
    evidenceLevel: 'A',
    monitoring: ['E2', 'T'],
    contraindications: {
      zh: ['贴片过敏', '皮肤损伤处', '雌激素依赖性肿瘤'],
      en: ['Patch allergy', 'Damaged skin', 'Estrogen-dependent tumor'],
      ja: ['パッチアレルギー', '皮膚損傷部位', 'エストロゲン依存性腫瘍'],
    },
  },
  {
    id: 'estradiol-gel',
    names: { zh: '雌二醇凝胶', en: 'Estradiol Gel', ja: 'エストラジオールゲル' },
    category: 'estrogen',
    route: { zh: '经皮（凝胶）', en: 'Transdermal (gel)', ja: '経皮（ゲル）' },
    doseStart: '1.5 mg/天',
    doseMaintenance: '3–6 mg/天',
    doseMax: '6 mg/天',
    frequency: { zh: '每日1次', en: 'Once daily', ja: '1日1回' },
    halfLife: '—',
    bioavailability: '~10%',
    vteRR: 0.97,
    evidenceLevel: 'B',
    monitoring: ['E2', 'T'],
    contraindications: {
      zh: ['凝胶成分过敏', '雌激素依赖性肿瘤'],
      en: ['Gel component allergy', 'Estrogen-dependent tumor'],
      ja: ['ゲル成分アレルギー', 'エストロゲン依存性腫瘍'],
    },
  },
  {
    id: 'estradiol-injection',
    names: { zh: '戊酸雌二醇注射', en: 'Estradiol Valerate (IM/SC)', ja: 'エストラジオール吉草酸エステル注射' },
    category: 'estrogen',
    route: { zh: '肌注/皮下', en: 'IM / SC injection', ja: '筋注/皮下注射' },
    doseStart: '2–4 mg',
    doseMaintenance: '4–6 mg',
    doseMax: '10 mg',
    frequency: { zh: '每4-7天', en: 'Every 4-7 days', ja: '4-7日ごと' },
    halfLife: '4–5 天',
    bioavailability: '~100%',
    vteRR: 1.0,
    evidenceLevel: 'A',
    monitoring: ['E2', 'T'],
    contraindications: {
      zh: ['注射部位感染', '凝血障碍（相对）', '雌激素依赖性肿瘤'],
      en: ['Injection site infection', 'Coagulation disorder (relative)', 'Estrogen-dependent tumor'],
      ja: ['注射部位感染', '凝固障害（相対的）', 'エストロゲン依存性腫瘍'],
    },
  },
  {
    id: 'cpa',
    names: { zh: '醋酸环丙孕酮 (CPA)', en: 'Cyproterone Acetate (CPA)', ja: '酢酸シプロテロン (CPA)' },
    category: 'antiandrogen',
    route: { zh: '口服', en: 'Oral', ja: '経口' },
    doseStart: '5–12.5 mg/天',
    doseMaintenance: '5–12.5 mg/天',
    doseMax: '12.5 mg/天',
    frequency: { zh: '每日或隔日', en: 'Daily or every other day', ja: '毎日または隔日' },
    halfLife: '1.5–4 天',
    bioavailability: '~100%',
    vteRR: 2.0,
    evidenceLevel: 'A',
    monitoring: ['T', 'PRL', 'ALT/AST', 'MRI'],
    contraindications: {
      zh: ['脑膜瘤（现有或既往）', '严重肝病', '重度抑郁（未治疗）'],
      en: ['Meningioma (current or history)', 'Severe liver disease', 'Severe untreated depression'],
      ja: ['髄膜腫（現在または既往）', '重度肝疾患', '重度未治療うつ病'],
    },
  },
  {
    id: 'spironolactone',
    names: { zh: '螺内酯', en: 'Spironolactone', ja: 'スピロノラクトン' },
    category: 'antiandrogen',
    route: { zh: '口服', en: 'Oral', ja: '経口' },
    doseStart: '50 mg/天',
    doseMaintenance: '100–200 mg/天',
    doseMax: '300 mg/天',
    frequency: { zh: '每日1-2次', en: '1-2x daily', ja: '1日1-2回' },
    halfLife: '1.4h (canrenone 10–23h)',
    bioavailability: '~73%',
    vteRR: 1.0,
    evidenceLevel: 'B',
    monitoring: ['T', 'K+', 'BP', 'Cr'],
    contraindications: {
      zh: ['高钾血症', '严重肾功能不全', 'Addison 病'],
      en: ['Hyperkalemia', 'Severe renal impairment', "Addison's disease"],
      ja: ['高カリウム血症', '重度腎不全', 'アジソン病'],
    },
  },
  {
    id: 'bicalutamide',
    names: { zh: '比卡鲁胺', en: 'Bicalutamide', ja: 'ビカルタミド' },
    category: 'antiandrogen',
    route: { zh: '口服', en: 'Oral', ja: '経口' },
    doseStart: '25–50 mg/天',
    doseMaintenance: '50 mg/天',
    doseMax: '50 mg/天',
    frequency: { zh: '每日1次', en: 'Once daily', ja: '1日1回' },
    halfLife: '5–6 天',
    bioavailability: '—',
    vteRR: 1.0,
    evidenceLevel: 'C',
    monitoring: ['T', 'ALT/AST'],
    contraindications: {
      zh: ['严重肝损伤', '药物过敏'],
      en: ['Severe liver injury', 'Drug allergy'],
      ja: ['重度肝障害', '薬物アレルギー'],
    },
  },
  {
    id: 'gnrh-agonist',
    names: { zh: 'GnRH 激动剂', en: 'GnRH Agonist', ja: 'GnRHアゴニスト' },
    category: 'antiandrogen',
    route: { zh: '注射（缓释）', en: 'Injection (depot)', ja: '注射（デポ剤）' },
    doseStart: '3.75 mg/月',
    doseMaintenance: '3.75 mg/月 或 11.25 mg/3月',
    doseMax: '11.25 mg/3月',
    frequency: { zh: '每月或每3月', en: 'Monthly or every 3 months', ja: '毎月または3ヶ月ごと' },
    halfLife: '3h（缓释持续1–3月）',
    bioavailability: '~100%',
    vteRR: 1.0,
    evidenceLevel: 'A',
    monitoring: ['T', 'LH/FSH'],
    contraindications: {
      zh: ['对GnRH类过敏', '妊娠'],
      en: ['GnRH hypersensitivity', 'Pregnancy'],
      ja: ['GnRH過敏症', '妊娠'],
    },
  },
  {
    id: 'progesterone',
    names: { zh: '微粒化黄体酮', en: 'Micronized Progesterone', ja: '微粒化プロゲステロン' },
    category: 'progestogen',
    route: { zh: '口服/直肠', en: 'Oral / Rectal', ja: '経口/直腸' },
    doseStart: '100 mg/天',
    doseMaintenance: '100–200 mg/天',
    doseMax: '200 mg/天',
    frequency: { zh: '每晚睡前', en: 'Nightly', ja: '就寝前' },
    halfLife: '16–18h',
    bioavailability: '~10% (oral)',
    vteRR: 1.0,
    evidenceLevel: 'C',
    monitoring: ['PRL'],
    contraindications: {
      zh: ['对花生过敏（含花生油）', '严重肝病'],
      en: ['Peanut allergy (contains peanut oil)', 'Severe liver disease'],
      ja: ['ピーナッツアレルギー（ピーナッツ油含有）', '重度肝疾患'],
    },
  },
  {
    id: 'hydroxyprogesterone',
    names: { zh: '己酸羟孕酮', en: 'Hydroxyprogesterone Caproate', ja: 'カプロン酸ヒドロキシプロゲステロン' },
    category: 'progestogen',
    route: { zh: '肌注', en: 'IM injection', ja: '筋注' },
    doseStart: '125–250 mg',
    doseMaintenance: '250 mg',
    doseMax: '500 mg',
    frequency: { zh: '每1-2周', en: 'Every 1-2 weeks', ja: '1-2週ごと' },
    halfLife: '7–8 天',
    bioavailability: '~100%',
    vteRR: 1.0,
    evidenceLevel: 'C',
    monitoring: ['PRL'],
    contraindications: {
      zh: ['注射部位感染', '严重肝病'],
      en: ['Injection site infection', 'Severe liver disease'],
      ja: ['注射部位感染', '重度肝疾患'],
    },
  },
  {
    id: 'estradiol-cypionate',
    names: { zh: '环戊丙酸雌二醇注射', en: 'Estradiol Cypionate (IM/SC)', ja: 'エストラジオールシピオネート注射' },
    category: 'estrogen',
    route: { zh: '肌注/皮下', en: 'IM / SC injection', ja: '筋注/皮下注射' },
    doseStart: '2-3 mg/周',
    doseMaintenance: '3-5 mg/周',
    doseMax: '7 mg/10-14天',
    frequency: { zh: '每7-14天', en: 'Every 7-14 days', ja: '7-14日ごと' },
    halfLife: '8-10 天',
    bioavailability: '~100%',
    vteRR: 1.0,
    evidenceLevel: 'B',
    monitoring: ['E2', 'T'],
    contraindications: {
      zh: ['活动性DVT/PE', '雌激素依赖性肿瘤'],
      en: ['Active DVT/PE', 'Estrogen-dependent tumor'],
      ja: ['活動性DVT/PE', 'エストロゲン依存性腫瘍'],
    },
  },
  {
    id: 'estradiol-enanthate',
    names: { zh: '庚酸雌二醇注射', en: 'Estradiol Enanthate (IM/SC)', ja: 'エストラジオールエナント酸エステル注射' },
    category: 'estrogen',
    route: { zh: '肌注/皮下', en: 'IM / SC injection', ja: '筋注/皮下注射' },
    doseStart: '2-4 mg/周',
    doseMaintenance: '4-6 mg/周',
    doseMax: '10 mg/10天',
    frequency: { zh: '每7-10天', en: 'Every 7-10 days', ja: '7-10日ごと' },
    halfLife: '5-7 天',
    bioavailability: '~100%',
    vteRR: 1.0,
    evidenceLevel: 'B',
    monitoring: ['E2', 'T'],
    contraindications: {
      zh: ['活动性DVT/PE', '雌激素依赖性肿瘤'],
      en: ['Active DVT/PE', 'Estrogen-dependent tumor'],
      ja: ['活動性DVT/PE', 'エストロゲン依存性腫瘍'],
    },
  },
  {
    id: 'estradiol-undecylate',
    names: { zh: '十一酸雌二醇注射', en: 'Estradiol Undecylate (IM)', ja: 'ウンデシル酸エストラジオール注射' },
    category: 'estrogen',
    route: { zh: '肌注', en: 'IM injection', ja: '筋注' },
    doseStart: '20-40 mg/月',
    doseMaintenance: '40-100 mg/月',
    doseMax: '100 mg/月',
    frequency: { zh: '每21-30天', en: 'Every 21-30 days', ja: '21-30日ごと' },
    halfLife: '20-30 天',
    bioavailability: '~100%',
    vteRR: 1.0,
    evidenceLevel: 'C',
    monitoring: ['E2'],
    contraindications: {
      zh: ['雌激素依赖性肿瘤'],
      en: ['Estrogen-dependent tumor'],
      ja: ['エストロゲン依存性腫瘍'],
    },
  },
  {
    id: 'finasteride',
    names: { zh: '非那雄胺', en: 'Finasteride', ja: 'フィナステリド' },
    category: '5ari',
    route: { zh: '口服', en: 'Oral', ja: '経口' },
    doseStart: '1 mg/天',
    doseMaintenance: '1-5 mg/天',
    doseMax: '5 mg/天',
    frequency: { zh: '每日1次', en: 'Once daily', ja: '1日1回' },
    halfLife: '6-8h',
    bioavailability: '~80%',
    vteRR: 1.0,
    evidenceLevel: 'B',
    monitoring: ['T'],
    contraindications: {
      zh: ['药物过敏', '严重肝功能不全'],
      en: ['Drug allergy', 'Severe hepatic impairment'],
      ja: ['薬物アレルギー', '重度肝機能障害'],
    },
  },
  {
    id: 'dutasteride',
    names: { zh: '度他雄胺', en: 'Dutasteride', ja: 'デュタステリド' },
    category: '5ari',
    route: { zh: '口服', en: 'Oral', ja: '経口' },
    doseStart: '0.5 mg/天',
    doseMaintenance: '0.5 mg/天',
    doseMax: '0.5 mg/天',
    frequency: { zh: '每日1次', en: 'Once daily', ja: '1日1回' },
    halfLife: '4-5 周',
    bioavailability: '~60%',
    vteRR: 1.0,
    evidenceLevel: 'C',
    monitoring: ['T'],
    contraindications: {
      zh: ['药物过敏', '严重肝功能不全', '强效CYP3A4抑制剂联用'],
      en: ['Drug allergy', 'Severe hepatic impairment', 'Strong CYP3A4 inhibitors'],
      ja: ['薬物アレルギー', '重度肝機能障害', '強力なCYP3A4阻害薬との併用'],
    },
  },
  {
    id: 'dydrogesterone',
    names: { zh: '地屈孕酮', en: 'Dydrogesterone', ja: 'ジドロゲステロン' },
    category: 'progestogen',
    route: { zh: '口服', en: 'Oral', ja: '経口' },
    doseStart: '10 mg/天',
    doseMaintenance: '10-20 mg/天',
    doseMax: '20 mg/天',
    frequency: { zh: '每日1-2次', en: '1-2x daily', ja: '1日1-2回' },
    halfLife: '14-17h',
    bioavailability: '~28%',
    vteRR: 1.0,
    evidenceLevel: 'C',
    monitoring: ['PRL'],
    contraindications: {
      zh: ['药物过敏', '急性肝性卟啉症'],
      en: ['Drug allergy', 'Acute hepatic porphyria'],
      ja: ['薬物アレルギー', '急性肝性ポルフィリン症'],
    },
  },
  {
    id: 'drospirenone',
    names: { zh: '屈螺酮', en: 'Drospirenone', ja: 'ドロスピレノン' },
    category: 'progestogen',
    route: { zh: '口服', en: 'Oral', ja: '経口' },
    doseStart: '3-4 mg/天',
    doseMaintenance: '3-4 mg/天',
    doseMax: '4 mg/天',
    frequency: { zh: '每日1次', en: 'Once daily', ja: '1日1回' },
    halfLife: '25-33h',
    bioavailability: '~76%',
    vteRR: 1.0,
    evidenceLevel: 'C',
    monitoring: ['K+', 'PRL'],
    contraindications: {
      zh: ['螺内酯联用', '高钾血症', '严重肾功能不全'],
      en: ['Spironolactone co-use', 'Hyperkalemia', 'Severe renal impairment'],
      ja: ['スピロノラクトン併用', '高カリウム血症', '重度腎不全'],
    },
  },
];

/* ================================
   VTE Risk Color
   ================================ */

function getVteColor(rr: number): string {
  if (rr <= 1.0) return 'var(--color-safe)';
  if (rr <= 1.5) return 'var(--color-caution)';
  return 'var(--color-danger)';
}

function getVteLabel(rr: number, ui: (typeof UI_COPY)[Locale]): string {
  if (rr <= 1.0) return ui.riskLow;
  if (rr <= 1.5) return ui.riskModerate;
  if (rr <= 2.0) return ui.riskHigh;
  return ui.riskVeryHigh;
}

function getCategoryLabel(cat: string, ui: (typeof UI_COPY)[Locale]): string {
  if (cat === 'estrogen') return ui.catEstrogen;
  if (cat === 'antiandrogen') return ui.catAntiandrogen;
  if (cat === '5ari') return ui.cat5ari;
  return ui.catProgestogen;
}

function getCategoryColor(cat: string): string {
  if (cat === 'estrogen') return 'var(--color-primary)';
  if (cat === 'antiandrogen') return 'var(--color-info)';
  if (cat === '5ari') return 'var(--color-safe)';
  return 'var(--color-accent)';
}

/* ================================
   Styles
   ================================ */

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
    marginBottom: 'var(--space-lg)',
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
  selectorRow: {
    display: 'flex',
    gap: 'var(--space-md)',
    flexWrap: 'wrap' as const,
    marginBottom: 'var(--space-lg)',
    alignItems: 'flex-end',
  },
  selectorGroup: {
    flex: '1 1 200px',
  },
  label: {
    display: 'block',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-sm)',
    fontWeight: 600,
  },
  select: {
    width: '100%',
    padding: 'var(--space-sm) var(--space-md)',
    background: 'var(--color-bg-container)',
    color: 'var(--color-text-primary)',
    border: 'none',
    borderBottom: '2px solid var(--color-outline)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9375rem',
    outline: 'none',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'border-color var(--transition-fast)',
  },
  addBtn: {
    padding: 'var(--space-sm) var(--space-md)',
    background: 'transparent',
    color: 'var(--color-accent)',
    border: '1px dashed var(--color-accent)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
    whiteSpace: 'nowrap' as const,
    alignSelf: 'flex-end',
  },
  removeBtn: {
    padding: '2px var(--space-sm)',
    background: 'transparent',
    color: 'var(--color-text-muted)',
    border: 'none',
    fontFamily: 'var(--font-body)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.8125rem',
    fontFamily: 'var(--font-body)',
  },
  th: {
    textAlign: 'left' as const,
    padding: 'var(--space-sm) var(--space-md)',
    borderBottom: '2px solid var(--color-outline)',
    color: 'var(--color-text-muted)',
    fontSize: '0.6875rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },
  thDrug: {
    textAlign: 'left' as const,
    padding: 'var(--space-sm) var(--space-md)',
    borderBottom: '2px solid var(--color-outline)',
    color: 'var(--color-text-primary)',
    fontSize: '0.8125rem',
    fontWeight: 700,
    fontFamily: 'var(--font-body)',
  },
  td: {
    padding: 'var(--space-sm) var(--space-md)',
    borderBottom: '1px solid var(--color-outline-20)',
    color: 'var(--color-text-primary)',
    verticalAlign: 'top' as const,
  },
  tdLabel: {
    padding: 'var(--space-sm) var(--space-md)',
    borderBottom: '1px solid var(--color-outline-20)',
    color: 'var(--color-text-muted)',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap' as const,
    verticalAlign: 'top' as const,
    width: '140px',
  },
  tdMono: {
    padding: 'var(--space-sm) var(--space-md)',
    borderBottom: '1px solid var(--color-outline-20)',
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-accent)',
    fontWeight: 600,
    verticalAlign: 'top' as const,
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.05em',
  },
  listInCell: {
    margin: 0,
    paddingLeft: 'var(--space-md)',
    fontSize: '0.75rem',
    lineHeight: 1.6,
    color: 'var(--color-text-secondary)',
  },
  disclaimer: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    marginTop: 'var(--space-lg)',
    lineHeight: 1.6,
    fontFamily: 'var(--font-body)',
  },
  drugLink: {
    color: 'var(--color-primary-light)',
    textDecoration: 'none',
  },
  presetSection: {
    marginBottom: 'var(--space-md)',
  },
  presetLabel: {
    display: 'block',
    fontSize: '0.6875rem',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-body)',
    marginBottom: 'var(--space-xs)',
    letterSpacing: '0.04em',
  },
  presetRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-xs)',
  },
  presetChip: {
    background: 'var(--color-bg-container)',
    border: '1px solid var(--color-outline-20)',
    clipPath: 'var(--clip-corner-sm)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    padding: 'var(--space-xs) var(--space-md)',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease',
    lineHeight: 1.4,
  },
};

const RESPONSIVE_CSS = `
.dc-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
@media (max-width: 640px) {
  .dc-table-wrap table {
    min-width: 500px;
  }
}
.dc-drug-link:hover {
  text-decoration: underline;
}
.dc-preset-chip:hover {
  border-color: var(--color-primary) !important;
}
`;

/* ================================
   Preset comparisons
   ================================ */

const PRESETS = [
  { a: 'cpa', b: 'spironolactone', label: { zh: 'CPA vs 螺内酯', en: 'CPA vs Spiro', ja: 'CPA vs スピロ' } },
  { a: 'estradiol-oral', b: 'estradiol-injection', label: { zh: '口服 vs 注射', en: 'Oral vs Injection', ja: '経口 vs 注射' } },
  { a: 'estradiol-patch', b: 'estradiol-gel', label: { zh: '贴片 vs 凝胶', en: 'Patch vs Gel', ja: 'パッチ vs ゲル' } },
  { a: 'progesterone', b: 'dydrogesterone', label: { zh: '黄体酮 vs 地屈孕酮', en: 'Progesterone vs Dydro', ja: 'プロゲステロン vs ジドロ' } },
] as const;

/* ================================
   Component
   ================================ */

export default function DrugComparator() {
  const locale = getLocale();
  const linkLocale = getLocaleFromPath();
  const ui = UI_COPY[locale];
  const [drugA, setDrugA] = useState('estradiol-oral');
  const [drugB, setDrugB] = useState('estradiol-injection');
  const [drugC, setDrugC] = useState<string | null>(null);

  const selectedDrugs = useMemo(() => {
    const ids = [drugA, drugB];
    if (drugC) ids.push(drugC);
    return ids.map(id => DRUGS.find(d => d.id === id)!).filter(Boolean);
  }, [drugA, drugB, drugC]);

  const getName = (d: DrugCompare) => d.names[locale];
  const getRoute = (d: DrugCompare) => d.route[locale];
  const getFreq = (d: DrugCompare) => d.frequency[locale];
  const getContra = (d: DrugCompare) => d.contraindications[locale];

  function renderRow(label: string, cells: (string | ReactNode)[]) {
    return (
      <tr key={label}>
        <td style={s.tdLabel}>{label}</td>
        {cells.map((cell, i) => (
          <td key={i} style={s.td}>{cell}</td>
        ))}
      </tr>
    );
  }

  function renderMonoRow(label: string, cells: (string | ReactNode)[]) {
    return (
      <tr key={label}>
        <td style={s.tdLabel}>{label}</td>
        {cells.map((cell, i) => (
          <td key={i} style={s.tdMono}>{cell}</td>
        ))}
      </tr>
    );
  }

  return (
    <div style={s.container} role="region" aria-label={ui.regionLabel}>
      <style>{RESPONSIVE_CSS}</style>

      <div style={s.title}>
        <span style={s.iconBadge}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </span>
        {ui.title}
      </div>

      {/* Popular comparison presets */}
      <div style={s.presetSection}>
        <span style={s.presetLabel}>
          {locale === 'zh' ? '热门对比' : locale === 'ja' ? '人気の比較' : 'Popular comparisons'}
        </span>
        <div style={s.presetRow}>
          {PRESETS.map(preset => (
            <button
              key={`${preset.a}-${preset.b}`}
              type="button"
              className="dc-preset-chip"
              style={s.presetChip}
              onClick={() => { setDrugA(preset.a); setDrugB(preset.b); }}
            >
              {preset.label[locale]}
            </button>
          ))}
        </div>
      </div>

      {/* Drug Selectors */}
      <div style={s.selectorRow}>
        <div style={s.selectorGroup}>
          <label htmlFor="dc-drug-a" style={s.label}>{ui.selectDrug} A</label>
          <select id="dc-drug-a" value={drugA} onChange={e => setDrugA(e.target.value)} style={s.select}>
            {DRUGS.map(d => <option key={d.id} value={d.id}>{getName(d)}</option>)}
          </select>
        </div>
        <div style={s.selectorGroup}>
          <label htmlFor="dc-drug-b" style={s.label}>{ui.selectDrug} B</label>
          <select id="dc-drug-b" value={drugB} onChange={e => setDrugB(e.target.value)} style={s.select}>
            {DRUGS.map(d => <option key={d.id} value={d.id}>{getName(d)}</option>)}
          </select>
        </div>
        {drugC !== null ? (
          <div style={s.selectorGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label htmlFor="dc-drug-c" style={s.label}>{ui.selectDrug} C</label>
              <button type="button" style={s.removeBtn} onClick={() => setDrugC(null)}>{ui.removeThird}</button>
            </div>
            <select id="dc-drug-c" value={drugC} onChange={e => setDrugC(e.target.value)} style={s.select}>
              {DRUGS.map(d => <option key={d.id} value={d.id}>{getName(d)}</option>)}
            </select>
          </div>
        ) : (
          <button type="button" style={s.addBtn} onClick={() => setDrugC('cpa')}>{ui.addThird}</button>
        )}
      </div>

      {/* Comparison Table */}
      <div className="dc-table-wrap">
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}></th>
              {selectedDrugs.map(d => {
                const url = getDrugPageUrl(d.id, linkLocale);
                return (
                  <th key={d.id} style={s.thDrug}>
                    {url ? (
                      <a href={url} style={s.drugLink} className="dc-drug-link">
                        {getName(d)}
                      </a>
                    ) : getName(d)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {renderRow(ui.category, selectedDrugs.map(d => (
              <span key={d.id} style={{ ...s.badge, color: getCategoryColor(d.category), border: `1px solid ${getCategoryColor(d.category)}` }}>
                {getCategoryLabel(d.category, ui)}
              </span>
            )))}
            {renderRow(ui.route, selectedDrugs.map(d => getRoute(d)))}
            {renderMonoRow(ui.doseStart, selectedDrugs.map(d => d.doseStart))}
            {renderMonoRow(ui.doseMaintenance, selectedDrugs.map(d => d.doseMaintenance))}
            {renderMonoRow(ui.doseMax, selectedDrugs.map(d => d.doseMax))}
            {renderRow(ui.frequency, selectedDrugs.map(d => getFreq(d)))}
            {renderMonoRow(ui.halfLife, selectedDrugs.map(d => d.halfLife))}
            {renderMonoRow(ui.bioavailability, selectedDrugs.map(d => d.bioavailability))}
            {renderRow(ui.vteRR, selectedDrugs.map(d => (
              <span key={d.id}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: getVteColor(d.vteRR) }}>
                  {d.vteRR.toFixed(2)}
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginLeft: 'var(--space-sm)' }}>
                  {getVteLabel(d.vteRR, ui)}
                </span>
              </span>
            )))}
            {renderRow(ui.evidenceLevel, selectedDrugs.map(d => (
              <span key={d.id} style={{
                ...s.badge,
                color: d.evidenceLevel === 'A' ? 'var(--color-safe)' : d.evidenceLevel === 'B' ? 'var(--color-caution)' : 'var(--color-text-muted)',
                border: `1px solid ${d.evidenceLevel === 'A' ? 'var(--color-safe)' : d.evidenceLevel === 'B' ? 'var(--color-caution)' : 'var(--color-text-muted)'}`,
              }}>
                {d.evidenceLevel}
              </span>
            )))}
            {renderRow(ui.monitoringTests, selectedDrugs.map(d => (
              <span key={d.id} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-accent)' }}>
                {d.monitoring.join(', ')}
              </span>
            )))}
            {renderRow(ui.contraindications, selectedDrugs.map(d => (
              <ul key={d.id} style={s.listInCell}>
                {getContra(d).map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            )))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <div style={s.disclaimer}>{ui.disclaimer}</div>
    </div>
  );
}
