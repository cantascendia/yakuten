# YAKUTEN — HRT药典 技術仕様書 (SPEC.md)

> **Version**: 2.0 Final
> **Updated**: 2026-04-07
> **Author**: 未飞 (Mifei)
> **Repository**: yakuten
> **Related**: CONTENT.md（内容规范）、AGENTS.md（Agent操作指南，从本文第11节提取）

---

## 1. プロジェクト概要

### 1.1 基本情報

| 項目 | 内容 |
|------|------|
| プロジェクト名 | yakuten |
| サイト名称 | HRT药典 / HRT Yakuten |
| ドメイン | hrtyaku.com（第一候補）/ hrtyakuten.com（第二候補） |
| Slogan | 「愿此行，抵达真实的自己」 |
| 定位声明 | 「循証 · 减害 · 引导就医」— 不是百科，不是论坛，不教"怎么自己用药"。为已经在用药或即将用药的跨性别女性提供基于国际临床指南和同行评审文献的安全底线信息 |
| ターゲット | 中国語圏を中心とした HRT 実施者（DIY含む）、医療従事者、当事者コミュニティ |
| 技術スタック | Astro 6 + Starlight + React Islands + MDX |
| デプロイ先 | Vercel（静的ホスティング + Edge Functions） |
| 関連プロジェクト | hananote（Flutter HRT記録アプリ） |
| 年間コスト | 約 $10-30（ドメイン代のみ。Vercel無料枠で十分） |

### 1.2 与 mtf.wiki 的核心差异

| 維度 | mtf.wiki | yakuten |
|------|----------|--------|
| 構造 | 百科式（以药物为中心） | 临床路径式（以用户旅程为中心） |
| 引用 | 部分引用、不标注证据等级 | 每条建议必须附 DOI + 证据等级 A/B/C |
| 剂量指导 | 范围罗列（"2-10mg/周"） | 分阶段流程图 + 决策节点 + 红绿灯 |
| 急症识别 | 分散在各药物页面 | 专页集中 + 首页紧急横幅 |
| 乳房发育 | 提及但不展开 | 独立专题页（高剂量危害的核心差异化） |
| CPA 剂量 | 引用了低剂量文献但未强调 | 红色警告：50mg 是危险的过时剂量 |
| 注射途径 | 一行带过 | 独立专题（药代动力学、SC vs IM、操作规范） |
| AI 功能 | 无 | AI 问答 + 剂量模拟器 + 血检解读器 |
| 中国资源 | 极少 | 友好医院数据库 + 合法获取途径 + 网售禁令应对 |

---

## 2. 视觉设计规范

### 2.1 设计风格：米哈游「二相乐园」风

整站视觉以《崩坏：星穹铁道》4.0 版本「二相乐园」为灵感，融合绯英角色元素。

**风格关键词**: 半透明毛玻璃、几何装饰线条、对角切角、粒子光效、二次元与专业感并存

### 2.2 色彩系统

```css
:root {
  /* === 暗色主题（默认） === */

  /* 主色 - 绯英绯色系 */
  --color-primary: #C84B7C;
  --color-primary-light: #E8A0BE;
  --color-primary-dark: #8B2D55;

  /* 副色 - 幻月金系 */
  --color-accent: #D4A853;
  --color-accent-light: #F0D68A;
  --color-accent-dark: #9A7A2E;

  /* 中性色 */
  --color-bg-primary: #0D0B14;
  --color-bg-secondary: #1A1625;
  --color-bg-tertiary: #241F33;
  --color-text-primary: #F0EBF5;
  --color-text-secondary: #A49CB5;
  --color-text-muted: #6B6280;
  --color-border: rgba(200, 75, 124, 0.2);

  /* 语义色 - 用于证据等级和安全信号 */
  --color-safe: #4CAF50;          /* 绿灯 / 证据等级A */
  --color-caution: #FF9800;       /* 黄灯 / 证据等级C */
  --color-danger: #F44336;        /* 红灯 / 禁忌 */
  --color-info: #7C8CF0;          /* 蓝色 / 证据等级B */
}

[data-theme="light"] {
  --color-bg-primary: #FAF7FC;
  --color-bg-secondary: #FFFFFF;
  --color-bg-tertiary: #F3EEF8;
  --color-text-primary: #1A1625;
  --color-text-secondary: #5A5270;
  --color-text-muted: #8A82A0;
  --color-border: rgba(200, 75, 124, 0.15);
}
```

### 2.3 字体

```css
:root {
  --font-display: "Noto Serif SC", "Noto Serif JP", serif;
  --font-body: "Noto Sans SC", "Noto Sans JP", sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
  --font-accent: "ZCOOL XiaoWei", serif; /* slogan/特殊标题 */
}
```

