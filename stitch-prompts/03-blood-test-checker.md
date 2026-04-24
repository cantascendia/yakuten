# Tool 3: Blood Test Checker (血检自查) — Priority: 🟡

Design a blood test result checker tool. Users enter 7 blood marker values and see real-time traffic-light assessments.

Layout:
1. SECTION HEADER: "输入血检数值" in Noto Serif SC, golden accent divider line below

2. INPUT GRID: 7 input fields in a 2-column grid (desktop), single column (mobile). Each field:
   - Marker name (e.g., "雌二醇 E2") as label above
   - Terminal-style input: bottom border only, monospace font for the number
   - Unit label (pg/mL, ng/dL) to the right of input in muted text
   - When filled: a small colored dot appears next to the label (green/yellow/red)

3. RESULTS PANEL: Below the inputs (desktop: right column; mobile: separate tab labeled "结果")
   - Each filled marker shows a result row:
     - Marker name + entered value (bold, colored by status)
     - Horizontal range bar: green zone | yellow zone | red zone with a triangle marker showing where the value falls
     - For accessibility: icon prefix ✓ (green), ⚠ (yellow), ✗ (red) — not just color
   - Red results show a pulsing danger box with "查看急症指南 →" link

4. BOTTOM BAR:
   - "已恢复上次的数据" notice in golden accent (when localStorage data exists)
   - "打印结果" button (secondary ghost style)
   - "清除记录" button (subtle, muted)
   - Privacy disclaimer in small muted text

5. MOBILE (375px): Use a tab switcher — "输入" tab and "结果" tab — instead of side-by-side layout. Tab bar uses the terminal style with primary underline on active tab.
