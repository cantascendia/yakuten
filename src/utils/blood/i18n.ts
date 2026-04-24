/**
 * i18n copy tables for the v3.2 handbook-style blood tracker (sakura mode).
 * Per user decision: zh/en/ja all filled, review JA before ship.
 */

export type Locale = 'zh' | 'en' | 'ja';

export interface B32Copy {
  // header
  headerKicker: string;
  headerCount: (n: number) => string;
  addNew: string;
  settings: string;
  close: string;

  // empty state
  emptyHeadline: string;
  emptyBody: string;
  emptyCta: string;

  // hero
  heroPowerLabel: string;
  heroRecordNth: (n: string, phase: string) => string;
  noPhase: string;
  shareCta: string;
  streakRecordedLabel: string;
  streakRecordedValue: (n: number) => string;
  streakSpanLabel: string;
  streakSpanValue: (days: number) => string;
  streakFirstLabel: string;

  // sections
  sectionHighlights: string;
  sectionTimeline: string;
  sectionMetrics: string;
  sectionMetricsEmpty: string;

  // highlight tags
  tagMilestone: string;
  tagImprovement: string;
  tagWorry: string;
  milestoneFirstTarget: string;
  improvementFirstRecord: string;
  improvementRange: (from: string, to: string, unit: string) => string;
  worrySuffix: string;

  // timeline
  timelineAddHint: string;

  // levels
  levelTarget: string;
  levelSafe: string;
  levelCaution: string;
  levelDanger: string;
  levelEmpty: string;

  // grade titles / subtitles
  gradeNeutralTitle: string;
  gradeNeutralSubtitle: string;
  gradeSTitle: string;
  gradeSSubtitle: string;
  gradeAPlusTitle: string;
  gradeAPlusSubtitle: string;
  gradeATitle: string;
  gradeASubtitle: string;
  gradeBPlusTitle: string;
  gradeBPlusSubtitle: string;
  gradeBTitle: string;
  gradeBSubtitle: string;
  gradeCTitle: string;
  gradeCSubtitle: string;
  gradeDTitle: string;
  gradeDSubtitle: string;

  // input sheet
  inputTitleNew: string;
  inputTitleEdit: string;
  inputKickerNew: string;
  inputKickerEdit: string;
  inputDate: string;
  inputPhase: string;
  inputNote: string;
  inputNotePlaceholder: string;
  inputCore: string;
  inputExtendedShow: string;
  inputExtendedHide: string;
  inputFilled: (filled: number, total: number) => string;
  inputSave: string;
  inputCancel: string;
  phases: string[];

  // share placeholder (iter 1: not wired yet)
  shareUpcoming: string;

  // settings
  settingsTitle: string;
  settingsRegion: string;
  settingsRegionHint: string;
  regionCN: string;
  regionUS: string;
  regionEU: string;
  regionJP: string;
  settingsExport: string;
  settingsImport: string;
  settingsClearAll: string;
  settingsClearConfirm: string;

  // disclaimer
  disclaimer: string;
  disclaimerRed: string;

  // delete confirm
  deleteConfirm: (date: string) => string;

  // sakura switcher hint (inline)
  sakuraHint: string;
}

