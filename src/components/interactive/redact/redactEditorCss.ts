/**
 * redactEditorCss —— RedactEditor 的默认皮肤（米哈游「二相乐园」）基线样式。
 *
 * 形态与 AIAssistant 的 BASE_CSS 一致：组件自带 `<style>`，随组件的动态 chunk 一起加载
 * （R5：编辑器与其依赖只在用户点「上传照片」后动态 import → 样式也不能进首屏 CSS）。
 * `html.sakura` 覆盖**不**在这里，在 src/styles/sakura-ai.css §17（全站样式，手工纪律）。
 *
 * 三条本文件必须守的纪律：
 *
 * 1. **颜色全走 CSS 变量**（CLAUDE.md 铁律）。唯一例外是 `--yk-redact-burn`：它不是主题色，
 *    是**导出图里那些像素的真实颜色**（exportRedacted 的 `fillStyle:'#000000'`）。
 *    编辑器里的黑块必须与导出物同色，否则"所见即所发"（§2 原则 3）在视觉上就先破了。
 *    → 声明在这里当常量，**任何皮肤都不得覆盖它**。
 * 2. 文字色规则一律带根类前缀（`.yk-redact .yk-redact__x`，(0,2,0)）。裸 (0,1,0) 会被
 *    Starlight prose 的 `.sl-markdown-content p` (0,1,1) 压过 —— 本会话刚在 sakura 侧
 *    出过同型 P0（危机卡文字与底色同色）。
 * 3. 动画只 `transform` / `opacity`，并有 prefers-reduced-motion 兜底。
 */

