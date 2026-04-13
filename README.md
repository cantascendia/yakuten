<div align="center">

# HRT药典 / HRT Yakuten

### 愿此行，抵达真实的自己

*Per iter ad se verum*

**循证 · 减害 · 引导就医**

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://yakuten.vercel.app)
[![Astro](https://img.shields.io/badge/Built%20with-Astro%205-BC52EE?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey?style=flat-square)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![i18n](https://img.shields.io/badge/Languages-中文%20%7C%20English%20%7C%20日本語-blue?style=flat-square)](#languages)

---

面向跨性别女性的 HRT 安全底线信息站。

基于 WPATH SOC 8、Endocrine Society Guidelines 和同行评审文献，为已在用药或即将用药者提供循证安全参考。

**不是百科，不是论坛，不教怎么自己用药。是安全底线。**

[进入药典 →](https://yakuten.vercel.app)

</div>

---

## Why / 为什么做这件事

> 在中国，超过 **84%** 的跨性别激素使用者没有任何医疗指导。

大量跨性别女性在缺乏医疗支持的情况下自行使用激素。网络上的用药信息碎片化、相互矛盾，甚至存在危险的过时剂量建议（如 CPA 50mg/日）。

HRT药典的存在，是为了在你找到愿意接诊的医生之前，给你一条**安全的底线**。

## Features / 功能

### 临床路径式内容

每一篇内容都遵循严格的循证标准：

- **每条医学声明必须附带 DOI 引用 + 证据等级 (A/B/C)**
- 剂量数据交叉验证自 WPATH SOC 8 + Endocrine Society 2017 + UCSF
- 分阶段用药路径图 + 决策节点 + 红绿灯警示
- 覆盖 **20 种药物**的详解页面（雌激素、抗雄激素、孕激素、5α-还原酶抑制剂）

### 交互式临床工具

| Tool | Description |
|------|-------------|
| **Blood Test Checker** | 血检自查 — 输入数值，即时判读红绿灯 |
| **Dose Simulator** | 剂量模拟器 — 可视化不同给药方案的药代动力学 |
| **Injection Calculator** | 注射剂量计算器 — 精确换算注射方案 |
| **Drug Comparator** | 药物对比 — 18 种药物多维度横向对比 |
| **Risk Screener** | 风险自评 — 7 问卷 4 维度风险评分 (VTE/肝脏/脑膜瘤/心血管) |
| **AI Assistant** | AI 问答 — 基于站内文献库的智能助手 |
| **Reference Library** | 参考文献库 — 22 条核心文献检索 |
| **Hospital Finder** | 友好医疗资源 — 全国 15 家跨性别友好医院 |

### 安全优先

- **紧急横幅**：红色背景、白色文字、不可关闭 — 生命安全永远是首页第一行
- 血检工具 100% 浏览器端运行，零数据传输
- AI 对话不存储任何记录
- 无第三方追踪脚本
- 全站 Umami 匿名统计（自托管）

## Languages

| Locale | Pages | Status |
|--------|-------|--------|
| 🇨🇳 中文 | 42 | Full |
| 🇬🇧 English | 42 | Full |
| 🇯🇵 日本語 | 42 | Full |
| 🇰🇷 한국어 | — | Planned |

## Tech Stack

```
Astro 5 + Starlight     Static-first documentation framework
React Islands            Interactive tools (client:visible)
MDX                      Content with embedded components
TypeScript               Strict mode throughout
Vercel                   Static hosting + Edge Functions
Pagefind                 Offline-capable trilingual search
CSS Variables            Zero Tailwind, miHoYo-inspired design system
```

### Visual Design

视觉风格灵感来自米哈游《崩坏：星穹铁道》4.0「二相乐园」：

- Glass morphism (`backdrop-filter: blur(12px)`)
- Diagonal clip-path geometry
- Color palette: 绯色 `#C84B7C` + 幻月金 `#D4A853`
- Lightweight canvas particle background
- Dark theme default / Light theme supported

## Quick Start

```bash
# Clone
git clone https://github.com/Loveil381/yakuten.git
cd yakuten

# Install
npm install

# Dev
npm run dev          # → localhost:4321

# Build
npm run build        # Includes content validation
npm run preview      # Preview production build
```

## Project Structure

```
src/
├── components/
│   ├── interactive/     # React Islands (Blood checker, AI, etc.)
│   ├── layout/          # Astro layout components
│   ├── medical/         # CitationRef, EvidenceBadge, etc.
│   └── ui/              # EmergencyBanner, shared UI
├── content/docs/
│   ├── zh/              # 中文 (42 pages)
│   ├── en/              # English (42 pages)
│   └── ja/              # 日本語 (42 pages)
├── data/
│   ├── drugs.json       # Structured drug database
│   ├── blood-ranges.json# Blood test reference ranges
│   ├── references.json  # Citation database (22 refs, 18 with DOI)
│   └── hospitals.json   # Trans-friendly hospital database
└── i18n/
    └── ui.ts            # Trilingual UI strings
```

## Content Policy

本站内容严格遵守以下规则：

- **每条医学声明必须附带引用 (DOI)**，无引用 = 不收录
- 不使用绝对化表述（「一定」→「建议」，「必须」→「通常」）
- 不提供个性化剂量建议（不说「你应该吃 Xmg」）
- 不包含任何购药链接或商业推广
- 不存储任何用户健康数据

## Absolute Prohibitions

| Prohibition | Reason |
|---|---|
| No drug purchase links | 不是药商 |
| No personalized dosing | 不是处方 |
| No user health data storage | 隐私至上 |
| No removal of emergency banners | 生命安全 > 用户体验 |
| No uncited medical advice | 循证底线 |

## Contributing

欢迎贡献！特别需要以下方面的帮助：

- **翻译**：韩语 locale、内容校对
- **医学审阅**：如果你是内分泌科 / 跨性别医疗从业者
- **社区素材**：药物品牌实物照片
- **Bug 报告**：通过 [Issues](https://github.com/Loveil381/yakuten/issues) 提交

请阅读 [CONTRIBUTING.md](.github/CONTRIBUTING.md) 了解贡献流程。

## Related Projects

- [**hananote**](https://github.com/Loveil381/hananote) — Flutter HRT 记录应用（配套工具）

## Evidence Sources

所有临床数据来源于：

- [WPATH Standards of Care, Version 8](https://doi.org/10.1080/26895269.2022.2100644)
- [Endocrine Society Clinical Practice Guideline (2017)](https://doi.org/10.1210/jc.2017-01658)
- [UCSF Transgender Care Guidelines](https://transcare.ucsf.edu/guidelines)
- 及其他经同行评审的内分泌学研究

## License

本项目内容采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 许可协议。

代码部分采用 [MIT License](LICENSE)。

---

<div align="center">

**HRT药典 · 循证 · 减害 · 引导就医**

*不卖药，不开方，不存数据。只做一件事：给你安全的底线。*

</div>