### 2.4 UI 组件规范

**毛玻璃卡片**:
```css
.glass-card {
  background: rgba(26, 22, 37, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  clip-path: polygon(
    0 0, calc(100% - 16px) 0, 100% 16px,
    100% 100%, 16px 100%, 0 calc(100% - 16px)
  );
}
```

**紧急警告横幅**（首页顶部 + 风险页顶部）:
```css
.emergency-banner {
  background: linear-gradient(135deg, #F44336, #D32F2F);
  color: #FFFFFF;
  padding: 16px 24px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 16px;
  /* 固定在视口顶部，不可关闭 */
}
```

**证据等级标签**:
```css
.evidence-badge[data-level="A"] { background: var(--color-safe); }
.evidence-badge[data-level="B"] { background: var(--color-info); }
.evidence-badge[data-level="C"] { background: var(--color-caution); }
.evidence-badge[data-level="X"] { background: var(--color-danger); }
```

**红绿灯指标卡片**（血检解读器用）:
```css
.indicator-green  { border-left: 4px solid var(--color-safe); }
.indicator-yellow { border-left: 4px solid var(--color-caution); }
.indicator-red    { border-left: 4px solid var(--color-danger); }
```

**导航栏**: 半透明毛玻璃，固定顶部。左侧 logo（含狐耳轮廓），右侧：语言切换 → 主题切换 → 搜索

**侧边栏**: 左侧固定，深色半透明背景，当前页高亮用绯色竖线

### 2.5 Logo

- 主体：「药」字简化几何形态
- 彩蛋：字形中暗藏狐耳轮廓（绯英元素）
- 配色：绯色 → 金色渐变
- 格式：SVG 矢量，16px favicon 到 512px

### 2.6 动画规范

| 动画 | 实现 | 性能要求 |
|------|------|---------|
| 页面加载 | 粒子飘散（轻量 Canvas） | requestAnimationFrame，不超过 60 粒子 |
| 卡片进入 | fade-in + translateY(20px) | CSS only，staggered delay |
| hover | 发光边框 + scale(1.02) | CSS transform + box-shadow |
| 主题切换 | 全局 transition 0.3s | CSS variables transition |
| 路径图节点 | 点击展开详情 | CSS max-height transition |

**硬性要求**:
- 所有动画仅使用 `transform` 和 `opacity`
- 提供 `prefers-reduced-motion: reduce` 回退
- 粒子背景可关闭（设置页或自动检测低端设备）

---

## 3. 技术架构

### 3.1 架构总览

```
Astro 6 (Starlight docs theme)
├── MDX 内容层
│   ├── 8 个主页面 + 3 个附录页
│   ├── 药物详解子页面（雌激素5篇 + 抗雄4篇 + 孕激素2篇）
│   └── 注射专题（日雌完整指南）
├── React Islands（client:visible 延迟加载）
│   ├── AI 问答助手
│   ├── 血检自查工具（纯前端，无后端）
│   ├── 剂量模拟器（半衰期曲线）
│   ├── 注射剂量换算器
│   ├── 用药路径图（交互式流程图）
│   └── 药物对比器
├── 数据层
│   ├── drugs.json（药物结构化数据）
│   ├── blood-ranges.json（血检参考值）
│   ├── hospitals.json（友好医院）
│   └── references.json（文献数据库）
├── Pagefind（全站静态搜索，支持中文）
├── i18n 路由（/zh/, /en/, /ja/, /ko/）
└── Vercel 部署
    ├── 静态页面 → CDN
    └── Edge Functions → AI API 代理
```

### 3.2 目录结构

> 最终更新: 2026-04-15 — 反映 Astro 6 + Starlight 0.38 实际状态

