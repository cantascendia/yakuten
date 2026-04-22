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
- **Styling**: CSS Variables (no Tailwind), 米哈游「二相乐园」visual theme
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
- Blood test tool is pure frontend JS — zero data transmission
- AI chat does not store conversations
- No third-party tracking scripts
- All colors via CSS variables, never hardcoded
- All animations: transform + opacity only, with prefers-reduced-motion fallback
- Emergency banners: red background, white text, NOT dismissible
- Dark theme default, light theme via [data-theme="light"]

## Visual Design

米哈游「二相乐园」风格:
- Glass morphism: `backdrop-filter: blur(12px)` + `rgba(26,22,37,0.6)`
- Diagonal clip: `clip-path: polygon(0 0, calc(100%-16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100%-16px))`
- Primary: #C84B7C (绯色), Accent: #D4A853 (幻月金)
- Particle background (lightweight Canvas, max 60 particles)
- Fonts: Noto Serif SC (display), Noto Sans SC (body), JetBrains Mono (code)

## Content Rules

- Every medical statement requires `<CitationRef>` with DOI
- No absolute language ("一定" -> "建议", "必须" -> "通常")
- Dose data must cite guideline name + year
- Evidence levels: A(RCT/Meta) B(single RCT/cohort) C(case/expert) X(no evidence)
- Cross-validate doses with >= 2 independent sources (WPATH SOC 8 + Endocrine Society 2017 + UCSF)

## Absolute Prohibitions

- No commercial promotion links or drug purchase channels
- No user health data storage (blood test tool = pure frontend)
- No bypassing AI disclaimer or safety warnings
- No personalized dosing recommendations ("you should take Xmg")
- No removing/weakening emergency banners or danger warnings
- No uncited medication advice

## Delivery Risks

- Scope creep: 30+ pages + 6 interactive tools + 4 languages is ambitious for a solo project
- Chinese font loading: Noto SC fonts are 4-8MB each, need subsetting
- Starlight theme customization: 米哈游 style requires extensive CSS overrides
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
- All frontend UI must follow 米哈游「二相乐园」visual style defined in SPEC.md section 2

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
