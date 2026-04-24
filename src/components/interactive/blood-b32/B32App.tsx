import { useCallback, useEffect, useState } from 'react';
import {
  bcExportJSON,
  bcImportJSON,
  bcLoadPrefs,
  bcSavePrefs,
  bcSaveRecords,
  bcSeedIfEmpty,
  bcClearAll,
  type BloodPrefs,
  type BloodRecord,
} from '../../../utils/blood/storage';
import { getB32Copy, type Locale, detectLocaleFromPath } from '../../../utils/blood/i18n';
import { SakuraLogo, StickerBadge } from './Primitives';
import Dashboard from './Dashboard';
import InputSheet from './InputSheet';
import SettingsSheet from './SettingsSheet';

export default function B32App() {
  const [locale, setLocale] = useState<Locale>(() => detectLocaleFromPath());
  const [records, setRecords] = useState<BloodRecord[]>(() => bcSeedIfEmpty());
  const [prefs, setPrefs] = useState<BloodPrefs>(() => bcLoadPrefs());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const rs = bcSeedIfEmpty();
    if (rs.length === 0) return null;
    return [...rs].sort((a, b) => b.date.localeCompare(a.date))[0].id;
  });

  const [inputOpen, setInputOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BloodRecord | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    // Re-detect locale if route changes client-side (Starlight does not, but harmless)
    setLocale(detectLocaleFromPath());
  }, []);

  const copy = getB32Copy(locale);
  const activeRecord = records.find((r) => r.id === activeId) ?? null;

  const persist = useCallback((next: BloodRecord[]) => {
    setRecords(next);
    bcSaveRecords(next);
  }, []);

  const persistPrefs = useCallback((p: BloodPrefs) => {
    setPrefs(p);
    bcSavePrefs(p);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingRecord(null);
    setInputOpen(true);
  }, []);

  const handleEditRecord = useCallback((rec: BloodRecord) => {
    setEditingRecord(rec);
    setInputOpen(true);
  }, []);

  const handleSaveRecord = useCallback(
    (rec: BloodRecord) => {
      const existing = records.find((r) => r.id === rec.id);
      const next = existing ? records.map((r) => (r.id === rec.id ? rec : r)) : [...records, rec];
      persist(next);
      setActiveId(rec.id);
      setInputOpen(false);
    },
    [records, persist]
  );

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const next = await bcImportJSON(file);
        persist(next);
        const sorted = [...next].sort((a, b) => b.date.localeCompare(a.date));
        setActiveId(sorted[0]?.id ?? null);
      } catch {
        if (typeof window !== 'undefined') window.alert('Import failed: invalid file');
      }
    },
    [persist]
  );

  const handleClearAll = useCallback(() => {
    bcClearAll();
    setRecords([]);
    setActiveId(null);
    setSettingsOpen(false);
  }, []);

  const handleOpenShare = useCallback(() => {
    setShareToast(true);
    window.setTimeout(() => setShareToast(false), 2400);
  }, []);

  return (
    <div className="b32-root">
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(255, 248, 242, 0.86)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--b32-divider)',
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              background: 'var(--b32-sakura-soft)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid var(--b32-divider)',
              flexShrink: 0,
            }}
          >
            <SakuraLogo />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--b32-font-ui)',
                fontSize: 10,
                color: 'var(--b32-ink-3)',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {copy.headerKicker}
            </div>
            <div style={{ fontFamily: 'var(--b32-font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>
              {copy.headerCount(records.length)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={copy.settings}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'var(--b32-surface-2)',
              border: 0,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--b32-ink-2)',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <circle cx="10" cy="10" r="2.5" />
              <path d="M10 2v2M10 16v2M18 10h-2M4 10H2M15.5 4.5l-1.5 1.5M6 14l-1.5 1.5M15.5 15.5L14 14M6 6 4.5 4.5" />
            </svg>
          </button>
          <button type="button" onClick={handleAddNew} className="b32-btn b32-btn-primary">
            {copy.addNew}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 120px' }}>
        {records.length === 0 ? (
          <EmptyState locale={locale} onAddNew={handleAddNew} />
        ) : (
          <Dashboard
            records={records}
            activeRecord={activeRecord}
            prefs={prefs}
            locale={locale}
            onSelectRecord={setActiveId}
            onAddNew={handleAddNew}
            onEditRecord={handleEditRecord}
            onOpenShare={handleOpenShare}
          />
        )}

        <div
          style={{
            marginTop: 44,
            padding: '18px 22px',
            background: 'var(--b32-surface-2)',
            borderRadius: 18,
            fontSize: 12,
            color: 'var(--b32-ink-2)',
            lineHeight: 1.75,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: 'var(--b32-ink-3)',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 8,
              fontFamily: 'var(--b32-font-accent)',
            }}
          >
            {locale === 'zh' ? '说明' : locale === 'ja' ? '注意事項' : 'Notes'}
          </div>
          {copy.disclaimer}
          <br />
          <strong style={{ color: 'var(--b32-danger)' }}>{copy.disclaimerRed}</strong>
        </div>
      </div>

      <InputSheet
        open={inputOpen}
        record={editingRecord}
        prefs={prefs}
        locale={locale}
        onSave={handleSaveRecord}
        onClose={() => setInputOpen(false)}
      />
      <SettingsSheet
        open={settingsOpen}
        prefs={prefs}
        locale={locale}
        onSavePrefs={persistPrefs}
        onImport={handleImport}
        onExport={bcExportJSON}
        onClearAll={handleClearAll}
        onClose={() => setSettingsOpen(false)}
      />

      {shareToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--b32-ink)',
            color: 'white',
            padding: '12px 22px',
            borderRadius: 'var(--b32-r-full)',
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(74,40,56,0.3)',
            zIndex: 300,
            fontFamily: 'var(--b32-font-accent)',
          }}
          className="b32-pop"
        >
          {copy.shareUpcoming}
        </div>
      )}
    </div>
  );
}

function EmptyState({ locale, onAddNew }: { locale: Locale; onAddNew: () => void }) {
  const copy = getB32Copy(locale);
  return (
    <div style={{ padding: '80px 40px', textAlign: 'center' }}>
      <StickerBadge color="var(--b32-sakura-soft)" size={100} rotate={-4}>
        <SakuraLogo size={52} petalR={6.5} />
      </StickerBadge>
      <div
        style={{
          fontFamily: 'var(--b32-font-display)',
          fontSize: 26,
          fontWeight: 800,
          marginTop: 24,
          marginBottom: 10,
          letterSpacing: '-0.02em',
        }}
      >
        {copy.emptyHeadline}
      </div>
      <p
        style={{
          fontSize: 14,
          color: 'var(--b32-ink-2)',
          maxWidth: 360,
          margin: '0 auto 28px',
          lineHeight: 1.7,
          whiteSpace: 'pre-line',
        }}
      >
        {copy.emptyBody}
      </p>
      <button type="button" onClick={onAddNew} className="b32-btn b32-btn-primary">
        {copy.emptyCta}
      </button>
    </div>
  );
}