export const REDACT_EDITOR_CSS = `
/* 入场：只动 transform + opacity */
@keyframes yk-redact-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.yk-redact {
  /* ⛔ 常量，不是主题色：导出像素的真实颜色（见文件头纪律 1）。皮肤不得覆盖。 */
  --yk-redact-burn: #000000;
  /* 手柄视觉尺寸 12–16px（SPEC R6）；命中区靠 ::before 撑到 44px */
  --yk-redact-handle: 14px;
  --yk-redact-hit: 44px;
  /* danger 系**文字**色（错误条 + 删除钮）。局部 token，形态同 AIAssistant 的 --yk-ai-skeleton。
     ⚠️ 不能直接用 --color-danger-text：暗色下它是 #F44336，而这两处的底都不是纯页面底 ——
     错误条自铺 --color-danger-alpha-10（合成 rgb(54,34,41)），删除钮在卡片里（rgb(46,43,53)）。
     Playwright 实测：#F44336 分别只有 4.04:1 / 3.76:1，13px 正文不过 AA 4.5。
     global.css 第 51 行注释记的正是这一类误判（按纯页面底色估算）。
     #FFB4AB 实测 8.8:1 / 8.2:1。亮色下改用仓库已按合成底色验证过的 --color-danger-text (#B71C1C)。
     覆盖门控：tests/redact-editor-a11y.spec.ts 的四态对比度用例。 */
  --yk-redact-danger-fg: #FFB4AB;

  display: flex;
  flex-direction: column;
  gap: var(--space-md, 16px);
  padding: var(--space-md, 16px);
  background: var(--color-bg-container, #211E28);
  border: 1px solid var(--color-outline-20);
  border-radius: 16px;
  font-family: var(--font-body);
  animation: yk-redact-in .28s ease both;
}
.yk-redact * { margin: 0; }

/* ── 标题区（§3.3 文案：操作指引，不是免责声明） ── */
.yk-redact .yk-redact__title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--color-text-primary);
}
.yk-redact .yk-redact__hint,
.yk-redact .yk-redact__note {
  font-size: .8125rem;
  line-height: 1.7;
  color: var(--color-text-secondary);
}
.yk-redact .yk-redact__note {
  color: var(--color-text-muted);
}
.yk-redact .yk-redact__note--caution {
  color: var(--color-caution-text);
}
.yk-redact .yk-redact__link {
  color: var(--color-accent-text);
  text-underline-offset: 2px;
}

/* ── 工具条 ── */
.yk-redact__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm, 8px);
  align-items: center;
}
.yk-redact__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-block-size: 44px;
  min-inline-size: 44px;
  padding: 8px 14px;
  font-family: var(--font-body);
  font-size: .8125rem;
  line-height: 1.4;
  cursor: pointer;
  border-radius: 999px;
  border: 1px solid var(--color-outline-20);
  background: var(--color-white-alpha-03, rgba(255,255,255,.03));
  color: var(--color-text-secondary);
  transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast), transform .2s ease;
}
@media (hover: hover) {
  .yk-redact__btn:hover:not(:disabled) {
    color: var(--color-text-primary);
    border-color: var(--color-primary);
    background: var(--color-primary-alpha-08, rgba(200,75,124,.08));
  }
}
.yk-redact__btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.yk-redact__btn:disabled { opacity: .45; cursor: not-allowed; }
.yk-redact__btn[aria-pressed='true'] {
  color: var(--color-text-primary);
  border-color: var(--color-accent);
  background: var(--color-accent-alpha-10, rgba(212,168,83,.1));
}
/* 承载**文字**的主行动钮：底色不能用 .yk-ai-send 那条 primary→primary-dark 渐变 ——
   白字在渐变亮端 #C84B7C 上实测 4.42:1，差一点点不过 AA（那个按钮只放图标，
   图形按 SC 1.4.11 只需 3:1，所以那里没问题、这里有问题）。改钉 primary-dark 单色
   （白字 ≈8.1:1），hover 不改色只抬升 —— 与 .yk-ai-send 的 hover 语汇一致。 */
.yk-redact__btn--primary {
  background: var(--color-primary-dark, #8B2D55);
  border-color: var(--color-primary);
  color: var(--color-text-on-dark, #FFFFFF);
  font-weight: 600;
}
@media (hover: hover) {
  .yk-redact__btn--primary:hover:not(:disabled) {
    color: var(--color-text-on-dark, #FFFFFF);
    border-color: var(--color-primary-light);
    box-shadow: 0 4px 16px var(--color-primary-alpha-60, rgba(200,75,124,.5));
    transform: translateY(-1px);
  }
}
.yk-redact__btn--danger { color: var(--yk-redact-danger-fg); border-color: var(--color-danger-border); }
@media (hover: hover) {
  .yk-redact__btn--danger:hover:not(:disabled) {
    color: var(--yk-redact-danger-fg);
    border-color: var(--color-danger);
    background: var(--color-danger-alpha-10, rgba(244,67,54,.1));
  }
}

/* ── 舞台：inline-block 收缩包住 canvas，使 stage 的盒子**恰好**等于图片盒子。
      pointToUnit() 依赖这一点 —— 一旦 stage 比图片大，归一化坐标就整体偏移
      （= R1 陷阱 4 的另一种形态）。所以这里不许加 padding / border。 ── */
.yk-redact__stagewrap { text-align: center; }
.yk-redact__stage {
  position: relative;
  display: inline-block;
  padding: 0;
  border: 0;
  max-inline-size: 100%;
  line-height: 0;
  touch-action: none;
  cursor: crosshair;
}
.yk-redact__canvas {
  display: block;
  inline-size: auto;
  block-size: auto;
  max-inline-size: 100%;
  max-block-size: min(56vh, 520px);
  background: var(--color-bg-primary, #0D0B14);
  border-radius: 8px;
}

/* ── 遮盖框（⚠️ 这是**预览用的 CSS 叠层**，不是遮盖本体）
      真正的遮盖由 exportRedacted 的 fillRect 烧进导出像素（R1）。
      本层永远不参与导出 —— R1 陷阱 1「黑框画在叠加层，导出只 toBlob 底层」
      在本组件里被结构性避免：导出路径只吃归一化矩形数值，从不读 DOM。 ── */
.yk-redact__rect {
  position: absolute;
  background: var(--yk-redact-burn);
  outline: 1px solid var(--color-accent-alpha-30, rgba(212,168,83,.3));
  touch-action: none;
  cursor: move;
}
.yk-redact__rect--selected { outline: 2px dashed var(--color-accent); outline-offset: 1px; }
.yk-redact__rect__tag {
  position: absolute;
  inset-block-start: 2px;
  inset-inline-start: 4px;
  font-family: var(--font-mono);
  font-size: .625rem;
  line-height: 1.2;
  color: var(--color-accent-light);
  pointer-events: none;
  user-select: none;
}

/* 手柄：视觉 14px（不挡视线），命中区 44px 且**向框外**扩展（撑大的是框外空白，
   不遮内容）—— SPEC R6 原文要求。手柄视觉中心落在框的边界线上。 */
.yk-redact__handle {
  position: absolute;
  inline-size: var(--yk-redact-handle);
  block-size: var(--yk-redact-handle);
  background: var(--color-accent);
  border: 1px solid var(--color-bg-primary, #0D0B14);
  border-radius: 3px;
  touch-action: none;
}
.yk-redact__handle::before {
  content: '';
  position: absolute;
  inline-size: var(--yk-redact-hit);
  block-size: var(--yk-redact-hit);
}
.yk-redact__handle--nw { inset-block-start: -7px; inset-inline-start: -7px; cursor: nwse-resize; }
.yk-redact__handle--ne { inset-block-start: -7px; inset-inline-end: -7px; cursor: nesw-resize; }
.yk-redact__handle--sw { inset-block-end: -7px; inset-inline-start: -7px; cursor: nesw-resize; }
.yk-redact__handle--se { inset-block-end: -7px; inset-inline-end: -7px; cursor: nwse-resize; }
/* 44px 命中区中心相对手柄中心外移 8px：框外 30px / 框内 14px */
.yk-redact__handle--nw::before { inset-block-start: -23px; inset-inline-start: -23px; }
.yk-redact__handle--ne::before { inset-block-start: -23px; inset-inline-end: -23px; }
.yk-redact__handle--sw::before { inset-block-end: -23px; inset-inline-start: -23px; }
.yk-redact__handle--se::before { inset-block-end: -23px; inset-inline-end: -23px; }

/* ── 裁剪舞台（react-easy-crop，T7）
      库自带的布局 CSS 由它自己注入 document.head（保持与库版本同步，不抄一份）；
      这里只做**颜色与焦点**覆盖，全部走 CSS 变量。
      .yk-redact__cropstage 必须有确定高度：库的容器是 position:absolute; inset:0。 ── */
.yk-redact__cropstage {
  position: relative;
  block-size: min(56vh, 520px);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-bg-primary, #0D0B14);
  /* 双指缩放的前提：浏览器不得把双指手势解释成页面缩放/滚动。库对自己的容器已设过，
     这里对整个舞台再设一次（含缩放滑块行外的留白）。 */
  touch-action: none;
}
/* 库的容器（classes.containerClassName） */
.yk-redact__cropbox { border-radius: 8px; }
/* 取景框（classes.cropAreaClassName）：color 就是**框外遮罩色** ——
   库用 box-shadow: 0 0 0 9999em currentColor 铺满框外，所以遮罩色只能从这里给。 */
.yk-redact__cropframe {
  border: 2px dashed var(--color-primary-light);
  color: var(--color-black-alpha-50, rgba(0,0,0,.5));
}
.yk-redact__cropframe:focus-visible { outline: 3px solid var(--color-accent); outline-offset: -1px; }
/* 缩放滑块行：与 .yk-redact__slider 同一栅格语汇，但它在舞台层内（裁剪态才存在） */
.yk-redact__zoomrow {
  display: grid;
  grid-template-columns: 3.4em 1fr 4.2em;
  align-items: center;
  gap: 6px;
  position: absolute;
  inset-block-end: 8px;
  inset-inline: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--color-bg-container, #211E28);
  border: 1px solid var(--color-outline-20);
}
.yk-redact__zoomrow input[type='range'] {
  inline-size: 100%;
  min-block-size: 24px;
  accent-color: var(--color-primary);
  cursor: pointer;
}
.yk-redact__zoomrow input[type='range']:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.yk-redact .yk-redact__cropreadout {
  position: absolute;
  inset-block-start: 8px;
  inset-inline-start: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--color-bg-container, #211E28);
  border: 1px solid var(--color-outline-20);
  font-family: var(--font-mono);
  font-size: .6875rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent-text);
}
/* 裁剪态：遮盖舞台只**视觉隐藏**，不卸载（canvas 位图与显示副本都靠它） */
.yk-redact__stagewrap--off { display: none; }

/* ── 精确调整（R6 / SC 2.5.7 的非拖拽等价路径） ── */
.yk-redact__fields { display: flex; flex-direction: column; gap: var(--space-sm, 8px); list-style: none; padding: 0; }
.yk-redact__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--color-outline-20);
  border-radius: 12px;
  background: var(--color-white-alpha-03, rgba(255,255,255,.03));
}
.yk-redact__field--selected { border-color: var(--color-accent); }
.yk-redact__field__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.yk-redact .yk-redact__field__name {
  font-family: var(--font-display);
  font-size: .8125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}
.yk-redact__sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px 14px; }
.yk-redact__slider { display: grid; grid-template-columns: 3.4em 1fr 3.6em; align-items: center; gap: 6px; }
.yk-redact .yk-redact__slider__label { font-size: .75rem; color: var(--color-text-secondary); }
.yk-redact .yk-redact__slider__value {
  font-family: var(--font-mono);
  font-size: .75rem;
  font-variant-numeric: tabular-nums;
  text-align: end;
  color: var(--color-accent-text);
}
.yk-redact__slider input[type='range'] {
  inline-size: 100%;
  min-block-size: 24px;
  accent-color: var(--color-primary);
  cursor: pointer;
}
.yk-redact__slider input[type='range']:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

/* ── 预览（R3：这里放的是 toBlob() 产物解码回来的图，不是编辑器画布） ── */
.yk-redact__previewwrap { text-align: center; overflow: auto; max-block-size: min(60vh, 560px); }
.yk-redact__previewimg {
  display: inline-block;
  max-inline-size: 100%;
  block-size: auto;
  border-radius: 8px;
  transform-origin: top center;
  transition: transform .2s ease;
}
.yk-redact__previewimg--zoom { transform: scale(2); max-inline-size: 100%; }
.yk-redact .yk-redact__confirm {
  font-family: var(--font-display);
  font-size: .9375rem;
  font-weight: 600;
  line-height: 1.6;
  color: var(--color-text-primary);
}
.yk-redact .yk-redact__meta {
  font-family: var(--font-mono);
  font-size: .6875rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

/* ── 错误条（导出失败 = 这次上传失败，绝不回落原图；按 §4.2 导向血检工具） ── */
.yk-redact .yk-redact__error {
  padding: 10px 12px;
  border: 1px solid var(--color-danger-border);
  border-radius: 10px;
  background: var(--color-danger-alpha-10, rgba(244,67,54,.1));
  color: var(--yk-redact-danger-fg);
  font-size: .8125rem;
  line-height: 1.6;
}
.yk-redact .yk-redact__error .yk-redact__link { color: var(--yk-redact-danger-fg); }

/* 读屏专用状态区（aria-live）—— 视觉隐藏但不 display:none */
.yk-redact__srstatus {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.yk-redact__filepick { display: none; }

/* 亮色（非 sakura） */
[data-theme='light'] .yk-redact {
  background: var(--color-bg-container, #FFFFFF);
  /* 亮色下用仓库已按合成底色实测过的 #B71C1C（global.css [data-theme=light] 注释） */
  --yk-redact-danger-fg: var(--color-danger-text);
}

@media (prefers-reduced-motion: reduce) {
  .yk-redact { animation: none; }
  .yk-redact__btn,
  .yk-redact__previewimg { transition: none; }
}
`;
