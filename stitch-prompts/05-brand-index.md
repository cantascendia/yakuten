# Tool 5: Brand Index (品牌索引) — Priority: 🟡

Design a drug brand search/browse tool showing 58 pharmaceutical brands across multiple countries.

Layout:
1. SEARCH + FILTERS:
   - Search input (terminal style, bottom border only) with magnifying glass icon, placeholder "搜索品牌名..."
   - Below: two filter dropdowns side by side — "地区" and "药物类别"
   - Filter result count shown: "显示 23 / 58 个品牌"

2. BRAND CARD GRID: Auto-fill grid (3 columns desktop, 2 tablet, 1 mobile). Each card:
   - Glass panel with diagonal clip-path
   - Header row: country flag emoji + country name in monospace golden accent
   - Brand name in Noto Serif SC
   - Detail rows: 厂商, 规格, 外观 — each as label+value pair
   - Status badge: use consistent glass badges (NOT emoji):
     - "上市" = green-tinted badge
     - "处方" = blue-tinted badge
     - "禁售" = red-tinted badge with strikethrough
   - Bottom: "药物详情 →" link in primary-light color

3. EMPTY STATE (no search results): Glass card centered, "未找到匹配品牌" + suggestion to clear filters

4. MOBILE: Single column, full-width cards
