---
name: release-readiness
description: >
  Web 发布前就绪检查。当用户说"发布检查"或项目即将部署到 Vercel 时触发。
  检查功能完整性、技术质量、SEO 与无障碍、内容与合规四个维度。
  适用于 Astro 5 + Starlight + React Islands + MDX 项目。
type: checklist
---

# 发布就绪检查（Web）

## 维度一：功能完整性

### 多语言页面
- [ ] 所有计划页面在 `/zh/`、`/en/`、`/ja/`、`/ko/` 四个 locale 下均已存在且可正常渲染
- [ ] 各 locale 导航链接正确，无 404 跳转
- [ ] i18n 字符串无遗漏（无 key 裸露，无英文混入中文页面）
- [ ] 日期、单位、数字格式符合对应语言习惯

### React Islands
- [ ] `AIAssistant` — 加载并可正常提问，disclaimer 可见，不存储对话
- [ ] `BloodTestChecker` — 输入数值后返回正确参考范围，纯前端无数据上传
- [ ] `DoseSimulator` — 剂量模拟交互可用，结果附引用说明
- [ ] 其余 7 个 Islands 逐一手动验证（列出名称，逐项打勾）
- [ ] 所有 Islands 在 `client:visible` / `client:load` 策略下正确 hydrate，无控制台报错
- [ ] Islands 在移动端（375px）和桌面端（1280px）均布局正常

### 紧急横幅
- [ ] 相关页面顶部紧急横幅（红底白字）可见
- [ ] 横幅无关闭按钮，不可被用户手动隐藏
- [ ] 横幅内容语言跟随当前 locale

### 搜索
- [ ] `npm run build` 后 Pagefind 索引已生成（`dist/_pagefind/` 目录存在）
- [ ] 搜索框支持中文关键词查询并返回正确结果
- [ ] 搜索结果摘要包含正确的语言分段

### AI 聊天接口
- [ ] Vercel Edge Function `/api/chat` 返回 200 并正常流式输出
- [ ] 系统 prompt 包含免责声明，无法被用户绕过
- [ ] 超时或报错时前端显示友好错误提示，非白屏

### 引用系统
- [ ] 所有 `<CitationRef>` 的 `id` 均能在 `src/data/references.json` 中找到对应条目
- [ ] 引用弹窗或链接跳转目标 URL 可访问（DOI 链接格式正确）
- [ ] 无孤立引用（references.json 中存在但页面未使用的条目不阻塞发布，但需记录）

---

## 维度二：技术质量

### 构建与类型检查
- [ ] `npm run build` 全程无报错（退出码 0）
- [ ] `npm run astro check` 无 TypeScript 错误，无类型警告
- [ ] 构建产物体积合理（单页 HTML < 200KB，总 JS bundle < 500KB gzip）
- [ ] 字体子集化已配置（Noto SC 系列不以完整包形式加载）

### 代码卫生
- [ ] `grep -rn "TODO\|FIXME\|HACK" src/` 无输出（或所有残留已登记为已知问题）
- [ ] 无 `console.log` / `console.error` 遗留在生产组件中
- [ ] 无注释掉的大段代码块

### 环境变量与配置
- [ ] Vercel 项目设置中已配置 `GOOGLE_GENERATIVE_AI_API_KEY`（Production 环境）
- [ ] `.env.example` 列出所有必需变量，`.env` 未提交到 Git
- [ ] `vercel.json` redirects / rewrites 经过验证，无规则冲突
- [ ] 无硬编码的 API base URL、密钥、域名

### 设计系统合规
- [ ] React 组件无硬编码颜色值（`#xxx` / `rgb()` / `hsl()` 裸值），全部使用 CSS 变量
- [ ] 所有 CSS 使用设计系统 token（`--color-primary`、`--color-accent` 等）
- [ ] `clip-path`、`backdrop-filter`、粒子背景均有 `@media (prefers-reduced-motion)` 降级
- [ ] Dark theme 为默认，`[data-theme="light"]` 切换正常
- [ ] 动画仅使用 `transform` + `opacity`，无 `width` / `height` / `top` 过渡

---

## 维度三：SEO 与无障碍

### Meta 标签
- [ ] 每个页面具备唯一且描述性的 `<title>`（< 60 字符）
- [ ] 每个页面具备 `<meta name="description">`（< 160 字符）
- [ ] `og:title`、`og:description`、`og:image` 完整，`og:image` 实际可访问
- [ ] `<html lang="...">` 与当前 locale 一致（`zh`、`en`、`ja`、`ko`）

### 结构化数据
- [ ] 核心医疗内容页包含 `MedicalWebPage` JSON-LD schema
- [ ] JSON-LD 无语法错误（可通过 Google Rich Results Test 验证）

### 技术 SEO
- [ ] `robots.txt` 已生成且内容正确（不屏蔽正常页面）
- [ ] `sitemap.xml` 已生成，包含所有 4 个 locale 的页面
- [ ] 无重复内容（相同内容无多个 URL 指向，或已设 `canonical`）

### WCAG AA 合规
- [ ] 所有正文文字对比度 ≥ 4.5:1（工具：Colour Contrast Analyser）
- [ ] 大号文字 / UI 组件对比度 ≥ 3:1
- [ ] 所有图片具备有意义的 `alt` 属性（装饰图用 `alt=""`）
- [ ] 每个页面标题层级从 `<h1>` 开始，无跳级（h1 → h2 → h3，不跳 h2）
- [ ] 所有交互元素（按钮、链接、表单）可通过键盘访问，有可见 focus 样式
- [ ] 紧急横幅 `role="alert"` 或 `aria-live="assertive"` 已设置

---

## 维度四：内容与合规

### 医疗内容规范
- [ ] 每条医疗陈述均附 `<CitationRef>`，无裸露声明
- [ ] 无绝对化语言（"一定"、"必须" → "建议"、"通常"）
- [ ] 所有剂量数据注明指南名称 + 年份（如"WPATH SOC 8, 2022"）
- [ ] 证据等级标注与引用研究类型一致（A=RCT/Meta，B=单RCT/队列，C=病例/专家，X=无证据）
- [ ] 核心剂量数据已用 ≥ 2 个独立来源交叉核验（WPATH SOC 8 + Endocrine Society 2017 + UCSF）

### 免责声明与安全
- [ ] 每个页面 footer 包含完整的核心免责声明
- [ ] AI 聊天界面在首次加载时展示免责声明，用户需确认后方可使用
- [ ] 危险警告（禁忌症、过量警示）位置突出，未被弱化或删除

### 隐私与数据合规
- [ ] 血液检测工具为纯前端计算，无任何数据上传至服务器
- [ ] AI 聊天不持久化对话内容，无后端日志存储用户消息
- [ ] 分析工具使用 Umami（自托管），无 Google Analytics 或其他第三方追踪脚本
- [ ] 无任何用户健康数据写入 localStorage / IndexedDB / Cookie

### 商业合规
- [ ] 无商业推广链接（药品购买渠道、医院付费推广等）
- [ ] 无个性化用药建议（"你应该服用 X mg"等表述）
- [ ] 外部链接均指向学术/官方来源，无未注明的利益关系

---

## 发布前最终确认

- [ ] 在生产环境 URL 上完整点击一遍核心用户流程（zh 主路径）
- [ ] 在移动设备（iOS Safari + Android Chrome）各验证一次核心页面
- [ ] Vercel deployment log 无 function timeout 或 500 错误
- [ ] 已通知相关社区/合作方发布时间（如适用）
- [ ] 发布后监控 Umami 实时数据，确认页面访问正常上报
