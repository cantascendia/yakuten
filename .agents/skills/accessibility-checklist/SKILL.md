---
name: accessibility-checklist
description: >
  Web 无障碍合规检查（WCAG 2.1 AA）。当任务涉及 UI 组件、页面结构、可交互元素、
  导航、React Islands 或 MDX 内容时触发。不适用于纯后端/数据层代码。
type: checklist
---

# Web 无障碍合规检查（WCAG 2.1 AA）

在提交涉及 UI 的代码前，逐项检查：

## 语义 HTML 结构
- [ ] 每个页面只有一个 `<h1>`，标题层级连续（h1 → h2 → h3，不跳级）
- [ ] 使用地标区域：`<header>`、`<nav>`、`<main>`、`<footer>`、`<aside>`、`<section>`
- [ ] `<nav>` 有 `aria-label`（如多个导航，例如 `aria-label="主导航"` / `aria-label="面包屑"`）
- [ ] 所有 `<img>` 设置了有意义的 `alt` 文字；装饰性图片用 `alt=""`
- [ ] SVG 图标：纯装饰用 `aria-hidden="true"`；有含义的 SVG 加 `<title>` 或 `aria-label`
- [ ] 表单 `<input>` / `<select>` / `<textarea>` 均有关联的 `<label>`（`for` + `id` 或 `aria-label`）
- [ ] 表格使用 `<th scope="col/row">` 标注表头

## 颜色对比度
- [ ] 正文文字与背景对比度 ≥ 4.5:1
- [ ] 大号文字（≥ 18pt 或 ≥ 14pt 加粗）与背景对比度 ≥ 3:1
- [ ] UI 组件边框、图标、焦点指示器与相邻颜色对比度 ≥ 3:1
- [ ] 验证工具：https://webaim.org/resources/contrastchecker/
- [ ] 玻璃拟态组件（backdrop-filter）需额外验证：叠加背景图后对比度仍满足要求

## 触控 / 点击目标
- [ ] 所有可交互元素点击区域 ≥ 44×44px（移动端）
- [ ] 相邻可交互元素间距 ≥ 8px，避免误触
- [ ] 链接文字足够描述目的（避免"点击这里"、"了解更多"等无语境文字）

## 键盘导航
- [ ] 所有可交互元素（链接、按钮、表单控件、自定义组件）可通过 Tab 聚焦
- [ ] Tab 顺序与视觉顺序一致（避免 `tabindex > 0` 打乱顺序）
- [ ] 自定义组件不需要 `tabindex > 0`；原生元素或 `tabindex="0"` 优先
- [ ] 模态框 / 弹层打开时焦点移入，关闭时焦点归还触发元素
- [ ] 模态框内焦点被困（focus trap），不能 Tab 到背景内容
- [ ] 下拉菜单 / 折叠面板支持方向键操作（符合 ARIA Authoring Practices）

## 焦点指示器
- [ ] 所有可聚焦元素有可见焦点轮廓（不得使用 `outline: none` 且不提供替代样式）
- [ ] 焦点样式与背景对比度 ≥ 3:1（CSS: `outline: 2px solid var(--color-accent)`）
- [ ] dark/light 两个主题下焦点指示器均可见

## 屏幕阅读器 & ARIA
- [ ] 动态内容更新使用 `aria-live="polite"`（非紧急）或 `aria-live="assertive"`（紧急/错误）
- [ ] 按钮、图标按钮有 `aria-label`（内容不是纯文字时）
- [ ] 展开/折叠状态用 `aria-expanded="true/false"`
- [ ] 当前页面导航链接用 `aria-current="page"`
- [ ] React Islands 中的状态变化（加载、错误、成功）通过 `aria-live` 或 `role="status"` 通知
- [ ] 自定义交互组件（非原生 button/input）正确使用 `role` 属性（如 `role="button"`、`role="dialog"`）

## 减少动态效果
- [ ] 所有动画仅使用 `transform` + `opacity`（项目规范）
- [ ] CSS 动画 / 过渡包含 `prefers-reduced-motion` 媒体查询回退：
  ```css
  @media (prefers-reduced-motion: reduce) {
    /* 禁用或简化动画 */
  }
  ```
- [ ] Canvas 粒子背景在 `prefers-reduced-motion: reduce` 时停止渲染

## i18n 语言属性
- [ ] `<html lang="...">` 与当前路由 locale 匹配：`zh`、`en`、`ja`、`ko`
- [ ] Astro Starlight i18n 路由已正确配置各 locale 的 `lang` 属性
- [ ] 页面内如有引用其他语言文字片段，使用 `lang` 属性标注（`<span lang="en">SOC 8</span>`）

## MDX 内容特定检查
- [ ] MDX 文件内图片使用带 `alt` 的语法（`![描述](url)`）
- [ ] `<CitationRef>` 组件不影响文档阅读顺序
- [ ] 代码块 `<pre><code>` 在屏幕阅读器下有语言标注（Starlight 默认处理）
