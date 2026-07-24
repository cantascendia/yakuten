/**
 * AIChatIcon — 对话气泡 + 樱瓣（手账贴纸风，stroke=currentColor）。
 * 独立文件：FloatingAIChat（全站 FAB）只需要图标，不能因它静态拖入
 * 整个 AIAssistant 模块（lazy 拆包会失效）。
 */
export function AIChatIcon({ size = 24 }: { size?: number }) {
  const petal = 'M12 6.9c.85.85.85 1.8 0 2.6-.85-.8-.85-1.75 0-2.6z';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 14.8a2 2 0 0 1-2 2H7.6L3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <g strokeWidth="1.3">
        <path d={petal} />
        <path d={petal} transform="rotate(72 12 9.5)" />
        <path d={petal} transform="rotate(144 12 9.5)" />
        <path d={petal} transform="rotate(216 12 9.5)" />
        <path d={petal} transform="rotate(288 12 9.5)" />
      </g>
    </svg>
  );
}
