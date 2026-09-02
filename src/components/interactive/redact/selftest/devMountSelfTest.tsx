/**
 * devMountSelfTest —— 真机自检页的 **dev-only** 挂载适配器。
 *
 * 与 devMount.tsx 同一理由：挂载页用 `<script is:inline>` + 运行时 `import()`
 * （普通 `<script>` 会被 Vite 打成孤儿 chunk 塞进 dist/_astro/，公开可取）。
 * inline 脚本不经 Vite 处理 → 里面无法 `import 'react'` 这类裸模块名，
 * 所以把 React/createRoot 的引入收进这个**模块**，inline 脚本只 import 它。
 *
 * 生产产物里没有任何页面引用本文件 → Vite 不会打包它，自检代码进不了 dist。
 * （验证：`npm run build` 后 dist/ 里 grep 不到 `selftest` / `yk-st`。）
 */

import { createRoot } from 'react-dom/client';
import RedactSelfTest from './RedactSelfTest';

export function mountRedactSelfTest(host: HTMLElement): void {
  createRoot(host).render(<RedactSelfTest />);
}
