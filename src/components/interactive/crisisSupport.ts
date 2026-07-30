/**
 * crisisSupport — AI 问答助手的危机词本地拦截（减害强化）
 *
 * 用户输入命中危机关键词 → 不等 AI，AIAssistant 立即本地渲染危机热线卡
 * （同时照常把消息发给端点 —— 服务端本就有危机引导 prompt）。
 * 本地卡是「秒级响应」保障：AI 慢或挂了，热线也在。
 *
 * 红线：
 * · 热线数据只从 src/data/hotlines.json（SSOT）读取，禁止硬编码号码。
 * · 关键词表保守宽召回（substring 匹配）——宁可多弹不可漏。
 * · 匹配纯本地进行，不上报、不落存储、不发任何 analytics。
 */

import hotlinesData from '../../data/hotlines.json';

export interface CrisisHotline {
  id: string;
  name: string;
  number: string;
  href: string;
  scope: string;
  hours: string;
}

/** hotlines.json 的 category 字段（SSOT 全量记录都有）。
 *  · mental-health      —— 心理/危机援助线（含 pt-sns-24 这类非「拨打即派车」的健康线）
 *  · general-emergency  —— 通用急救调度号（120 / 112 / 192），拨打即派救护车
 *  该字段**只被 getEmergencyMedicalNumber() 消费**，不改变 getCrisisHotlines 的行为
 *  （见下方 §5.3 说明）。 */
type HotlineCategory = 'mental-health' | 'general-emergency';
type HotlineRecord = CrisisHotline & { category?: HotlineCategory };

/* 保守宽召回关键词表（17 语）。substring 匹配，全部预先小写。
   已知可接受的过召回：如「自杀式」等惯用语也会触发 —— 按减害原则接受。 */
const CRISIS_KEYWORDS: readonly string[] = [
  // zh（简/繁）
  '自杀', '自殺', '自残', '自殘', '自伤', '自傷', '轻生', '輕生',
  '不想活', '想死', '寻死', '尋死', '求死', '活不下去', '不如死',
  '结束生命', '結束生命', '结束自己', '結束自己', '了结自己', '了結自己',
  '自我了断', '自我了斷', '割腕', '跳楼', '跳樓', '上吊', '烧炭', '燒炭',
  '遗书', '遺書', '自尽', '自盡', '厌世', '厭世', '活着没意思', '活著沒意思',
  // en（codex 终审补漏：惯用语）
  'suicide', 'suicidal', 'kill myself', 'end my life', 'ending my life',
  'self-harm', 'self harm', 'selfharm', 'hurt myself', 'want to die',
  'wanna die', "don't want to live", 'dont want to live', 'no reason to live',
  'better off dead', 'end it all', 'take my own life', 'not worth living',
  // ja（codex 终审补漏）
  '死にたい', '消えたい', 'リストカット', 'リスカ', '死のう',
  '死んだほうが', '死んだ方が', '命を絶', '生きていたくない', '生きたくない',
  '楽になりたい',
  // ko
  '자살', '자해', '죽고 싶', '죽고싶', '살기 싫', '살고 싶지 않', '사라지고 싶',
  // es（codex 终审补漏）
  'suicidio', 'suicidarme', 'matarme', 'quitarme la vida',
  'no quiero vivir', 'autolesión', 'autolesion', 'hacerme daño', 'quiero morir',
  // pt
  'suicídio', 'me matar', 'tirar minha vida', 'não quero viver',
  'nao quero viver', 'automutilação', 'automutilacao', 'me machucar',
  // fr（'suicide' 已由 en 覆盖）
  'me suicider', 'me tuer', 'mettre fin à mes jours', 'mettre fin a mes jours',
  'je veux mourir', 'plus envie de vivre', 'automutilation',
  // de（codex 终审补漏）
  'selbstmord', 'suizid', 'umbringen', 'mir das leben nehmen',
  'nicht mehr leben', 'selbstverletzung', 'ich will sterben', 'sterben will',
  // ru
  'суицид', 'самоубийство', 'покончить с собой', 'не хочу жить',
  'убить себя', 'самоповреждение', 'хочу умереть',
  // ar
  'انتحار', 'أريد أن أموت', 'اريد ان اموت', 'إيذاء نفسي', 'ايذاء نفسي',
  // fa
  'خودکشی', 'می‌خواهم بمیرم', 'میخواهم بمیرم', 'خودزنی', 'نمی‌خواهم زنده بمانم',
  // th
  'ฆ่าตัวตาย', 'อยากตาย', 'ทำร้ายตัวเอง', 'ไม่อยากมีชีวิต',
  // vi
  'tự tử', 'tự sát', 'muốn chết', 'tự làm hại', 'không muốn sống',
  // id
  'bunuh diri', 'ingin mati', 'menyakiti diri', 'tidak ingin hidup',
  // fil
  'magpakamatay', 'gusto ko nang mamatay', 'saktan ang sarili',
  // hi
  'आत्महत्या', 'खुदकुशी', 'मरना चाहती', 'मरना चाहता', 'खुद को नुकसान',
  // tr
  'intihar', 'kendimi öldürmek', 'ölmek istiyorum', 'kendime zarar',
];

