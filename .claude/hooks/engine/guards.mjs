// v4.0 guard engine — 10 个 guard 的语义等价实现
// 每个 guard 对照 .sh legacy 实现逐分支移植（规格：2026-07-02 spec 提取，评审基线 v3.15）。
// 铁律：exit 码 / deny JSON 字节形状 / audit 事件名 / env opt-out 语义与 legacy 完全一致。
import fs from 'node:fs';
import {
  normalizePaths, isAiPlaybookSelf, forbiddenPattern, block, deny, remind,
  auditLog, gitBranch, gitCdup, headBytes, escapeField, localDay, isoLocal, fsPath,
  FORBIDDEN_FALLBACK_PATTERN, DESTRUCTIVE_SQL_CORE, BYPASS_PATTERNS as BYPASS_PATTERNS_SRC,
} from './lib.mjs';

const env = () => process.env;
const nonComment = (l) => !/^\s*(#|$)/.test(l);
const splitLines = (s) => String(s).split(/\r?\n/);

// ═══ immutable-guard ═══（4 条红线；红线 1/4 仅 self，红线 2/3 通用）
export function immutableGuard(ctx) {
  if (!ctx.filePath) process.exit(0);
  const self = isAiPlaybookSelf(ctx.cwd);
  const { normFile, normCwd, rel, basename } = normalizePaths(ctx, 'basename');

  const writeOrMultiEditCheck = (context) => {
    if (ctx.toolName === 'Write' || ctx.toolName === 'MultiEdit') {
      if (env().CTO_CONSTITUTION_AMEND === '1') {
        auditLog(ctx, 'immutable-guard', 'constitution-amend-allowed', `file=${rel} tool=${ctx.toolName} context=${context} env=1`);
        return; // 继续（与 bash return 0 一致）
      }
      auditLog(ctx, 'immutable-guard', 'immutable-blocked-write-or-multiedit', `file=${rel} tool=${ctx.toolName} context=${context}`);
      block(`🛑 v3.9 IMMUTABLE: 不允许用 ${ctx.toolName} 改 immutable 文件

文件: ${rel}
上下文: ${context}

为什么？${ctx.toolName} 整文件覆写 / 多块编辑跳过 old_string 比对，
是绕过 immutable-guard 的攻击面（codex 第 5 轮 dogfood 教训）。

允许的操作：
  - 单 Edit（含具体 old/new_string）→ 触发完整 immutable 检查
  - 在 .claude/rules/learned/ 加 learned rule
  - 加新 hook / skill / handbook §50+ 章节

紧急 opt-out：export CTO_CONSTITUTION_AMEND=1（audit 永久记录）`);
    }
  };

  // 红线 1：CLAUDE.md 铁律段（仅 self）
  if (self && basename === 'CLAUDE.md') {
    writeOrMultiEditCheck('CLAUDE.md (含铁律段)');
    if (/## 铁律|铁律 #[0-9]+/.test(ctx.oldString)) {
      if (env().CTO_CONSTITUTION_AMEND === '1') {
        auditLog(ctx, 'immutable-guard', 'constitution-amend-allowed', `file=${rel} section=铁律 amend_env=1`);
        process.exit(0);
      }
      auditLog(ctx, 'immutable-guard', 'immutable-blocked', `file=${rel} section=铁律`);
      block(`🛑 v3.9 IMMUTABLE: CLAUDE.md 铁律段不可由 AI 修改

参考：
- OWASP Agentic Top 10 (2025-12) Rogue Agent
- AIVSS v0.8: self-modification = risk amplifier
- Anthropic Constitutional AI: constitution 不可妥协
- 共识：Cursor / Cline / Aider / Devin 都不让 agent 改 system prompt

允许的进化路径（不改铁律本身）：
  1. 加新 hook / skill / rule（守同一铁律的实施层）
  2. 在 .claude/rules/learned/ 写 learned rule（Bugbot 模式 — Cursor 44k 验证）
  3. 真要改铁律？必须人决策 + amendment proposal + 双签：
     export CTO_CONSTITUTION_AMEND=1（极端情况，audit 永久记录）`);
    }
  }

  // 红线 2：CONSTITUTION.md（任何工具任何改动，通用红线）
  if (/docs\/ai-cto\/CONSTITUTION\.md$/.test(normFile)) {
    if (env().CTO_CONSTITUTION_AMEND === '1') {
      auditLog(ctx, 'immutable-guard', 'constitution-amend-allowed', `file=${rel} tool=${ctx.toolName} amend_env=1`);
      process.exit(0);
    }
    auditLog(ctx, 'immutable-guard', 'immutable-blocked', `file=${rel} tool=${ctx.toolName}`);
    block(`🛑 v3.9 IMMUTABLE: CONSTITUTION.md 不可由 AI 单方面修改

走 /cto-constitution review 流程：人决策 + 双签 + amendment 记录。
极端情况：export CTO_CONSTITUTION_AMEND=1 单次解锁，audit 永久记录。`);
  }

  // 红线 3：forbidden-paths.txt 只加不删（通用红线）
  if (/scripts\/forbidden-paths\.txt$/.test(normFile)) {
    if (ctx.toolName === 'Write') {
      const current = `${fsPath(normCwd)}/scripts/forbidden-paths.txt`;
      let oldPaths = null;
      try { oldPaths = splitLines(fs.readFileSync(current, 'utf8')).filter(nonComment); } catch { /* 首次创建放行 */ }
      if (oldPaths) {
        // JSON.parse 已产出真实换行（等价 bash printf %b 还原后）
        const newPaths = splitLines(ctx.content).filter(nonComment);
        const removed = oldPaths.filter((l) => l !== '' && !newPaths.includes(l));
        if (removed.length) {
          const removedStr = removed.join(' ') + ' ';
          if (env().CTO_FORBIDDEN_REMOVE === '1') {
            auditLog(ctx, 'immutable-guard', 'forbidden-removal-allowed-write', `removed=${removedStr}env=1`);
            process.exit(0);
          }
          auditLog(ctx, 'immutable-guard', 'forbidden-removal-blocked-write', `removed=${removedStr}tool=Write`);
          block(`🛑 v3.9 IMMUTABLE: Write 整文件覆写 forbidden-paths.txt 试图删除条目

试图删除：${removedStr}

只允许加新路径，不允许删（codex 第 5 轮 dogfood 教训：Write 也要被守）。
极端情况：export CTO_FORBIDDEN_REMOVE=1 单次解锁，audit 永久记录。`);
        }
      }
      process.exit(0);
    }
    if (ctx.toolName === 'MultiEdit') {
      if (env().CTO_FORBIDDEN_REMOVE === '1') {
        auditLog(ctx, 'immutable-guard', 'forbidden-multiedit-allowed', 'tool=MultiEdit env=1');
        process.exit(0);
      }
      auditLog(ctx, 'immutable-guard', 'immutable-blocked-multiedit', `file=${rel} tool=MultiEdit`);
      block(`🛑 v3.9 IMMUTABLE: 不允许用 MultiEdit 改 forbidden-paths.txt

MultiEdit 的 edits 数组难以精确比对删除条目（codex 第 5 轮 dogfood 教训）。
请用单 Edit + old/new_string 改一处一处。

紧急：export CTO_FORBIDDEN_REMOVE=1`);
    }
    if (ctx.oldString) {
      const oldPaths = splitLines(ctx.oldString).filter(nonComment);
      const newPaths = splitLines(ctx.newString).filter(nonComment);
      const removed = oldPaths.filter((l) => l !== '' && !newPaths.includes(l));
      if (removed.length) {
        const removedStr = removed.join(' ') + ' ';
        if (env().CTO_FORBIDDEN_REMOVE === '1') {
          auditLog(ctx, 'immutable-guard', 'forbidden-removal-allowed', `removed=${removedStr}env=1`);
          process.exit(0);
        }
        auditLog(ctx, 'immutable-guard', 'forbidden-removal-blocked', `removed=${removedStr}`);
        block(`🛑 v3.9 IMMUTABLE: forbidden-paths.txt 不允许删除条目

试图删除：${removedStr}

只允许加新路径（扩大保护范围），不允许删（缩小保护 = 放开高危）。
极端情况：export CTO_FORBIDDEN_REMOVE=1 单次解锁，audit 永久记录。`);
      }
    }
  }

  // 红线 4：handbook §32-§35（仅 self）
  if (self && /playbook\/handbook\.md$/.test(normFile)) {
    writeOrMultiEditCheck('handbook §32-§35');
    if (/^## 32\. AI 代码生成|^## 33\. Vibe Coding|^## 34\. Harness 设计|^## 35\. Eval-Driven/m.test(ctx.oldString)) {
      if (env().CTO_CONSTITUTION_AMEND === '1') {
        auditLog(ctx, 'immutable-guard', 'handbook-core-amend-allowed', 'amend_env=1');
        process.exit(0);
      }
      auditLog(ctx, 'immutable-guard', 'immutable-blocked', `file=${rel} section=§32-§35`);
      block(`🛑 v3.9 IMMUTABLE: handbook §32-§35 是基础理论框架，不可由 AI 修改

§32 反模式定义 / §33 vibe 红线 / §34 Harness 自审 / §35 EDD = ai-playbook 的"宪法"层。
允许：加新章节（§50+）/ 扩 §32.X 子节
禁止：改既有 §32-§35 的核心定义

极端情况：export CTO_CONSTITUTION_AMEND=1`);
    }
  }

  // 红线 5（v4.0c，人双签语义）：guard 层自保护 — 落实 CONSTITUTION「hooks block 逻辑不可移除」
  // 仅拦 Write/MultiEdit 对既有 guard 文件的整文件覆写（镜像红线 1/4 的 Edit-vs-Write 区分：
  // 单 Edit 精修保持低摩擦 — 修 guard bug 顺手 sweep 是主进化路径）。新文件创建放行。
  // 通用红线（self + 子项目同守：agent 关停自身护栏的威胁与仓库身份无关）。
  if (/\.claude\/hooks\/.+\.(sh|mjs)$/.test(normFile) && (ctx.toolName === 'Write' || ctx.toolName === 'MultiEdit')) {
    const abs = /^\/|^[A-Za-z]:\//.test(normFile) ? normFile : `${normCwd}/${normFile}`;
    let exists = false;
    try { exists = fs.statSync(fsPath(abs)).isFile(); } catch { /* 新文件 → 放行 */ }
    if (exists) {
      if (env().CTO_GUARD_AMEND === '1') {
        auditLog(ctx, 'immutable-guard', 'guard-amend-allowed', `file=${rel} tool=${ctx.toolName} env=1`);
        process.exit(0);
      }
      auditLog(ctx, 'immutable-guard', 'guard-overwrite-blocked', `file=${rel} tool=${ctx.toolName}`);
      block(`🛑 v4.0 GUARD SELF-PROTECTION: 不允许用 ${ctx.toolName} 整文件覆写 guard

文件: ${rel}

CONSTITUTION 安全宪法：hooks 的 block/deny 逻辑不可由 AI 单方面移除。
整文件覆写会绕过逐行审查，是关停护栏的最短路径（OWASP ASI10 Rogue Agent）。

允许的操作：
  - 单 Edit（含具体 old/new_string）→ 可精修 guard bug（主进化路径不受阻）
  - 新建 guard / engine 文件（Write 到不存在的路径）

维护性覆写（人已确认）：export CTO_GUARD_AMEND=1（audit 永久记录）`);
    }
  }

  process.exit(0);
}

// ═══ forbidden-guard ═══（§32.1 forbidden 路径 → exit 2；剥离失败保留完整路径）
export function forbiddenGuard(ctx) {
  if (!ctx.filePath) process.exit(0);
  const { normCwd, rel } = normalizePaths(ctx, 'keep');
  const { pattern } = forbiddenPattern(normCwd);
  if (!pattern) process.exit(0);
  let re;
  try { re = new RegExp(`(${pattern})`); } catch {
    process.stderr.write('⚠️ forbidden pattern 编译失败，回退内置 pattern\n');
    re = new RegExp(`(${FORBIDDEN_FALLBACK_PATTERN})`);
  }
  if (re.test(rel)) {
    if (env().CTO_DOUBLE_SIGNED === '1') {
      auditLog(ctx, 'forbidden-guard', 'forbidden-allowed', `path=${rel} double_signed=true`);
      process.exit(0);
    }
    auditLog(ctx, 'forbidden-guard', 'forbidden-blocked', `path=${rel}`);
    block(`🛑 §32.1 BLOCKED: \`${rel}\` 命中 forbidden 路径

此路径禁止 vibe coding（铁律 #13），必须走 Spec-Driven：
  1. /cto-spec specify — 先写 SPEC 并经人审
  2. 双签：CTO + 第二模型独立审（/cto-review --cross）
  3. PR 打 requires-double-review 标签

参考：handbook §32.1 / §19 / 铁律 #13
紧急 opt-out（已获双签后）：export CTO_DOUBLE_SIGNED=1（audit 永久记录）`);
  }
  process.exit(0);
}

// ═══ branch-guard ═══（铁律 #8：保护分支上禁 Edit；v4.0c 扩展 Bash git commit/push/merge）
const PROTECTED_BRANCHES = new Set(['main', 'master', 'production', 'prod', 'release']);
const PROTECTED_RE = '(main|master|production|prod|release)';

// v4.0c（需人双签的新语义）：解析真实 git 子命令，不做子串匹配（cutover 审查 MUST-2：
// PR body / git log --grep / echo 文本必须放行）。剥离引号 + heredoc 后按 shell 操作符切段。
function stripQuotedAndHeredoc(cmd) {
  return splitLines(cmd).map((l) => l.replace(/<<-?'?[A-Za-z_]+'?.*$/, '')).join('\n')
    .replace(/'[^']*'/g, ' ')
    .replace(/"(\\.|[^"\\])*"/g, ' ');
}