const ZH: B32Copy = {
  headerKicker: 'BLOOD CHECKER · 血检小手账',
  headerCount: (n) => `共 ${n} 条记录`,
  addNew: '+ 新记录',
  settings: '设置',
  close: '关闭',

  emptyHeadline: '还是一页空白',
  emptyBody: '新增你的第一次血检，之后每次复查都可以对照变化。\n数据只存在你自己的浏览器里。',
  emptyCta: '+ 新增第一次血检',

  heroPowerLabel: 'HRT 战力',
  heroRecordNth: (n, phase) => `RECORD #${n} · ${phase}`,
  noPhase: '未分期',
  shareCta: '分享战绩',
  streakRecordedLabel: '打卡',
  streakRecordedValue: (n) => `第 ${n} 次`,
  streakSpanLabel: '跨度',
  streakSpanValue: (days) => `${days} 天`,
  streakFirstLabel: '首次',

  sectionHighlights: 'HIGHLIGHTS · 本次亮点',
  sectionTimeline: 'TIMELINE · 历次记录',
  sectionMetrics: 'METRICS · 各项指标',
  sectionMetricsEmpty: '还没填写任何指标 · 点击右上角新增 / 编辑',

  tagMilestone: '里程碑',
  tagImprovement: '进步',
  tagWorry: '关注',
  milestoneFirstTarget: '首次进入目标区间',
  improvementFirstRecord: '本次首次记录',
  improvementRange: (from, to, unit) => `从 ${from} → ${to} ${unit}`,
  worrySuffix: '：建议在下一次问诊时提到',

  timelineAddHint: '+ 新增记录',

  levelTarget: '达标',
  levelSafe: '可接受',
  levelCaution: '留意',
  levelDanger: '需复查',
  levelEmpty: '未填',

  gradeNeutralTitle: '还在准备中',
  gradeNeutralSubtitle: '填个数字，让战绩开始登场',
  gradeSTitle: '荷尔蒙神谕者',
  gradeSSubtitle: '数据说话 · 全线达标中',
  gradeAPlusTitle: 'HRT 主修优等生',
  gradeAPlusSubtitle: '稳定续航 · 继续这样走',
  gradeATitle: '正在走上正轨',
  gradeASubtitle: '身体很棒 · 微调一下就完美',
  gradeBPlusTitle: '调药中的旅人',
  gradeBPlusSubtitle: '不慌 · 我们一项一项来',
  gradeBTitle: '过渡期 · 关卡中',
  gradeBSubtitle: '大多数人也在这一站',
  gradeCTitle: '数值在说悄悄话',
  gradeCSubtitle: '有几项偏了 · 找医生聊聊',
  gradeDTitle: '需要一次对话',
  gradeDSubtitle: '红灯亮了 · 一定要看医生',

  inputTitleNew: '新增血检',
  inputTitleEdit: '编辑记录',
  inputKickerNew: 'NEW',
  inputKickerEdit: 'EDIT',
  inputDate: '日期',
  inputPhase: '阶段',
  inputNote: '备注',
  inputNotePlaceholder: '方案、感受…',
  inputCore: '核心指标',
  inputExtendedShow: '+ 可选指标（FSH / SHBG / 血脂）',
  inputExtendedHide: '收起可选指标',
  inputFilled: (filled, total) => `已填 ${filled}/${total} 项`,
  inputSave: '保存',
  inputCancel: '取消',
  phases: ['初始基线', '1 个月', '3 个月随访', '6 个月随访', '稳定期', '年度复查'],

  shareUpcoming: '分享卡即将上线 🌸',

  settingsTitle: '设置',
  settingsRegion: '单位偏好',
  settingsRegionHint: '决定默认显示单位（E2、T、胆固醇）',
  regionCN: '中国 · pmol/L / nmol/L',
  regionUS: '美国 · pg/mL / ng/dL',
  regionEU: '欧洲 · pmol/L / nmol/L',
  regionJP: '日本 · pmol/L / nmol/L',
  settingsExport: '导出 JSON',
  settingsImport: '导入 JSON',
  settingsClearAll: '清空所有记录',
  settingsClearConfirm: '确定要清空所有血检记录吗？此操作不可撤销。',

  disclaimer: '数据全部保存在你本机的浏览器里，不上传任何服务器。这只是帮你读懂数字的参考工具，不替代医生。',
  disclaimerRed: '看到红色项请一定找医生复查，不要自己停药或加药。',

  deleteConfirm: (date) => `确定删除 ${date} 的记录吗？`,

  sakuraHint: '关闭「新版」可回到经典红绿灯模式',
};

