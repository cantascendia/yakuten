# Tool 1: Drug Comparator (药物对比器) — Priority: 🔴 CRITICAL

Design a medication comparator tool. Users select 2-3 HRT drugs to compare side by side.

Layout:
1. TOP: Two glass-panel dropdown selectors side by side, with a subtle "+" button to add a 3rd drug. Dropdowns use the terminal input style (bottom border only).

2. EMPTY STATE (before any selection): Show 3-4 "popular comparison" suggestion chips as small glass cards arranged horizontally. Each chip shows two drug names like "CPA vs 螺内酯" in monospace font. Clicking a chip auto-fills both selectors.

3. COMPARISON VIEW: Each selected drug becomes a vertical glass card with diagonal clip-path. Cards sit side by side on desktop, horizontally scrollable on mobile. Each card contains:
   - Drug name in Noto Serif SC (large)
   - Category badge (colored pill: estrogen=pink, antiandrogen=gold, progestogen=lavender)
   - Dose range in JetBrains Mono
   - VTE risk as a colored circle badge (green ≤1.0, yellow >1.0, red >1.2) with the number inside
   - Half-life value
   - Monitoring requirements as small icon+text rows
   - Contraindications section with danger-red accent

4. MOBILE (375px): Cards stack vertically. Each card full-width with the same glass styling. Selector dropdowns stack vertically too.

The overall feel should be like comparing holographic data panels in a dark command center.
