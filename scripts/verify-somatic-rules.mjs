#!/usr/bin/env node
/**
 * 躯体急症规则门禁 —— 把 SPEC §6 的探针集落成可执行断言。
 *
 * 为什么存在：客户端躯体急症规则是「部位 + 限定词 + 症状」的合取式，精度主张
 * （「这句不会误触发」）**只能由可执行断言背书，不能由定性举例背书**。
 * SPEC §6.4 记录了实证：规格初稿声称「我最近压力大总心慌，没吃螺内酯」不触发
 * R-HYPERK，实跑却触发了（substring 匹配看不见否定）—— 那条修正就是这套断言逼出来的。
 *
 * 误触发的代价不是崩溃，是**警报疲劳**：用户学会无视红卡，等到真的是卒中那次
 * 也会划过去 —— 干预的净效果变为负。漏报的代价是躯体急症延误。两个方向都必须守。
 *
 * 判定不经过 LLM：直接 import 真源码（src/components/interactive/somaticEmergency.ts）。
 * 词表在源码里、断言在这里，两边不可能漂移。
 *
 * 门槛（SPEC §6.3，不得降低）：
 *   · 5 条真阳性全部命中，且命中规则集合 + tier 完全一致
 *   · 25 条假阳性防护里，只有 FP-10（PE 慢性已知诊断句）允许命中且必须 downgrade=true，
 *     其余 24 条必须 0 命中
 *
 * 用法：npm run verify:somatic
 * 需要 Node ≥ 22.18（TypeScript 类型剥离默认开启）；更早的 Node 加 --experimental-strip-types。
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROBES = join(ROOT, 'scripts/somatic-emergency-probes.json');
const SOURCE = join(ROOT, 'src/components/interactive/somaticEmergency.ts');

let detectSomaticEmergency;
try {
  ({ detectSomaticEmergency } = await import(pathToFileURL(SOURCE).href));
} catch (e) {
  console.error(`🔴 无法加载 ${SOURCE}：${e.message}`);
  console.error('   本门禁直接 import TS 源码（零复制，防词表漂移）。');
  console.error('   Node < 22.18 请改跑：node --experimental-strip-types scripts/verify-somatic-rules.mjs');
  process.exit(1);
}
if (typeof detectSomaticEmergency !== 'function') {
  console.error('🔴 somaticEmergency.ts 未导出 detectSomaticEmergency()');
  process.exit(1);
}

const { probes } = JSON.parse(readFileSync(PROBES, 'utf8'));
if (!Array.isArray(probes) || probes.length === 0) {
  console.error('🔴 探针集为空 —— 门禁自身失效比规则出错更危险，直接失败');
  process.exit(1);
}

/** 规格化成可比较的字符串：`R-PE@tier1-120+downgrade`，排序后比集合。 */
function normalize(hits) {
  return (hits ?? [])
    .map((h) => `${h.ruleId}@${h.tier}${h.downgrade ? '+downgrade' : ''}`)
    .sort();
}
const fmt = (list) => (list.length ? list.join(', ') : '（无命中）');

const failures = [];
let tpTotal = 0;
let tpPass = 0;
let fpTotal = 0;
let fpPass = 0;

for (const p of probes) {
  const isTP = p.id.startsWith('TP-');
  const actualHits = detectSomaticEmergency(p.ask);
  const actual = normalize(actualHits);
  const expected = normalize(p.expect);
  const ok = actual.length === expected.length && actual.every((v, i) => v === expected[i]);

  if (isTP) {
    tpTotal += 1;
    if (ok) tpPass += 1;
  } else {
    fpTotal += 1;
    if (ok) fpPass += 1;
  }

  if (!ok) {
    failures.push(
      `${p.id} [${p.group}] 期望 ${fmt(expected)} ／ 实际 ${fmt(actual)}\n`
      + `     句子：${p.ask}\n`
      + `     判据：${p.why}`,
    );
  }
  console.log(`${ok ? '✅' : '🔴'} ${p.id.padEnd(6)} ${fmt(actual).padEnd(34)} ${p.ask}`);
}

console.log(
  `\n真阳性 ${tpPass}/${tpTotal}　假阳性防护 ${fpPass}/${fpTotal}　合计 ${tpPass + fpPass}/${tpTotal + fpTotal}`,
);

if (failures.length) {
  console.error('\n🔴 躯体急症规则未达门槛：');
  failures.forEach((f) => console.error('   · ' + f));
  console.error(
    '\n门槛见 docs/specs/ai-chat-somatic-emergency.md §6.3：任一条不满足即视为规则需要返工，'
    + '\n**不得降低门槛上线**。误触发方向的代价是警报疲劳（干预净效果为负），'
    + '\n漏报方向的代价是躯体急症延误 —— 两个方向都不能靠改探针来"通过"。',
  );
  process.exit(1);
}

console.log('\n✅ 躯体急症规则全部断言通过（真阳性全中 + 假阳性防护全守）');
