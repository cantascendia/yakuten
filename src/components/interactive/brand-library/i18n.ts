/**
 * 药物图鉴 v2 — UI 文案（zh / en / ja / ko；其余语言回退 en）
 * 对应 docs/specs/brand-library-v2.md §7。
 *
 * 结构纪律：
 * - 所有用户可见文本都在本文件，JSX 里不出现硬编码可见文本。
 * - 每条文案是一个四元组 [zh, en, ja, ko]，缺一项在类型层直接报错 —— 四语天生对齐。
 * - 带变量的文案用 `{name}` 占位，渲染时走 fmt()。
 */

import type {
  BrandStatus,
  Coating,
  ColorFamily,
  Confidence,
  HrtUse,
  IngredientCategory,
  Locale,
  MarketRegion,
  Score,
} from './types';

/** UI 四语；页面可能是 17 语中的任意一种，非四语一律回退 en */
export type UiLocale = Locale;

/** [zh, en, ja, ko] */
export type Quad = readonly [string, string, string, string];

const LOCALE_INDEX: Record<UiLocale, 0 | 1 | 2 | 3> = { zh: 0, en: 1, ja: 2, ko: 3 };

/** 把路径/属性上的原始语言码收敛到 UI 四语（其余回退 en，spec §7） */
export function resolveUiLocale(raw: string | undefined | null): UiLocale {
  if (raw === 'zh' || raw === 'en' || raw === 'ja' || raw === 'ko') return raw;
  return 'en';
}

/** 取四元组里对应语言的一条 */
export function label(quad: Quad, locale: UiLocale): string {
  return quad[LOCALE_INDEX[locale]];
}

/** Pictogram 导出的标签对象（FORM_LABELS / SHAPE_LABELS）取语言 */
export function labelOf(
  rec: { zh: string; en: string; ja: string; ko: string },
  locale: UiLocale,
): string {
  return rec[locale];
}

/** `{n}` 占位替换 */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : whole,
  );
}

/* ────────────────────────────────────────────────────────────────
   主文案表
   ──────────────────────────────────────────────────────────────── */