```
yakuten/
├── SPEC.md                      # 本文件（技术规范）
├── CONTENT.md                   # 内容规范
├── AGENTS.md                    # AI Agent 指令
├── README.md
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── playwright.config.ts         # E2E 测试配置
├── eslint.config.js             # ESLint 9 flat config
├── .prettierrc
├── vercel.json                  # 根路由重定向（/ → /zh/）
│
├── public/
│   ├── favicon.svg
│   ├── og-image.svg
│   ├── manifest.json
│   ├── robots.txt
│   ├── llms.txt
│   ├── brands/                  # 药品品牌实物照片（11 WebP）
│   └── images/
│       ├── diagrams/            # AI生成医学图解（14 × 5 locale = 70 WebP）
│       └── drugs/               # 药品产品照片（7 WebP）
│
├── src/
│   ├── components/
│   │   ├── ui/                      # 医疗内容 UI（27 Astro 组件）
│   │   │   ├── CitationRef.astro        # 文献引用标注 [n]
│   │   │   ├── DangerBox.astro          # 危险警告框（红色）
│   │   │   ├── WarningBox.astro         # 风险警告框（黄色）
│   │   │   ├── EmergencyBanner.astro    # 紧急情况横幅（不可关闭）
│   │   │   ├── DoseTable.astro          # 剂量表格
│   │   │   ├── DrugInfoBox.astro        # 药物信息卡片
│   │   │   ├── EvidenceBadge.astro      # 证据等级标签 A/B/C/X
│   │   │   ├── BloodTestRange.astro     # 血检参考值范围条
│   │   │   ├── GlassCard.astro          # 毛玻璃卡片
│   │   │   ├── DecisionNode.astro       # 路径图决策节点
│   │   │   ├── PhaseBlock.astro         # 阶段色块
│   │   │   ├── CrisisHotline.astro      # 心理危机热线
│   │   │   ├── DrugBrandGallery.astro   # 品牌图片展示
│   │   │   ├── PKCurveChart.astro       # 药代动力学曲线图
│   │   │   ├── InjectionSiteSVG.astro   # 注射部位示意图
│   │   │   ├── HospitalCard.astro       # 友好医院卡片
│   │   │   └── ...（27 个）
│   │   │
│   │   ├── interactive/             # React Islands（10 TSX）
│   │   │   ├── AIAssistant.tsx          # AI 问答（client:load）
│   │   │   ├── FloatingAIChat.tsx       # 浮动 AI 入口
│   │   │   ├── BloodTestChecker.tsx     # 血检自查（纯前端）
│   │   │   ├── DoseSimulator.tsx        # 半衰期曲线模拟
│   │   │   ├── InjectionCalculator.tsx  # 注射剂量换算
│   │   │   ├── DrugComparator.tsx       # 药物对比器
│   │   │   ├── DrugCards.tsx            # 速查卡片
│   │   │   ├── DrugBrandIndex.tsx       # 品牌索引
│   │   │   ├── RiskScreener.tsx         # 风险自评
│   │   │   └── ReferenceLibrary.tsx     # 文献浏览器
│   │   │
│   │   ├── layout/                  # 首页布局组件
│   │   │   ├── HeroSection.astro        # Hero + 搜索入口
│   │   │   ├── ActionCards.astro         # 三张旅程入口卡片
│   │   │   ├── DrugQuickNav.astro       # 药物速查分类网格
│   │   │   ├── SplashNav.astro          # 首页水平导航栏
│   │   │   ├── ParticleBackground.astro # 粒子背景
│   │   │   ├── MissionStatement.astro   # 使命声明
│   │   │   ├── SiteFooter.astro         # 站点底部
│   │   │   └── BlogHeader.astro         # 博客头部
│   │   │
│   │   ├── overrides/               # Starlight 组件覆盖
│   │   │   ├── Head.astro
│   │   │   ├── Footer.astro
│   │   │   └── SiteTitle.astro
│   │   │
│   │   └── seo/
│   │       ├── JsonLd.astro             # 结构化数据
│   │       └── BlogPostJsonLd.astro
│   │
│   ├── content/
│   │   ├── content.config.ts        # 文档 + 博客 schema
│   │   ├── blog/zh/                 # 博客（仅中文，11 篇 SEO 文章）
│   │   └── docs/
│   │       ├── zh/                  # 中文（主语言，44 MDX）
│   │       │   ├── index.mdx            # 首页（splash 模板）
│   │       │   ├── before-you-start.mdx # 用药前准备
│   │       │   ├── pathway.mdx          # 用药路径图（核心）
│   │       │   ├── medications/         # 药物详解
│   │       │   │   ├── estrogens/       # 雌激素（10 页）
│   │       │   │   ├── antiandrogens/   # 抗雄激素（5 页）
│   │       │   │   ├── progestogens/    # 孕激素（6 页）
│   │       │   │   ├── five-alpha-reductase/  # 5α-还原酶（3 页）
│   │       │   │   └── banned-drugs.mdx # 绝对禁用
│   │       │   ├── dose-limits.mdx      # 剂量红线
│   │       │   ├── breast-development.mdx # 乳房发育专题
│   │       │   ├── blood-tests.mdx      # 血检指南
│   │       │   ├── risks.mdx            # 风险与急症
│   │       │   ├── china-reality.mdx    # 中国 HRT 现实
│   │       │   ├── tools/               # 交互工具页（9 页）
│   │       │   ├── about.mdx            # 关于本站
│   │       │   └── appendix-references.mdx # 参考文献库
│   │       ├── en/                  # English（44 MDX，完全对等）
│   │       ├── ja/                  # 日本語（44 MDX，完全对等）
│   │       └── ko/                  # 한국어（44 MDX，完全对等）
│   │
│   ├── data/
│   │   ├── drugs.json               # 药物结构化数据（20 种）
│   │   ├── drug-brands.json         # 药品品牌信息（按地区）
│   │   ├── blood-ranges.json        # 血检参考值（7 项）
│   │   ├── references.json          # 文献引用数据库（27 条）
│   │   ├── hospitals.json           # 友好医院（25 家/19 省）
│   │   ├── hotlines.json            # 危机热线
│   │   ├── injection-doses.json     # 注射剂量换算表
│   │   └── og-images.json           # OG 图片配置
│   │
│   ├── i18n/
│   │   └── ui.ts                    # UI 字符串翻译（zh/en/ja/ko）
│   │
│   ├── layouts/
│   │   └── BlogPostLayout.astro     # 博客文章布局
│   │
│   ├── pages/
│   │   └── zh/blog/                 # 博客路由
│   │       ├── index.astro
│   │       └── [slug].astro
│   │
│   ├── styles/
│   │   ├── global.css               # CSS 变量系统 + 主题
│   │   ├── glass.css                # 毛玻璃效果
│   │   ├── emergency.css            # 紧急横幅样式
│   │   ├── pathway.css              # 路径图专用样式
│   │   ├── starlight-override.css   # Starlight 主题覆盖
│   │   └── blog.css                 # 博客样式
│   │
│   └── utils/
│       ├── drugLinks.ts             # 药物 ID → URL 映射
│       ├── readingTime.ts           # 阅读时间计算
│       ├── blogHelpers.ts           # 博客辅助函数
│       └── medicalFormat.ts         # 医学数据格式化
│
├── api/                             # Vercel Edge Functions
│   └── ai-chat.ts                   # AI 问答代理（Gemini）
│
├── scripts/
│   ├── validate-content.mjs         # 构建门禁：引用完整性检查
│   └── generate-images.mjs          # AI 图片生成脚本
│
└── tests/
    └── critical-paths.spec.ts       # Playwright E2E 测试
```
└── vercel.json
```

### 3.3 关键技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 框架 | Astro 6 + Starlight | 内容站 SEO 最优，零 JS 默认 |
| 交互组件 | React Islands (client:visible) | 仅AI问答等需要JS，延迟加载不影响首屏 |
| 内容格式 | MDX | 写文章的同时可嵌入交互组件 |
| 搜索 | Pagefind | 纯静态，零后端，支持中文分词 |
| i18n | Astro 原生 | /zh/ /en/ /ja/ /ko/ 路由 |
| AI API | Google Gemini (gemini-3-flash-preview) via Vercel Edge Function | 前端不暴露 API key |
| 血检工具 | 纯前端 JS | 不传输任何个人健康数据 |
| 部署 | Vercel | 免费静态托管 + Edge Functions |
| 字体 | 自托管 Google Fonts | 不依赖外部 CDN，中国可访问 |
| 分析 | Umami 自托管 | 隐私友好，不用 Google Analytics |
| 域名注册 | Cloudflare Registrar | 便宜，WHOIS 隐私免费 |

---

## 4. 数据结构

### 4.1 drugs.json

```typescript
interface Drug {
  id: string;                       // "estradiol-valerate-injection"
  names: {
    generic: string;                // "Estradiol Valerate Injection"
    zh: string;                     // "戊酸雌二醇注射液"
    ja: string;                     // "プロギノン・デポー"
    slang: string[];                // ["日雌", "EV注射"]
    brands: string[];               // ["Progynon Depot", "Estraval Depot"]
  };
  category: "estrogen" | "antiandrogen" | "progestogen" | "banned";
  routes: Array<{
    route: "oral" | "sublingual" | "injection_im" | "injection_sc"
         | "transdermal_patch" | "transdermal_gel";
    doseRange: {
      start: { min: number; max: number; unit: string };    // 起始剂量
      maintenance: { min: number; max: number; unit: string }; // 维持剂量
      maximum: { value: number; unit: string };              // 绝对上限
    };
    frequency: string;
    bioavailability: string;
    halfLife: string;
    peakTime: string;
    vteRisk: { rr: number; source: string };  // 相对风险
    evidenceLevel: "A" | "B" | "C";
  }>;
  phases: {                          // 用药路径图阶段目标
    phase1: { e2Target: string; duration: string };
    phase2: { e2Target: string; duration: string };
    phase3: { e2Target: string; duration: string };
  };
  monitoring: Array<{
    test: string;
    targetRange: { min: number; max: number; unit: string };
    cautionRange: { min: number; max: number };
    dangerThreshold: number;
    frequency: string;
  }>;
  sideEffects: Array<{
    effect: string;
    frequency: "common" | "uncommon" | "rare";
    percentage?: string;
    severity: "mild" | "moderate" | "severe";
  }>;
  contraindications: {
    absolute: string[];
    relative: string[];
  };
  interactions: Array<{
    drug: string;
    severity: "contraindicated" | "major" | "moderate" | "minor";
    description: string;
    source: string;
  }>;
  chinaAccess: {
    availability: "pharmacy" | "hospital" | "overseas" | "banned";
    notes: string;
    affectedByBan2022: boolean;
  };
  references: string[];
}
```

### 4.2 blood-ranges.json

```typescript
interface BloodTest {
  id: string;
  name: { zh: string; en: string; ja: string };
  unit: string;
  ranges: {
    green: { min: number; max: number; label: string };   // 目标
    yellow: { min: number; max: number; label: string };  // 注意
    red: { threshold: number; direction: "above" | "below"; label: string }; // 危险
  };
  timing: string;          // "注射前当天（谷值）"
  frequency: string;       // "每3个月"
  notes: string;
  drugSpecific?: {          // 特定药物才需要检测的
    drug: string;
    reason: string;
  };
  references: string[];
}
```

### 4.3 hospitals.json

```typescript
interface Hospital {
  id: string;
  name: { zh: string; en: string };
  city: string;
  province: string;
  department: string;       // "成形外科跨性别门诊"
  doctors: string[];        // ["潘柏林", "刘烨"]
  services: string[];       // ["HRT处方", "心理评估", "手术"]
  registrationMethod: string;
  estimatedCost: string;
  communityFeedback: string;
  lastVerified: string;     // ISO date
  coordinates?: { lat: number; lng: number };
}
```

### 4.4 injection-doses.json

```typescript
// Progynon Depot 10mg/mL 注射剂量换算表
interface InjectionDose {
  targetMg: number;         // 1, 2, 3, 4, 5
  volumeMl: number;         // 0.10, 0.20, 0.30, 0.40, 0.50
  applicableTo: string;     // "青少年阶段1-2" / "成人起始"
  expectedE2Range: string;  // "40-80 pg/mL"
  warning?: string;         // ">5mg 不建议"
}
```

### 4.5 references.json

```typescript
interface Reference {
  id: string;               // "hembree-2017"
  authors: string;
  title: string;
  journal: string;
  year: number;
  volume?: string;
  pages?: string;
  doi?: string;
  pubmedId?: string;
  pmcId?: string;
  evidenceLevel: "A" | "B" | "C";
  category: "guideline" | "rct" | "cohort" | "case-report"
          | "meta-analysis" | "review" | "expert-opinion";
  tags: string[];           // ["VTE", "经皮vs口服", "剂量"]
}
```

---

## 5. 交互组件规范

### 5.1 血检自查工具 (BloodTestCheckerRouter.tsx)

**双模式**（由左下角 🌸 新版 toggle 切换，`html.sakura` + `localStorage["sakura-theme"]` 控制）:

#### 5.1.a 经典模式（默认，`BloodTestChecker.tsx`）
**核心原则**: 纯前端计算，不传输任何数据，不存储任何数据。
```
用户输入 → 前端 JS 对比 blood-ranges.json → 即时渲染红绿灯
```
**UI**: 表单左侧输入数值，右侧实时显示仪表盘（绿/黄/红色条）。
**底部固定声明**: "此工具仅供参考，不能替代医生的判读。如果你有任何疑虑，请直接就医。"

#### 5.1.b 新版「血检手账」v3.2（`blood-b32/B32App.tsx`）
Claude Design 2026-04 产出，移植自 `.claude-design-bundle/design_handoff_blood_checker/`。

**核心原则**: 纯前端计算 + `localStorage` 仅本机持久化。**绝不**上传任何服务器。

**数据层**（`src/utils/blood/`）:
- `metrics.ts`: 7 核心 + 7 扩展指标，多区域单位（CN/US/EU/JP），canonical 存储
- `storage.ts`: localStorage 键 `yakuten_blood_records_v2` / `yakuten_blood_prefs_v2`，支持 seed / import / export JSON / clear all
- `scoring.ts`: score 0-100 / 等级 S·A+·A·B+·B·C·D / buckets / highlights / streak / series
- `i18n.ts`: zh / en / ja 三语 copy

**视觉**: 乐园手账（paper `#FFF5E0` + sakura `#E5578B` + washi tape + 圆角 24），scoped under `.b32-root`，tokens 在 `src/styles/blood-b32.css`。

