/**
 * 真机自检页的样式（dev-only）。
 *
 * 纪律与 redactEditorCss 一致：颜色全走 CSS 变量、双皮肤都可读、动画只 transform/opacity。
 * 判定色（PASS 绿 / FAIL 红）**不走主题色**：它们表达的是断言结果，不是装饰 ——
 * 皮肤不得把 FAIL 弄得比 PASS 更不显眼。同时不只用颜色区分（每行都带 PASS/FAIL 文字），
 * 满足 SC 1.4.1（不以颜色为唯一手段）。
 */

export const SELFTEST_CSS = `
.yk-st {
  --yk-st-pass: #1B7F4B;
  --yk-st-fail: #B3261E;
  --yk-st-info: #4A5B7A;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-family: var(--font-body, sans-serif);
  color: var(--color-text-primary, #E6E0EE);
}
.yk-st * { margin: 0; }
.yk-st .yk-st__title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  line-height: 1.4;
  color: var(--color-text-primary, #E6E0EE);
}
.yk-st .yk-st__h2 {
  font-family: var(--font-display);
  font-size: 1rem;
  margin-block-start: 8px;
  color: var(--color-text-primary, #E6E0EE);
}
.yk-st .yk-st__lede {
  font-size: .875rem;
  line-height: 1.7;
  color: var(--color-text-secondary, #B9AEC6);
}

/* 一个按钮跑完全部断言：手机上要够大够显眼 */
.yk-st__run {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-block-size: 56px;
  padding: 12px 20px;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  border-radius: 999px;
  border: 1px solid var(--color-primary, #C84B7C);
  background: var(--color-primary-dark, #8B2D55);
  color: var(--color-text-on-dark, #FFFFFF);
}
.yk-st__run:focus-visible { outline: 3px solid var(--color-accent, #D4A853); outline-offset: 2px; }
.yk-st__run:disabled { opacity: .5; cursor: progress; }
.yk-st__run--file { position: relative; overflow: hidden; }
.yk-st__file { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

/* 大字判定：不需要开发者工具就能看懂 */
.yk-st__verdict {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border-radius: 14px;
  border: 3px solid currentColor;
}
.yk-st__verdict--pass { color: var(--yk-st-pass); }
.yk-st__verdict--fail { color: var(--yk-st-fail); }
.yk-st__verdict__big { font-size: 2.5rem; line-height: 1.1; letter-spacing: .04em; }
.yk-st .yk-st__verdict__sub { font-size: .9375rem; color: var(--color-text-primary, #E6E0EE); }

.yk-st__rows { display: flex; flex-direction: column; gap: 8px; list-style: none; padding: 0; }
.yk-st__row {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--color-outline-20, rgba(255,255,255,.15));
  background: var(--color-white-alpha-03, rgba(255,255,255,.03));
}
.yk-st__row--fail { border-color: var(--yk-st-fail); border-inline-start-width: 6px; }
.yk-st__row--pass { border-inline-start: 6px solid var(--yk-st-pass); }
.yk-st__row--info { border-inline-start: 6px solid var(--yk-st-info); }
.yk-st__row__head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.yk-st__pill {
  font-family: var(--font-mono, monospace);
  font-size: .75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  color: #FFFFFF;
}
.yk-st__pill--pass { background: var(--yk-st-pass); }
.yk-st__pill--fail { background: var(--yk-st-fail); }
.yk-st__pill--info { background: var(--yk-st-info); }
.yk-st .yk-st__row__title { font-size: .9375rem; font-weight: 600; line-height: 1.5; }
.yk-st .yk-st__row__detail {
  margin-block-start: 6px;
  font-family: var(--font-mono, monospace);
  font-size: .75rem;
  line-height: 1.7;
  word-break: break-word;
  color: var(--color-text-secondary, #B9AEC6);
}

/* 亮色（非 sakura）：判定色改用亮底上仍过 AA 的深色 */
[data-theme='light'] .yk-st {
  --yk-st-pass: #12603A;
  --yk-st-fail: #8C1D18;
  --yk-st-info: #33415C;
}

/* 乐园手账（sakura）：纸底 + 墨线，判定色保持语义强度 */
html.sakura .yk-st {
  --yk-st-pass: #1B7F4B;
  --yk-st-fail: #A32019;
  --yk-st-info: #3F5170;
  color: var(--fg-1, #4A2838);
}
html.sakura .yk-st .yk-st__title,
html.sakura .yk-st .yk-st__h2,
html.sakura .yk-st .yk-st__row__title,
html.sakura .yk-st .yk-st__verdict__sub { color: var(--fg-1, #4A2838); }
html.sakura .yk-st .yk-st__lede,
html.sakura .yk-st .yk-st__row__detail { color: var(--fg-2, #6B4A5A); }
html.sakura .yk-st__row {
  background: var(--bg-3, #FFFFFF);
  border: 1.5px solid var(--ink-faint, rgba(74,40,56,.22));
  border-radius: 16px;
}
html.sakura .yk-st__run {
  background: var(--sakura-pink-aa, #C8356B);
  border: 1.5px solid var(--ink, #4A2838);
  box-shadow: 2px 2px 0 var(--ink, #4A2838);
  font-family: var(--font-ui-accent, sans-serif);
}
html.sakura[data-theme='dark'] .yk-st {
  --fg-1: #F0E6EF;
  --fg-2: #C5B2C3;
  --ink-faint: rgba(240,230,239,.22);
  --bg-3: #2B2337;
  --yk-st-pass: #4CC38A;
  --yk-st-fail: #FF8FA3;
  --yk-st-info: #A9B8D8;
}
/* 夜里判定底色翻亮 → pill 里的白字会不够对比，改用墨字 */
html.sakura[data-theme='dark'] .yk-st__pill { color: #1A1622; }
`;