const DICT = {
  /* — 命令栏 — */
  searchLabel: [
    '搜索品牌、成分、厂商、压印',
    'Search brands, ingredients, manufacturers, imprints',
    'ブランド・成分・メーカー・刻印を検索',
    '브랜드·성분·제조사·각인 검색',
  ],
  searchPlaceholder: [
    '搜索品牌 / 成分 / 厂商 / 压印…',
    'Brand / ingredient / maker / imprint…',
    'ブランド / 成分 / メーカー / 刻印…',
    '브랜드 / 성분 / 제조사 / 각인…',
  ],
  searchShortcutHint: [
    '按斜杠键聚焦搜索框',
    'Press slash to focus search',
    'スラッシュキーで検索欄へ',
    '슬래시 키로 검색창 이동',
  ],
  searchClear: ['清空搜索', 'Clear search', '検索をクリア', '검색 지우기'],
  viewLabel: ['视图', 'View', '表示', '보기'],
  viewPlates: ['图版', 'Plates', '図版', '도판'],
  viewList: ['列表', 'List', 'リスト', '목록'],
  summary: [
    '显示 {shown} / 共 {total} · {plates} 种成分',
    'Showing {shown} of {total} · {plates} ingredients',
    '{total} 件中 {shown} 件を表示 · 成分 {plates} 種',
    '{total}개 중 {shown}개 표시 · 성분 {plates}종',
  ],
  resultsRegionLabel: ['检索结果计数', 'Result count', '検索結果件数', '검색 결과 수'],

  /* — 反查条 — */
  reverseTitle: [
    '我手里有一片…',
    'I have a tablet in hand…',
    '手元にある一錠から探す',
    '손에 있는 약으로 찾기',
  ],
  reverseHint: [
    '按剂型 → 颜色 → 形状逐级收窄',
    'Narrow by form, then colour, then shape',
    '剤形 → 色 → 形の順に絞り込み',
    '제형 → 색 → 모양 순으로 좁히기',
  ],
  reverseForm: ['剂型', 'Form', '剤形', '제형'],
  reverseColor: ['颜色', 'Colour', '色', '색'],
  reverseShape: ['形状', 'Shape', '形状', '모양'],
  reverseClear: ['清除外观条件', 'Clear appearance filters', '外観条件をクリア', '외관 조건 지우기'],

  /* — 筛选栏 — */
  filters: ['筛选', 'Filters', '絞り込み', '필터'],
  filtersWithCount: ['筛选（{n}）', 'Filters ({n})', '絞り込み（{n}）', '필터 ({n})'],
  filterCategory: ['分类', 'Class', '分類', '분류'],
  filterIngredient: ['成分', 'Ingredient', '成分', '성분'],
  filterRegion: ['地区', 'Region', '地域', '지역'],
  filterStatus: ['监管状态', 'Regulatory status', '規制区分', '규제 상태'],
  allCategories: ['全部分类', 'All classes', '全分類', '전체 분류'],
  allIngredients: ['全部成分', 'All ingredients', '全成分', '전체 성분'],
  allRegions: ['全部地区', 'All regions', '全地域', '전체 지역'],
  allStatuses: ['全部状态', 'All statuses', '全区分', '전체 상태'],
  clearFilters: ['清除筛选', 'Clear filters', '条件をクリア', '필터 지우기'],

  /* — 图版头 — */
  plateKicker: ['图版', 'Plate', '図版', '도판'],
  brandsUnit: ['{n} 品牌', '{n} brands', '{n} ブランド', '{n} 브랜드'],
  regionsUnit: ['{n} 地区', '{n} regions', '{n} 地域', '{n} 지역'],
  esterLabel: ['酯', 'Ester', 'エステル', '에스터'],
  equivalenceLabel: ['等效换算', 'Equivalence', '力価換算', '역가 환산'],
  drugDetail: ['药物详情', 'Drug page', '薬剤ページ', '약물 상세'],

  /* — 标本卡 — */
  detail: ['详情', 'Details', '詳細', '상세'],
  detailOf: ['查看 {name} 详情', 'View details for {name}', '{name} の詳細を見る', '{name} 상세 보기'],
  compare: ['对比', 'Compare', '比較', '비교'],
  compareToggleOf: [
    '把 {name} 加入对比',
    'Add {name} to comparison',
    '{name} を比較に追加',
    '{name} 비교에 추가',
  ],
  badgeUnverified: ['待核实', 'To verify', '未確認', '미확인'],
  badgeSchematic: ['示意', 'Schematic', '模式図', '모식도'],
  badgePhoto: ['实拍', 'Photo', '実写', '실물 사진'],

  /* — 禁用区 — */
  bannedSection: ['禁用 / 不适用', 'Not suitable for HRT', 'HRT に不適', 'HRT 부적합'],
  bannedSectionNote: [
    '以下药物在 HRT 语境下不适用；列出仅为辨识与避免误用，不构成使用建议。',
    'The items below are not suitable for HRT. They are listed for identification only, not as a suggestion to use them.',
    '以下は HRT には適しません。識別と誤用回避のための掲載であり、使用を勧めるものではありません。',
    '아래 약물은 HRT에 적합하지 않습니다. 식별과 오용 방지를 위한 목록이며 사용 권고가 아닙니다.',
  ],
  bannedSeal: ['不适用于 HRT', 'Not for HRT', 'HRT 不適', 'HRT 부적합'],

  /* — 空状态 — */
  noResults: [
    '未找到匹配的品牌',
    'No matching brands',
    '該当するブランドがありません',
    '일치하는 브랜드가 없습니다',
  ],
  noResultsHint: [
    '试试搜索成分名，如 雌二醇',
    'Try searching an ingredient name, e.g. estradiol',
    '成分名（例：エストラジオール）で検索してみてください',
    '성분명(예: 에스트라디올)으로 검색해 보세요',
  ],

  /* — 列表视图 — */
  listCaption: [
    '品牌列表：图示、名称、成分、规格、厂商与国家、状态',
    'Brand list: thumbnail, name, ingredient, strengths, maker and country, status',
    'ブランド一覧：図、名称、成分、規格、メーカーと国、区分',
    '브랜드 목록: 그림, 이름, 성분, 규격, 제조사와 국가, 상태',
  ],
  colImage: ['图示', 'Image', '図', '그림'],
  colBrand: ['品牌', 'Brand', 'ブランド', '브랜드'],
  colIngredient: ['成分', 'Ingredient', '成分', '성분'],
  colStrength: ['规格', 'Strengths', '規格', '규격'],
  colMaker: ['厂商 / 国家', 'Maker / country', 'メーカー / 国', '제조사 / 국가'],
  colStatus: ['状态', 'Status', '区分', '상태'],
  colAction: ['操作', 'Actions', '操作', '작업'],

  /* — 详情对话框 — */
  close: ['关闭', 'Close', '閉じる', '닫기'],
  fieldIngredient: ['成分', 'Ingredient', '成分', '성분'],
  fieldEster: ['酯', 'Ester', 'エステル', '에스터'],
  fieldStrengths: ['规格', 'Strengths', '規格', '규격'],
  fieldPack: ['包装', 'Pack size', '包装', '포장'],
  fieldForm: ['剂型', 'Form', '剤形', '제형'],
  fieldAppearance: ['外观', 'Appearance', '外観', '외관'],
  fieldShape: ['形状', 'Shape', '形状', '모양'],
  fieldColor: ['颜色', 'Colour', '色', '색'],
  fieldCoating: ['包衣', 'Coating', 'コーティング', '코팅'],
  fieldScore: ['刻痕', 'Score line', '割線', '분할선'],
  fieldImprint: ['压印', 'Imprint', '刻印', '각인'],
  fieldPackaging: ['包装特征', 'Packaging', '外箱・PTP の特徴', '포장 특징'],
  fieldManufacturer: ['厂商', 'Manufacturer', 'メーカー', '제조사'],
  fieldMarket: ['上市地区', 'Market', '流通地域', '유통 지역'],
  fieldStatus: ['监管状态', 'Regulatory status', '規制区分', '규제 상태'],
  fieldApproval: ['批准文号', 'Approval no.', '承認番号', '허가번호'],
  fieldIdentification: ['鉴别要点', 'Identification points', '識別のポイント', '식별 포인트'],
  fieldNotes: ['备注', 'Notes', '備考', '비고'],
  fieldConfidence: ['数据可信度', 'Data confidence', 'データ信頼度', '데이터 신뢰도'],
  fieldLastVerified: ['最近核对', 'Last checked', '最終確認', '최근 확인'],
  sameIngredient: [
    '同成分其他品牌',
    'Other brands, same ingredient',
    '同成分の他ブランド',
    '같은 성분의 다른 브랜드',
  ],
  imageSource: ['图片来源', 'Image source', '画像の出典', '이미지 출처'],
  creditPhotoDefault: [
    '实拍 · 站方拍摄',
    'Photo · shot by this site',
    '実写 · 当サイト撮影',
    '실물 사진 · 사이트 촬영',
  ],
  creditPhotoFrom: [
    '实拍 · 图片来自 {credit}',
    'Photo · courtesy of {credit}',
    '実写 · 出典 {credit}',
    '실물 사진 · 출처 {credit}',
  ],
  creditSchematic: [
    '示意图 · 依据外观描述绘制，非实物',
    'Schematic · drawn from the written description, not a photo',
    '模式図 · 外観記述に基づく作図であり実物ではありません',
    '모식도 · 외관 설명을 바탕으로 그린 그림이며 실물이 아닙니다',
  ],
  nmpaQuery: ['去药监局查询', 'Look up at NMPA', 'NMPA で照会', 'NMPA에서 조회'],
  linkOfficial: ['官网', 'Official site', '公式サイト', '공식 사이트'],
  linkLeaflet: ['说明书', 'Leaflet', '添付文書', '설명서'],
  opensNewTab: ['在新标签页打开', 'opens in a new tab', '新しいタブで開く', '새 탭에서 열림'],

  /* — 对比 — */
  compareTray: ['对比托盘', 'Comparison tray', '比較トレイ', '비교 트레이'],
  compareSelected: ['已选 {n}', '{n} selected', '{n} 件選択中', '{n}개 선택'],
  compareOpen: ['对比（{n}）', 'Compare ({n})', '比較（{n}）', '비교 ({n})'],
  compareClear: ['清空', 'Clear', 'クリア', '비우기'],
  compareLimit: [
    '最多同时对比 3 个品牌',
    'Up to 3 brands at a time',
    '同時比較は 3 件までです',
    '최대 3개까지 비교할 수 있습니다',
  ],
  compareTitle: ['品牌对比', 'Brand comparison', 'ブランド比較', '브랜드 비교'],
  compareField: ['字段', 'Field', '項目', '항목'],
  compareDiff: ['该行有差异', 'values differ', 'この行は差異あり', '이 행은 값이 다름'],
  removeFromCompare: [
    '从对比中移除 {name}',
    'Remove {name} from comparison',
    '{name} を比較から外す',
    '비교에서 {name} 제거',
  ],

  /* — 通用 — */
  none: ['—', '—', '—', '—'],
  dataNote: [
    '外观与包装为事实型产品信息，不含任何用量建议；本页不提供购买链接，也不推荐销售渠道。',
    'Appearance and packaging are factual product information and contain no dosing advice. This page provides no purchase links and recommends no sellers.',
    '外観・包装は事実としての製品情報であり、用量の助言は含みません。購入リンクや販売元の推奨は行いません。',
    '외관과 포장은 사실 기반 제품 정보이며 용량 조언을 포함하지 않습니다. 구매 링크나 판매처 추천은 제공하지 않습니다.',
  ],

  /* — 图版折叠 / 反查折叠 — */
  showMore: ['展开其余 {n} 条', 'Show {n} more', '残り {n} 件を表示', '나머지 {n}개 보기'],
  showLess: ['收起', 'Show less', '折りたたむ', '접기'],
  reverseExpand: ['按外观找药', 'Find by appearance', '外観から探す', '외관으로 찾기'],

  referencesLabel: ['依据文献', 'References', '根拠文献', '근거 문헌'],

  /* — 页尾说明 — */
  footLegend: ['状态图例', 'Status legend', 'ステータス凡例', '상태 범례'],
  footData: ['数据来源与核对', 'Data sources & verification', 'データ出典と確認', '데이터 출처와 확인'],
  footDataText: [
    '品牌、规格、包装与外观取自各地公开说明书与监管机构数据库；实拍图由站方拍摄。标「据报告」的条目表示外观细节尚未经实物核对。',
    'Brands, strengths, packaging and appearance come from public leaflets and regulator databases; photos are taken by the site. Entries marked "Reported" have not yet been checked against a physical sample.',
    'ブランド・規格・包装・外観は各国の公開添付文書と規制当局データベースに基づき、実物写真はサイト側で撮影。「報告ベース」の項目は外観の詳細が実物未確認です。',
    '브랜드·규격·포장·외관은 각국 공개 설명서와 규제기관 데이터베이스에서 가져왔으며 실물 사진은 사이트에서 촬영했습니다. "보고 기반" 항목은 외관 세부가 아직 실물로 확인되지 않았습니다.',
  ],
  footReviewed: ['整库最近核对：{date}', 'Library last reviewed: {date}', '最終確認日：{date}', '최종 확인일: {date}'],
  footSchematic: ['关于示意图', 'About the pictograms', '図示について', '도해 안내'],
  footSchematicText: [
    '无实拍的条目按外观数据绘制线描示意图，只表达形状、颜色与刻痕的相对关系，不还原真实尺寸与印字；请勿仅凭示意图判断真伪。',
    'Entries without a photo show a line-drawn pictogram generated from the appearance data: it conveys shape, colour and score only, not true size or printing. Never judge authenticity by the pictogram alone.',
    '実物写真のない項目は外観データから線画の図示を生成しています。形・色・割線の関係のみを表し、実寸や刻印は再現しません。図示だけで真贋を判断しないでください。',
    '실물 사진이 없는 항목은 외관 데이터로 생성한 선화 도해를 표시합니다. 모양·색·분할선의 관계만 나타내며 실제 크기나 각인은 재현하지 않습니다. 도해만으로 진위를 판단하지 마세요.',
  ],
  footFix: ['发现错误？', 'Found an error?', '誤りを見つけたら', '오류를 발견했다면'],
  footFixText: [
    '品牌信息随各地上市与停产不断变化。若你手里的实物与本页描述不符，欢迎附包装照片提交纠错。',
    'Brand details change as products launch and are withdrawn. If what you hold differs from this page, please report it with a packaging photo.',
    'ブランド情報は各国の発売・販売終了に伴い変化します。お手元の実物と本ページの記載が異なる場合は、包装の写真を添えてご報告ください。',
    '브랜드 정보는 각국의 출시와 단종에 따라 계속 바뀝니다. 손에 든 실물이 이 페이지의 설명과 다르면 포장 사진과 함께 알려 주세요.',
  ],
  footFixLink: ['纠错与联系方式 →', 'Corrections & contact →', '訂正・連絡先 →', '정정 및 연락처 →'],
} as const satisfies Record<string, Quad>;

