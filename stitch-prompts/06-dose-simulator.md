# Tool 6: Dose Simulator (剂量模拟器) — Priority: 🟡

Design a pharmacokinetic dose simulator tool. Users select a drug formulation, adjust dose and interval, and see a real-time blood concentration curve.

Layout:
1. DRUG SELECTOR: Row of 5 formulation chips — "口服 | 舌下 | 注射 | 凝胶 | 贴片". Active chip has primary gradient fill. Each chip has a small icon above the text. Use rectangular chips with clip-path, NOT rounded.

2. CONTROLS: Two parameter sections side by side (desktop), stacked (mobile):
   - Left: "剂量" — number input (terminal style) + unit label + range slider below
   - Right: "间隔" — preset interval buttons (1d, 2d, 3d, 5d, 7d etc.) as small rectangular chips in a wrapping grid
   - Warning badges appear inline when dose exceeds safe range (yellow/red glass cards)

3. CHART AREA: Glass panel card with clip-path containing:
   - SVG line chart showing blood concentration over time
   - Y-axis: concentration level, X-axis: days
   - Filled area under curve with primary color gradient at 20% opacity
   - Dashed horizontal lines for "target range" zone (green tint between lines)
   - Hover tooltip showing exact value at cursor position (monospace, glass panel popup)

4. STATS ROW below chart: 3-4 stat cards in a row (glass panels, clip-path):
   - Peak value, Trough value, Fluctuation %, Half-life
   - Each stat: label in muted text above, value in large monospace below

5. PK REFERENCE TABLE: Below stats, a compact table showing all 5 formulations' parameters. Current selection row highlighted with primary-alpha-15 background.

6. MOBILE: Controls stack vertically, chart full-width, stats in 2x2 grid
