# Tool 7: AI Assistant (AI 问答助手) — Priority: 🟡

Design an AI medical Q&A chat interface for HRT information. The assistant answers based on clinical guidelines only.

Layout:
1. HEADER BAR: Glass panel, left-aligned title "AI 问答助手" in Noto Serif SC + "BETA" badge in small monospace green text + close button (X) on right

2. DISCLAIMER BAR: Subtle caution-tinted strip below header: "仅供信息导航，不提供个体化用药建议"

3. CHAT AREA:
   - User messages: right-aligned, primary-alpha-15 background, left border 3px primary
   - Assistant messages: left-aligned, glass panel background (rgba 255,255,255,0.03), left border 3px golden accent
   - Message labels: tiny monospace "YOU" / "AI ASSISTANT" above each message
   - Thinking state: golden accent loading dots animation with "正在思考..." text
   - Error state: danger-red glass card with error message

4. EMPTY STATE (no messages): Centered glass card with:
   - 💊 icon
   - "这是一个用于 HRT 信息导航的 AI 助手"
   - 4 suggestion chips as glass cards: pre-made questions the user can click
   - Suggestion chips arranged in single column, full width

5. INPUT AREA: Bottom-fixed bar with:
   - Terminal-style text input (bottom border only), placeholder "输入你的问题..."
   - Send button: primary gradient, clipped corners
   - Input focus: border becomes primary gradient

6. MOBILE: Full-width chat, input bar fixed to bottom with safe-area padding
