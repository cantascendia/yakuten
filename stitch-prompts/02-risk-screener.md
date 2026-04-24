# Tool 2: Risk Screener (风险自评) — Priority: 🔴 CRITICAL

Design a medical risk self-assessment questionnaire tool. 7 questions evaluating HRT risks across 4 categories (VTE, liver, meningioma, cardiovascular).

Three screens needed:

SCREEN 1 — WELCOME:
- Glass panel card centered on page
- Title "风险自评" in Noto Serif SC, large
- Subtitle: "7 个问题 · 约 2 分钟 · 数据不离开你的浏览器"
- Brief explanation: what the tool evaluates
- Important note in a subtle info box: "高风险不代表不能使用 HRT，只意味着需要更密切的监测"
- Large gradient primary button: "开始评估 →"
- The welcome screen should NOT feel empty — fill with purposeful content

SCREEN 2 — QUESTION:
- Progress bar at very top: thin line, primary color fill, shows step X of 7
- Question number "Q3/7" in monospace golden accent
- Question text large, centered, Noto Serif SC
- 3-4 answer options as glass panel cards stacked vertically, each with:
  - Left color accent stripe (2px primary)
  - Option text in body font
  - Hover: border glows primary color
  - Selected: filled with primary-alpha-15 background
- Auto-advance to next question on selection (no "next" button needed)

SCREEN 3 — RESULTS:
- 4 risk category cards in a 2x2 grid (desktop) or stacked (mobile)
- Each card: glass panel with clip-path, category name in serif, risk level shown as a horizontal gradient bar (green→yellow→red spectrum with a marker dot for the user's level)
- Below the bar: "Contributing factors" list with small bullet points
- Each card has a "详细了解 →" link in accent gold
- Bottom: two buttons side by side — "打印结果" (secondary ghost) and "重新评估" (secondary ghost)
