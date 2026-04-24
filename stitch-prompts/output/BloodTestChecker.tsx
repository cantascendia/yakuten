import React, { useState, CSSProperties } from 'react';

const BloodTestChecker: React.FC = () => {
  const [e2, setE2] = useState('184');
  const [t, setT] = useState('35');
  
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
    header: {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '32px',
      margin: '0 0 16px 0',
      borderBottom: '1px solid var(--color-secondary, #D4A853)',
      paddingBottom: '16px',
    },
    layout: {
      display: 'flex',
      gap: '40px',
      flexWrap: 'wrap',
      marginTop: '40px',
    },
    inputCol: {
      flex: '1 1 300px',
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '24px',
    },
    resultCol: {
      flex: '1.5 1 400px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    inputWrapper: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    label: {
      fontSize: '14px',
      color: 'var(--color-tertiary, #CBC2DD)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    statusDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
    },
    inputRow: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '12px',
    },
    input: {
      background: 'transparent',
      border: 'none',
      borderBottom: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      color: '#ffffff',
      padding: '8px 0',
      fontSize: '20px',
      outline: 'none',
      fontFamily: '"JetBrains Mono", monospace',
      width: '120px',
    },
    inputFocus: {
      borderBottom: '1px solid var(--color-primary, #C84B7C)',
    },
    unit: {
      color: 'var(--color-outline-variant, rgba(86,65,71,0.5))',
      fontSize: '14px',
    },
    resultCard: {
      background: 'rgba(26,22,37,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      clipPath: 'polygon(0 0, 98% 0, 100% 10%, 100% 100%, 2% 100%, 0 90%)',
      padding: '16px 20px',
    },
    redCard: {
      border: '1px solid var(--color-danger, #F44336)',
      boxShadow: '0 0 15px rgba(244, 67, 54, 0.2)',
    },
    resHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
    },
    resTitle: {
      fontWeight: 'bold',
      fontSize: '18px',
    },
    resBarContainer: {
      display: 'flex',
      height: '6px',
      width: '100%',
      position: 'relative',
    },
    zoneSafe: { flex: 2, background: 'var(--color-safe, #4CAF50)' },
    zoneWarn: { flex: 1, background: 'var(--color-caution, #FF9800)' },
    zoneDanger: { flex: 1, background: 'var(--color-danger, #F44336)' },
    triangle: {
      position: 'absolute',
      top: '-8px',
      width: 0, 
      height: 0, 
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderTop: '6px solid #fff',
    },
    link: {
      color: 'var(--color-primary, #C84B7C)',
      textDecoration: 'none',
      fontSize: '14px',
      display: 'block',
      marginTop: '12px',
    },
    bottomBar: {
      marginTop: '60px',
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      borderTop: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      paddingTop: '24px',
      flexWrap: 'wrap',
    },
    notice: {
      color: 'var(--color-secondary, #D4A853)',
      fontSize: '14px',
      marginRight: 'auto',
    },
    ghostBtn: {
      background: 'transparent',
      border: '1px solid var(--color-secondary, #D4A853)',
      color: 'var(--color-secondary, #D4A853)',
      padding: '8px 16px',
      cursor: 'pointer',
      clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)',
    },
    clearBtn: {
      background: 'transparent',
      border: 'none',
      color: 'var(--color-outline-variant, rgba(86,65,71,0.8))',
      cursor: 'pointer',
    },
    disclaimer: {
      fontSize: '12px',
      color: 'var(--color-outline-variant, rgba(86,65,71,0.8))',
      width: '100%',
      textAlign: 'center',
      marginTop: '16px',
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>输入血检数值</h1>
      
      <div style={styles.layout}>
        <div style={styles.inputCol}>
          <div style={styles.inputWrapper}>
            <div style={styles.label}>
              雌二醇 E2
              {e2 && <div style={{...styles.statusDot, background: 'var(--color-safe, #4CAF50)'}} />}
            </div>
            <div style={styles.inputRow}>
              <input 
                style={{...styles.input, ...styles.inputFocus}} 
                value={e2} 
                onChange={e=>setE2(e.target.value)} 
              />
              <span style={styles.unit}>pg/mL</span>
            </div>
          </div>

          <div style={styles.inputWrapper}>
            <div style={styles.label}>
              睾酮 T
              {t && <div style={{...styles.statusDot, background: 'var(--color-danger, #F44336)'}} />}
            </div>
            <div style={styles.inputRow}>
              <input 
                style={styles.input} 
                value={t} 
                onChange={e=>setT(e.target.value)} 
              />
              <span style={styles.unit}>ng/dL</span>
            </div>
          </div>

          <div style={styles.inputWrapper}>
            <div style={styles.label}>泌乳素 PRL</div>
            <div style={styles.inputRow}>
              <input style={styles.input} placeholder="-" />
              <span style={styles.unit}>ng/mL</span>
            </div>
          </div>
          
          <div style={styles.inputWrapper}>
            <div style={styles.label}>谷丙转氨酶 ALT</div>
            <div style={styles.inputRow}>
              <input style={styles.input} placeholder="-" />
              <span style={styles.unit}>U/L</span>
            </div>
          </div>
        </div>

        <div style={styles.resultCol}>
          <div style={styles.resultCard}>
            <div style={styles.resHeader}>
              <span style={{...styles.resTitle, color: 'var(--color-safe, #4CAF50)'}}>✓ 雌二醇 E2: {e2} pg/mL</span>
            </div>
            <div style={styles.resBarContainer}>
               <div style={styles.zoneSafe} />
               <div style={styles.zoneWarn} />
               <div style={styles.zoneDanger} />
               <div style={{...styles.triangle, left: '30%'}} />
            </div>
          </div>

          <div style={{...styles.resultCard, ...styles.redCard}}>
            <div style={styles.resHeader}>
              <span style={{...styles.resTitle, color: 'var(--color-danger, #F44336)'}}>✗ 睾酮 T: {t} ng/dL</span>
            </div>
            <div style={styles.resBarContainer}>
               <div style={{flex: 1, background: 'var(--color-danger, #F44336)'}} />
               <div style={{flex: 1, background: 'var(--color-caution, #FF9800)'}} />
               <div style={{flex: 2, background: 'var(--color-safe, #4CAF50)'}} />
               <div style={{...styles.triangle, left: '10%'}} />
            </div>
            <a href="#" style={styles.link}>查看急症指南 →</a>
          </div>
        </div>
      </div>

      <div style={styles.bottomBar}>
        <span style={styles.notice}>✦ 已恢复上次的数据</span>
        <button style={styles.ghostBtn}>打印结果</button>
        <button style={styles.clearBtn}>清除记录</button>
        <div style={styles.disclaimer}>免责声明：本工具仅供参考，任何数值异常请务必咨询专业医疗人员，数据仅存储于您的浏览器本地。</div>
      </div>
    </div>
  );
};

export default BloodTestChecker;
