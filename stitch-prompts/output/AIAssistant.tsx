import React, { CSSProperties } from 'react';

const AIAssistant: React.FC = () => {
  const styles: Record<string, CSSProperties> = {
    container: {
      backgroundColor: 'var(--color-surface, #0D0B14)',
      color: '#ffffff',
      height: '100vh',
      fontFamily: '"Noto Sans SC", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '800px',
      margin: '0 auto',
      position: 'relative',
    },
    header: {
      background: 'rgba(26,22,37,0.8)',
      backdropFilter: 'blur(12px)',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      borderBottom: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
    },
    title: {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '20px',
      margin: 0,
      marginRight: '12px',
    },
    betaBadge: {
      fontFamily: '"JetBrains Mono", monospace',
      color: 'var(--color-safe, #4CAF50)',
      fontSize: '12px',
      border: '1px solid var(--color-safe, #4CAF50)',
      padding: '2px 6px',
      borderRadius: '2px',
    },
    closeBtn: {
      marginLeft: 'auto',
      background: 'transparent',
      border: 'none',
      color: '#fff',
      fontSize: '24px',
      cursor: 'pointer',
    },
    disclaimer: {
      background: 'rgba(255, 152, 0, 0.1)',
      color: 'var(--color-caution, #FF9800)',
      padding: '8px 24px',
      fontSize: '12px',
      textAlign: 'center',
      borderBottom: '1px solid rgba(255, 152, 0, 0.2)',
    },
    chatArea: {
      flex: 1,
      padding: '24px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    },
    userMsgBox: {
      alignSelf: 'flex-end',
      maxWidth: '80%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '4px',
    },
    aiMsgBox: {
      alignSelf: 'flex-start',
      maxWidth: '80%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '4px',
    },
    labelUser: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '10px',
      color: 'var(--color-tertiary, #CBC2DD)',
    },
    labelAI: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '10px',
      color: 'var(--color-secondary, #D4A853)',
    },
    userBubble: {
      background: 'rgba(200, 75, 124, 0.15)',
      borderLeft: '3px solid var(--color-primary, #C84B7C)',
      padding: '16px',
      fontSize: '15px',
      lineHeight: '1.6',
    },
    aiBubble: {
      background: 'rgba(255,255,255,0.03)',
      borderLeft: '3px solid var(--color-secondary, #D4A853)',
      padding: '16px',
      fontSize: '15px',
      lineHeight: '1.6',
    },
    emptyState: {
      margin: 'auto',
      background: 'rgba(26,22,37,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)',
      padding: '32px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      width: '100%',
      maxWidth: '500px',
    },
    chip: {
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(86,65,71,0.2)',
      padding: '12px',
      textAlign: 'left',
      cursor: 'pointer',
      fontSize: '14px',
    },
    inputArea: {
      padding: '16px 24px',
      background: 'var(--color-surface, #0D0B14)',
      borderTop: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      display: 'flex',
      gap: '16px',
    },
    input: {
      flex: 1,
      background: 'transparent',
      border: 'none',
      borderBottom: '1px solid var(--color-outline-variant, rgba(86,65,71,0.5))',
      color: '#fff',
      fontSize: '16px',
      padding: '8px 0',
      outline: 'none',
    },
    sendBtn: {
      background: 'linear-gradient(135deg, var(--color-primary, #C84B7C), #E76395)',
      color: '#fff',
      border: 'none',
      padding: '10px 24px',
      cursor: 'pointer',
      clipPath: 'polygon(0 0, 85% 0, 100% 15%, 100% 100%, 15% 100%, 0 85%)',
      fontWeight: 'bold',
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>AI 问答助手</h1>
        <span style={styles.betaBadge}>BETA</span>
        <button style={styles.closeBtn}>×</button>
      </div>
      
      <div style={styles.disclaimer}>
        仅供信息导航，不提供个体化用药建议
      </div>

      <div style={styles.chatArea}>
        {/*
        <div style={styles.emptyState}>
          <div style={{fontSize: '32px'}}>💊</div>
          <div>这是一个用于 HRT 信息导航的 AI 助手</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            <div style={styles.chip}>CPA 和 螺内酯的副作用有什么区别？</div>
            <div style={styles.chip}>长期使用较高剂量的戊酸雌二醇安全吗？</div>
            <div style={styles.chip}>血检中的 E2 和 T 应该在什么范围？</div>
          </div>
        </div>
        */}

        <div style={styles.userMsgBox}>
          <div style={styles.labelUser}>YOU</div>
          <div style={styles.userBubble}>目前推荐的抗雄药物主要是哪些？</div>
        </div>

        <div style={styles.aiMsgBox}>
          <div style={styles.labelAI}>AI ASSISTANT</div>
          <div style={styles.aiBubble}>
            根据目前主流的跨性别医疗指南（如 WPATH SOC8 和 Endocrine Society 指南），常用的抗雄激素（组织雄激素受体结合或抑制雄激素生成）包括：<br/><br/>
            1. **螺内酯 (Spironolactone)**：美国最常首选。<br/>
            2. **醋酸环丙孕酮 (CPA)**：欧洲和国内常见。但因为可能增加脑膜瘤风险，建议低剂量使用（如 10-12.5mg/天）。<br/>
            3. **比卡鲁胺 (Bicalutamide)**：近年来由于其靶向性受到关注，但尚未被所有主要指南作为一线推荐。<br/>
            4. **GnRH 激动剂/拮抗剂**：最安全且最有效，但因为价格昂贵，普及度较低。
          </div>
        </div>
      </div>

      <div style={styles.inputArea}>
        <input style={styles.input} placeholder="输入你的问题..." />
        <button style={styles.sendBtn}>发送</button>
      </div>
    </div>
  );
};

export default AIAssistant;
