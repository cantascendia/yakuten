/**
 * 对比度测量助手（Playwright 侧）。
 *
 * 实现来源：tests/redact-editor-a11y.spec.ts 里那段已被四态用例验证过的 page.evaluate。
 * 本文件把它抽成可复用模块，供**新增**用例（tests/redact-crop.spec.ts 的裁剪态四态）使用。
 * ⚠️ a11y spec 仍保留它自己的内联副本 —— 那是铁律 #14 锁定的既有门控文件，本轮不动它的
 * 任何一行。等下一轮有正当理由改那个文件时，再把它切到这里，消除这处重复。
 *
 * 两条容易被忽略的实现要点（都是实测坑，别简化掉）：
 *  1. 必须对**合成后的**底色算对比度：逐层向上做 src-over 合成（global.css 第 51 行记的坑）。
 *  2. 渐变只写在 background-image 里 —— 只看 background-color 会算到卡片底色上，
 *     「白字在渐变亮端不过 AA」这类 bug 就藏在那里。所以每个色标都要当候选底色。
 */
import type { Page } from '@playwright/test';

export interface ContrastTarget {
  sel: string;
  label: string;
}

export interface ContrastResult {
  label: string;
  sel: string;
  found: boolean;
  ratio: number;
  fg: string;
  bg: string;
}

/** WCAG AA 正文最低对比度 */
export const AA_TEXT = 4.5;

export async function measureContrast(page: Page, targets: readonly ContrastTarget[]): Promise<ContrastResult[]> {
  return await page.evaluate((list) => {
    const lum = (rgb: number[]): number => {
      const f = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * f[0]! + 0.7152 * f[1]! + 0.0722 * f[2]!;
    };
    const parse = (s: string): number[] => {
      const m = s.match(/[\d.]+/g);
      if (!m) return [0, 0, 0, 0];
      return [Number(m[0]), Number(m[1]), Number(m[2]), m[3] === undefined ? 1 : Number(m[3])];
    };
    function effectiveBg(el: Element): number[] {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let node: Element | null = el;
      while (node) {
        const bg: number[] = parse(getComputedStyle(node).backgroundColor);
        const ba: number = bg[3] ?? 1;
        if (ba > 0) {
          r = r * a + bg[0]! * ba * (1 - a);
          g = g * a + bg[1]! * ba * (1 - a);
          b = b * a + bg[2]! * ba * (1 - a);
          a = a + ba * (1 - a);
          if (a > 0) {
            r /= a;
            g /= a;
            b /= a;
          }
          if (a >= 0.999) return [r, g, b];
        }
        node = node.parentElement;
      }
      return [r * a + 255 * (1 - a), g * a + 255 * (1 - a), b * a + 255 * (1 - a)];
    }
    const ratioOf = (fg: number[], bg: number[]): number => {
      const l1 = lum(fg);
      const l2 = lum(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    return list.map(({ sel, label }) => {
      const el = document.querySelector(sel);
      if (!el) return { label, sel, found: false, ratio: 0, fg: '', bg: '' };
      const cs = getComputedStyle(el);
      const fg = parse(cs.color).slice(0, 3);
      const candidates: number[][] = [effectiveBg(el)];
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        for (const m of cs.backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)) {
          const stop = parse(m[0]!);
          const sa = stop[3] ?? 1;
          const under = effectiveBg(el.parentElement ?? el);
          candidates.push([0, 1, 2].map((i) => stop[i]! * sa + under[i]! * (1 - sa)));
        }
      }
      let worst = candidates[0]!;
      let ratio = ratioOf(fg, worst);
      for (const c of candidates) {
        const r = ratioOf(fg, c);
        if (r < ratio) {
          ratio = r;
          worst = c;
        }
      }
      return {
        label,
        sel,
        found: true,
        ratio: Math.round(ratio * 100) / 100,
        fg: `rgb(${fg.map(Math.round).join(',')})`,
        bg: `rgb(${worst.map(Math.round).join(',')})`,
      };
    });
  }, targets as ContrastTarget[]);
}
