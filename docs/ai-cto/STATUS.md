# STATUS

**Last Updated:** 2026-04-08
**Current Version:** v0.4.0 (post Phase 5B)
**Git Tag:** v0.3.0

---

## 当前阶段：Phase 5B 完成

Phase 5A（证据加固 + 品牌语言统一）和 Phase 5B（品牌图鉴 + 质量审计修复）均已完成。

---

## 功能完成度

### 已发布（Vercel 生产环境）

| 功能 | 状态 | 质量 |
|------|------|------|
| 中文核心文档（9 页 + 16 药物详解页） | ✅ | 良好（全部有内联 CitationRef） |
| 用药路径时间线 | ✅ | 良好（v0.3.0 重构） |
| 乳房发育专题 | ✅ | 良好 |
| 中国现实页 | ✅ | 良好 |
| 血检指南 | ✅ | 待扩展 |
| 英文核心文档（5 页） | ✅ | 良好（已补 CitationRef） |
| 日文核心文档（5 页） | ✅ | 良好（已补 CitationRef） |
| 血检自查工具 | ✅ | 良好 |
| 注射剂量计算器 | ✅ | 良好 |
| 剂量模拟器 | ✅ | 良好 |
| AI 问答助手（Gemini Flash） | ✅ | 良好 |
| 友好医疗资源数据库 | ✅ | 良好（8 家） |
| 品牌图鉴（DrugBrandGallery） | ✅ | 良好（40+ 品牌，含 12 印度品牌） |
| SEO / OG 图像 | ✅ | 良好 |
| 米哈游视觉主题 | ✅ | 优秀 |
| 多语言 UI 字符串 | ✅ | 良好 |
| Pagefind 搜索（三语索引） | ✅ | 良好 |
| Google Fonts 字体加载 | ✅ | 良好 |
| 禁用药物页 | ✅ | 完整 |
| CSS 变量系统 | ✅ | 完整（零硬编码颜色） |

### 未完成

| 功能 | 优先级 | 备注 |
|------|--------|------|
| en/ja 药物详解页面 | P2 | 仅中文有完整药物页（16 页），翻译工作量巨大 |
| 医院数据库 en/ja 版 | P2 | 仅中文 |
| about 页面内容扩展 | P2 | 现有内容单薄 |
| references.json DOI 字段 | P2 | 有 22 条记录但缺 DOI/URL 结构化字段 |
| React 组件 aria-label i18n | P3 | 中文硬编码但仅影响中文工具页 |

---

## Phase 5 完成记录

### Phase 5A — 证据加固 + 品牌语言统一 ✅

| 任务 | 状态 | 结果 |
|------|------|------|
| risks.mdx 引用补全 | ✅ | X → B，7 refs，8 CitationRef |
| pathway.mdx 引用补全 | ✅ | X → B，5 refs，8 CitationRef |
| blood-tests.mdx 引用补全 | ✅ | 补 2 条 CitationRef |
| 英文硬编码 → i18n | ✅ | 9 处 → t() 函数 |
| 虚假隐私声明修正 | ✅ | 移除"去中心化存储" |

### Phase 5B — 品牌图鉴 + 质量审计 ✅

| 任务 | 状态 | 结果 |
|------|------|------|
| DrugBrandGallery 组件 | ✅ | 新组件 + drug-brands.json（40+ 品牌） |
| 图鉴嵌入 11 药物页 | ✅ | 所有药物详解页底部有品牌图鉴 |
| 印度药品覆盖 | ✅ | 12 条印度品牌（Zydus/Cipla/Sun Pharma/Hetero/Panacea） |
| 日本注射液品牌 | ✅ | 富士製薬 Progynon Depot |
| 占位页删除 | ✅ | appendix-a/b 删除（91 → 89 页） |
| CSS 未定义变量修复 | ✅ | --radius-sm/md, --color-border, --color-text-on-dark, --color-warning-low |
| 硬编码颜色消除 | ✅ | 6 处 hex → CSS 变量（RiskCard/EvidenceBadge/DrugInfoBox/EmergencyActions/emergency.css） |
| en/ja 核心页引用补全 | ✅ | 6 页 X → B，全部有 CitationRef |

---

## 质量评分

| 维度 | 评分 | 变化 |
|------|------|------|
| 产品完整性 | 8.5/10 | ↑ from 8（品牌图鉴新增） |
| 技术质量 | 9/10 | ↑ from 8.5（CSS 变量全覆盖，零硬编码颜色） |
| 内容质量 | 8.5/10 | ↑ from 7（en/ja 引用补全，占位页删除） |
| 视觉设计 | 9/10 | — |
| 性能 | 7/10 | — |
| i18n 完整性 | 6.5/10 | ↑ from 5.5（en/ja 核心页引用完整） |
| **综合** | **8.1/10** | ↑ from 7.5 |

---

## 已知问题

| 问题 | 严重性 | 状态 |
|------|--------|------|
| `astro preview` 本地无法测试 Pagefind | 低 | 已知限制 |
| en/ja 药物详解页不存在（404） | 中 | 暂缓（工作量巨大） |
| React 组件 aria-label 中文硬编码 | 低 | 仅影响中文工具页，P3 |
| 品牌图鉴暂无实物图片 | 低 | 文字描述为主，图片后续补充 |