**功能（iteration 1 已实现）**:
- 仪表盘：Hero 等级卡（ring gauge + 标题 + bucket pills + streak）+ Highlights strip + Timeline rail + Metric list
- 新增/编辑记录 sheet（日期 + 阶段 + 备注 + 14 指标 + 区域单位切换）
- 设置 sheet（区域偏好 + 导入/导出 JSON + 清空所有）
- 空状态 + 首次自动 seed 3 条示例

**iteration 2 待接入**:
- 分享卡生成（4 vibes × 4 sizes × 3 privacy levels）
- 单项详情抽屉（ArcGauge + sparkline + 医生建议）
- 历次对比表
- 医生文本生成（一键复制给医生的文本摘要）

**隐私边界**:
- 分享卡（iter 2）即便 privacy=minimal 仍暴露"用户追踪 HRT"事实，必须显式用户操作触发，且在 UI 内明确提示 outing 风险
- 清空操作走 `window.confirm`，一键彻底擦除所有记录 + 偏好

### 5.2 剂量模拟器 (DoseSimulator.tsx)

**功能**: 输入药物+剂量+频率 → 绘制 7-14 天的血药浓度曲线
**数据来源**: drugs.json 中的半衰期和生物利用度
**公式**: 单室模型指数衰减 C(t) = C0 × e^(-0.693t/t½)，多次给药叠加
**不做**: 不给出"推荐剂量"，只展示理论曲线
**库**: Recharts 或 Chart.js