export type UIStrings = { [K in keyof typeof DICT]: string };

const UI_CACHE = new Map<UiLocale, UIStrings>();

/** 取该语言的全部 UI 文案（带缓存，组件里直接 t.searchLabel） */
export function getUI(locale: UiLocale): UIStrings {
  const cached = UI_CACHE.get(locale);
  if (cached) return cached;
  const out: Record<string, string> = {};
  for (const key of Object.keys(DICT)) {
    out[key] = label(DICT[key as keyof typeof DICT], locale);
  }
  const strings = out as UIStrings;
  UI_CACHE.set(locale, strings);
  return strings;
}

/* ────────────────────────────────────────────────────────────────
   枚举标签
   ──────────────────────────────────────────────────────────────── */

export const STATUS_LABELS: Record<BrandStatus, Quad> = {
  prescription: ['处方药', 'Prescription', '処方薬', '처방약'],
  otc: ['非处方', 'OTC', '一般用医薬品', '일반의약품'],
  approved: ['已批准', 'Approved', '承認済', '승인됨'],
  grey: ['灰色渠道', 'Grey channel', 'グレー流通', '회색 유통'],
  discontinued: ['已停产', 'Discontinued', '販売中止', '생산 중단'],
  banned: ['不适用于 HRT', 'Not for HRT', 'HRT 不適', 'HRT 부적합'],
  cautioned: ['慎用', 'Caution', '慎重', '신중 사용'],
};

