import React, { useState, CSSProperties } from 'react';

const RiskScreener: React.FC = () => {
  const [step, setStep] = useState(0); // 0: Welcome, 1: Question, 2: Results

  const styles: Record<string, CSSProperties> = {
    container: {
      backgroundColor: 'var(--color-surface, #0D0B14)',
      color: '#ffffff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '"Noto Sans SC", sans-serif',
      position: 'relative',
    },
    glassCard: {
      background: 'rgba(26,22,37,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)',
      padding: '48px',
      maxWidth: '640px',
      width: '100%',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    },
    title: {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '36px',
      margin: 0,
      color: '#ffffff',
    },
    subtitle: {
      fontSize: '18px',
      color: 'var(--color-tertiary, #CBC2DD)',
      margin: 0,
    },
    infoBox: {
      background: 'transparent',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      padding: '16px',
      fontSize: '14px',
      color: 'var(--color-secondary, #D4A853)',
    },
    primaryBtn: {
      background: 'linear-gradient(135deg, var(--color-primary, #C84B7C), #E76395)',
      color: '#ffffff',
      border: 'none',
      padding: '16px 32px',
      fontSize: '18px',
      fontWeight: 'bold',
      cursor: 'pointer',
      clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)',
      alignSelf: 'center',
      marginTop: '16px',
    },
    ghostBtn: {
      background: 'transparent',
      border: '1px solid var(--color-secondary, #D4A853)',
      color: 'var(--color-secondary, #D4A853)',
      padding: '12px 24px',
      fontSize: '16px',
      cursor: 'pointer',
      clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)',
    },
    progressBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '4px',
      background: 'var(--color-primary, #C84B7C)',
      width: '42%', // 3 of 7
      transition: 'width 0.3s',
    },
    qNumber: {
      fontFamily: '"JetBrains Mono", monospace',
      color: 'var(--color-secondary, #D4A853)',
      fontSize: '16px',
    },
    qText: {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '28px',
      margin: '0 0 32px 0',
    },
    optionCard: {
      background: 'rgba(26,22,37,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      borderLeft: '2px solid var(--color-primary, #C84B7C)',
      padding: '20px',
      cursor: 'pointer',
      textAlign: 'left',
      fontSize: '16px',
      clipPath: 'polygon(0 0, 98% 0, 100% 10%, 100% 100%, 2% 100%, 0 90%)',
      transition: 'all 0.2s',
    },
    resultsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
      width: '100%',
      maxWidth: '800px',
    },
    resCard: {
      background: 'rgba(26,22,37,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      textAlign: 'left',
    },
    resCategory: {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '20px',
      margin: 0,
    },
    riskBar: {
      height: '8px',
      background: 'linear-gradient(to right, var(--color-safe, #4CAF50), var(--color-caution, #FF9800), var(--color-danger, #F44336))',
      position: 'relative',
      marginTop: '8px',
    },
    riskMarker: {
      position: 'absolute',
      top: '50%',
      left: '30%',
      transform: 'translate(-50%, -50%)',
      width: '12px',
      height: '12px',
      background: '#fff',
      borderRadius: '50%',
      boxShadow: '0 0 4px rgba(0,0,0,0.5)',
    },
    resList: {
      margin: 0,
      paddingLeft: '20px',
      fontSize: '14px',
      color: 'var(--color-tertiary, #CBC2DD)',
    },
    resLink: {
      color: 'var(--color-secondary, #D4A853)',
      textDecoration: 'none',
      fontSize: '14px',
      marginTop: 'auto',
    },
    btnGroup: {
      display: 'flex',
      gap: '16px',
      marginTop: '32px',
      justifyContent: 'center',
    }
  };

  return (
    <div style={styles.container}>
      {step === 0 && (
        <div style={styles.glassCard}>
          <h1 style={styles.title}>风险自评</h1>
          <p style={styles.subtitle}>7 个问题 · 约 2 分钟 · 数据不离开你的浏览器</p>
          <p style={{fontSize: '16px', lineHeight: 1.6}}>基于最新内分泌学会指南，评估血栓、肝脏及心血管等相关风险，辅助选择最优 HRT 方案。</p>
          <div style={styles.infoBox}>
            💡 高风险不代表不能使用 HRT，只意味着需要更密切的监测或调整给药途径。
          </div>
          <button style={styles.primaryBtn} onClick={() => setStep(1)}>开始评估 →</button>
        </div>
      )}

      {step === 1 && (
        <>
          <div style={styles.progressBar} />
          <div style={{...styles.glassCard, padding: '40px 24px'}}>
            <div style={styles.qNumber}>Q3/7</div>
            <h2 style={styles.qText}>您是否有吸烟习惯？</h2>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div style={styles.optionCard} onClick={() => setStep(2)}>不吸烟，且无二手烟环境</div>
              <div style={styles.optionCard} onClick={() => setStep(2)}>偶尔吸烟 (每月 &lt; 5支)</div>
              <div style={styles.optionCard} onClick={() => setStep(2)}>经常吸烟或电子烟</div>
              <div style={styles.optionCard} onClick={() => setStep(2)}>已戒烟不到半年</div>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <div style={{maxWidth: '800px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <h2 style={{...styles.title, marginBottom: '32px'}}>评估结果</h2>
          
          <div style={styles.resultsGrid}>
            <div style={styles.resCard}>
              <h3 style={styles.resCategory}>VTE (静脉血栓) 风险</h3>
              <div style={styles.riskBar}>
                <div style={{...styles.riskMarker, left: '20%'}} />
              </div>
              <ul style={styles.resList}>
                <li>年龄 &lt; 35岁 (-风险)</li>
                <li>不吸烟 (-风险)</li>
              </ul>
              <a href="#" style={styles.resLink}>详细了解 →</a>
            </div>

            <div style={styles.resCard}>
              <h3 style={styles.resCategory}>肝脏代谢负担</h3>
              <div style={styles.riskBar}>
                <div style={{...styles.riskMarker, left: '65%'}} />
              </div>
              <ul style={styles.resList}>
                <li>未提及肝病史</li>
                <li>可能需要首选透皮/注射途径</li>
              </ul>
              <a href="#" style={styles.resLink}>详细了解 →</a>
            </div>

            <div style={styles.resCard}>
              <h3 style={styles.resCategory}>心血管事件风险</h3>
              <div style={styles.riskBar}>
                <div style={{...styles.riskMarker, left: '10%'}} />
              </div>
              <ul style={styles.resList}>
                <li>血压正常范围内</li>
              </ul>
              <a href="#" style={styles.resLink}>详细了解 →</a>
            </div>

            <div style={styles.resCard}>
              <h3 style={styles.resCategory}>脑膜瘤风险</h3>
              <div style={styles.riskBar}>
                <div style={{...styles.riskMarker, left: '15%'}} />
              </div>
              <ul style={styles.resList}>
                <li>暂无高危因素</li>
              </ul>
              <a href="#" style={styles.resLink}>详细了解 →</a>
            </div>
          </div>

          <div style={styles.btnGroup}>
            <button style={styles.ghostBtn}>打印结果</button>
            <button style={styles.ghostBtn} onClick={() => setStep(0)}>重新评估</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskScreener;