### 5.3 注射剂量换算器 (InjectionCalculator.tsx)

**功能**: 选择药物规格（10mg/mL）→ 输入目标周剂量 → 显示抽取体积 + 注射器选择建议
**数据**: injection-doses.json
**安全限制**: 输入 >5mg 时显示红色警告

### 5.4 用药路径图 (PathwayMap.tsx)

**功能**: CONTENT.md 中的阶段 0-3 流程图的交互版本
**UI**: 垂直时间线，每个阶段是可展开的色块（绿=安全区，黄=注意，红=停止就医），决策节点是菱形框
**交互**: 点击节点展开详情 + 对应血检项目 + 下一步指引

### 5.5 风险评估筛查 (RiskScreener.tsx)

**功能**: 用户输入基本信息（年龄/BMI/吸烟/家族史/合并症）→ 输出风险分层 + 给药途径推荐
**5层架构**（来自中国现状分析文档）:
1. 风险评估与筛查 → 识别绝对禁忌
2. 方案建议 → 经皮 vs 口服 vs 注射
3. 检验解读 → 连接血检自查工具
4. 预警转诊 → 危险信号触发急诊信息
5. 知识教育 → 连接对应内容页

### 5.6 AI 问答助手 (AIAssistant.tsx)

**技术**: React Island + Vercel Edge Function (`/api/ai-chat.ts`) + Claude Sonnet API

