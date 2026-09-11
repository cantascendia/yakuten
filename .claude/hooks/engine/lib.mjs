// v4.0 guard engine 共享库 — stdin JSON 解析 / 路径 normalize / self 检测 / 动作原语
//
// 语义等价移植自 lib/common.sh（v3.14 verdict Phase-1：严禁重设计）。
// JSON.parse 结构性取代 sed fallback 解析器（v3.11 转义引号 / v3.12 字面量 \n 两次安全回归的根因）。
// 注意：JSON.parse 产出真实换行（等价于 bash 的 jq 路径 = canonical 语义），
// 因此 forbidden-paths 行比对不再需要 printf %b 还原步骤。
//
// 字节契约（eval 锁定，不可改）：
//   - deny JSON: {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny",...}}
//     紧凑无空格（eval 024/032/033/034/035/051 grep 'permissionDecision":"deny"'）
//   - audit jsonl 字段序: ts,hook,event,details,session；hook 名保留 <name>.sh（ledger/replay 消费）
//   - trajectory jsonl 字段序: ts,schema,event,tool,file,cmd,session；schema 硬编码 "v3.8"
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// ─── 单源正则（与 lib/common.sh 字符串逐字相等 — eval 047 扩展断言锁定）───
export const FORBIDDEN_FALLBACK_PATTERN =
  'auth/|payment/|billing/|secrets/|keys/|migration|crypto/|infra/|terraform/|\\.github/workflows/';
export const DESTRUCTIVE_SQL_CORE =
  '\\bDROP\\s+(TABLE|DATABASE|SCHEMA|INDEX)\\b|\\bTRUNCATE\\b|DELETE\\s+FROM\\s+[a-z_]+\\s*(;|$)';
// hook 绕过模式：必须与 common.sh bypass_patterns() 输出逐字节相等（eval 073 锁定）。
// v4.4b core.hooksPath = 广义 token（拦一切提及）—— 读/写 carve-out 经 3 轮对抗验证证明
// static regex 不可安全区分，回退广义 + 消费方剥引号归一化（见 common.sh 注释 / DECISIONS ADR-010）。
export const BYPASS_PATTERNS =
  '--no-verify|git\\s+commit\\s+-n($|\\s)|core\\.hooksPath|HUSKY=0|hooks-disable|chmod\\s+-x.*husky|git\\s+stash[^|]*&&[^|]*commit|SKIP=|--allow-empty\\s+--dry-run|git\\s+config.*hooksPath';

// ─── MSYS 路径翻译（git-bash 场景）───
// evals / 用户脚本经 git-bash 传入 /c/projects/... 风格 cwd；win32 Node 的 fs 只认 C:/...。
// 仅在触达文件系统 / 子进程时翻译；字符串比对（前缀剥离）保持原样（两侧同风格，剥离自洽）。
export function fsPath(p) {
  const s = String(p);
  if (process.platform === 'win32') {
    const m = /^\/([A-Za-z])(\/.*)?$/.exec(s);
    if (m) return `${m[1].toUpperCase()}:${m[2] || '/'}`;
  }
  return s;
}

// ─── stdin 解析（common.sh read_hook_input 等价）───
export function readInput(stdinText) {
  let raw = stdinText;
  if (raw === undefined) {
    try { raw = fs.readFileSync(0, 'utf8'); } catch { raw = ''; }
  }
  let j = {};
  try { j = JSON.parse(raw); } catch { j = {}; } // 解析失败 → 全空字段 → 各 guard 放行（bash 同语义）
  if (typeof j !== 'object' || j === null) j = {};
  const ti = (typeof j.tool_input === 'object' && j.tool_input !== null) ? j.tool_input : {};
  const s = (v) => (typeof v === 'string' ? v : '');
  return {
    rawJson: raw,
    toolName: s(j.tool_name),
    // MCP filesystem 用 tool_input.path 不是 file_path（learned rule 2026-05-29）
    filePath: s(ti.file_path) || s(ti.path),
    mcpDest: s(ti.destination),
    cmd: s(ti.command),
    oldString: s(ti.old_string),
    newString: s(ti.new_string),
    content: s(ti.content),
    prompt: s(j.prompt),
    cwd: s(j.cwd),
    sessionId: s(j.session_id),
    event: s(j.hook_event_name),
    query: s(ti.query),
    sql: s(ti.sql),
  };
}

