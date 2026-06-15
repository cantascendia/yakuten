# Yakuten CTO Guide

## Role

Act as CTO + Tech Lead for this repository. Use the CTO playbook as the operating guide for product thinking, architecture, planning, reviews, and release quality.

Primary handbook:
`C:/projects/ai-playbook/playbook/handbook.md`

## Product Vision

**HRT药典** — 循証 · 减害 · 引导就医
面向中文圈跨性别女性的 HRT 安全底线信息站。基于国际临床指南和同行评审文献，为已在用药或即将用药者提供安全参考。

- **不是**: 百科、论坛、购药渠道、个人化处方
- **是**: 临床路径式安全底线、每条建议附 DOI + 证据等级、紧急情况识别与引导就医

## User Segments

- 中国大陆跨性别女性 HRT 使用者（DIY 为主）
- 友好医疗从业者
- 跨性别社区组织
- 日/韩/英语圈用户（次要）

## Tech Stack

- **Framework**: Astro 5 + Starlight (docs theme)
- **Interactive**: React Islands (client:visible, AI问答用 client:load)
- **Content**: MDX with custom components
- **Styling**: CSS Variables (no Tailwind), 樱粉手账「绯英典籍」v2 visual theme
- **Search**: Pagefind (static, supports Chinese)
- **i18n**: Astro native routing (/zh/, /en/, /ja/, /ko/)
- **Deploy**: Vercel (static + Edge Functions)
- **AI**: Google Gemini (gemini-3-flash-preview) via Vercel Edge Function
- **Analytics**: Umami (self-hosted, privacy-first)
- **Language**: TypeScript strict mode

## Build & Test Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (localhost:4321)
npm run build        # Production build
npm run preview      # Preview production build
npm run astro check  # TypeScript checking
```

## Architecture Constraints

- Zero JS by default (Astro static), interactive only via React Islands
- All medical claims must have `<CitationRef>` — no citation = no content
- **Blood test tool · 快速判读 (classic, default)**: pure frontend JS, zero storage, zero transmission
- **Blood test tool · 血检手账 (v3.2 tracker, in-page toggle)**: records persist in `localStorage` on the user's device only. Never transmitted to any server. Cleared via the in-app "清空所有记录" action or by clearing site data.
- AI chat does not store conversations
- No third-party tracking scripts
- All colors via CSS variables, never hardcoded
- All animations: transform + opacity only, with prefers-reduced-motion fallback
- Emergency banners: red background, white text, NOT dismissible
- Light paper theme default; 幻月夜 night mode via [data-theme="dark"] (real moon-phase toggle, preference in `localStorage["starlight-theme"]`)

## Visual Design

**Default (light paper) — 樱粉手账「绯英典籍」v2:**
- Cream paper `#FFF5E0` desk + dotted-grid texture; cards = white paper, 2px 梅子墨 `#4A2838` border, hard offset shadow `4px 4px 0 var(--ink)` (no blur), radii 6/14/22/32/pill.
- Palette: sakura `#FFA8C5` / hot `#FF7FA8` / deep `#E5578B` (text-safe red `#C02868`), blush `#FFD4E0`, coral `#FF8E7F`, butter `#FFE89C`/`#F5C842`, honey `#F5B347`, mint `#A8E6C9`/`#5AC89D`, sky `#A8D5F5`/`#5BA8E0`, lavender `#D4C5F5`/`#9B7DD4`. Ink is always 梅子墨 — never pure black.
- Structure systems: 线装书「卷」PageHead (`.yk-pagehead`), washi-tape section kickers, 尺刀「裁定」judgment language (RangeGauge ruler + SealStamp 印章), clinical A/B/C/X evidence badges (绿/蓝/橙/红 — never star ratings / gacha rarity).
- Danger layer leaves the cute register: ink-background + red-seal boxes; emergency banner solid `--danger-deep` red.
- Mascots: HibiscusMark 五瓣花印 (brand), FoxTeacherMark 狐狸老师 (AI Q&A persona). Original flat SVG only.
- Fonts: Fraunces + Noto Serif SC (display/heading), Noto Sans SC (body), Ma Shan Zheng (handwritten notes), JetBrains Mono (lab values/dates only — never UI).
- Sakura petal background (lightweight Canvas, max 60 petals, transform/opacity only).
- Forbidden: glass morphism blur, clip-path cut corners, neon/cyberpunk, pure black, star-rating medical info.