**Edge Function 逻辑**:
```typescript
// api/ai-chat.ts
export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `你是 HRT药典 的 AI 助手。
规则：
1. 只能基于已收录的医学文献回答
2. 每个回答引用具体文献（作者+年份+期刊）
3. 永远不要给出个人化的用药建议
4. 如果问题超出文献范围，说「目前文献库中没有相关信息」
5. 如果用户描述紧急症状，立即引导就医并给出急诊信息
6. 回答末尾固定附加 disclaimer
7. 语言：跟随用户语言

你可以参考的文献数据库摘要: [注入 references.json 的精简版]
你可以参考的药物数据: [注入 drugs.json 的精简版]`;
```

**前端 UI**: 聊天气泡界面，顶部 disclaimer，底部输入框
**安全**: 不存储对话，不传输个人健康数据（除用户主动输入的问题文本）

---

## 6. 导航结构

```
首页（使命 + 紧急情况入口 + 三按钮）
│
├── 1. 用药前：你准备好了吗？
│   ├── 1.1 必做的基线检查
│   ├── 1.2 绝对禁忌症
│   ├── 1.3 相对禁忌症
│   └── 1.4 心理准备与预期管理
│
├── 2. 用药路径图（核心页面）     ← 交互式流程图
│   ├── 阶段0: 基线
│   ├── 阶段1: 低剂量起步（1-6个月）
│   ├── 阶段2: 中等剂量调整（6-12个月）
│   └── 阶段3: 维持期（12个月+）
│
├── 3. 药物详解
│   ├── 3.1 雌二醇（6个子页：贴片/口服/舌下/凝胶/注射/禁用）
│   ├── 3.2 抗雄激素（4个子页：CPA/螺内酯/比卡鲁胺/GnRH）
│   ├── 3.3 孕激素（2个子页：天然黄体酮/羟孕酮）
│   └── 3.4 绝对禁用药物（EE/结合雌激素/兽用/自制）
│
├── 4. 剂量红线与混用禁忌
│   ├── 4.1 各药物最大剂量表
│   ├── 4.2 危险的药物组合
│   └── 4.3 常见错误方案批评
│
├── 5. 乳房发育专题              ← 核心差异化
│   ├── 5.1 正常发育生理（Tanner分期）
│   ├── 5.2 跨性别女性的现实数据
│   ├── 5.3 高剂量为什么适得其反
│   ├── 5.4 正确的渐进做法
│   └── 5.5 社区常见说法纠正
│
├── 6. 血检指南与自查工具         ← 含交互组件
│   ├── 6.1 什么时候查、查什么
│   ├── 6.2 如何看懂报告（红绿灯表）
│   └── 6.3 互动式自查工具
│
├── 7. 风险与急症识别
│   ├── 7.1 HRT的已知风险（按严重性排序）
│   ├── 7.2 必须停药就医的症状清单
│   └── 7.3 情绪危机与求助热线
│
├── 8. 中国现实
│   ├── 8.1 现状数据（引用三项调查）
│   ├── 8.2 友好医疗资源清单
│   ├── 8.3 合法获取药物途径
│   └── 8.4 海外就医信息
│
├── 工具
│   ├── AI 问答助手
│   ├── 血检自查工具
│   ├── 剂量模拟器
│   └── 注射剂量换算器
│
├── 附录A: 对现有资源的批判性评估
├── 附录B: 完整参考文献库（可搜索/筛选）
└── 附录C: 关于本站
```

