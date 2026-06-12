#!/usr/bin/env node
/**
 * Inject FAQPage-compatible `faqs:` frontmatter into high-value pages.
 * The JsonLd.astro component emits FAQPage schema whenever faqs[] is present.
 * Pairs well with on-page FAQ sections (SEO + AEO / featured snippets).
 * Idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';

const FAQS = {
  'src/content/docs/zh/medications/antiandrogens/cpa.mdx': [
    { q: 'CPA(色普龙)每天吃多少安全?', a: '国际临床共识建议低剂量方案:5-12.5 mg/天即可充分抑制睾酮。超过 25 mg/天明显提高脑膜瘤累积风险,不再推荐。具体剂量请在医生指导下根据血检调整。' },
    { q: 'CPA 吃多久要查血?', a: '开始用药或调整剂量后 6-8 周查第一次:睾酮、泌乳素、肝功能(ALT/AST)、血常规。稳定后每 3-6 个月复查;累积剂量达 10 克时应评估脑膜瘤风险。' },
    { q: 'CPA 脑膜瘤风险有多大?', a: 'EMA 2020 警讯显示风险随累积剂量升高:累积 10 克以下罕见,超过 60 克风险显著增加。女性化 HRT 常用剂量下若规范减量、限制疗程,风险低于治疗多毛症的高剂量患者。' },
    { q: '为什么 EMA 限制了 CPA?', a: '欧洲药品管理局 2020 年基于大规模法国队列研究(Meyer 2020),确认 CPA 与脑膜瘤存在剂量-风险关系,限制其在非癌症适应症的累积剂量。跨性别 HRT 仍可在低剂量下谨慎使用。' },
    { q: 'CPA 可以和螺内酯合用吗?', a: '不推荐常规合用。两者机制不同但都抑制睾酮,叠加使用增加不良反应(高钾、肝毒性)且缺乏循证收益。通常二选一,根据个体耐受性和合并症决定。' },
  ],
  'src/content/docs/zh/medications/antiandrogens/spironolactone.mdx': [
    { q: '螺内酯 MTF 常用剂量是多少?', a: 'WPATH SOC 8 和 Endocrine Society 2017 推荐起始 50-100 mg/天,分次服用,根据血压与血钾调整至 100-300 mg/天。超过 400 mg/天无额外收益且升高副作用。' },
    { q: '螺内酯会引起高钾血症吗?', a: '会。螺内酯抑制醛固酮导致保钾;合并 ACEI/ARB、NSAIDs、大量补钾食物时风险升高。建议起始后 2 周和每次调量后查血钾与肾功能(肌酐/eGFR)。' },
    { q: '螺内酯要吃多久才见效?', a: '6-12 周开始出现体毛减缓、皮脂减少等抗雄效果;完整的女性化(乳房发育等)需雌激素联合 6-24 个月。血清睾酮下降通常在 4-8 周内可测到。' },
    { q: '为什么有的医生不推荐螺内酯?', a: '单用时血清睾酮未必降到去势水平(机制更偏受体阻断),且存在多尿、低血压、乳腺痛等副作用。在 CPA 不可用、禁忌或肝功能异常时是主力选择。' },
  ],
  'src/content/docs/zh/medications/estrogens/oral.mdx': [
    { q: '口服雌二醇(补佳乐)一天吃几片?', a: '常用剂量 2-6 mg/天(1-3 片戊酸雌二醇 2mg),根据目标血清雌二醇(100-200 pg/mL)和临床反应调整。超过 8 mg/天对腺体发育收益有限而 VTE 风险上升。' },
    { q: '口服和注射雌二醇哪个更安全?', a: '注射和经皮(凝胶/贴片)避开肝脏首过,VTE 和胆汁淤积风险显著低于口服。对 ≥40 岁、吸烟、肥胖、凝血异常者,指南优先推荐非口服途径。' },
    { q: '补佳乐可以舌下含服吗?', a: '可以,但血药曲线呈尖峰谷值,半衰期短,需一天 2-3 次给药。适合追求快速起效或口服不耐受者;长期稳态血药浓度仍不如贴片/凝胶/注射。' },
    { q: '口服雌二醇会致癌吗?', a: '生理剂量雌二醇未显示提高乳腺癌基线风险;结合雌激素(马结合雌激素)已不推荐。长期用药建议每 1-2 年乳腺/宫颈常规筛查。' },
  ],
  'src/content/docs/zh/medications/estrogens/injection.mdx': [
    { q: '戊酸雌二醇多久打一次?', a: '常用方案:4-10 mg 每 5-10 天(半衰期约 4-5 天)。目标谷值 100-200 pg/mL。剂量间隔越短,血药浓度越平稳。首次注射前建议就近设置急救支持。' },
    { q: '打针打屁股还是大腿?', a: '臀部背外侧(腹股沟后上外象限)、大腿前外侧、三角肌均可。大油量(≥2 mL)推荐臀部;自行注射者大腿更便捷。轮换注射部位避免硬结。' },
    { q: '注射雌二醇峰值血药浓度是多少?', a: '戊酸雌二醇 4 mg 肌注后 24-48 小时达峰,峰值 300-600 pg/mL,之后呈一阶衰减。不同酯(庚酸、环戊丙酸、十一酸)峰值时间和半衰期不同。' },
    { q: '注射针头选多大?', a: '油性剂建议 23G 1-1.5 inch(约 0.6mm × 25-38mm)抽药用 21G。皮下注射油剂半衰期与肌注相似但吸收更慢更平稳,针头 25G × 5/8 inch。' },
  ],
  'src/content/docs/zh/blood-tests.mdx': [
    { q: 'HRT 多久查一次血?', a: '起始或调整剂量后 6-8 周查第一次;稳定后 3-6 个月复查;稳定 1 年以上可延长至 6-12 个月。急性症状(胸痛、黄疸、持续头痛)随时急查。' },
    { q: 'HRT 必查哪些项目?', a: '核心:雌二醇 (E2)、睾酮 (T)、泌乳素 (PRL)、肝功能 (ALT/AST/GGT)、血钾、肾功能 (Cr/eGFR)、血脂 (TG/LDL/HDL)、血常规。CPA 使用者加查催乳素与影像评估脑膜瘤风险。' },
    { q: '雌二醇目标值是多少?', a: 'WPATH SOC 8 推荐 100-200 pg/mL(367-734 pmol/L);部分指南接受 100-300 pg/mL。超过 400 pg/mL 无额外收益且风险增加。注射者查谷值,口服查早晨服药前。' },
    { q: '注射当天可以查血吗?', a: '不建议。应在下次注射前 24 小时内(谷值)抽血,反映最低浓度。若查峰值(24-72 小时)数值偏高易误判。' },
    { q: '血检报告看不懂怎么办?', a: '使用本站血检自查工具可自动比对跨性别参考范围;异常项目会给出就医建议。不要凭单次异常自行停药或改量,建议复查并咨询医师。' },
  ],
  'src/content/docs/zh/risks.mdx': [
    { q: 'HRT 哪些症状要立刻去医院?', a: '紧急就医信号:单侧小腿肿痛(DVT)、突发胸痛或呼吸困难(肺栓塞)、剧烈头痛伴视觉异常(脑膜瘤/血栓)、皮肤/眼白发黄(肝损伤)、意识模糊或一侧肢体无力(卒中)。' },
    { q: 'VTE(静脉血栓)风险有多高?', a: '口服雌二醇 VTE 风险约为基线 2-4 倍,经皮/注射约等于基线。吸烟、肥胖(BMI>30)、年龄>40、遗传性凝血异常叠加风险。长途飞行、手术前后加强预防。' },
    { q: 'HRT 会伤肝吗?', a: '生理剂量雌二醇对正常肝脏影响小;CPA 和比卡鲁胺有肝毒性报告,建议每 3-6 个月查 ALT/AST。黄疸、右上腹痛、恶心持续应立即停药就医。' },
    { q: 'CPA 脑膜瘤如何识别?', a: '典型信号:持续性头痛(尤其晨起加重)、视野缺损、听力下降、新发嗅觉异常、性格改变、不明原因癫痫。累积剂量 ≥10 克者建议基线 MRI,有症状者立即影像检查。' },
    { q: '出现副作用要停药吗?', a: '危及生命的症状(上述紧急信号)立即停药就医;轻度不适(情绪波动、乳腺痛、水肿)一般观察或调整剂量。不要自行彻底停药,突然停药可能引起反弹症状。' },
  ],
};

let injected = 0;
let skipped = 0;

for (const [relPath, faqs] of Object.entries(FAQS)) {
  const abs = path.resolve(relPath);
  if (!fs.existsSync(abs)) {
    console.warn(`SKIP (missing): ${relPath}`);
    continue;
  }
  const src = fs.readFileSync(abs, 'utf8');
  const head = src.split('\n').slice(0, 30).join('\n');
  if (/^faqs:/m.test(head)) {
    skipped++;
    continue;
  }
  // Anchor on the closing `---` of the first frontmatter block (handles CRLF and LF).
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    console.warn(`SKIP (no frontmatter): ${relPath}`);
    continue;
  }
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const fmBody = m[1];
  const faqsYaml =
    'faqs:' +
    eol +
    faqs
      .map((f) => `  - q: ${JSON.stringify(f.q)}${eol}    a: ${JSON.stringify(f.a)}`)
      .join(eol);
  const newFm = fmBody + eol + faqsYaml;
  const next = src.replace(m[0], `---${eol}${newFm}${eol}---`);
  fs.writeFileSync(abs, next);
  injected++;
  console.log(`✓ ${relPath} (+${faqs.length} FAQ)`);
}

console.log(`\nInjected: ${injected} · Skipped: ${skipped}`);
