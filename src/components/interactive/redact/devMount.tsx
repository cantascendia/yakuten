/**
 * devMount —— 遮盖编辑器的 **dev-only** 挂载适配器。
 *
 * 为什么需要它：挂载页用 `<script is:inline>` + 运行时 `import()`（见
 * src/pages/dev/editor/[view].astro 的注释：普通 `<script>` 会被 Vite 打成孤儿 chunk
 * 塞进 dist/_astro/，公开可取）。但 inline 脚本不经 Vite 处理 → 里面无法 `import 'react'`
 * 这类裸模块名。所以把 React/createRoot 的引入收进这个**模块**，inline 脚本只 import 它。
 *
 * 生产产物里没有任何页面引用本文件 → Vite 不会打包它，编辑器代码也就进不了 dist。
 * （验证：`npm run build` 后 dist/_astro 里 grep 不到 `yk-redact`。）
 *
 * 顺带承担 V3 思路的**自测**：预览 blob 与交给 onSend 的 blob 必须是同一实例，
 * 且 SHA-256 相同 —— 即「预览字节 === 上传字节」。
 */

import { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import RedactEditor from './RedactEditor';
import { isRedactedBlob } from './exportRedacted';
import { assertRedactedBlob, buildRedactedUploadBody, canUploadRedactedBlob } from './uploadGuard';

async function sha256(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface SelfTest {
  lines: string[];
  pass: boolean;
}

function DevHarness() {
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewHash, setPreviewHash] = useState<string | null>(null);
  const [result, setResult] = useState<SelfTest | null>(null);

  const onPreviewReady = useCallback((blob: Blob) => {
    setPreviewBlob(blob);
    setResult(null);
    void sha256(blob).then(setPreviewHash);
  }, []);

  const onSend = useCallback(
    async (blob: Blob) => {
      const lines: string[] = [];
      let pass = true;
      const check = (ok: boolean, text: string) => {
        if (!ok) pass = false;
        lines.push(`${ok ? 'PASS' : 'FAIL'} — ${text}`);
      };

      const sentHash = await sha256(blob);
      check(previewBlob === blob, '预览与上传是同一个 Blob 实例（R3）');
      check(previewHash !== null && previewHash === sentHash, `预览字节 === 上传字节（sha256 ${sentHash.slice(0, 16)}…）`);
      check(isRedactedBlob(blob), 'blob 带导出管线 brand（R1a-2）');
      check(canUploadRedactedBlob(blob), 'uploadGuard 准入通过');
      check(blob.type === 'image/jpeg', `MIME 是 image/jpeg（实得 ${blob.type}）`);
      check(!(blob instanceof File), '交出去的不是 File（R1a-1）');
      try {
        assertRedactedBlob(blob);
        const fd = buildRedactedUploadBody(blob, { endpoint: '/dev/never-sent' });
        const file = fd.get('image');
        check(file instanceof File && file.name === 'redacted.jpg', 'multipart 文件名固定 redacted.jpg');
      } catch (e) {
        check(false, `构造 multipart 失败：${(e as Error).message}`);
      }
      lines.push(`（本页零网络请求：只构造 FormData，不 fetch。大小 ${blob.size} 字节）`);
      setResult({ lines, pass });
      (window as unknown as { __ykEditorSelfTest?: SelfTest }).__ykEditorSelfTest = { lines, pass };
    },
    [previewBlob, previewHash],
  );

  return (
    <>
      <RedactEditor onSend={onSend} onPreviewReady={onPreviewReady} onCancel={() => setResult(null)} />
      {result ? (
        <pre
          data-selftest={result.pass ? 'pass' : 'fail'}
          style={{
            marginBlockStart: '16px',
            padding: '12px',
            whiteSpace: 'pre-wrap',
            border: `2px solid ${result.pass ? '#4CAF50' : '#F44336'}`,
            borderRadius: '10px',
          }}
        >
          {`V3 自测（预览 = 实发）：${result.pass ? 'ALL PASS' : 'FAIL'}\n${result.lines.join('\n')}`}
        </pre>
      ) : null}
    </>
  );
}

export function mountRedactEditorDev(host: HTMLElement): void {
  createRoot(host).render(<DevHarness />);
}
