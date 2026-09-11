#!/usr/bin/env node
// v4.0 guard engine 入口 — 由 .claude/hooks/<name>.sh thin shim 调起：
//   exec node "$SCRIPT_DIR/engine/guard.mjs" <hook-name>
// stdin = Claude Code hook JSON；行为与 legacy bash 实现语义等价（32 条 golden-trajectory eval 平价门）。
// 回滚杠杆：CTO_GUARD_ENGINE=legacy（shim 层回退旧 .sh 实现，引擎不参与）。
import { readInput, maybeRunOverride } from './lib.mjs';
import {
  immutableGuard, forbiddenGuard, branchGuard, testLockGuard,
  evalGate, vibePromptGuard, trajectoryLogger,
  bypassGuard, destructiveActionGuard, mcpGuard,
} from './guards.mjs';

const GUARDS = {
  'immutable-guard': { fn: immutableGuard, override: true },
  'forbidden-guard': { fn: forbiddenGuard, override: true },
  'branch-guard': { fn: branchGuard, override: true },
  'test-lock-guard': { fn: testLockGuard, override: true },
  'eval-gate': { fn: evalGate, override: true },
  'vibe-prompt-guard': { fn: vibePromptGuard, override: false }, // legacy 无 override 委派，保持一致
  'trajectory-logger': { fn: trajectoryLogger, override: false },
  'bypass-guard': { fn: bypassGuard, override: true },
  'destructive-action-guard': { fn: destructiveActionGuard, override: true },
  'mcp-guard': { fn: mcpGuard, override: true },
};

const name = process.argv[2] || '';
const entry = GUARDS[name];
if (!entry) {
  process.stderr.write(`⚠️ guard engine: 未知 hook '${name}'，放行（fail-open + 告警）\n`);
  process.exit(0);
}

try {
  const ctx = readInput();
  if (entry.override) maybeRunOverride(ctx, name);
  entry.fn(ctx);
} catch (e) {
  // 引擎内部异常：软 hook fail-open；红线 guard fail-closed（红线不因引擎 bug 出现真空）
  const REDLINE = new Set(['immutable-guard', 'forbidden-guard', 'bypass-guard', 'destructive-action-guard', 'mcp-guard']);
  process.stderr.write(`⚠️ guard engine 内部异常（${name}）：${e && e.message ? e.message : e}\n`);
  process.exit(REDLINE.has(name) ? 2 : 0);
}