// ─── 路径 normalize（common.sh normalize_paths 等价）───
// mode 'basename'：剥离失败回退 basename（immutable / test-lock / eval-gate / mcp red-lines）
// mode 'keep'    ：剥离失败保留完整规范化路径（forbidden-guard — 'auth/' 等片段需在绝对路径里也可命中）
export function normalizePaths(ctx, mode = 'basename') {
  const normFile = ctx.filePath.replaceAll('\\', '/');
  const normCwd = (ctx.cwd || '.').replaceAll('\\', '/');
  let rel = normFile.startsWith(normCwd + '/') ? normFile.slice(normCwd.length + 1) : normFile;
  if (/^\/|^[A-Za-z]:\//.test(rel)) {
    rel = mode === 'keep' ? normFile : path.posix.basename(normFile);
  }
  return { normFile, normCwd, rel, basename: path.posix.basename(normFile) };
}

// ─── self vs subproject 检测（immutable-guard.sh:21-34 等价，含 env 覆盖顺序）───
export function isAiPlaybookSelf(cwd, env = process.env) {
  let self = false;
  const c = fsPath((cwd || '.').replaceAll('\\', '/'));
  try {
    if (fs.statSync(`${c}/playbook/handbook.md`).isFile() && fs.statSync(`${c}/playbook`).isDirectory()) {
      const hb = fs.readFileSync(`${c}/playbook/handbook.md`, 'utf8');
      if (/^## 50\./m.test(hb) || fs.existsSync(`${c}/CTO-PLAYBOOK.md`)) self = true;
    }
  } catch { /* 不存在 → 非 self */ }
  // env 覆盖在自动检测之后；SUBPROJECT 先、SELF 后（同时设 1 时 SELF 胜 — 与 bash 顺序一致）
  if (env.CTO_IS_SUBPROJECT === '1') self = false;
  if (env.CTO_IS_AI_PLAYBOOK_SELF === '1') self = true;
  return self;
}

// ─── SSOT 读取（forbidden-guard.sh / mcp-guard.sh 等价：缺失 → fallback + 告警不静默）───
export function forbiddenPattern(normCwd) {
  const ssot = `${fsPath(normCwd)}/scripts/forbidden-paths.txt`;
  try {
    const lines = fs.readFileSync(ssot, 'utf8').split(/\r?\n/).filter((l) => !/^\s*(#|$)/.test(l));
    const p = lines.join('|').replace(/\|+$/, '');
    if (p) return { pattern: p, source: 'ssot' };
  } catch { /* 缺失 → fallback */ }
  // v4.0：SSOT 缺失时不再无声 — stderr 告警（不阻断），修复 safe-grep 未接线的静默失败面
  process.stderr.write(`⚠️ forbidden-paths SSOT 缺失（${ssot}），使用内置 fallback pattern\n`);
  return { pattern: FORBIDDEN_FALLBACK_PATTERN, source: 'fallback' };
}

// ─── 动作原语 ───
// 文件类 guard：exit 2 + stderr（block_with_reason 等价）
export function block(reason) {
  process.stderr.write(reason + '\n');
  process.exit(2);
}

// Bash / mcp guard：紧凑 deny JSON + exit 0（deny_with_reason 等价；对冲 GitHub #23284）
export function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }) + '\n');
  process.exit(0);
}

// 软提醒：additionalContext JSON（bash jq -Rs 路径等价 — 引擎恒有"jq"，无 stderr 降级分支）
export function remind(text, eventName) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: eventName, additionalContext: text },
  }) + '\n');
  process.exit(0);
}

// ─── audit log（common.sh audit_log 等价：字段序 / 最小转义 / 目录缺失静默跳过）───
export function isoLocal(d = new Date()) {
  const p = (n) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    `${sign}${p(Math.trunc(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)}`;
}

