#!/usr/bin/env node
/**
 * 配额常量一致性门禁 —— 把注释约束变成可执行断言。
 *
 * 为什么存在：两级滚动配额的四个常量在**两个文件里各存了一份**：
 *   api/ai-chat.ts                              SESSION_LIMIT / WEEKLY_LIMIT / *_WINDOW_MS
 *   src/components/interactive/AIAssistant.tsx  SESSION_QUOTA / WEEKLY_QUOTA / *_WINDOW_MS
 *
 * 不能靠 import 消除重复：`api/` 是 Vercel 原生目录，无法本地构建或测试
 * （见 docs/specs/ai-chat-multi-tier-fallback.md §5）；给它引入跨目录模块解析
 * 的未知量，任何解析失败都会直接变成线上事故。所以副本是**刻意的**，
 * 但「靠注释保持同步」在本仓库已经被证伪过（ENABLE_* 第二真值源、
 * business-paths 漏 api/ 等），必须有机器约束。
 *
 * 漂移的后果不是崩溃，是**静默错误**：用户看到的百分比与服务端实际拦截点不符 ——
 * 进度条显示 60% 却已被 429 拒绝，或显示 100% 却还能继续发。两者都会被当成 bug 报。
 *
 * 用法：node scripts/verify-quota-parity.mjs
 * 已挂在 `npm run check` 与 `npm run build` 上（漂移即阻断部署）。
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SERVER = 'api/ai-chat.ts';
const CLIENT = 'src/components/interactive/AIAssistant.tsx';

/** 逻辑名 → [服务端常量名, 客户端常量名] */
const PAIRS = [
  ['5 小时窗口额度', 'SESSION_LIMIT', 'SESSION_QUOTA'],
  ['每周窗口额度', 'WEEKLY_LIMIT', 'WEEKLY_QUOTA'],
  ['5 小时窗口长度', 'SESSION_WINDOW_MS', 'SESSION_WINDOW_MS'],
  ['每周窗口长度', 'WEEKLY_WINDOW_MS', 'WEEKLY_WINDOW_MS'],
];

/**
 * 取 `const NAME = <expr>;` 的右侧并求值。
 * 只接受由数字、`*`、`(`、`)`、空白构成的算术表达式（如 `5 * 60 * 60 * 1000`）——
 * 拒绝其他一切内容，避免这个门禁本身变成任意代码执行面。
 */
function readConst(src, file, name) {
  const m = new RegExp(`const\\s+${name}\\s*(?::\\s*[A-Za-z<>\\[\\]]+\\s*)?=\\s*([^;]+);`).exec(src);
  if (!m) throw new Error(`${file}: 找不到常量 ${name}`);
  const expr = m[1].trim();
  if (!/^[\d\s*()]+$/.test(expr)) {
    throw new Error(`${file}: ${name} 的值 \`${expr}\` 不是纯算术表达式，本门禁拒绝求值`);
  }
  const value = Function(`"use strict";return (${expr});`)();
  if (!Number.isFinite(value)) throw new Error(`${file}: ${name} 求值得到非有限数 ${value}`);
  return { value, expr };
}

const serverSrc = readFileSync(join(ROOT, SERVER), 'utf8');
const clientSrc = readFileSync(join(ROOT, CLIENT), 'utf8');

const problems = [];
const rows = [];

for (const [label, serverName, clientName] of PAIRS) {
  let s, c;
  try { s = readConst(serverSrc, SERVER, serverName); } catch (e) { problems.push(String(e.message)); continue; }
  try { c = readConst(clientSrc, CLIENT, clientName); } catch (e) { problems.push(String(e.message)); continue; }
  const ok = s.value === c.value;
  if (!ok) problems.push(`${label}：${SERVER} 的 ${serverName}=${s.value} ≠ ${CLIENT} 的 ${clientName}=${c.value}`);
  rows.push(`${ok ? '✅' : '🔴'} ${label.padEnd(14)} ${serverName}=${s.expr}  ↔  ${clientName}=${c.expr}`);
}

rows.forEach((r) => console.log(r));

if (problems.length) {
  console.error('\n🔴 配额常量漂移：');
  problems.forEach((p) => console.error('   · ' + p));
  console.error(
    '\n后果是静默错误 —— 用户看到的百分比与服务端实际拦截点不符。'
    + '\n两处必须同改；改完顺带更新 docs/specs/ai-chat-multi-tier-fallback.md §2.8 的数值推导。',
  );
  process.exit(1);
}

console.log('\n✅ 服务端与客户端配额常量一致');
