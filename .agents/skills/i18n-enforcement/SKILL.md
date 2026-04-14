---
name: i18n-enforcement
description: >
  在提交代码前检查国际化合规性。当任务涉及 UI 文本、提示信息、按钮标签、
  错误消息等用户可见字符串时触发。不适用于日志、注释、变量名、CSS 类名。
---

# 国际化合规检查

在提交任何涉及用户可见文本的代码前，逐项检查：

## 路由结构

- [ ] 所有内容页面位于 `/zh/`、`/en/`、`/ja/`、`/ko/` 路由前缀下，不存在根路径的内容页面
- [ ] `astro.config.mjs` 中 `locales` 数组包含全部四个语言代码，`defaultLocale` 已设置

## MDX 内容一致性

- [ ] 每个文档页面在所有四个 locale 目录下均有对应文件（slug 相同，仅目录层级不同）
- [ ] 新增文档时，`src/content/docs/zh/`、`src/content/docs/en/`、`src/content/docs/ja/`、`src/content/docs/ko/` 四个目录下均已创建对应文件
- [ ] 各 locale 版本的 frontmatter 字段结构一致（`title`、`description`、`sidebar` 等字段齐全）

## UI 字符串

- [ ] 所有组件（`.astro`、`.tsx`、`.jsx`）中用户可见字符串均通过 `t()` 函数调用（来自 `src/i18n/ui.ts`）
- [ ] 新增 UI 字符串时，已在 `src/i18n/ui.ts` 的 `zh`、`en`、`ja`、`ko` 四个对象中均添加对应翻译
- [ ] 不存在直接硬编码的中文或英文字符串出现在组件模板 / JSX 返回值中（搜索 `Text(["` 以外：直接写在 JSX 里的 `"确定"`、`"取消"`、`"Submit"` 等）

## React Islands

- [ ] React Island 组件接受 `lang` prop 或通过 `useLocale()` / URL 路径解析当前语言，不写死语言代码
- [ ] Island 内部所有 UI 文案均支持四个语言，不存在仅有中文或仅有英文的分支
- [ ] `client:visible` / `client:load` 的组件在语言切换后能正确显示对应语言文案

## Sidebar 翻译

- [ ] `astro.config.mjs` 中每条 sidebar 条目均在 `translations` 字段下提供 `en`、`ja`、`ko` 三种翻译（`zh` 作为默认 label）
- [ ] 新增 sidebar 条目时不遗漏任何语言的 `translations`

## 字体声明

- [ ] `src/styles/global.css` 中存在 `:root:lang(zh)`、`:root:lang(en)`、`:root:lang(ja)`、`:root:lang(ko)` 四个独立的 `font-family` 声明
- [ ] 每个 lang 规则下的字体栈适配对应语言的排版需求（如日语使用 Noto Sans JP，韩语使用 Noto Sans KR）

## Google Fonts / 字体预加载

- [ ] `<head>` 中的 `<link rel="preload">` 或 Google Fonts `@import` 包含当前页面所用 locale 的全部字体
- [ ] 未在当前 locale 使用的字体不应在首屏预加载（避免无效带宽消耗）

## 日期与数字格式

- [ ] 日期格式化使用 `Intl.DateTimeFormat` 并传入当前 locale，不手写 `YYYY/MM/DD` 等格式
- [ ] 数字、货币、百分比格式化使用 `Intl.NumberFormat` 并传入当前 locale

## 常见违规模式（排查关键词）

- JSX / Astro 模板中直接出现 `"确定"`、`"取消"`、`"提交"`、`"加载中"`、`"Submit"`、`"Cancel"` 等硬编码字符串
- 组件内 `const label = "某中文文本"` 后直接用于渲染
- Island 组件中 `if (lang === 'zh')` 写死逻辑却缺少其他语言分支
- Sidebar label 只有中文，`translations` 字段缺失或不完整

## 例外

以下场景允许不走 i18n：

- 控制台日志（`console.log`、`console.error` 等）
- 代码注释
- 开发者调试信息（`data-debug-*` 属性等）
- CSS 类名、变量名、文件名
- 第三方 SDK 要求的固定字符串参数（如 Umami 事件名）
