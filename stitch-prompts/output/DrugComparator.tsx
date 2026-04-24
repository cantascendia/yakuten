import React, { useState, CSSProperties } from 'react';

const DrugComparator: React.FC = () => {
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);

  const styles: Record<string, CSSProperties> = {
    container: {
      backgroundColor: 'var(--color-surface, #0D0B14)',
      color: '#ffffff',
      padding: '40px 20px',
      minHeight: '100vh',
      fontFamily: '"Noto Sans SC", sans-serif',
    },
    topBar: {
      display: 'flex',
      gap: '16px',
      marginBottom: '40px',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    select: {
      background: 'transparent',
      border: 'none',
      borderBottom: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      color: '#ffffff',
      padding: '8px 0',
      fontSize: '16px',
      outline: 'none',
      width: '200px',
      fontFamily: '"JetBrains Mono", monospace',
    },
    selectFocus: {
      borderBottom: '1px solid var(--color-primary, #C84B7C)',
    },
    addButton: {
      background: 'transparent',
      border: '1px solid var(--color-secondary, #D4A853)',
      color: 'var(--color-secondary, #D4A853)',
      cursor: 'pointer',
      padding: '8px 16px',
      clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)',
      fontSize: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyState: {
      display: 'flex',
      gap: '12px',
      marginTop: '24px',
      flexWrap: 'wrap',
    },
    chip: {
      background: 'rgba(26,22,37,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      padding: '12px 20px',
      cursor: 'pointer',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '14px',
      clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)',
      transition: '0.3s',
    },
    compareGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px',
    },
    card: {
      background: 'rgba(26,22,37,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)',
      padding: '32px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    cardTitle: {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '28px',
      margin: 0,
      color: '#ffffff',
    },
    badge: {
      display: 'inline-block',
      padding: '4px 12px',
      fontSize: '12px',
      color: '#0D0B14',
      fontWeight: 'bold',
      width: 'fit-content',
    },
    dose: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '20px',
      color: 'var(--color-secondary, #D4A853)',
    },
    vteBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    vteCircle: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: 'var(--color-safe, #4CAF50)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      color: '#0D0B14',
      fontSize: '16px',
    },
    infoRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: 'var(--color-tertiary, #CBC2DD)',
      fontFamily: '"JetBrains Mono", monospace',
    },
    dangerBox: {
      borderLeft: '2px solid var(--color-secondary, #D4A853)', // Changed to gold stripe as per design system
      paddingLeft: '16px',
      marginTop: '8px',
    },
    dangerTitle: {
      margin: '0 0 8px 0', 
      color: 'var(--color-danger, #F44336)',
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '16px',
    },
    dangerList: {
      margin: 0, 
      paddingLeft: '20px', 
      fontSize: '14px',
      color: '#ffffff',
    }
  };

  const handleChipClick = () => {
    setSelectedDrugs(['CPA (色普龙)', 'Spironolactone (螺内酯)']);
  };

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <input style={{...styles.select, ...styles.selectFocus}} placeholder={selectedDrugs[0] || "选择药物 1..."} />
        <span style={{padding: '8px 0', color: 'var(--color-tertiary, #CBC2DD)', fontFamily: '"JetBrains Mono", monospace'}}>VS</span>
        <input style={styles.select} placeholder={selectedDrugs[1] || "选择药物 2..."} />
        <button style={styles.addButton}>+</button>
      </div>

      {selectedDrugs.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.chip} onClick={handleChipClick}>CPA vs 螺内酯</div>
          <div style={styles.chip}>戊酸雌二醇 vs 凝胶</div>
          <div style={styles.chip}>补佳乐 vs 达英-35</div>
          <div style={styles.chip}>恩惜 vs 拜复乐</div>
        </div>
      ) : (
        <div style={styles.compareGrid}>
          {selectedDrugs.map((drug, i) => (
            <div key={i} style={styles.card}>
              <h2 style={styles.cardTitle}>{drug}</h2>
              <div style={{...styles.badge, background: i === 0 ? 'var(--color-tertiary, #CBC2DD)' : 'var(--color-secondary, #D4A853)'}}>
                {i === 0 ? '孕激素类抗雄' : '抗盐皮质激素'}
              </div>
              <div style={styles.dose}>
                {i === 0 ? '12.5mg - 50mg / day' : '100mg - 200mg / day'}
              </div>
              <div style={styles.vteBadge}>
                <div style={{...styles.vteCircle, background: i === 0 ? 'var(--color-safe, #4CAF50)' : 'var(--color-safe, #4CAF50)'}}>1.0</div>
                <span style={{fontSize: '14px', color: '#ffffff'}}>VTE 风险系数</span>
              </div>
              <div style={styles.infoRow}>
                <span>⌛</span> 半衰期: {i === 0 ? '1.5 ~ 2 天' : '1.4 小时'}
              </div>
              <div style={styles.infoRow}>
                <span>🩺</span> 监测点: {i === 0 ? '肝功能 (ALT/AST), 泌乳素' : '血钾, 血压, 肾功能'}
              </div>
              <div style={styles.dangerBox}>
                <h4 style={styles.dangerTitle}>禁忌症 / 警告</h4>
                <ul style={styles.dangerList}>
                  {i === 0 ? (
                     <><li>肝功能不全者慎用</li><li>抑郁病史须密切监测</li><li>脑膜瘤风险 (高剂量长期)</li></>
                  ) : (
                     <><li>高钾血症风险</li><li>肾功能不全者禁用</li></>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DrugComparator;
