/**
 * ⚠️ 覆盖范围的诚实说明（2026-07-29 修）
 *
 * `npm run lint` 原本是 `eslint 'src/**' + 单引号`，两个问题叠在一起，**从未跑通过**：
 *   1. Windows 下 npm 不剥单引号 → eslint 收到带引号的字面 pattern → "No files matching"
 *   2. 更根本：`src/` 是 **100% TypeScript**（21 .ts + 35 .tsx，零 .js/.mjs），
 *      而本 config **没有装 TS parser**（依赖里无 typescript-eslint）。
 *      默认 espree 解析不了类型注解 → 就算修掉引号，也会在 56 个文件上全炸。
 *
 * 所以 `lint` 现在只指向 `scripts/`（18 个 .mjs，espree 可解析，实测 0 error）。
 * **`src/` 目前不在 lint 覆盖内** —— 这是个已知缺口，不是疏漏：
 *   · 类型正确性由 `npm run check`（astro check）覆盖
 *   · 但 no-unused-vars 这类 lint 规则对 src 的 56 个文件**确实没有生效**
 *
 * 要纳入 src 需新增 devDependency `typescript-eslint` 并在下方加 parser 配置。
 * 那是依赖决策，留给 owner —— 不擅自引入。
 *
 * 别把 lint 改回指向 src 而不同时装 parser：那只会让它重新变成一个恒红的脚本，
 * 而恒红的检查等于没有检查。
 */
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.astro/**', '.vercel/**'],
  },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      /* no-unreachable 属 eslint:recommended，能抓 return/throw 之后的死代码。
         这里显式打开，当前零违规。

         ⚠️ 注意它**抓不到** `process.exit()` 之后的代码 —— ESLint 的静态流分析
         不知道 process.exit 会终止进程，那些语句在规则看来是可达的。
         （最初以为开这条规则能让 seo/ai-analyze.mjs 里那条
         `eslint-disable no-unreachable` 变得有意义 —— 不成立，那条指令是
         多余的，已直接删除。记在这里免得有人再绕一圈。） */
      'no-unreachable': 'error',
    },
  },
  eslintConfigPrettier,
];