**幻月夜 night mode (`[data-theme="dark"]`) —「满月是神不在的时间」:**
- Toggle = real current moon phase button in the nav (synodic 29.53059d); preference persists in `localStorage["starlight-theme"]`; light is the default for first-time visitors.
- Night-desk model: only the desk flips to dream purple (`--night-1/2/3`), page-level text flips to cream; **paper surfaces stay lit** — any light card/panel must carry `data-paper` (or `.yk-paper`) which locks its text back to 梅子墨.

**血检手账 v3.2 (blood tracker, in-page mode toggle on blood-checker):**
- Tokens scoped under `.b32-root`. See `src/styles/blood-b32.css`. Same v2 palette family.

## Content Rules

- Every medical statement requires `<CitationRef>` with DOI
- No absolute language ("一定" -> "建议", "必须" -> "通常")
- Dose data must cite guideline name + year
- Evidence levels: A(RCT/Meta) B(single RCT/cohort) C(case/expert) X(no evidence)
- Cross-validate doses with >= 2 independent sources (WPATH SOC 8 + Endocrine Society 2017 + UCSF)

## Absolute Prohibitions

- No commercial promotion links or drug purchase channels
- **No server-side storage of user health data**. Classic blood-checker mode must stay storage-free; sakura-mode (v3.2 血检手账) may only use `localStorage` on the user's device and must never introduce an upload / sync / account path without explicit user-level consent and a SPEC update.
- No bypassing AI disclaimer or safety warnings
- No personalized dosing recommendations ("you should take Xmg")
- No removing/weakening emergency banners or danger warnings
- No uncited medication advice

## Delivery Risks

- Scope creep: 30+ pages + 6 interactive tools + 4 languages is ambitious for a solo project
- Chinese font loading: Noto SC fonts are 4-8MB each, need subsetting
- Starlight theme customization: 手账典籍 style requires extensive CSS overrides (see src/styles/starlight-skin.css)
- AI system prompt size: references.json injection may cause token overflow
- Content accuracy: medical content requires rigorous review cycle

## Key Files

| File | Purpose |
|------|---------|
| SPEC.md | Complete technical specification |
| CONTENT.md | Content specification (page frameworks, medical content, references) |
| AGENTS.md | AI Agent operating rules |
| src/data/drugs.json | Structured drug data |
| src/data/drug-brands.json | Drug brand information by region |
| src/data/blood-ranges.json | Blood test reference ranges |
| src/data/references.json | Citation database |
| src/data/hospitals.json | Trans-friendly hospitals |
| src/data/hotlines.json | Crisis hotline numbers |
| src/data/injection-doses.json | Injection dose conversion table |

## Default Working Rules

- Start with product intent before implementation details
- Prefer clear architecture and explicit tradeoffs
- Use spec-driven work for larger features
- Treat code review as a quality gate, not a formality
- Keep release readiness, i18n, accessibility, and UX quality in scope
- UI work must use design-system-enforcement + accessibility-checklist + ux-quality-checklist skills
- All frontend UI must follow the 樱粉手账「绯英典籍」v2 visual style (design handoff: `design_handoff_site_v2`; tokens in `src/styles/global.css`, skeleton in `src/styles/layout.css`). The blood-checker v3.2 「血检手账」 tracker follows the 乐园手账 tokens in `src/styles/blood-b32.css`.

## Playbook Commands

Use the installed command set under `.claude/commands/`:

- `cto-start` — New project kickoff
- `cto-resume` — Resume session
- `cto-refresh` — Refresh handbook norms
- `cto-review` — Cross review
- `cto-spec` — Spec-driven development
- `cto-design` — UI design flow
- `cto-audit` — Self-audit QC
- `cto-models` — Model list update
- `cto-release` — Pre-release check
- `cto-skills` — Skill ecosystem management

## Installed Skills

Installed under `.agents/skills/`:

- `accessibility-checklist` — WCAG AA compliance
- `design-system-enforcement` — Design system adherence
- `i18n-enforcement` — Internationalization rules
- `release-readiness` — Pre-release quality gates
- `ux-quality-checklist` — UX quality assurance
