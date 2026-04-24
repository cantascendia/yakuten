import React, { CSSProperties } from 'react';

const BrandIndex: React.FC = () => {
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
    topSection: {
      marginBottom: '40px',
    },
    searchWrapper: {
      position: 'relative',
      marginBottom: '16px',
    },
    searchInput: {
      width: '100%',
      background: 'transparent',
      border: 'none',
      borderBottom: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      color: '#ffffff',
      padding: '12px 12px 12px 36px',
      fontSize: '20px',
      outline: 'none',
      boxSizing: 'border-box',
    },
    searchIcon: {
      position: 'absolute',
      left: '0',
      top: '14px',
      fontSize: '20px',
    },
    filtersRow: {
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    select: {
      background: 'rgba(26,22,37,0.6)',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      color: '#ffffff',
      padding: '8px 16px',
      fontSize: '14px',
      outline: 'none',
      clipPath: 'polygon(0 0, 90% 0, 100% 20%, 100% 100%, 10% 100%, 0 80%)',
    },
    resultCount: {
      marginLeft: 'auto',
      fontSize: '14px',
      color: 'var(--color-tertiary, #CBC2DD)',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '24px',
    },
    card: {
      background: 'rgba(26,22,37,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-outline-variant, rgba(86,65,71,0.2))',
      clipPath: 'polygon(0 0, 95% 0, 100% 5%, 100% 100%, 5% 100%, 0 95%)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    countryRow: {
      fontFamily: '"JetBrains Mono", monospace',
      color: 'var(--color-secondary, #D4A853)',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    brandName: {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '22px',
      margin: 0,
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '14px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      paddingBottom: '8px',
    },
    label: {
      color: 'var(--color-tertiary, #CBC2DD)',
    },
    value: {
      color: '#fff',
    },
    badgeContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '12px',
    },
    badgeGreen: {
      background: 'rgba(76, 175, 80, 0.2)',
      color: 'var(--color-safe, #4CAF50)',
      padding: '4px 8px',
      fontSize: '12px',
      border: '1px solid var(--color-safe, #4CAF50)',
    },
    badgeRed: {
      background: 'rgba(244, 67, 54, 0.2)',
      color: 'var(--color-danger, #F44336)',
      padding: '4px 8px',
      fontSize: '12px',
      border: '1px solid var(--color-danger, #F44336)',
      textDecoration: 'line-through',
    },
    badgeBlue: {
      background: 'rgba(33, 150, 243, 0.2)',
      color: '#2196F3',
      padding: '4px 8px',
      fontSize: '12px',
      border: '1px solid #2196F3',
    },
    link: {
      color: 'var(--color-primary, #C84B7C)',
      textDecoration: 'none',
      fontSize: '14px',
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input style={styles.searchInput} placeholder="搜索品牌名..." />
        </div>
        <div style={styles.filtersRow}>
          <select style={styles.select}>
            <option>地区: 全部</option>
            <option>中国大陆</option>
            <option>日本</option>
          </select>
          <select style={styles.select}>
            <option>药物类别: 全部</option>
            <option>雌激素</option>
            <option>抗雄激素</option>
          </select>
          <div style={styles.resultCount}>显示 23 / 58 个品牌</div>
        </div>
      </div>

      <div style={styles.grid}>
        
        {/* Card 1 */}
        <div style={styles.card}>
          <div style={styles.countryRow}>🇨🇳 中国大陆</div>
          <h3 style={styles.brandName}>补佳乐 (Progynova)</h3>
          <div style={styles.detailRow}><span style={styles.label}>厂商</span><span style={styles.value}>拜耳 (Bayer)</span></div>
          <div style={styles.detailRow}><span style={styles.label}>规格</span><span style={styles.value}>1mg × 21片</span></div>
          <div style={styles.detailRow}><span style={styles.label}>外观</span><span style={styles.value}>淡黄色糖衣片</span></div>
          <div style={styles.badgeContainer}>
            <div style={styles.badgeGreen}>上市</div>
            <a href="#" style={styles.link}>药物详情 →</a>
          </div>
        </div>

        {/* Card 2 */}
        <div style={styles.card}>
          <div style={styles.countryRow}>🇯🇵 日本</div>
          <h3 style={styles.brandName}>Pelanin Depot</h3>
          <div style={styles.detailRow}><span style={styles.label}>厂商</span><span style={styles.value}>持田制药</span></div>
          <div style={styles.detailRow}><span style={styles.label}>规格</span><span style={styles.value}>10mg / 1mL</span></div>
          <div style={styles.detailRow}><span style={styles.label}>外观</span><span style={styles.value}>无色/淡黄油状注射液</span></div>
          <div style={styles.badgeContainer}>
            <div style={styles.badgeBlue}>处方</div>
            <a href="#" style={styles.link}>药物详情 →</a>
          </div>
        </div>

        {/* Card 3 */}
        <div style={styles.card}>
          <div style={styles.countryRow}>🇨🇳 中国大陆</div>
          <h3 style={styles.brandName}>色普龙 (色普龙片)</h3>
          <div style={styles.detailRow}><span style={styles.label}>厂商</span><span style={styles.value}>拜耳 (Bayer)</span></div>
          <div style={styles.detailRow}><span style={styles.label}>规格</span><span style={styles.value}>50mg × 50片</span></div>
          <div style={styles.detailRow}><span style={styles.label}>外观</span><span style={styles.value}>白色刻痕片</span></div>
          <div style={styles.badgeContainer}>
            <div style={styles.badgeRed}>禁售</div>
            <a href="#" style={styles.link}>药物详情 →</a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BrandIndex;
