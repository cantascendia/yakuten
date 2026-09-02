/**
 * RedactSelfTest —— 真机自检页的 UI（**dev-only**）
 *
 * SPEC: docs/specs/ai-chat-image-input.md §7.2a ②（Playwright WebKit ≠ 真机 iOS Safari）、
 *       §7 表格 V11（真机项）、R7 / R7a / T6
 *
 * 设计约束（来自「用户会在手机上看」）：
 *  - **一个按钮跑完全部断言**，结果以大字 PASS / FAIL 显示，不需要开发者工具。
 *  - 每条断言都显示自己的判据与实测值 —— 真机上看到 FAIL 时要能直接判断是哪一类失败。
 *  - 触控目标 ≥44px；颜色全走 CSS 变量；双皮肤（默认 / html.sakura）都可读。
 *  - 页面自己**不上传任何东西**：断言全在本机跑完，最后一条自检就是「零远端请求」。
 */

import { useCallback, useState } from 'react';
import { collectEnv, runPhotoCheck, runSelfChecks, type CheckRow } from './runSelfChecks';
import { SELFTEST_CSS } from './selfTestCss';

type Phase = 'idle' | 'running' | 'done';

function StatusPill({ status }: { status: CheckRow['status'] }) {
  const text = status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'INFO';
  return (
    <span className={`yk-st__pill yk-st__pill--${status}`} aria-label={`状态 ${text}`}>
      {text}
    </span>
  );
}

function Rows({ rows }: { rows: CheckRow[] }) {
  return (
    <ul className="yk-st__rows">
      {rows.map((r) => (
        <li key={r.id} className={`yk-st__row yk-st__row--${r.status}`}>
          <div className="yk-st__row__head">
            <StatusPill status={r.status} />
            <span className="yk-st__row__title">{r.title}</span>
          </div>
          <p className="yk-st__row__detail">{r.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export default function RedactSelfTest() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [env, setEnv] = useState<CheckRow[]>([]);
  const [photoRows, setPhotoRows] = useState<CheckRow[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);

  const run = useCallback(async () => {
    setPhase('running');
    setRows([]);
    setEnv([]);
    try {
      const report = await runSelfChecks();
      setRows(report.rows);
      setEnv(collectEnv());
    } catch (e) {
      setRows([
        {
          id: 'crash',
          title: '自检本身崩了',
          status: 'fail',
          detail: `${(e as Error).name}: ${(e as Error).message}`,
        },
      ]);
    } finally {
      setPhase('done');
    }
  }, []);

  const onPhoto = useCallback(async (file: File | null) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoRows([]);
    try {
      setPhotoRows(await runPhotoCheck(file));
    } catch (e) {
      setPhotoRows([
        {
          id: 'photo-crash',
          title: '照片自检崩了',
          status: 'fail',
          detail: `${(e as Error).name}: ${(e as Error).message}`,
        },
      ]);
    } finally {
      setPhotoBusy(false);
    }
  }, []);

  const failed = rows.filter((r) => r.status === 'fail').length;
  const passed = rows.filter((r) => r.status === 'pass').length;
  const verdict = phase !== 'done' ? null : failed === 0 ? 'pass' : 'fail';

  return (
    <section className="yk-st" aria-label="遮盖管线真机自检">
      <style>{SELFTEST_CSS}</style>

      <h1 className="yk-st__title">遮盖管线 · 真机自检</h1>
      <p className="yk-st__lede">
        CI 里的 WebKit 是桌面构建，不等于你手上这台机器。这一页把 V1 / V2 / V3 三组隐私断言
        在**本机**再跑一遍：全部在这台设备上完成，不上传任何字节。
      </p>

      <button
        type="button"
        className="yk-st__run"
        disabled={phase === 'running'}
        onClick={() => void run()}
        data-yk-selftest-run
      >
        {phase === 'running' ? '正在跑…' : phase === 'done' ? '再跑一次' : '开始自检'}
      </button>

      {verdict ? (
        <div
          className={`yk-st__verdict yk-st__verdict--${verdict}`}
          role="status"
          aria-live="polite"
          data-yk-selftest={verdict}
        >
          <strong className="yk-st__verdict__big">{verdict === 'pass' ? 'PASS' : 'FAIL'}</strong>
          <span className="yk-st__verdict__sub">
            {verdict === 'pass'
              ? `${passed} 条断言全部通过`
              : `${failed} 条失败 / ${passed} 条通过 —— 失败的那几条不要上线`}
          </span>
        </div>
      ) : null}

      {rows.length ? <Rows rows={rows} /> : null}

      {env.length ? (
        <>
          <h2 className="yk-st__h2">环境信息（截图存档用）</h2>
          <Rows rows={env} />
        </>
      ) : null}

      <h2 className="yk-st__h2">相册照片实测（T6：HEIC 行为无公开数据）</h2>
      <p className="yk-st__lede">
        从相册选一张**真实照片**。这一步只在本机解码与导出，用来回答「iOS Safari 会不会把
        HEIC 自动转成 JPEG」，以及真实照片的 EXIF 是否真的被剥掉。
      </p>
      <label className="yk-st__run yk-st__run--file">
        {photoBusy ? '正在处理…' : '选一张照片'}
        <input
          type="file"
          accept="image/*"
          className="yk-st__file"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            e.target.value = '';
            void onPhoto(f);
          }}
        />
      </label>
      {photoRows.length ? <Rows rows={photoRows} /> : null}
    </section>
  );
}