---

## 7. SEO 策略

### 7.1 技术 SEO

每页自动生成:
- `<title>`: "{页面名} - HRT药典 | 循証HRT用药安全指南"
- `<meta description>`: 150字以内摘要
- `<link rel="canonical">`: 规范 URL
- `<link rel="alternate" hreflang="xx">`: 多语言替代
- schema.org `MedicalWebPage` 结构化数据
- OG image 自动生成

### 7.2 schema.org

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "name": "比卡鲁胺 HRT 用药指南",
  "about": {
    "@type": "Drug",
    "name": "Bicalutamide",
    "alternateName": ["比卡鲁胺", "Casodex"]
  },
  "audience": { "@type": "MedicalAudience", "audienceType": "Patient" },
  "lastReviewed": "2026-04-01",
  "specialty": "Endocrinology",
  "hasPart": {
    "@type": "MedicalScholarlyArticle",
    "citation": "Hembree WC et al. J Clin Endocrinol Metab 2017"
  }
}
```

### 7.3 目标关键词

**核心词**: HRT 用药指南, 雌二醇注射剂量, 比卡鲁胺 HRT, DIY HRT 安全, 跨性别激素
**长尾词**: 日雌注射方法, CPA 剂量 脑膜瘤, 补佳乐 戊酸雌二醇 区别, HRT 血检项目, 经皮贴片 vs 口服, 乳房发育 高剂量 危害

---

## 8. 国际化 (i18n)

| 優先 | 言語 | Code | 完成度目標 | 備考 |
|------|------|------|-----------|------|
| 1 | 简体中文 | zh | 100% | 主语言，首先完成全部页面 |
| 2 | English | en | 80% | 核心8页 + 药物详解 |
| 3 | 日本語 | ja | 50% | 就医指南重点（日本获取途径） |
| 4 | 한국어 | ko | 30% | Phase 4 |

翻译工作流: 中文原文完成 → AI 初稿 (`translation: draft`) → 人工审校 (`translation: reviewed`)
未翻译页面: 显示中文原文 + 横幅「本页尚未翻译」

---

## 9. 开发计划

### Phase 1（2周）— 骨架 + 核心内容 + 紧急信息

- [ ] Astro 6 + Starlight 初始化 + 米哈游风格主题
- [ ] 基础 UI 组件（GlassCard, EvidenceBadge, WarningBox, DangerBox, EmergencyBanner, CitationRef）
- [ ] 首页（紧急横幅 + 使命陈述 + 三按钮入口）
- [ ] P1 用药前（基线检查 + 禁忌症）
- [ ] P2 用药路径图（静态版，4阶段）
- [ ] P7 风险与急症识别（优先级最高的内容页）
- [ ] i18n 路由 + SEO 基础
- [ ] Vercel 部署 + 域名

### Phase 2（2周）— 药物详解 + 血检工具

- [ ] P3 药物详解 - 雌二醇全部子页（含注射/日雌完整指南）
- [ ] P3 药物详解 - 抗雄全部子页（含比卡鲁胺）
- [ ] P3 药物详解 - 孕激素 + 禁用药物
- [ ] P4 剂量红线与混用禁忌
- [ ] P6 血检指南 + 血检自查工具（React Island）
- [ ] 注射剂量换算器（React Island）
- [ ] Pagefind 搜索集成

### Phase 3（3周）— 差异化内容 + AI + 交互

- [ ] P5 乳房发育专题（核心差异化页面）
- [ ] P8 中国现实（数据 + 友好医院 + 合法获取）
- [ ] AI 问答助手（Edge Function + React Island）
- [ ] 剂量模拟器（半衰期曲线）
- [ ] 用药路径图交互版
- [ ] 风险评估筛查器
- [ ] 附录 A/B/C
- [ ] 英文翻译（核心10篇）

### Phase 4（持续）

- [ ] 药物对比器
- [ ] 日文/韩文翻译
- [ ] 社区投稿系统（GitHub PR 工作流）
- [ ] 网站反馈入口（站内单一入口 -> 腾讯问卷）
- [ ] hananote app 集成入口
- [ ] 内容持续更新 + 季度审查

---

## 10. 质量保证

### 10.1 性能目标

| 指标 | 目标 |
|------|------|
| Lighthouse Performance | 95+ |
| Lighthouse SEO | 100 |
| Lighthouse Accessibility | 90+ |
| LCP | < 2.5s |
| FID / INP | < 100ms |
| CLS | < 0.1 |
| 无 JS 可读性 | 所有内容页在禁用 JS 后仍可完整阅读 |

### 10.2 安全要求

- 不收集用户个人数据
- 血检工具纯前端计算，零数据传输
- AI 问答不存储对话记录
- 不使用第三方追踪脚本
- HTTPS 强制
- CSP headers 配置
- API key 仅存在于 Vercel Edge Function 环境变量

### 10.3 移动端

- 375px 起步，移动端优先
- 紧急横幅在移动端也必须完整显示
- 血检工具在小屏上使用垂直布局
- 底部固定 disclaimer 不遮挡内容

---

## 11. AI Agent 操作指南 (AGENTS.md)

以下内容应提取为仓库根目录的 `AGENTS.md`：

### 代码规范

- TypeScript 严格模式
- Astro 组件 `.astro`，交互组件 `.tsx`
- CSS Variables，不使用 Tailwind
- 所有颜色引用 CSS 变量，不硬编码
- 组件 PascalCase，文件 kebab-case
- 每个 React Island 使用 `client:visible`（除 AI 问答用 `client:load`）

### 内容规范

- MDX 必须包含完整 frontmatter（title, description, evidenceLevel, lastReviewed, references）
- 每条医学声明必须附带 `<CitationRef>` 组件
- 不得生成未经引用的用药建议
- 不得使用绝对化表述（「一定」→「建议」；「必须」→「通常」）
- 剂量数据必须标注来源指南名称和年份
- 每个决策节点必须有红绿灯判断条件

### 视觉规范

- 严格遵循第 2 节设计规范
- 所有组件支持亮色/暗色主题
- 动画仅 transform/opacity
- 毛玻璃 backdrop-filter: blur(12px)
- 紧急信息使用红色背景 + 白色文字，不可关闭

### Git 规范

- 分支：`feature/xxx`, `fix/xxx`, `content/xxx`
- Commit：`type(scope): description`
- 类型：feat, fix, content, style, refactor, docs

### 绝对禁止

- 不得包含商业推广链接
- 不得存储用户健康数据
- 不得绕过 AI disclaimer 或免责声明
- 不得生成具体个人用药方案
- 不得在站内推荐药品购买渠道
- 不得删除或弱化紧急横幅和危险警告

---

## 12. 运营

### 12.1 流量获取

1. SEO 自然流量（核心）
2. HRT 社群分享（QQ/微信/Telegram）
3. hananote app 内嵌链接
4. 多语言覆盖

### 12.2 变现路径（站外进行）

- hananote app 付费功能导流
- ココナラ 建站服务品牌背书
- 赞助/捐赠（Ko-fi / Buy Me a Coffee）

### 12.3 绝对不做

- 不在站内卖药
- 不做医药广告
- 不收集数据变现
- 不做付费墙

### 12.4 反馈入口与回收机制

- 站内设置单一“反馈入口”，统一收集错别字、页面错误、内容建议、需求投票与工具 bug。
- 第一阶段采用腾讯问卷作为默认反馈渠道，原因是中国大陆用户访问门槛低、填写成本低、移动端体验稳定。
- 反馈入口仅用于站点改进，不接收个人剂量咨询、不提供个体化用药建议、不处理紧急医疗求助。
- 表单建议字段：反馈类型、页面链接、问题描述、是否愿意被联系、可选联系方式。
- 表单类型建议限制为：内容纠错、页面打不开、看不懂的段落、希望新增的专题、工具异常。
- 涉及危险症状或急症的提交，反馈页需明确提示“立即就医/前往风险页”，不进入一般反馈流。
- 后台处理节奏：每周整理一次高频问题，每月汇总一次需求，纳入内容更新与工具迭代计划。