/** 页尾图例用的一句话说明 */
export const STATUS_HINTS: Record<BrandStatus, Quad> = {
  prescription: ['需医生处方', 'Requires a prescription', '医師の処方が必要', '의사 처방 필요'],
  otc: ['非处方可购', 'Available over the counter', '処方箋なしで購入可', '처방전 없이 구매 가능'],
  approved: ['该国已批准，处方状态未细分', 'Approved in that country; Rx status not itemised', '当該国で承認済み（処方区分は未分類）', '해당국 승인, 처방 구분 미분류'],
  grey: ['非正规上市渠道流通', 'Circulates outside formal channels', '正規流通外で出回る', '비공식 유통 경로'],
  discontinued: ['厂商已停止生产', 'Discontinued by the manufacturer', 'メーカーが製造中止', '제조사 생산 중단'],
  banned: ['成分不适合跨性别 HRT', 'Ingredient unsuitable for transgender HRT', '成分がトランスジェンダー HRT に不適', '성분이 트랜스젠더 HRT에 부적합'],
  cautioned: ['站内标为慎用', 'Flagged as use-with-caution on this site', 'サイト内で「要注意」扱い', '사이트에서 주의 표시'],
};

export const CATEGORY_LABELS: Record<IngredientCategory, Quad> = {
  estrogen: ['雌激素', 'Estrogens', 'エストロゲン', '에스트로겐'],
  antiandrogen: ['抗雄激素', 'Antiandrogens', '抗アンドロゲン', '항안드로겐'],
  gnrh: ['GnRH 类', 'GnRH analogues', 'GnRH 製剤', 'GnRH 제제'],
  progestogen: ['孕激素', 'Progestogens', 'プロゲストーゲン', '프로게스토겐'],
  '5ari': [
    '5α-还原酶抑制剂',
    '5α-reductase inhibitors',
    '5α還元酵素阻害薬',
    '5α-환원효소 억제제',
  ],
  banned: ['禁用 / 不适用', 'Not for HRT', 'HRT 不適', 'HRT 부적합'],
};

