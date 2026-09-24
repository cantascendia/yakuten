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
- **Styling**: CSS Variables (no Tailwind), 乐园手账 (sakura) visual theme — the only design since 2026-09
- **Search**: Pagefind (static, supports Chinese)
- **i18n**: Astro native routing (/zh/, /en/, /ja/, /ko/)
- **Deploy**: Vercel (static + Edge Functions)
- **AI**: Google Gemini via Vercel Edge Function, with a three-tier fallback chain (free key → paid key → DeepSeek backup). Model ids live in `docs/specs/ai-chat-multi-tier-fallback.md` §2.2, not here — pinning them in prose has gone stale twice.
- **Analytics**: Vercel Analytics + Google Analytics 4 (aggregate pageview/event only; GA's gtag is blocked in mainland China, so mainland traffic is measured via Bing Webmaster + Vercel Analytics)
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
- **Blood test tool (v3.2 血检手账, the only checker)**: records persist in `localStorage` on the user's device only. Never transmitted to any server. Cleared via the in-app "清空所有记录" action or by clearing site data. Never seed demo records into the user's store. Red-zone values must show the classic `RED_WARNINGS` (`src/utils/blood/redFlags.ts`) — the tracker's own grading must never make a danger warning weaker.
- AI chat does not store conversations
- Third-party analytics limited to aggregate pageview/event metrics (Vercel Analytics + Google Analytics 4, both honoring the `yakuten-dev` opt-out via `PUBLIC_GA_ID`). Never send health data, user input, AI-chat content, or blood-test records to any analytics endpoint. No ad/social pixels (FB/TikTok/etc.). GA's gtag is blocked in mainland China — mainland traffic is measured via Bing Webmaster + Vercel Analytics.
- All colors via CSS variables, never hardcoded
- All animations: transform + opacity only, with prefers-reduced-motion fallback
- Emergency banners: red background, white text, NOT dismissible
- Light (cream paper) only. 幻月夜 dark is PAUSED (D019) until sakura tokens are redesigned as surface/on-surface pairs — ThemeProvider forces light, ThemeSelect renders nothing

## Visual Design

**乐园手账 (`html.sakura`) — the only design:**
- `html.sakura` is baked into the static HTML by `src/middleware.ts` (Head.astro adds it inline as a fallback). There is no toggle; the retired 米哈游「二相乐园」dark glass skin must not come back.
- All sakura CSS is still prefixed `html.sakura` (specificity depends on it) — keep new rules prefixed. Old unprefixed base CSS (global.css, glass.css, starlight-override.css …) is being retired; don't add new rules there.
- Palette: cream paper `#FFF5E0`, sakura-deep `#E5578B`, honey `#F5B347`, mint-deep `#5AC89D`, sky-deep `#5BA8E0`, lavender-deep `#9B7DD4`, ink `#4A2838`.
- Surfaces: rounded cards (`--b32-r-lg: 24px`), 1.5px ink/.22 borders, soft drop shadows, optional `3px 3px 0` sticker-shadow for emphasis.
- Washi tape strips as section labels; sticker-style rotated badges.
- Fonts: Noto Serif SC (display), Noto Sans SC (body), Ma Shan Zheng / Klee One (hand-written accents), Plus Jakarta Sans (UI kickers + numbers).
- Tokens scoped under `.b32-root`. See `src/styles/blood-b32.css`.

## Content Rules

- Every medical statement requires `<CitationRef>` with DOI
- No absolute language ("一定" -> "建议", "必须" -> "通常")
- Dose data must cite guideline name + year
- Evidence levels: A(RCT/Meta) B(single RCT/cohort) C(case/expert) X(no evidence)
- Cross-validate doses with >= 2 independent sources (WPATH SOC 8 + Endocrine Society 2017 + UCSF)

## Absolute Prohibitions

- No commercial promotion links or drug purchase channels
- **No server-side storage of user health data**. The blood checker (v3.2 血检手账) may only use `localStorage` on the user's device and must never introduce an upload / sync / account path without explicit user-level consent and a SPEC update.
- No bypassing AI disclaimer or safety warnings
- No personalized dosing recommendations ("you should take Xmg")
- No removing/weakening emergency banners or danger warnings
- No uncited medication advice

## Delivery Risks

- Scope creep: 30+ pages + 6 interactive tools + 4 languages is ambitious for a solo project
- Chinese font loading: Noto SC fonts are 4-8MB each, need subsetting
- Starlight theme customization: 乐园手账 style layers extensive CSS overrides on Starlight
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
- All frontend UI must follow the 乐园手账 (sakura) design: tokens in `src/styles/sakura-theme.css` (site) and `src/styles/blood-b32.css` (`.b32-root` tools). SPEC.md §2's 米哈游 section is historical.

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
