import { lazy, Suspense, useEffect, useState } from 'react';
import ClassicBloodTestChecker from './BloodTestChecker';

import '../../styles/blood-b32.css';

const B32App = lazy(() => import('./blood-b32/B32App'));

function readSakuraClass(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('sakura');
}

/**
 * Router that renders the classic red/yellow/green checker by default,
 * and the v3.2 乐园手账 tracker (records + scoring + timeline) when
 * ThemeToggle.astro enables `html.sakura`.
 *
 * - Classic mode:   stateless single-shot checker (zero storage)
 * - Sakura mode:    localStorage-backed tracker (records persist locally)
 */
export default function BloodTestCheckerRouter() {
  const [sakura, setSakura] = useState<boolean>(() => readSakuraClass());

  useEffect(() => {
    setSakura(readSakuraClass());
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      setSakura(html.classList.contains('sakura'));
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (sakura) {
    return (
      <Suspense fallback={<B32Loading />}>
        <B32App />
      </Suspense>
    );
  }
  return <ClassicBloodTestChecker />;
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
        color: 'var(--b32-ink-3)',
        fontSize: 14,
      }}
    >
      🌸 载入手账中…
    </div>
  );
}