export const REGION_LABELS: Record<MarketRegion, Quad> = {
  cn: ['中国大陆', 'Mainland China', '中国本土', '중국 본토'],
  'tw-hk': ['台港澳', 'Taiwan / HK / Macau', '台湾・香港・マカオ', '대만·홍콩·마카오'],
  jp: ['日本', 'Japan', '日本', '일본'],
  kr: ['韩国', 'South Korea', '韓国', '한국'],
  sea: ['东南亚', 'Southeast Asia', '東南アジア', '동남아시아'],
  in: ['印度', 'India', 'インド', '인도'],
  eu: ['欧洲', 'Europe', 'ヨーロッパ', '유럽'],
  na: ['北美', 'North America', '北米', '북미'],
  oceania: ['大洋洲', 'Oceania', 'オセアニア', '오세아니아'],
  latam: ['拉丁美洲', 'Latin America', 'ラテンアメリカ', '라틴아메리카'],
  other: ['其他地区', 'Other', 'その他', '기타'],
};

export const COLOR_FAMILY_LABELS: Record<ColorFamily, Quad> = {
  white: ['白色', 'White', '白', '흰색'],
  blue: ['蓝色', 'Blue', '青', '파랑'],
  yellow: ['黄色', 'Yellow', '黄', '노랑'],
  pink: ['粉色', 'Pink', 'ピンク', '분홍'],
  red: ['红色', 'Red', '赤', '빨강'],
  orange: ['橙色', 'Orange', 'オレンジ', '주황'],
  brown: ['棕色', 'Brown', '茶', '갈색'],
  green: ['绿色', 'Green', '緑', '초록'],
  purple: ['紫色', 'Purple', '紫', '보라'],
  peach: ['桃色', 'Peach', '桃色', '살구색'],
  clear: ['无色 / 透明', 'Clear', '無色・透明', '무색·투명'],
  multi: ['多色', 'Multicolour', '複色', '여러 색'],
};

