import { lazy, Suspense, useState } from 'react';
import ClassicBloodTestChecker from './BloodTestChecker';

import '../../styles/blood-b32.css';

const B32App = lazy(() => import('./blood-b32/B32App'));

type Mode = 'classic' | 'tracker';

/**
 * In-page toggle between the two blood-test tools — decoupled from the global theme.
 *
 *  - 快速判读 (classic): stateless single-shot checker — zero storage, zero transmission (DEFAULT).
 *  - 血检手账 (v3.2):    localStorage-backed tracker — records persist on-device only (opt-in).
 *
 * Classic stays the default per the project privacy rule (classic mode must remain storage-free);
 * the tracker is opt-in via this visible toggle. Previously the tracker was tied to `html.sakura`
 * (set by the now-removed ThemeToggle); 绯英典籍 v2 switched theming to `data-theme`, so the
 * trigger is moved here to keep v3.2 reachable independent of the active theme.
 */
export default function BloodTestCheckerRouter() {
  const [mode, setMode] = useState<Mode>('classic');

  return (
    <div className="bt-router">
      <div className="bt-mode-toggle" role="tablist" aria-label="血检工具模式">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'classic'}
          className={`bt-mode-toggle__btn${mode === 'classic' ? ' is-active' : ''}`}
          onClick={() => setMode('classic')}
        >
          快速判读
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'tracker'}
          className={`bt-mode-toggle__btn${mode === 'tracker' ? ' is-active' : ''}`}
          onClick={() => setMode('tracker')}
        >
          血检手账
          <span className="bt-mode-toggle__badge">本地记录</span>
        </button>
      </div>

      {mode === 'tracker' ? (
        <Suspense fallback={<B32Loading />}>
          <B32App />
        </Suspense>
      ) : (
        <ClassicBloodTestChecker />
      )}
    </div>
  );
}

function B32Loading() {
  return (
    <div
      className="b32-root"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
        fontFamily: 'var(--b32-font-display)',
        color: 'var(--b32-ink-2)',
        fontSize: 14,
      }}
    >
      🌸 载入手账中…
    </div>
  );
}
