import React, { CSSProperties } from 'react';

const DoseSimulator: React.FC = () => {
  const styles: Record<string, CSSProperties> = {
    container: {
      backgroundColor: 'var(--color-surface, #0D0B14)',
      color: '#ffffff',
      padding: '40px 20px',
      minHeight: '100vh',
      fontFamily: '"Noto Sans SC", sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px',
    },
    selectorRow: {
      display: 'flex',
      gap: '12px',
      overflowX: 'auto',
      paddingBottom: '8px',
      scrollbarWidth: 'none',
    },
    chipActive: {
      background: 'linear-gradient(135deg, var(--color-primary, #C84B7C), #E76395)',
      color: '#fff',
      border: 'none',
      padding: '12px 24px',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      clipPath: 'polygon(0 0, 90% 0, 100% 10%, 100% 100%, 10% 100%, 0 90%)',
      minWidth: '80px',
    },
    chipInactive: {
      background: 'transparent',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      color: '#ffffff',
      padding: '12px 24px',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      clipPath: 'polygon(0 0, 90% 0, 100% 10%, 100% 100%, 10% 100%, 0 90%)',
      minWidth: '80px',
    },
    controlsArea: {
      display: 'flex',
      gap: '40px',
      flexWrap: 'wrap',
    },
    controlSection: {
      flex: '1 1 300px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    label: {
      fontSize: '16px',
      color: 'var(--color-tertiary, #CBC2DD)',
    },
    termInput: {
      background: 'transparent',
      border: 'none',
      borderBottom: '1px solid var(--color-primary, #C84B7C)',
      color: '#fff',
      fontSize: '28px',
      fontFamily: '"JetBrains Mono", monospace',
      width: '100px',
      outline: 'none',
    },
    intervalGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
    },
    sChipActive: {
      background: 'var(--color-primary, #C84B7C)',
      color: '#fff',
      padding: '6px 12px',
      fontSize: '14px',
      clipPath: 'polygon(0 0, 90% 0, 100% 15%, 100% 100%, 10% 100%, 0 85%)',
      cursor: 'pointer',
    },
    sChipInactive: {
      border: '1px solid rgba(86,65,71,0.5)',
      color: '#fff',
      padding: '6px 12px',
      fontSize: '14px',
      clipPath: 'polygon(0 0, 90% 0, 100% 15%, 100% 100%, 10% 100%, 0 85%)',
      cursor: 'pointer',
    },
    chartArea: {
      background: 'rgba(26,22,37,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      clipPath: 'polygon(0 0, 98% 0, 100% 5%, 100% 100%, 2% 100%, 0 95%)',
      padding: '24px',
      height: '300px',
      position: 'relative',
    },
    statsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
    },
    statCard: {
      background: 'rgba(26,22,37,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      clipPath: 'polygon(0 0, 95% 0, 100% 10%, 100% 100%, 5% 100%, 0 90%)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    statLabel: {
      color: 'var(--color-tertiary, #CBC2DD)',
      fontSize: '14px',
      marginBottom: '8px',
    },
    statVal: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '24px',
      color: '#fff',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '16px',
      fontSize: '14px',
    },
    th: {
      textAlign: 'left',
      padding: '12px',
      borderBottom: '1px solid var(--color-outline-variant, rgba(86,65,71,0.5))',
      color: 'var(--color-tertiary, #CBC2DD)',
    },
    td: {
      padding: '12px',
      borderBottom: '1px solid rgba(86,65,71,0.2)',
    },
    trActive: {
      background: 'rgba(200, 75, 124, 0.15)', // primary alpha 15
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.selectorRow}>
        <div style={styles.chipInactive}><span>💊</span> 口服</div>
        <div style={styles.chipInactive}><span>👅</span> 舌下</div>
        <div style={styles.chipActive}><span>💉</span> 注射</div>
        <div style={styles.chipInactive}><span>🧴</span> 凝胶</div>
        <div style={styles.chipInactive}><span>🩹</span> 贴片</div>
      </div>

      <div style={styles.controlsArea}>
        <div style={styles.controlSection}>
          <div style={styles.label}>剂量 (Dose)</div>
          <div>
            <input style={styles.termInput} defaultValue="5.0" />
            <span style={{color: 'var(--color-tertiary, #CBC2DD)', marginLeft: '8px'}}>mg</span>
          </div>
          <input type="range" min="1" max="20" step="0.5" style={{width: '100%', marginTop: '8px'}} />
        </div>
        
        <div style={styles.controlSection}>
          <div style={styles.label}>给药间隔 (Interval)</div>
          <div style={styles.intervalGrid}>
            <div style={styles.sChipInactive}>3 d</div>
            <div style={styles.sChipActive}>5 d</div>
            <div style={styles.sChipInactive}>7 d</div>
            <div style={styles.sChipInactive}>10 d</div>
            <div style={styles.sChipInactive}>14 d</div>
          </div>
        </div>
      </div>

      <div style={styles.chartArea}>
        <div style={{position: 'absolute', top: 20, left: 20, right: 20, bottom: 40, borderLeft: '1px solid rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.2)'}}>
           {/* Mock target range line */}
           <div style={{position: 'absolute', top: '40%', left: 0, right: 0, borderTop: '2px dashed var(--color-safe, #4CAF50)', opacity: 0.5}} />
           <div style={{position: 'absolute', top: '70%', left: 0, right: 0, borderTop: '2px dashed var(--color-safe, #4CAF50)', opacity: 0.5}} />
           <div style={{position: 'absolute', top: '40%', height: '30%', left: 0, right: 0, background: 'rgba(76, 175, 80, 0.1)'}} />
           
           {/* SVG mock path */}
           <svg width="100%" height="100%" preserveAspectRatio="none">
             <path d="M0,200 Q20,50 80,100 T160,150 T240,110 T320,160" fill="none" stroke="var(--color-primary, #C84B7C)" strokeWidth="3" />
             <path d="M0,200 Q20,50 80,100 T160,150 T240,110 T320,160 L320,240 L0,240 Z" fill="url(#grad1)" opacity="0.2" />
             <defs>
               <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" style={{stopColor: 'var(--color-primary, #C84B7C)', stopOpacity:1}} />
                 <stop offset="100%" style={{stopColor: 'var(--color-primary, #C84B7C)', stopOpacity:0}} />
               </linearGradient>
             </defs>
           </svg>
        </div>
        <div style={{position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', color: 'var(--color-tertiary, #CBC2DD)', fontSize: '12px'}}>时间 (天)</div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>峰值 (Peak)</div>
          <div style={styles.statVal}>320 <span style={{fontSize: '12px'}}>pg/mL</span></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>谷值 (Trough)</div>
          <div style={styles.statVal}>150 <span style={{fontSize: '12px'}}>pg/mL</span></div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>波动率 (Fluctuation)</div>
          <div style={styles.statVal}>113%</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>消除半衰期 (T½)</div>
          <div style={styles.statVal}>4.2 <span style={{fontSize: '12px'}}>天</span></div>
        </div>
      </div>

      <div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>途径</th>
              <th style={styles.th}>达峰时间 (Tmax)</th>
              <th style={styles.th}>半衰期 (T½)</th>
              <th style={styles.th}>生物利用度</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>口服</td>
              <td style={styles.td}>4-6 小时</td>
              <td style={styles.td}>13-20 小时</td>
              <td style={styles.td}>~5%</td>
            </tr>
            <tr style={styles.trActive}>
              <td style={styles.td}>注射 (EV)</td>
              <td style={styles.td}>1.5-2 天</td>
              <td style={styles.td}>4-5 天</td>
              <td style={styles.td}>100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DoseSimulator;
