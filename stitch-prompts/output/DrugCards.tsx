import React, { CSSProperties } from 'react';

const DrugCards: React.FC = () => {
  const styles: Record<string, CSSProperties> = {
    container: {
      backgroundColor: 'var(--color-surface, #0D0B14)',
      color: '#ffffff',
      padding: '40px 20px',
      minHeight: '100vh',
      fontFamily: '"Noto Sans SC", sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    hintRow: {
      color: 'var(--color-tertiary, #CBC2DD)',
      textAlign: 'center',
      marginBottom: '24px',
      fontSize: '14px',
    },
    filterBar: {
      display: 'flex',
      gap: '12px',
      marginBottom: '32px',
      overflowX: 'auto',
      paddingBottom: '8px',
      scrollbarWidth: 'none',
    },
    chipActive: {
      background: 'linear-gradient(135deg, var(--color-primary, #C84B7C), #E76395)',
      color: '#fff',
      border: 'none',
      padding: '8px 16px',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    },
    chipInactive: {
      background: 'transparent',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      color: '#ffffff',
      padding: '8px 16px',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '24px',
      alignItems: 'stretch',
    },
    card: {
      background: 'rgba(26,22,37,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      borderLeft: '2px solid var(--color-primary, #C84B7C)',
      clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    },
    cardGold: {
      borderLeft: '2px solid var(--color-secondary, #D4A853)',
    },
    header: {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '24px',
      margin: '0 0 16px 0',
      paddingRight: '30px', 
    },
    evidenceBadge: {
      position: 'absolute',
      top: '24px',
      right: '24px',
      width: '24px',
      height: '24px',
      background: 'var(--color-safe, #4CAF50)',
      color: '#0D0B14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '12px',
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '12px',
      fontSize: '14px',
    },
    mono: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '16px',
      color: 'var(--color-tertiary, #CBC2DD)',
    },
    dangerText: {
      color: 'var(--color-danger, #F44336)',
      fontWeight: 'bold',
    },
    ghostBtn: {
      background: 'transparent',
      border: '1px solid var(--color-secondary, #D4A853)',
      color: 'var(--color-secondary, #D4A853)',
      padding: '8px 16px',
      cursor: 'pointer',
      clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)',
      marginTop: 'auto',
      alignSelf: 'flex-start',
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.hintRow}>截图保存卡片，随时查阅</div>
      
      <div style={styles.filterBar}>
        <div style={styles.chipActive}>全部</div>
        <div style={styles.chipInactive}>雌激素</div>
        <div style={styles.chipInactive}>抗雄激素</div>
        <div style={styles.chipInactive}>孕激素</div>
        <div style={styles.chipInactive}>5α-还原酶</div>
      </div>

      <div style={styles.grid}>
        
        {/* Card 1 */}
        <div style={styles.card}>
          <div style={styles.evidenceBadge}>A</div>
          <h2 style={styles.header}>戊酸雌二醇 (EV)</h2>
          <div style={styles.row}><span>💊</span> <span style={styles.mono}>2mg - 6mg / day</span></div>
          <div style={styles.row}><span>⏱</span> 分 2-3 次口服/舌下</div>
          <div style={styles.row}><span>🔍</span> E2, 肝功能, 凝血</div>
          <div style={styles.row}><span>🚩</span> <span style={styles.dangerText}>首过效应致 VTE 风险增高</span></div>
          <div style={{marginTop: '16px'}}>
            <button style={styles.ghostBtn}>查看详情 →</button>
          </div>
        </div>

        {/* Card 2 */}
        <div style={{...styles.card, ...styles.cardGold}}>
          <div style={{...styles.evidenceBadge, background: 'var(--color-caution, #FF9800)'}}>B</div>
          <h2 style={styles.header}>醋酸环丙孕酮 (CPA)</h2>
          <div style={styles.row}><span>💊</span> <span style={styles.mono}>12.5mg - 50mg / day</span></div>
          <div style={styles.row}><span>⏱</span> 每日 1 次口服</div>
          <div style={styles.row}><span>🔍</span> 肝功能, 泌乳素 (PRL)</div>
          <div style={styles.row}><span>🚩</span> <span style={styles.dangerText}>累积超高剂量: 脑膜瘤风险</span></div>
          <div style={{marginTop: '16px'}}>
            <button style={styles.ghostBtn}>查看详情 →</button>
          </div>
        </div>

        {/* Card 3 */}
        <div style={{...styles.card, borderLeft: '2px solid var(--color-tertiary, #CBC2DD)'}}>
          <div style={styles.evidenceBadge}>A</div>
          <h2 style={styles.header}>微粒化黄体酮 (P4)</h2>
          <div style={styles.row}><span>💊</span> <span style={styles.mono}>100mg - 200mg / day</span></div>
          <div style={styles.row}><span>⏱</span> 睡前口服 (易嗜睡)</div>
          <div style={styles.row}><span>🔍</span> 情绪监控, 乳房发育评估</div>
          <div style={styles.row}><span>🚩</span> <span style={styles.dangerText}>可能引发或加重抑郁症状</span></div>
          <div style={{marginTop: '16px'}}>
            <button style={styles.ghostBtn}>查看详情 →</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DrugCards;
