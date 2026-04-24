# Design System: Penacony Celestial Pharmacopeia

This is the shared design context for all tool redesigns. Paste this BEFORE each tool-specific prompt.

---

Design system: "Penacony Celestial Pharmacopeia" for a medical HRT safety information site called "HRT药典" (HRT Yakuten).

Core rules:
- Background: deep cosmic purple-black #0D0B14
- Glassmorphism cards: backdrop-filter blur(12px), background rgba(26,22,37,0.6), ghost border 1px rgba(86,65,71,0.2)
- Diagonal clipped corners on ALL cards: clip-path polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%). NEVER use border-radius or rounded corners.
- Primary color: #C84B7C (crimson pink). Accent: #D4A853 (golden). Tertiary: #CBC2DD (muted lavender).
- Semantic colors: safe #4CAF50, caution #FF9800, danger #F44336
- Primary buttons: clipped-corner shape, background linear-gradient(135deg, #C84B7C, #E76395), white bold text
- Secondary buttons: ghost style, transparent background, #D4A853 border, #D4A853 text
- Input fields: bottom-border only (no full border), focus state changes border to primary gradient
- Typography: Noto Serif SC for display/headlines, Noto Sans SC for body, JetBrains Mono for data/dosages
- Depth via tonal layering, NOT drop shadows. No standard 1px dividers — use tonal shifts or negative space.
- Everything should feel like a glowing terminal in a dark room.

Generate both desktop (1280px) and mobile (375px) variants.