const EN: B32Copy = {
  headerKicker: 'BLOOD CHECKER · Lab Handbook',
  headerCount: (n) => `${n} record${n === 1 ? '' : 's'}`,
  addNew: '+ New record',
  settings: 'Settings',
  close: 'Close',

  emptyHeadline: 'A blank page',
  emptyBody: "Add your first blood panel — future check-ups compare against it.\nAll data stays in your browser.",
  emptyCta: '+ Add first record',

  heroPowerLabel: 'HRT power',
  heroRecordNth: (n, phase) => `RECORD #${n} · ${phase}`,
  noPhase: 'Unphased',
  shareCta: 'Share',
  streakRecordedLabel: 'Check-in',
  streakRecordedValue: (n) => `#${n}`,
  streakSpanLabel: 'Span',
  streakSpanValue: (days) => `${days} d`,
  streakFirstLabel: 'First',

  sectionHighlights: 'HIGHLIGHTS',
  sectionTimeline: 'TIMELINE',
  sectionMetrics: 'METRICS',
  sectionMetricsEmpty: 'No values yet · tap + to add',

  tagMilestone: 'Milestone',
  tagImprovement: 'Progress',
  tagWorry: 'Watch',
  milestoneFirstTarget: 'First time in target range',
  improvementFirstRecord: 'First recorded value',
  improvementRange: (from, to, unit) => `${from} → ${to} ${unit}`,
  worrySuffix: ' — raise at next visit',

  timelineAddHint: '+ Add record',

  levelTarget: 'On target',
  levelSafe: 'OK',
  levelCaution: 'Watch',
  levelDanger: 'Review',
  levelEmpty: 'Empty',

  gradeNeutralTitle: 'Getting ready',
  gradeNeutralSubtitle: 'Add a number to start',
  gradeSTitle: 'Hormone Oracle',
  gradeSSubtitle: 'Every metric on target',
  gradeAPlusTitle: 'HRT Honors student',
  gradeAPlusSubtitle: 'Stable and steady',
  gradeATitle: 'On track',
  gradeASubtitle: 'Great body · small tune-up away',
  gradeBPlusTitle: 'Tuning the dose',
  gradeBPlusSubtitle: 'No rush · one metric at a time',
  gradeBTitle: 'Transition chapter',
  gradeBSubtitle: 'Most people pass through here',
  gradeCTitle: 'Numbers are whispering',
  gradeCSubtitle: 'A few are off · chat with your doctor',
  gradeDTitle: 'Needs a conversation',
  gradeDSubtitle: 'Red flags · please see a clinician',

  inputTitleNew: 'New record',
  inputTitleEdit: 'Edit record',
  inputKickerNew: 'NEW',
  inputKickerEdit: 'EDIT',
  inputDate: 'Date',
  inputPhase: 'Phase',
  inputNote: 'Note',
  inputNotePlaceholder: 'Regimen, feelings…',
  inputCore: 'Core metrics',
  inputExtendedShow: '+ Optional metrics (FSH / SHBG / lipids)',
  inputExtendedHide: 'Hide optional metrics',
  inputFilled: (filled, total) => `Filled ${filled}/${total}`,
  inputSave: 'Save',
  inputCancel: 'Cancel',
  phases: ['Baseline', '1 month', '3 months', '6 months', 'Stable', 'Annual'],

  shareUpcoming: 'Share card coming soon 🌸',

  settingsTitle: 'Settings',
  settingsRegion: 'Unit preference',
  settingsRegionHint: 'Controls default display units',
  regionCN: 'China · pmol/L / nmol/L',
  regionUS: 'US · pg/mL / ng/dL',
  regionEU: 'Europe · pmol/L / nmol/L',
  regionJP: 'Japan · pmol/L / nmol/L',
  settingsExport: 'Export JSON',
  settingsImport: 'Import JSON',
  settingsClearAll: 'Clear all records',
  settingsClearConfirm: 'Delete all blood records? This cannot be undone.',

  disclaimer: 'All data stays in your browser — nothing is uploaded. This tool helps you read numbers, it does not replace a clinician.',
  disclaimerRed: 'Any red entries should be reviewed with a doctor — do not stop or add medication yourself.',

  deleteConfirm: (date) => `Delete the record from ${date}?`,

  sakuraHint: 'Turn off sakura mode to return to the classic red/yellow/green view',
};