export function localDay(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function auditLog(ctx, hookName, event, details) {
  const cwd = fsPath((ctx.cwd || '.').replaceAll('\\', '/'));
  const dir = `${cwd}/.claude/agent-logs`;
  try {
    if (!fs.statSync(dir).isDirectory()) return;
  } catch { return; }
  // 与 bash 相同的最小转义（仅 " → \"）— 不"改进"，保持字节兼容
  const safe = String(details).replaceAll('"', '\\"');
  const line = `{"ts":"${isoLocal()}","hook":"${hookName}.sh","event":"${event}","details":"${safe}","session":"${ctx.sessionId}"}\n`;
  try { fs.appendFileSync(`${dir}/${localDay()}.jsonl`, line); } catch { /* 静默（bash 2>/dev/null 同语义）*/ }
}

// ─── hooks-overrides 透传（common.sh maybe_run_override 等价：exec 语义 = 透传 stdin + 退出码）───
export function maybeRunOverride(ctx, hookName) {
  const override = `${fsPath((ctx.cwd || '.').replaceAll('\\', '/'))}/.claude/hooks-overrides/${hookName}.sh`;
  try {
    if (!fs.statSync(override).isFile()) return;
  } catch { return; }
  const r = spawnSync('bash', [override], { input: ctx.rawJson, stdio: ['pipe', 'inherit', 'inherit'] });
  process.exit(r.status ?? 0);
}

// ─── git 分支查询（branch-guard 用）───
export function gitBranch(cwd) {
  let dir = fsPath((cwd || '.').replaceAll('\\', '/'));
  try { if (!fs.statSync(dir).isDirectory()) dir = '.'; } catch { dir = '.'; } // bash `cd 失败继续原地` 同语义
  const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: dir, encoding: 'utf8',
  });
  if (r.status !== 0 || r.error) return '';
  return (r.stdout || '').trim();
}

// ─── git 工作树根「相对上爬」查询（branch-guard 边界判断用）───
// v4.0e（codex §48 修正×2）：返回 `git rev-parse --show-cdup`（从 cwd 到工作树根的相对 `../` 串，
// 根目录时为空）。用它从 cwd 上爬得到工作树根 —— 全程停留在 cwd/file_path 的路径空间，
// 不引入 `--show-toplevel` 的 resolved-real 路径。否则 symlink/junction 别名（cwd 用别名路径、
// toplevel 返回真实路径）会前缀不匹配 → 保护分支上漏拦（codex §48 round-3 false-negative）。
export function gitCdup(cwd) {
  let dir = fsPath((cwd || '.').replaceAll('\\', '/'));
  try { if (!fs.statSync(dir).isDirectory()) dir = '.'; } catch { dir = '.'; }
  const r = spawnSync('git', ['rev-parse', '--show-cdup'], { cwd: dir, encoding: 'utf8' });
  if (r.status !== 0 || r.error) return null; // 非 git / 失败 → null（调用方回退 cwd）
  return (r.stdout || '').trim(); // 根目录 = ''，否则 '../' 重复
}

// ─── 字节截断（bash head -c 等价，按字节非字符）───
export function headBytes(s, n) {
  return Buffer.from(String(s), 'utf8').subarray(0, n).toString('utf8').replace(/�+$/, '');
}

// ─── trajectory 脱敏（trajectory-logger.sh _redact 等价：6 条规则按序）───
export function redact(s) {
  return String(s)
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, '[REDACTED_SK]')
    .replace(/(ghp|gho|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}/g, '[REDACTED_GH]')
    .replace(/AKIA[A-Z0-9]{16}/g, '[REDACTED_AWS]')
    .replace(/xox[baprs]-[A-Za-z0-9-]{10,}/g, '[REDACTED_SLACK]')
    .replace(/[Bb]earer[ \t]+[A-Za-z0-9._+/=-]{20,}/g, 'Bearer [REDACTED]')
    .replace(/((api[_-]?key|token|secret|password)["' ]*[:=]["' ]*)[A-Za-z0-9._+/=-]{12,}/gi, '$1[REDACTED]');
}

// _escape 等价：redact → 转义(\ 先 " 后) → 删换行 → head -c 500。顺序 load-bearing（eval 042）
export function escapeField(s) {
  const redacted = redact(s);
  const escaped = redacted.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  const noNl = escaped.replace(/\n/g, '');
  return headBytes(noNl, 500);
}
