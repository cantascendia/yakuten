/**
 * uploadGuard —— R1a 的三条硬约束（docs/specs/ai-chat-image-input.md §3.2 R1a）
 *
 * 「原图泄漏 100% 来自代码路径，不是来自 File 对象还在内存里。」
 * 所以这里守的是**签名与准入**，不是内存卫生：
 *
 *   1. 上传函数签名只接受 Blob，永远不接受 File，并断言它带有导出管线的内部 brand 标记
 *   2. 导出成功即把 blob 注册进 brand 集合（由 exportRedacted 独占写入）；未注册的一律拒绝
 *   3. 禁止任何「canvas 失败就传原图」的兜底 —— 宁可失败
 *
 * brand 集合本体（WeakSet）刻意放在 exportRedacted.ts：**只有产出方能授予成员资格**，
 * 本模块只有读权限（isRedactedBlob）。这样即使有人误改本文件也无法凭空 brand 一个 blob。
 * 用 WeakSet 而不是「在 blob 上挂个属性名」，因为属性可以被任意代码伪造与复制。
 */

import { isRedactedBlob } from './exportRedacted';

/**
 * ⛔ 本文件的不可协商条款（写死在这里，因为它最容易被当成「健壮性改进」抹掉）：
 *
 *   **绝不允许出现「导出失败 → 退回上传原始 File」的兜底路径。**
 *
 * 具体禁止形态（全部等价于泄漏，都曾被当作善意重构提出）：
 *   - try { blob = await exportRedacted(file) } catch { blob = file }
 *   - const payload = redacted ?? file
 *   - if (!blob) { /* 至少让用户能发出去 *\/ send(file) }
 *   - 「老浏览器不支持 createImageBitmap 就直接传原图」的能力降级
 *   - 「图太大就传原图让服务端处理」
 *
 * 导出失败的正确处理是**让这次上传失败**，并按 §4.2 把用户导向血检工具
 * （纯本地、永远可用、且它才是判读的权威来源）。一张遮盖失败的化验单进了
 * 第三方训练语料是不可逆的；一次上传失败不是。
 */
export const NO_ORIGINAL_FALLBACK = true as const;

export class RedactUploadError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`[upload-guard:${code}] ${message}`);
    this.name = 'RedactUploadError';
    this.code = code;
  }
}

/**
 * 准入断言。任何把图片字节交给网络的代码路径都必须先过这里。
 *
 * 注意 TypeScript 帮不上忙：`File extends Blob`，所以静态签名写 `Blob` 依然
 * 接受 File —— 必须在运行时显式挡掉（R1a-1 的「永远不接受 File」是运行时约束）。
 */
export function assertRedactedBlob(blob: Blob): void {
  if (!(blob instanceof Blob)) {
    throw new RedactUploadError('not-blob', '上传载荷必须是 Blob');
  }
  if (typeof File !== 'undefined' && blob instanceof File) {
    // 用户选中的原始文件就是 File。这里拒绝的是「原图直传」这条路径本身，
    // 与 blob 内容无关 —— 即使内容碰巧已遮盖也拒绝，因为它没有 brand。
    throw new RedactUploadError('file-rejected', '上传函数不接受 File，只接受导出管线产出的 Blob');
  }
  if (!isRedactedBlob(blob)) {
    throw new RedactUploadError('unbranded', 'blob 未经遮盖导出管线（无 brand 标记），拒绝上传');
  }
  if (blob.type !== 'image/jpeg') {
    // R7：Safari 的 canvas 不能编码 WebP 且 toBlob 会静默返回 PNG，
    // 症状是「只有 iPhone 用户报 413」。这里是第二道校验。
    throw new RedactUploadError('mime', `只允许 image/jpeg，收到 ${blob.type || '(空)'}`);
  }
  if (blob.size <= 0) {
    throw new RedactUploadError('empty', '空 blob');
  }
}

/** 不抛版本，供 UI 决定按钮可用性；判定逻辑与 assertRedactedBlob 同源 */
export function canUploadRedactedBlob(blob: Blob): boolean {
  try {
    assertRedactedBlob(blob);
    return true;
  } catch {
    return false;
  }
}

export interface RedactedUploadInit {
  /** 必填且无默认值：本轮不确定端点契约，不在这里预先钉死 forbidden 路径的形状 */
  endpoint: string;
  /** 表单里图片字段名 */
  field?: string;
  /** 随图一起提交的纯文本字段（绝不含健康数据以外的标识信息由调用方负责） */
  fields?: Record<string, string>;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

/**
 * 构造 multipart 载荷（§4.3：浏览器 → Vercel 这一跳传二进制，不做 base64，白捡 33%）。
 * 单独导出以便在不发请求的前提下被测试。
 */
export function buildRedactedUploadBody(blob: Blob, init: RedactedUploadInit): FormData {
  assertRedactedBlob(blob);
  const fd = new FormData();
  // 文件名固定，不用原文件名 —— 原文件名常含机型/日期/序号（IMG_20260730_…），
  // 属于「图片与健康数据同等对待」的范围（R1a 其余向量）
  fd.append(init.field ?? 'image', blob, 'redacted.jpg');
  const extra = init.fields ?? {};
  for (const k of Object.keys(extra)) fd.append(k, extra[k]!);
  return fd;
}

/**
 * 唯一允许把图片字节发出去的函数。签名只接受 Blob。
 * 失败就是失败：这里没有、也不允许有任何 catch → 传原图的分支（见 NO_ORIGINAL_FALLBACK）。
 */
export async function uploadRedactedImage(blob: Blob, init: RedactedUploadInit): Promise<Response> {
  assertRedactedBlob(blob);
  if (!init?.endpoint) throw new RedactUploadError('endpoint', '必须显式给出 endpoint');
  const body = buildRedactedUploadBody(blob, init);
  const doFetch = init.fetchImpl ?? fetch;
  return await doFetch(init.endpoint, { method: 'POST', body, signal: init.signal });
}