const CRISIS_KEYWORDS_LOWER: readonly string[] = CRISIS_KEYWORDS.map((k) =>
  k.toLowerCase(),
);

/** 纯本地危机词检测（substring，大小写不敏感）。 */
export function containsCrisisKeyword(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return CRISIS_KEYWORDS_LOWER.some((k) => t.includes(k));
}

/* locale → hotlines.json scope 白名单。
   ⚠ codex 终审裁决：没有经核验的对应地区号码的语种【不得】回退展示中国
   号码（120/12356 对境外用户不可用，危机场景给错号码是伤害）——这些语种
   卡片只显示「拨打当地急救/危机热线」指引行（文案在 aiChatL10n crisisOutside）。
   中文例外：zh 受众含身处大陆的用户，全国热线是正确默认。 */
const LOCALE_SCOPES: Record<string, readonly string[]> = {
  zh: ['全国'],
  de: ['Deutschland', 'Österreich', 'Schweiz', 'EU-weit'],
  fr: ['France', 'Belgique', 'Suisse', 'EU-weit'],
  es: ['España', 'Argentina', 'México', 'Colombia'],
  pt: ['Brasil', 'Portugal'],
  ru: ['Россия', 'Україна / Украина'],
};

const MAX_CARD_HOTLINES = 4;

/** 按 locale 取危机热线（SSOT: hotlines.json），最多 4 条保持卡片紧凑。
 *  24h 热线优先排序（限时热线沉底，卡片会显示服务时间）。
 *  无对应地区数据的语种返回空数组 —— 组件只渲染当地急救指引行。 */
export function getCrisisHotlines(locale: string): CrisisHotline[] {
  const scopes = LOCALE_SCOPES[locale];
  if (!scopes) return [];
  return (hotlinesData as CrisisHotline[])
    .filter((h) => scopes.includes(h.scope))
    .sort((a, b) => Number(b.hours === '24h') - Number(a.hours === '24h'))
    .slice(0, MAX_CARD_HOTLINES)
    .map(({ id, name, number, href, scope, hours }) => ({
      id, name, number, href, scope, hours,
    }));
}

/**
 * 按 locale 取通用急救调度号（SSOT: hotlines.json，category='general-emergency'）。
 * 服务于躯体急症卡（SomaticEmergencyCard），见
 * docs/specs/ai-chat-somatic-emergency.md §5.2。
 *
 * ⚠️ 沿用 getCrisisHotlines 的既有终审裁决：某语种若没有经核验的通用急救号码，
 * **不得**回退展示中国 120 或猜测性号码 —— 返回 null，由卡片改显示「请拨打当地
 * 急救电话」通用指引行（与心理危机卡的 crisisOutside 文案模式一致）。
 *
 * ⚠️ 本函数是**纯新增的独立读取函数**，`getCrisisHotlines` 一行不动：SPEC §5.3
 * 实测确认 `getCrisisHotlines('zh')` 现在就把 120 混在心理危机卡里，那是**有意的**
 * （自伤已发生时需要救护车），加 category 过滤会静默移除一个本该存在的号码。
 */
export function getEmergencyMedicalNumber(locale: string): CrisisHotline | null {
  const scopes = LOCALE_SCOPES[locale];
  if (!scopes) return null;
  const match = (hotlinesData as HotlineRecord[])
    .find((h) => scopes.includes(h.scope) && h.category === 'general-emergency');
  if (!match) return null;
  const { id, name, number, href, scope, hours } = match;
  return { id, name, number, href, scope, hours };
}