export const COATING_LABELS: Record<Coating, Quad> = {
  sugar: ['糖衣', 'Sugar-coated', '糖衣', '당의'],
  film: ['薄膜衣', 'Film-coated', 'フィルムコート', '필름코팅'],
  none: ['无包衣', 'Uncoated', '素錠', '무코팅'],
};

export const SCORE_LABELS: Record<Score, Quad> = {
  none: ['无刻痕', 'No score line', '割線なし', '분할선 없음'],
  single: ['单刻痕', 'Single score', '一本割線', '단일 분할선'],
  cross: ['十字刻痕', 'Cross score', '十字割線', '십자 분할선'],
};

export const CONFIDENCE_LABELS: Record<Confidence, Quad> = {
  verified: ['已核实', 'Verified', '確認済', '확인됨'],
  reported: ['据报告', 'Reported', '報告ベース', '보고 기반'],
  unverified: ['待核实', 'To verify', '未確認', '미확인'],
};

export const HRT_USE_LABELS: Record<HrtUse, Quad> = {
  standard: ['常规使用', 'Standard use', '標準的に使用', '표준 사용'],
  situational: ['特定情况使用', 'Situational use', '状況により使用', '상황별 사용'],
  cautioned: ['需谨慎', 'Caution advised', '注意が必要', '주의 필요'],
  banned: ['不适用于 HRT', 'Not for HRT', 'HRT 不適', 'HRT 부적합'],
};