const JA: B32Copy = {
  headerKicker: 'BLOOD CHECKER · 血液手帳',
  headerCount: (n) => `${n} 件の記録`,
  addNew: '+ 新規記録',
  settings: '設定',
  close: '閉じる',

  emptyHeadline: 'まだ真っ白なページ',
  emptyBody: '最初の血液検査を追加しましょう。次回からは変化を比較できます。\nデータはあなたのブラウザ内だけに保存されます。',
  emptyCta: '+ 最初の血液検査を追加',

  heroPowerLabel: 'HRT 力',
  heroRecordNth: (n, phase) => `RECORD #${n} · ${phase}`,
  noPhase: '未分類',
  shareCta: 'シェア',
  streakRecordedLabel: 'チェックイン',
  streakRecordedValue: (n) => `${n} 回目`,
  streakSpanLabel: '期間',
  streakSpanValue: (days) => `${days} 日`,
  streakFirstLabel: '初回',

  sectionHighlights: 'HIGHLIGHTS · 今回のハイライト',
  sectionTimeline: 'TIMELINE · これまでの記録',
  sectionMetrics: 'METRICS · 各項目',
  sectionMetricsEmpty: 'まだ項目が入力されていません · +ボタンで追加',

  tagMilestone: 'マイルストーン',
  tagImprovement: '改善',
  tagWorry: '注意',
  milestoneFirstTarget: '初めてターゲット域に到達',
  improvementFirstRecord: '今回が初回記録',
  improvementRange: (from, to, unit) => `${from} → ${to} ${unit}`,
  worrySuffix: '：次回の診察で相談を',

  timelineAddHint: '+ 記録を追加',

  levelTarget: '達成',
  levelSafe: '許容',
  levelCaution: '注意',
  levelDanger: '要再検',
  levelEmpty: '未入力',

  gradeNeutralTitle: '準備中',
  gradeNeutralSubtitle: '数値を追加すると記録が始まります',
  gradeSTitle: 'ホルモンの神託',
  gradeSSubtitle: '全項目がターゲット圏内',
  gradeAPlusTitle: 'HRT 優等生',
  gradeAPlusSubtitle: '安定して継続中',
  gradeATitle: '順調です',
  gradeASubtitle: '体調良好 · 微調整だけ',
  gradeBPlusTitle: '調整中の旅人',
  gradeBPlusSubtitle: '焦らず一つずつ',
  gradeBTitle: '移行期 · 途中',
  gradeBSubtitle: '多くの人がこの段階を通ります',
  gradeCTitle: '数値が小さく囁いています',
  gradeCSubtitle: '少し外れています · 医師に相談を',
  gradeDTitle: '相談が必要です',
  gradeDSubtitle: '赤信号 · 必ず医師に相談を',

  inputTitleNew: '新しい記録',
  inputTitleEdit: '記録を編集',
  inputKickerNew: 'NEW',
  inputKickerEdit: 'EDIT',
  inputDate: '日付',
  inputPhase: 'フェーズ',
  inputNote: 'メモ',
  inputNotePlaceholder: 'レジメン、体感など…',
  inputCore: 'コア指標',
  inputExtendedShow: '+ オプション項目（FSH / SHBG / 脂質）',
  inputExtendedHide: 'オプション項目を隠す',
  inputFilled: (filled, total) => `${filled}/${total} 項目入力済`,
  inputSave: '保存',
  inputCancel: 'キャンセル',
  phases: ['ベースライン', '1ヶ月', '3ヶ月', '6ヶ月', '安定期', '年次'],

  shareUpcoming: 'シェアカードは近日公開 🌸',

  settingsTitle: '設定',
  settingsRegion: '単位設定',
  settingsRegionHint: '既定の表示単位を切り替えます',
  regionCN: '中国 · pmol/L / nmol/L',
  regionUS: '米国 · pg/mL / ng/dL',
  regionEU: '欧州 · pmol/L / nmol/L',
  regionJP: '日本 · pmol/L / nmol/L',
  settingsExport: 'JSON エクスポート',
  settingsImport: 'JSON インポート',
  settingsClearAll: 'すべての記録を削除',
  settingsClearConfirm: '本当に全ての血液記録を削除しますか？元に戻せません。',

  disclaimer: 'データはあなたのブラウザ内にのみ保存され、サーバーには送信されません。このツールは数値理解の参考であり、医師の診断を置き換えるものではありません。',
  disclaimerRed: '赤色の項目は必ず医師に相談を。自己判断での休薬や増量は避けてください。',

  deleteConfirm: (date) => `${date} の記録を削除しますか？`,

  sakuraHint: '「新版」をオフにすると従来の赤黄緑表示に戻ります',
};

const DICT: Record<Locale, B32Copy> = { zh: ZH, en: EN, ja: JA };

export function getB32Copy(locale: Locale): B32Copy {
  return DICT[locale] ?? ZH;
}

export function detectLocaleFromPath(): Locale {
  if (typeof window === 'undefined') return 'zh';
  const p = window.location.pathname;
  if (p.startsWith('/en')) return 'en';
  if (p.startsWith('/ja')) return 'ja';
  if (p.startsWith('/ko')) return 'en';
  return 'zh';
}

export function gradeTitle(copy: B32Copy, _tone: 'hype' | 'warm' | 'calm' | 'neutral', grade: string): string {
  switch (grade) {
    case 'S': return copy.gradeSTitle;
    case 'A+': return copy.gradeAPlusTitle;
    case 'A': return copy.gradeATitle;
    case 'B+': return copy.gradeBPlusTitle;
    case 'B': return copy.gradeBTitle;
    case 'C': return copy.gradeCTitle;
    case 'D': return copy.gradeDTitle;
    default: return copy.gradeNeutralTitle;
  }
}

export function gradeSubtitle(copy: B32Copy, grade: string): string {
  switch (grade) {
    case 'S': return copy.gradeSSubtitle;
    case 'A+': return copy.gradeAPlusSubtitle;
    case 'A': return copy.gradeASubtitle;
    case 'B+': return copy.gradeBPlusSubtitle;
    case 'B': return copy.gradeBSubtitle;
    case 'C': return copy.gradeCSubtitle;
    case 'D': return copy.gradeDSubtitle;
    default: return copy.gradeNeutralSubtitle;
  }
}
