# Tool 4: Drug Quick Cards (速查卡片) — Priority: 🟡

Design a drug quick-reference card grid. Shows 20 HRT medications as compact reference cards that users can screenshot and save.

Layout:
1. FILTER BAR: Horizontal row of filter chips — "全部 | 雌激素 | 抗雄激素 | 孕激素 | 5α-还原酶". Use rectangular chips (NO rounded corners), active chip has primary gradient background, inactive chips have ghost border. On mobile, chips are horizontally scrollable.

2. CARD GRID: Auto-fill grid (3 columns desktop, 2 tablet, 1 mobile). Each card:
   - Glass panel with diagonal clip-path
   - Top: drug name in Noto Serif SC + category colored left border (2px, pink/gold/lavender)
   - Body rows in compact layout:
     - 💊 Dose range (monospace)
     - ⏱ Frequency
     - 🔍 Key monitoring item
     - 🚩 Top danger sign (red accent text)
   - Evidence badge (A/B/C) as small colored square in top-right corner
   - Bottom: "查看详情 →" as a visible secondary button (not just text link)

3. ALL cards MUST have equal height within each row

4. HINT at top: "截图保存卡片，随时查阅" in muted accent text

5. MOBILE: Single column, cards full width, same glass styling
