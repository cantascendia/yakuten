---
name: design-system-enforcement
description: >
  确保 UI 代码遵循 yakuten 米哈游「二相乐园」设计系统。当任务涉及 UI 组件、
  CSS 样式、颜色、字体、间距、React Islands 或 Astro 页面布局时触发。
  不适用于后端、API 路由或纯数据层代码。
type: checklist
---

# 设计系统合规检查（yakuten Web）

在提交涉及 UI 样式的代码前，逐项检查。完整设计规范参见 `SPEC.md` 第 2 节。

## 颜色
- [ ] 所有颜色引用 CSS 变量，不存在硬编码 hex / rgb / rgba 值
  - 正确：`color: var(--color-primary)`
  - 错误：`color: #C84B7C`
- [ ] Inline style 中颜色使用 `var()` 引用（React 组件 `style={{ color: 'var(--color-primary)' }}`）
- [ ] 常用变量确认：`--color-primary`（#C84B7C 绯色）、`--color-accent`（#D4A853 幻月金）
- [ ] 紧急横幅（Emergency Banner）：红色背景 + 白色文字，不可关闭，不使用 `--color-primary`

## 字体
- [ ] 字体系列引用 CSS 变量，不存在裸写 `font-family` 字符串
  - 正确：`font-family: var(--font-display)`
  - 错误：`font-family: 'Noto Serif SC', serif`
- [ ] 常用变量：`--font-display`（Noto Serif SC）、`--font-body`（Noto Sans SC）、`--font-mono` / `--font-code`（JetBrains Mono）
- [ ] 不使用固定 `font-size` 像素值覆盖基础字阶；优先使用 `--text-*` 变量或相对单位

## 间距
- [ ] 内外边距使用 CSS 间距变量，不存在魔法像素数字
  - 正确：`padding: var(--space-md)`
  - 错误：`padding: 16px`
- [ ] 变量范围：`--space-xs`、`--space-sm`、`--space-md`、`--space-lg`、`--space-xl`、`--space-2xl`、`--space-3xl`
- [ ] Gap / margin 同规则，Flex/Grid 布局中的 `gap` 也须用变量

## 玻璃拟态（Glass Morphism）
- [ ] 卡片 / 面板背景使用 `var(--glass-bg)`（对应 `rgba(26,22,37,0.6)`）
- [ ] 玻璃效果含 `backdrop-filter: blur(12px)`
- [ ] 不直接硬编码 `rgba(26,22,37,0.6)`，通过 `--glass-bg` 变量引用
- [ ] Safari 兼容：加 `-webkit-backdrop-filter: blur(12px)`

## 对角切角（Diagonal Clip / Penacony 几何风格）
- [ ] 需要切角效果的容器使用 `var(--clip-corner)` 变量
  - 对应：`clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))`
- [ ] 不直接在组件内硬写 `clip-path: polygon(...)` 字符串

## 主题支持（Dark / Light）
- [ ] 所有颜色变量在 `:root`（dark，默认）和 `[data-theme="light"]` 下均有定义
- [ ] 不使用 `prefers-color-scheme` 媒体查询覆盖主题逻辑（项目用 `[data-theme]` 属性切换）
- [ ] 玻璃拟态组件在 light 主题下视觉对比度仍满足无障碍要求

## React Islands（客户端水合）
- [ ] 默认交互组件使用 `client:visible`（视口进入时水合，节省 JS）
- [ ] AI 问答组件使用 `client:load`（页面加载即水合）
- [ ] 不使用 `client:only`（除非有充分理由并注释说明）
- [ ] Islands 在 JS 未加载时有合理的静态降级（SSR fallback 内容）

## 紧急横幅（Emergency Banner）
- [ ] 红色背景（`--color-danger` 或等效变量）+ 白色文字
- [ ] 无关闭按钮，不可被用户隐藏
- [ ] 位置固定在页面顶部，z-index 高于其他所有元素
- [ ] 内容不为空时始终显示，不依赖 JS 交互显示

## 粒子背景（Canvas）
- [ ] 粒子数量上限 60 个（`MAX_PARTICLES = 60`）
- [ ] 使用 `client:visible` 或 `client:idle` 水合，避免阻塞首屏
- [ ] 遵守 `prefers-reduced-motion: reduce` 时停止动画（见无障碍检查）

## 动画规范
- [ ] 动画仅操作 `transform` 和 `opacity`，不操作 `width`、`height`、`top`、`left` 等触发 layout 的属性
- [ ] 所有 CSS transition / animation 均有 `prefers-reduced-motion` 回退

## 参考文档
- 完整视觉规范：`SPEC.md` 第 2 节
- CSS 变量定义：`src/styles/global.css`
- 如发现变量未定义，立即在 `global.css` 中补充，不允许临时硬编码绕过