function gitSubcommand(segment) {
  const toks = segment.trim().split(/\s+/);
  if (toks[0] !== 'git') return { sub: '', rest: [] };
  const eatsArg = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
  for (let i = 1; i < toks.length; i++) {
    const t = toks[i];
    if (t.startsWith('-')) { if (eatsArg.has(t)) i++; continue; }
    return { sub: t, rest: toks.slice(i + 1) };
  }
  return { sub: '', rest: [] };
}

// push 判定看 refspec 而非 HEAD（cutover 审查：HEAD=main 时 push feature 分支必须放行）；
// bare `git push`（无 refspec）默认推当前分支 → 回退看 HEAD。
function pushTargetsProtected(rest, headProtected) {
  const nonFlags = rest.filter((t) => !t.startsWith('-'));
  const refspecs = nonFlags.slice(1); // 第一个非 flag = remote
  if (refspecs.length === 0) return headProtected;
  return refspecs.some((r) => new RegExp(`(^|:)${PROTECTED_RE}$`).test(r));
}

// v4.7 跨仓/复合命令感知（修实测两次 FP）：旧实现只用会话 cwd 判 HEAD，于是
//   ① `cd /other/repo && git commit`（他仓已在 feature 分支）被按本仓 HEAD=main 误拦；
//   ② `git checkout -b feat/x && git commit`（同串先切分支）按切换前 HEAD 误拦（TOCTOU）。
// 修：按 segment 顺序跟踪「有效工作目录」（cd / git -C）与「同串内已切到非保护分支」。
// fail-safe：目录解析不出 / 非 git 仓 / 任何异常 → 回退会话 cwd 的 HEAD（即旧行为，宁可拦）。
function resolveDir(base, arg) {
  if (!arg) return base;
  const a = arg.replaceAll('\\', '/').replace(/^["']|["']$/g, '');
  if (/^\/|^[A-Za-z]:\//.test(a)) return a.replace(/\/+$/, '') || a; // 绝对路径
  const b = String(base || '.').replaceAll('\\', '/').replace(/\/+$/, '');
  const parts = b.split('/');
  for (const seg of a.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') { if (parts.length > 1) parts.pop(); continue; }
    parts.push(seg);
  }
  return parts.join('/') || b;
}

function branchGuardBash(ctx) {
  if (!ctx.cmd) process.exit(0);
  const sessionBranch = gitBranch(ctx.cwd);
  const segments = stripQuotedAndHeredoc(ctx.cmd).split(/&&|\|\||;|\||\n/);
  let curDir = ctx.cwd;          // 有效工作目录（随 cd 推进）
  let switchedToSafe = false;    // 同串内已 checkout/switch 到非保护分支
  const branchCache = new Map();
  const branchOf = (dir) => {
    const k = String(dir);
    if (!branchCache.has(k)) {
      let b = '';
      try {
        // 目录必须真实存在才按它判 —— 否则 gitBranch 内部会回退到「进程 cwd」，
        // 那是 guard 自己的运行目录，与被检命令无关 → 会漏拦。fail-safe 用会话 HEAD。
        if (fs.statSync(fsPath(String(dir).replaceAll('\\', '/'))).isDirectory()) b = gitBranch(dir);
      } catch { b = ''; }
      branchCache.set(k, b || sessionBranch);
    }
    return branchCache.get(k);
  };

  for (const seg of segments) {
    const toks = seg.trim().split(/\s+/);
    // cd 跟踪（cd - / 无参 → 不改，保守）
    if (toks[0] === 'cd' && toks[1] && toks[1] !== '-') { curDir = resolveDir(curDir, toks[1]); continue; }
    const { sub, rest } = gitSubcommand(seg);
    // 同串内切分支：-b/-c 新建 或 切到非保护分支 → 后续 commit 视为安全；切回保护分支 → 复位
    if (sub === 'checkout' || sub === 'switch') {
      const names = rest.filter((t) => !t.startsWith('-'));
      const target = rest.includes('-b') || rest.includes('-c') || rest.includes('-B') ? names[0] : names[0];
      if (target) switchedToSafe = !PROTECTED_BRANCHES.has(target);
      continue;
    }
    // -C <dir> 覆盖本 segment 的目录
    const ci = toks.indexOf('-C');
    const segDir = ci > 0 && toks[ci + 1] ? resolveDir(curDir, toks[ci + 1]) : curDir;
    const branch = switchedToSafe ? '' : branchOf(segDir);
    const headProtected = PROTECTED_BRANCHES.has(branch);
    let hit = '';
    if ((sub === 'commit' || sub === 'merge') && headProtected) hit = `git ${sub}（HEAD=${branch}）`;
    if (sub === 'push' && pushTargetsProtected(rest, headProtected)) hit = `git push → 保护分支 refspec（HEAD=${branch}）`;
    if (hit) {
      if (env().CTO_MAIN_EDIT_ALLOWED === '1') {
        auditLog(ctx, 'branch-guard', 'main-commit-allowed-emergency', `branch=${branch} cmd=${headBytes(ctx.cmd, 200)}`);
        process.exit(0);
      }
      auditLog(ctx, 'branch-guard', 'main-commit-blocked', `branch=${branch} hit=${hit} cmd=${headBytes(ctx.cmd, 200)}`);
      deny(`🛑 铁律 #8 BLOCKED: ${hit}

命令：\`${headBytes(ctx.cmd, 300)}\`

保护分支（main/master/production/prod/release）不接受直接 commit/merge/push —
先建分支走 PR：git checkout -b feat/<short-name>

紧急 opt-out：export CTO_MAIN_EDIT_ALLOWED=1（audit 永久记录）
参考：CLAUDE.md 铁律 #8 / v4.0c 双签语义`);
    }
  }
  process.exit(0);
}

// v4.0e（修 2026-07-02 误拦 + codex §48 加固×2）：判定目标文件是否落在当前 git 工作树内。
// 保护分支只保护本仓工作树 — 仓库外文件（如 ~/.claude/.../memory/*.md）与本仓 main 无关 → 放行。
// 工作树根 = 从 cwd 按 `git rev-parse --show-cdup` 相对上爬（非 --show-toplevel 的 resolved-real 路径）：
//   - Major-1（cwd 为子目录）：cdup 上爬到真根 → cwd 外的同仓文件仍拦；
//   - round-3（symlink/junction 别名）：全程停留在 cwd/file 的路径空间，不引入 real 路径 → 别名前缀仍匹配。
// canonPath 归一：MSYS(/c/)→原生盘符 + 去尾斜杠 + Windows 大小写不敏感（Major-2）。
// engine 与 legacy branch-guard.sh 的 _canon / cdup 上爬同款，保 parity。
function canonPath(p) {
  let s = fsPath(String(p).replaceAll('\\', '/')).replace(/\/+$/, '');
  if (process.platform === 'win32') s = s.toLowerCase(); // Windows FS 大小写不敏感
  return s;
}
function fileInsideWorktree(ctx) {
  const rawFile = String(ctx.filePath).replaceAll('\\', '/');
  if (!/^\/|^[A-Za-z]:\//.test(rawFile)) return true; // 相对路径 → 相对 cwd（恒在工作树内）
  // 从 cwd 上爬 N 层得工作树根（N = cdup 中 '..' 段数）；全程 cwd 空间，与 file_path 同空间
  let root = String(ctx.cwd || '.').replaceAll('\\', '/').replace(/\/+$/, '');
  const cdup = gitCdup(ctx.cwd);
  if (cdup) {
    const levels = cdup.split('/').filter((s) => s === '..').length;
    for (let i = 0; i < levels; i++) root = root.replace(/\/[^/]+$/, '');
  }
  const base = canonPath(root);
  const f = canonPath(rawFile);
  return f === base || f.startsWith(base + '/');
}

export function branchGuard(ctx) {
  if (ctx.toolName === 'Bash') return branchGuardBash(ctx);
  if (!ctx.filePath) process.exit(0);
  const branch = gitBranch(ctx.cwd);
  if (!branch) process.exit(0); // 非 git repo / detached 空值 → 放行（与 bash 一致）
  if (PROTECTED_BRANCHES.has(branch)) {
    // v4.0e：仓库外文件放行（保护分支只拦本仓工作树内的直接 Edit/Write）
    if (!fileInsideWorktree(ctx)) {
      auditLog(ctx, 'branch-guard', 'main-edit-outside-repo-allowed', `branch=${branch} file=${ctx.filePath}`);
      process.exit(0);
    }
    if (env().CTO_MAIN_EDIT_ALLOWED === '1') {
      auditLog(ctx, 'branch-guard', 'main-edit-allowed-emergency', `branch=${branch} file=${ctx.filePath}`);
      process.exit(0);
    }
    auditLog(ctx, 'branch-guard', 'main-edit-blocked', `branch=${branch} file=${ctx.filePath}`);
    block(`🛑 铁律 #8 BLOCKED: 当前在 \`${branch}\` 分支上直接 Edit

文件：${ctx.filePath}

先创建分支再动手：
  git checkout -b feat/<short-name>

紧急 opt-out：export CTO_MAIN_EDIT_ALLOWED=1（audit 永久记录）
参考：CLAUDE.md 铁律 #8`);
  }
  process.exit(0);
}

// ═══ test-lock-guard ═══（铁律 #14：advisory only，永不 block）
const TEST_PATTERN = /\/tests?\/|\/__tests__\/|\.test\.[jt]sx?$|\.spec\.[jt]sx?$|_test\.py$|test_[^/]+\.py$|_test\.go$|.*Test\.java$|.*Spec\.scala$/;
export function testLockGuard(ctx) {
  if (!ctx.filePath) process.exit(0);
  const { rel } = normalizePaths(ctx, 'basename');
  if (TEST_PATTERN.test(rel)) {
    if (env().CTO_TEST_LOCK_ACK === '1') {
      auditLog(ctx, 'test-lock-guard', 'test-lock-ack', `file=${rel}`);
      process.exit(0);
    }
    auditLog(ctx, 'test-lock-guard', 'test-lock-warn', `file=${rel}`);
    remind(`🛑 §20.3 Test-Lock 触发（铁律 #14）: ${rel}

测试文件锁定：AI 只能改实现，不能改断言迁就实现（作弊式 TDD）。
合法修改场景（需在 commit message 声明依据）：
  - spec-change: SPEC.md 验收标准变了
  - bug-fix: 测试本身有 bug（断言错 / edge case 漏）
  - 新增测试 / refactor（不改断言语义）

非法：实现失败 → 改测试让它通过 / 删"麻烦的"测试。
确认合法：export CTO_TEST_LOCK_ACK=1（audit 永久记录）
参考：handbook §20.3 / 铁律 #14 / .claude/rules/test-lock.md`, 'PreToolUse');
  }
  process.exit(0);
}

// ═══ eval-gate ═══（铁律 #12：PostToolUse advisory）
const PROMPT_PATTERN = /\.claude\/commands\/|\.claude\/agents\/|\.claude\/skills\/|\.agents\/skills\/|^CLAUDE\.md$|\/CLAUDE\.md$|playbook\/handbook\.md$|\.claude\/output-styles\//;
export function evalGate(ctx) {
  if (!ctx.filePath) process.exit(0);
  const { rel } = normalizePaths(ctx, 'basename');
  if (PROMPT_PATTERN.test(rel)) {
    auditLog(ctx, 'eval-gate', 'eval-gate-warn', `file=${rel}`); // audit 先于 opt-out（顺序 load-bearing）
    if (env().CTO_EVAL_GATE_ACK === '1') process.exit(0);
    remind(`📊 §35 / 铁律 #12 触发: ${rel}

你刚才改了 agent 配置类文件。无 eval 不进 main（铁律 #12）：
  1. evals/golden-trajectories/ 需有覆盖本改动的 case
  2. 合并前跑 \`/cto-eval run\`（或 bash scripts/run-evals.sh）
  3. regression 集也要过（无回归）

已有 eval 覆盖 / 纯 typo：export CTO_EVAL_GATE_ACK=1
参考：handbook §35 / 铁律 #12 / .claude/rules/eval-gate.md`, 'PostToolUse');
  }
  process.exit(0);
}

// ═══ vibe-prompt-guard ═══（§33 关键词提醒；无 override / 无 opt-out）
// 注意：\b 对 CJK 在 JS 不成立（\w 仅 ASCII）→ 强行 单独用无边界匹配（与 GNU grep locale 行为的最接近可用语义）
const VIBE_ASCII = /\byolo\b|\baccept all\b|\bvibe ship\b|--no-verify|\bskip tests\b|\bjust do it\b|\bno spec\b/i;
export function vibePromptGuard(ctx) {
  if (!ctx.prompt) process.exit(0);
  if (VIBE_ASCII.test(ctx.prompt) || ctx.prompt.includes('强行')) {
    auditLog(ctx, 'vibe-prompt-guard', 'vibe-keyword', headBytes(ctx.prompt, 100));
    remind(`⚠️ §33 红线提醒：检测到 vibe 关键词

三档分级（handbook §33）：
  🟢 throwaway 原型 → 可以 vibe，但产物进 experimental/ 且 7 天过期
  🟡 生产代码 → 必须 spec-driven（/cto-spec specify）
  🔴 Forbidden 路径（auth/支付/secrets/migration/crypto/infra）禁止 vibe coding（铁律 #13）

.claude/hooks/forbidden-guard.sh 会硬阻止 Edit forbidden 路径。
参考：handbook §33 / 铁律 #13`, 'UserPromptSubmit');
  }
  process.exit(0);
}

// ═══ trajectory-logger ═══（PostToolUse *：脱敏 jsonl；schema v3.8 字节兼容）
export function trajectoryLogger(ctx) {
  const cwd = fsPath((ctx.cwd || '.').replaceAll('\\', '/'));
  const dir = `${cwd}/.claude/agent-logs`;
  try { if (!fs.statSync(dir).isDirectory()) process.exit(0); } catch { process.exit(0); }
  const rawCmd = env().CTO_TRAJECTORY_FULL === '1' ? ctx.cmd : headBytes(ctx.cmd, 200);
  const line = `{"ts":"${isoLocal()}","schema":"v3.8","event":"${escapeField(ctx.event)}","tool":"${escapeField(ctx.toolName)}","file":"${escapeField(ctx.filePath)}","cmd":"${escapeField(rawCmd)}","session":"${escapeField(ctx.sessionId)}"}\n`;
  try { fs.appendFileSync(`${dir}/${localDay()}.jsonl`, line); } catch { /* 静默 */ }
  process.exit(0);
}

// ═══ bypass-guard ═══（PreToolUse Bash：hook 绕过尝试 → deny JSON）
// 单源：pattern 字符串由 lib.mjs BYPASS_PATTERNS 提供（= common.sh bypass_patterns()）。
// /m 保留 legacy grep 逐行语义（($|\s) 的 $ 需匹配行尾而非串尾）。
const BYPASS_PATTERNS = new RegExp(BYPASS_PATTERNS_SRC, 'm');
export function bypassGuard(ctx) {
  if (ctx.toolName !== 'Bash') process.exit(0);
  if (!ctx.cmd) process.exit(0);
  // v4.4b 引号插入逃逸硬化：shell 执行前吃掉引号/反斜杠字符，guard 必须看到 shell 看到的形态 ——
  // `core.hooks'Path'` / `"core.hooksPath"` / `core\.hooksPath` / 引号包 metachar 值 都归一为可命中串。
  // 广义 core.hooksPath token + 本剥字符 = 对全部 3 轮对抗验证的引号/续行逃逸免疫（子串仍在即命中）。
  // 只删不增 → 匹配面严格超集，原命中不丢失。与 legacy bypass-guard.sh tr -d 逐字节同步。DECISIONS ADR-010。
  const scanCmd = ctx.cmd.replace(/['"\\]/g, '');
  if (BYPASS_PATTERNS.test(scanCmd)) {
    if (env().CTO_BYPASS_ALLOWED === '1') {
      auditLog(ctx, 'bypass-guard', 'bypass-allowed-emergency', `cmd=${ctx.cmd}`);
      process.exit(0);
    }
    auditLog(ctx, 'bypass-guard', 'bypass-blocked', `cmd=${ctx.cmd}`);
    deny(`🛑 BLOCKED: 检测到 hook/pre-commit 绕过尝试

命令：\`${ctx.cmd}\`

pre-commit hook 不可绕过（Constitution 安全宪法 #3 / GitHub #40117 已知绕过面）。
hook 失败 → 修根因，不是跳过检查。

紧急 opt-out（人已确认）：export CTO_BYPASS_ALLOWED=1（audit 永久记录）
参考：https://github.com/anthropics/claude-code/issues/40117`);
  }
  process.exit(0);
}

// ═══ destructive-action-guard ═══（PreToolUse Bash：不可逆动作 → deny JSON）
// SCAN_CMD：仅剥离 heredoc 起始标记至行尾（v3.11 定案：引号内容保留 — psql -c "DROP..." 必须命中）
const FS_PATTERNS = `rm\\s+-rf\\s+["']?/($|\\s|["'])|rm\\s+-rf\\s+["']?~($|\\s|["'])|rm\\s+-rf\\s+["']?\\$HOME|rm\\s+-rf\\s+["']?\\.\\s|rm\\s+-rf\\s+["']?\\*($|\\s)|find\\s+/?\\s.*-delete|>\\s*/dev/sda|mkfs|dd\\s+if=.*of=/dev/`;
const DB_PATTERNS = `${DESTRUCTIVE_SQL_CORE}|psql.*-c.*DROP|mongo.*dropDatabase|redis-cli.*FLUSHALL`;
const CLOUD_PATTERNS = `terraform\\s+destroy|vercel\\s+rm\\s.*--yes|railway\\s+(down|destroy)|supabase\\s+project\\s+delete|aws\\s+s3\\s+rb\\s+["']?s3://.*--force|aws\\s+rds\\s+delete-db-instance|aws\\s+ec2\\s+terminate-instances.*--force|gh\\s+repo\\s+delete|gh\\s+secret\\s+remove|firebase\\s+(use\\s+.*&&.*deploy|projects:delete)|heroku\\s+apps:destroy|fly\\s+apps\\s+destroy|kubectl\\s+delete\\s+(ns|namespace|cluster|all)|docker\\s+system\\s+prune\\s+--all\\s+--volumes`;
const COMBINED_DESTRUCTIVE = new RegExp(`${FS_PATTERNS}|${DB_PATTERNS}|${CLOUD_PATTERNS}`, 'im');

export function destructiveActionGuard(ctx) {
  if (ctx.toolName !== 'Bash') process.exit(0);
  if (!ctx.cmd) process.exit(0);
  const scanCmd = splitLines(ctx.cmd).map((l) => l.replace(/<<-?'?[A-Za-z_]+'?.*$/, '')).join('\n');
  // 纯 echo/printf 输出（无 shell 操作符）→ 放行（v3.10.2 教训：文本不是执行）
  if (/^[ \t]*(echo|printf)[ \t]/m.test(scanCmd) && !/&&|\|\||;|\$\(|\|\s/.test(scanCmd)) {
    process.exit(0);
  }
  if (COMBINED_DESTRUCTIVE.test(scanCmd)) {
    if (env().CTO_DESTRUCTIVE_CONFIRMED === '1') {
      auditLog(ctx, 'destructive-action-guard', 'destructive-action-allowed', `cmd=${headBytes(ctx.cmd, 200)} env=1`);
      process.exit(0);
    }
    auditLog(ctx, 'destructive-action-guard', 'destructive-action-blocked', `cmd=${headBytes(ctx.cmd, 200)}`);
    deny(`🛑 v3.10.1 DESTRUCTIVE ACTION BLOCKED

命令：\`${headBytes(ctx.cmd, 300)}\`

命中不可逆动作模式（FS 抹除 / DB DROP / 云资源销毁）。
参考：OWASP ASI01 / PocketOS 事故（Cursor+Claude Opus 4.6 删除生产库，theregister 2026-01）。

确认是有意为之：export CTO_DESTRUCTIVE_CONFIRMED=1（单次，audit 永久记录）`);
  }
  process.exit(0);
}

// ═══ mcp-guard ═══（PreToolUse mcp__.*：工具名语义 + SQL 内容 + filesystem 红线重跑）
const DESTRUCTIVE_MCP_TOOL = /_(delete|drop|destroy|purge|wipe)($|_)|_delete_|delete_(branch|project|database|namespace|bucket|file|table|deployment|secret)|apply_migration|reset_branch/i;
const MCP_FS_WRITE = /__(write_file|edit_file|move_file|create_file|create_directory)$/i;
const DESTRUCTIVE_SQL = new RegExp(`${DESTRUCTIVE_SQL_CORE}|\\bUPDATE\\s+[a-z_]+\\s+SET\\b.*(;|$)`, 'im');
const SQL_WHERE_CARVEOUT = /DELETE\s+FROM.*\bWHERE\b|UPDATE\s+.*\bWHERE\b/i;
const SQL_HARD = /\bDROP\b|\bTRUNCATE\b/i;
const MCP_TEST_PATTERN = /\/tests?\/|\/__tests__\/|\.test\.[jt]sx?$|\.spec\.[jt]sx?$|_test\.py$|test_[^/]+\.py$|_test\.go$/;

export function mcpGuard(ctx) {
  if (!ctx.toolName.startsWith('mcp__')) process.exit(0);
  let blocked = false;
  let reason = '';

  // Check 1：工具名 destructive 语义
  if (DESTRUCTIVE_MCP_TOOL.test(ctx.toolName)) {
    blocked = true;
    reason = `MCP 工具名命中 destructive 语义: ${ctx.toolName}`;
  }

  // Check 2：execute_sql 类 query/sql 参数内容（A4 决议：不扫 description 元数据 —
  // PreToolUse stdin 不含 MCP 工具 description，扫描是 no-op = 虚假安全感，见 learned rule 2026-05-30）
  const sqlText = `${ctx.query}${ctx.query && ctx.sql ? ' ' : ''}${ctx.sql}`;
  if (!blocked && sqlText && DESTRUCTIVE_SQL.test(sqlText)) {
    if (SQL_WHERE_CARVEOUT.test(sqlText) && !SQL_HARD.test(sqlText)) {
      // 带 WHERE 的 DELETE/UPDATE 且无 DROP/TRUNCATE → carve-out 放行
    } else {
      blocked = true;
      reason = `MCP SQL 含 destructive 操作: ${headBytes(sqlText, 150)}`;
    }
  }

  // Check 3：MCP filesystem 写类工具 → 重跑三条文件红线（learned rule 2026-05-29：path 字段）
  if (MCP_FS_WRITE.test(ctx.toolName) && ctx.filePath) {
    const { normFile, normCwd, rel } = normalizePaths(ctx, 'basename');
    if (!blocked && new RegExp('docs/ai-cto/CONSTITUTION\\.md|scripts/forbidden-paths\\.txt').test(`${rel} ${normFile}`)) {
      blocked = true;
      reason = `MCP filesystem 写 immutable 文件: ${rel}（绕过 immutable-guard）`;
    }
    if (!blocked) {
      const { pattern } = forbiddenPattern(normCwd);
      let re = null;
      try { re = pattern ? new RegExp(`(${pattern})`) : null; } catch { re = new RegExp(`(${FORBIDDEN_FALLBACK_PATTERN})`); }
      if (re && re.test(rel) && env().CTO_DOUBLE_SIGNED !== '1') {
        blocked = true;
        reason = `MCP filesystem 写 forbidden 路径: ${rel}（绕过 forbidden-guard）`;
      }
    }
    if (!blocked && env().CTO_TEST_LOCK_ACK !== '1' && MCP_TEST_PATTERN.test(rel)) {
      blocked = true;
      reason = `MCP filesystem 写测试文件: ${rel}（绕过 test-lock-guard，§20.3）`;
    }
  }

  if (blocked) {
    if (env().CTO_MCP_DESTRUCTIVE_CONFIRMED === '1') {
      auditLog(ctx, 'mcp-guard', 'mcp-destructive-allowed', `tool=${ctx.toolName} env=1`);
      process.exit(0);
    }
    auditLog(ctx, 'mcp-guard', 'mcp-destructive-blocked', `tool=${ctx.toolName} reason=${reason}`);
    deny(`🛑 v3.11 MCP DESTRUCTIVE BLOCKED

${reason}

MCP 工具权限往往比 Bash 更大（直连生产 DB / 云资源），enforcement 必须覆盖（OWASP ASI04）。
只读操作（list_/get_/search_/SELECT）不受影响。

确认是有意为之：export CTO_MCP_DESTRUCTIVE_CONFIRMED=1（单次，audit 永久记录）`);
  }
  process.exit(0);
}
