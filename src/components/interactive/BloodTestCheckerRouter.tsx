import { lazy, Suspense, useEffect, useState } from 'react';

import '../../styles/blood-b32.css';

const B32App = lazy(() => import('./blood-b32/B32App'));

/**
 * Blood-test checker entry point (kept under this name so the 18 locale MDX
 * pages need no change). Renders the v3.2 「血检手账」 tracker — records live
 * in the user's localStorage only and are never transmitted.
 *
 * The tracker reads localStorage on first render, so it only mounts after
 * hydration: server HTML and the first client render are the same neutral
 * placeholder, which avoids a hydration mismatch (React #418).
 */
export default function BloodTestCheckerRouter() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <B32Loading />;
  return (
    <Suspense fallback={<B32Loading />}>
      <B32App />
    </Suspense>
  );
}

function B32Loading() {
  return (
    <div
      className="b32-root"
      aria-busy="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
        color: 'var(--b32-ink-3)',
        fontSize: 22,
      }}
    >
      <span aria-hidden="true">🌸</span>
    </div>
  );
}
