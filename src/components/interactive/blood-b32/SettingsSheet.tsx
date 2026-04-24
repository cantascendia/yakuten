import { useRef, type ChangeEvent } from 'react';
import type { BloodPrefs } from '../../../utils/blood/storage';
import type { Region } from '../../../utils/blood/metrics';
import { getB32Copy, type Locale } from '../../../utils/blood/i18n';
import { B32Sheet } from './Primitives';

interface Props {
  open: boolean;
  prefs: BloodPrefs;
  locale: Locale;
  onSavePrefs: (prefs: BloodPrefs) => void;
  onImport: (file: File) => void | Promise<void>;
  onExport: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

export default function SettingsSheet({ open, prefs, locale, onSavePrefs, onImport, onExport, onClearAll, onClose }: Props) {
  const copy = getB32Copy(locale);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleRegion = (e: ChangeEvent<HTMLSelectElement>) => {
    onSavePrefs({ ...prefs, unitRegion: e.target.value as Region });
  };

  const handleImportClick = () => fileRef.current?.click();
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onImport(file);
    e.target.value = '';
  };

  const handleClear = () => {
    if (typeof window !== 'undefined' && window.confirm(copy.settingsClearConfirm)) {
      onClearAll();
    }
  };

  return (
    <B32Sheet open={open} onClose={onClose} title={copy.settingsTitle} maxWidth={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section>
          <label style={{ display: 'block' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--b32-ink-3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 6,
                fontFamily: 'var(--b32-font-accent)',
              }}
            >
              {copy.settingsRegion}
            </div>
            <select className="b32-input" value={prefs.unitRegion} onChange={handleRegion}>
              <option value="CN">{copy.regionCN}</option>
              <option value="US">{copy.regionUS}</option>
              <option value="EU">{copy.regionEU}</option>
              <option value="JP">{copy.regionJP}</option>
            </select>
            <div style={{ fontSize: 12, color: 'var(--b32-ink-3)', marginTop: 6 }}>{copy.settingsRegionHint}</div>
          </label>
        </section>

        <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={onExport} className="b32-btn b32-btn-ghost" style={{ flex: 1, minWidth: 140 }}>
            ⬇ {copy.settingsExport}
          </button>
          <button type="button" onClick={handleImportClick} className="b32-btn b32-btn-ghost" style={{ flex: 1, minWidth: 140 }}>
            ⬆ {copy.settingsImport}
          </button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleFile} />
        </section>

        <section>
          <button type="button" onClick={handleClear} className="b32-btn b32-btn-danger" style={{ width: '100%' }}>
            🗑 {copy.settingsClearAll}
          </button>
        </section>

        <section
          style={{
            padding: 14,
            background: 'var(--b32-sakura-paper)',
            borderRadius: 'var(--b32-r-md)',
            fontSize: 12,
            color: 'var(--b32-ink-2)',
            lineHeight: 1.7,
          }}
        >
          {copy.sakuraHint}
        </section>
      </div>
    </B32Sheet>
  );
}
