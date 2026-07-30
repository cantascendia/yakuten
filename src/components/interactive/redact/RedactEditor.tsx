/**
 * RedactEditor —— 客户端遮盖编辑器 UI（SPEC docs/specs/ai-chat-image-input.md §3）
 *
 * 阶段 2 交付物。**只做编辑器本体**：产出一个已遮盖、带 brand 的 Blob 交给调用方。
 * 不接 AI 对话（阶段 4，且那属于 api/ forbidden 路径，需独立双签），不发任何网络请求（R4）。
 *
 * ┌ 流程（§3.1）
 * │ 选图/拍照 → 解码+方向归一+降采样 → 自动在顶部 30% 预置遮盖框
 * │ → 拖拽/缩放/新增/删除 + 裁剪 → 预览（合成后的最终图）→ 显式「发送这张图」
 * └
 *
 * 本组件与导出管线的关系：**只消费，不重实现。** 遮盖是否真的烧进像素、EXIF 是否剥离、
 * 输出是否 JPEG，全部由 exportRedacted.ts 负责并被 tests/redact-privacy.spec.ts 硬门控。
 * 编辑器唯一的职责是**把用户意图翻译成归一化矩形**，以及**如实展示导出结果**。
 *
 * 三条本文件的红线：
 *  1. **原始 File 只活在 ref 里，绝不进 React state**（R1a-2）。对外出口只有 onSend(blob)，
 *     签名是 Blob —— 上传侧在作用域上就够不到原图。
 *  2. **没有任何「导出失败就用原图」的分支**（R1a-3）。失败就是失败，按 §4.2 导向血检工具。
 *  3. **预览渲染的是导出 blob 解码回来的图**（R3），不是编辑器画布。画布上的黑块是
 *     CSS 叠层，仅供操作；导出路径从不读 DOM，只吃归一化数值 —— R1 陷阱 1 被结构性避免。
 *
 * 无障碍（R6，AA 硬要求，不是加分项）：
 *  - SC 2.5.7：每个遮盖框配四个原生 `<input type="range">`（左/上/宽/高），与可视矩形双向绑定。
 *    ARIA 没有二维选区 pattern（w3c/aria#1443 已关闭未产出角色）→ 四个一维 slider 是正确拆解。
 *  - 绝不用 role="application"（会关掉 AT 浏览模式）。
 *  - 三条并行路径：拖拽 / 点击-再点击（全程无 press-move-release）/ 键盘。
 *  - 触控目标：手柄视觉 14px，命中区 ::before 撑到 44px 且向框外扩展（见 redactEditorCss.ts）。
 *  - 阶段切换后主动移动焦点：控件被卸载会让焦点掉回 body，键盘用户就地丢失位置。
 *
 * i18n：本轮**仅 zh**（SPEC §3.3 表格给的是 zh 文案，其余 16 语在接入对话时随
 * aiChatL10n 一起同步）。文案是**操作指引**不是免责声明 —— 与 owner「不加 AI 免责文案」
 * 的既有决策不冲突（§3.3 脚注）。
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createRedactedPreview, exportRedacted, type RedactedPreview, type RedactRect } from './exportRedacted';
import {
  FULL_RECT,
  MIN_CROP_SIDE,
  MIN_RECT_SIDE,
  moveRect,
  pct,
  pointToUnit,
  prepareExportGeometry,
  rangeBoundsFor,
  rectFromPoints,
  resizeRectCorner,
  setRectEdge,
  topBandRect,
  type RectCorner,
  type RectEdge,
  type UnitPoint,
} from './redactGeometry';
import { REDACT_EDITOR_CSS } from './redactEditorCss';

// ─────────────────────────────── 文案（§3.3，zh） ───────────────────────────────

const TXT = {
  title: '请遮住姓名和证件号',
  hint: '化验单上方通常有姓名、身份证号、就诊卡号。已为你预置了一个遮盖框，可拖动调整。',
  /**
   * R6a-4：**不得暗示「已帮你遮好了」**。预置框只是省掉一次操作，它不知道你的化验单版式，
   * 也不知道姓名在哪一行。这句话对全盲用户尤其重要 —— 见 §3.3 与 R6a 的诚实评估。
   */
  presetHonesty:
    '已预置遮盖顶部区域，这不代表已经替你确认遮住了什么。如果你无法确认图上遮住了哪些内容，建议改用手动输入数值。',
  exifNote: '导出时会重新编码整张图：照片里的 GPS 定位、机型等信息会一并去掉。',
  pick: '选择照片',
  repick: '换一张',
  addRect: '新增遮盖框',
  clickClick: '点两次加框',
  clickClickOn: '再点一次对角',
  clickClickHint: '点图片左上角、再点右下角即可加框（全程不需要按住拖动）。',
  preset25: '遮盖顶部 25%',
  preset33: '遮盖顶部 33%',
  cropOn: '调整裁剪',
  cropOff: '完成裁剪',
  cropHint: '把指标表格拉满取景框：裁剪不是美化，是 AI 能否读准数字的前提。',
  cropReset: '取消裁剪',
  delete: '删除',
  fieldsRedact: '精确调整遮盖框（不需要拖拽）',
  fieldsCrop: '精确调整裁剪框（不需要拖拽）',
  preview: '预览最终图',
  back: '返回继续编辑',
  confirm: '这张图会发送给 AI 识别数值。确认已遮住个人信息？',
  send: '发送这张图',
  zoomIn: '放大逐区检查',
  zoomOut: '还原大小',
  cancel: '取消',
  noRect: '当前没有任何遮盖框 —— 这张图会原样（仅裁剪）发出去。',
  dropped: '有遮盖框完全落在裁剪区外，已忽略（那部分内容本来也不会发出去）。',
  busy: '处理中…',
  manualEntry: '改用手动输入数值',
  canvasAlt: '待遮盖的化验单照片。遮盖框的位置与尺寸也可以用下方「精确调整」里的滑块设定。',
  previewAlt: '遮盖后的最终图，即将发送的就是这一张',
  edgeLabel: { x: '左', y: '上', w: '宽', h: '高' } as Record<RectEdge, string>,
  edgeSpoken: {
    x: '左边缘，距图片左侧',
    y: '上边缘，位于图片顶部',
    w: '宽度，占图片宽的',
    h: '高度，占图片高的',
  } as Record<RectEdge, string>,
} as const;

const FAIL_PREFIX = '这张图没能安全导出，所以没有发送。';
const FAIL_SUFFIX = '（不会退回未遮盖的原图 —— 宁可失败。）';

// ─────────────────────────────── 常量 ───────────────────────────────

/** 编辑舞台的显示解码长边。与导出无关（导出永远从原 File 重新解码，见 exportRedacted）。 */
const DISPLAY_LONG_EDGE = 1600;
/** §3.1 / R6a：预置遮盖顶部 25–30%，**取上限更保守** */
const PRESET_TOP_FRACTION = 0.3;
/** 新增框的默认几何（不与预置的顶部带重叠，方便一眼看见） */
const NEW_RECT: RedactRect = { x: 0.12, y: 0.4, w: 0.5, h: 0.1 };
/** pointerup 时小于此位移视为「点击」而非「拖拽新建」 */
const CLICK_SLOP = 0.015;
/** aria-live 节流窗口（R6：必须节流，否则拖一次框读屏会念上百条） */
const LIVE_THROTTLE_MS = 500;
/** range 步长（百分比） */
const SLIDER_STEP = 0.5;

// ─────────────────────────────── 类型 ───────────────────────────────

export interface RedactEditorProps {
  /**
   * 用户显式确认后交出的**已遮盖 blob**（与预览的是同一个实例，R3）。
   * 签名只接受 Blob —— 调用方永远拿不到原始 File（R1a-1/2）。
   */
  onSend: (blob: Blob) => void | Promise<void>;
  /** 用户放弃。组件会先释放 File / 预览 URL 再回调。 */
  onCancel?: () => void;
  /**
   * 预览就绪回调。给「预览字节 === 上传字节」的自测与阶段 4 的用量展示用；
   * 拿到的就是将要上传的那个 blob 实例。
   */
  onPreviewReady?: (blob: Blob) => void;
  /** 降级路径（§4.2 / R6a-2）：手动输入数值。默认指向血检工具。 */
  manualEntryHref?: string;
  className?: string;
}

type Phase = 'pick' | 'edit' | 'preview';

type Drag =
  | { kind: 'move'; index: number; grab: UnitPoint; start: RedactRect }
  | { kind: 'resize'; index: number; corner: RectCorner }
  | { kind: 'create'; origin: UnitPoint; moved: boolean }
  | { kind: 'cropmove'; grab: UnitPoint; start: RedactRect }
  | { kind: 'cropresize'; corner: RectCorner };

const CORNERS: readonly RectCorner[] = ['nw', 'ne', 'sw', 'se'];
const EDGES: readonly RectEdge[] = ['x', 'y', 'w', 'h'];

function rectPhrase(r: RedactRect): string {
  return `左 ${pct(r.x)}%，上 ${pct(r.y)}%，宽 ${pct(r.w)}%，高 ${pct(r.h)}%`;
}

function rectLabel(i: number, r: RedactRect): string {
  return `遮盖区 ${i + 1}：${rectPhrase(r)}`;
}

function cropLabel(r: RedactRect): string {
  return `裁剪区：${rectPhrase(r)}`;
}

function errorText(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return `${FAIL_PREFIX}${raw}${FAIL_SUFFIX}`;
}

/** 归一化矩形 → 内联 style。CSS 百分比天生就是归一化坐标，零换算（见 redactGeometry 头注）。 */
function rectStyle(r: RedactRect): CSSProperties {
  return {
    left: `${r.x * 100}%`,
    top: `${r.y * 100}%`,
    width: `${r.w * 100}%`,
    height: `${r.h * 100}%`,
  };
}

// ─────────────────────── 四个 range（R6 / SC 2.5.7 的等价控件） ───────────────────────

interface RectFieldsProps {
  index: number;
  rect: RedactRect;
  selected: boolean;
  /** 可读角色名：遮盖框 / 裁剪框。aria-roledescription 与全部播报文本共用它。 */
  kind: string;
  /** id 前缀（ASCII）。刻意与 kind 分开：CJK 出现在 id 里会让 CSS 选择器与测试都要转义。 */
  slug: string;
  minSide: number;
  removeLabel: string;
  onEdge: (index: number, edge: RectEdge, valuePct: number) => void;
  onFocus: (index: number) => void;
  onRemove: (index: number) => void;
}

function RectFields({
  index,
  rect,
  selected,
  kind,
  slug,
  minSide,
  removeLabel,
  onEdge,
  onFocus,
  onRemove,
}: RectFieldsProps) {
  const name = `${kind} ${index + 1}`;
  return (
    <li
      className={`yk-redact__field${selected ? ' yk-redact__field--selected' : ''}`}
      role="group"
      aria-roledescription={kind}
      aria-label={`${name}：${rectPhrase(rect)}`}
    >
      <div className="yk-redact__field__head">
        <span className="yk-redact__field__name">{name}</span>
        <button
          type="button"
          className="yk-redact__btn yk-redact__btn--danger"
          aria-label={`${removeLabel}（${name}）`}
          onClick={() => onRemove(index)}
          onFocus={() => onFocus(index)}
        >
          {removeLabel}
        </button>
      </div>
      <div className="yk-redact__sliders">
        {EDGES.map((edge) => {
          const [min, max] = rangeBoundsFor(rect, edge, minSide);
          const value = Number((rect[edge] * 100).toFixed(1));
          return (
            <span className="yk-redact__slider" key={edge}>
              <label className="yk-redact__slider__label" htmlFor={`yk-redact-${slug}-${index}-${edge}`}>
                {TXT.edgeLabel[edge]}
              </label>
              <input
                id={`yk-redact-${slug}-${index}-${edge}`}
                type="range"
                min={min}
                max={max}
                step={SLIDER_STEP}
                value={Math.min(max, Math.max(min, value))}
                aria-valuetext={`${name} ${TXT.edgeSpoken[edge]} ${pct(rect[edge])}%`}
                onFocus={() => onFocus(index)}
                onChange={(e) => onEdge(index, edge, Number(e.target.value))}
              />
              <span className="yk-redact__slider__value" aria-hidden="true">
                {pct(rect[edge])}%
              </span>
            </span>
          );
        })}
      </div>
    </li>
  );
}

// ─────────────────────────────── 主组件 ───────────────────────────────

export default function RedactEditor({
  onSend,
  onCancel,
  onPreviewReady,
  manualEntryHref = '/zh/tools/blood-checker/',
  className,
}: RedactEditorProps) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [rects, setRects] = useState<RedactRect[]>([]);
  const [crop, setCrop] = useState<RedactRect>(FULL_RECT);
  const [cropMode, setCropMode] = useState(false);
  const [clickMode, setClickMode] = useState(false);
  const [pendingCorner, setPendingCorner] = useState<UnitPoint | null>(null);
  const [selected, setSelected] = useState(0);
  const [preview, setPreview] = useState<RedactedPreview | null>(null);
  const [previewZoom, setPreviewZoom] = useState(false);
  const [dropped, setDropped] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState('');

  /**
   * R1a-2：**原始 File 只存在这里**，不进 state、不进 props、不出组件。
   * 置空点：发送成功后 / 取消 / 换图 / 卸载。
   */
  const fileRef = useRef<File | null>(null);
  /** 等待画布挂载后再绘制的解码结果（绘完立刻 close，不长期持有全尺寸 bitmap） */
  const pendingBitmapRef = useRef<ImageBitmap | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const previewRef = useRef<RedactedPreview | null>(null);
  const liveRef = useRef<{ at: number; timer: number | null; msg: string }>({ at: 0, timer: null, msg: '' });
  /** 焦点交接目标（阶段切换时控件会被卸载 → 焦点必须显式接管） */
  const pickBtnRef = useRef<HTMLButtonElement | null>(null);
  const editFirstBtnRef = useRef<HTMLButtonElement | null>(null);
  const previewBtnRef = useRef<HTMLButtonElement | null>(null);
  const sendBtnRef = useRef<HTMLButtonElement | null>(null);
  const backFromPreviewRef = useRef(false);

  // ── aria-live 节流（R6：必须节流。拖拽期每帧播报会把读屏彻底淹掉） ──
  const announce = useCallback((msg: string) => {
    const now = Date.now();
    const state = liveRef.current;
    state.msg = msg;
    if (now - state.at >= LIVE_THROTTLE_MS) {
      state.at = now;
      setLive(msg);
      return;
    }
    if (state.timer !== null) return;
    state.timer = window.setTimeout(
      () => {
        state.timer = null;
        state.at = Date.now();
        setLive(state.msg);
      },
      LIVE_THROTTLE_MS - (now - state.at),
    );
  }, []);

  const releasePreview = useCallback(() => {
    previewRef.current?.revoke();
    previewRef.current = null;
    setPreview(null);
    setPreviewZoom(false);
  }, []);

  /** 释放一切与这张图有关的东西。R1a：File 置空 + object URL revoke + input.value 清空。 */
  const releaseAll = useCallback(() => {
    releasePreview();
    fileRef.current = null;
    pendingBitmapRef.current?.close();
    pendingBitmapRef.current = null;
    const c = canvasRef.current;
    if (c) {
      c.width = 0;
      c.height = 0;
    }
    if (inputRef.current) inputRef.current.value = '';
  }, [releasePreview]);

  useEffect(() => releaseAll, [releaseAll]);
  useEffect(() => {
    const state = liveRef.current;
    return () => {
      if (state.timer !== null) window.clearTimeout(state.timer);
    };
  }, []);

  // ── 画布绘制：解码结果就位 + canvas 已挂载 → 画一次，随即 close ──
  // width/height **在这里**赋值而不是只靠 JSX 属性：releaseAll() 会把画布置 0×0，
  // 若下一张图尺寸恰好相同，React 的属性 diff 认为没变 → 不重设 → 画布永远停在 0×0。
  useEffect(() => {
    const bmp = pendingBitmapRef.current;
    const canvas = canvasRef.current;
    if (!bmp || !canvas || !imgSize) return;
    canvas.width = imgSize.w;
    canvas.height = imgSize.h;
    const ctx = canvas.getContext('2d');
    // R7a-2 的同一条纪律：显示画布也不乘 devicePixelRatio（1600 长边本身已够密）
    if (ctx) ctx.drawImage(bmp, 0, 0, bmp.width, bmp.height, 0, 0, imgSize.w, imgSize.h);
    bmp.close();
    pendingBitmapRef.current = null;
  }, [imgSize]);

  // ── 焦点交接：阶段切换会卸载当前焦点所在的按钮，不接管焦点就会掉回 body。
  //    首次挂载**不**抢焦点（组件是页面的一部分，不是模态框）。 ──
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (phase === 'edit') {
      (backFromPreviewRef.current ? previewBtnRef.current : editFirstBtnRef.current)?.focus();
      backFromPreviewRef.current = false;
    } else if (phase === 'preview') {
      sendBtnRef.current?.focus();
    } else {
      pickBtnRef.current?.focus();
    }
  }, [phase]);

  // ── 选图 ──
  const onPick = useCallback(
    async (ev: ChangeEvent<HTMLInputElement>) => {
      const file = ev.target.files?.[0] ?? null;
      // R1a 其余向量：用完立刻清空，防表单误提交直传原文件
      ev.target.value = '';
      if (!file) return;
      setBusy(true);
      setError(null);
      releaseAll();
      try {
        // R2：解码只走 createImageBitmap（**不**用 <img>：csswg-drafts#4666 至今 open，
        // 全局 CSS 的 image-orientation:none 会造成 Chrome 躺倒 / Safari 正常的隐蔽分叉）。
        // 不传 imageOrientation —— 规范默认就是 'from-image'。
        //
        // ⚠️ 刻意**不传 resizeWidth/resizeHeight**，尽管那样能省 4 倍峰值内存（12MP 照片
        // 全量解码约 48 MB）。理由是几何可信度优先于内存：exportRedacted 之所以敢用 resize，
        // 是因为它拿文件头算出期望比例、并在比例不符时**重解码 + 宁可 throw**（R2 的几何守卫）。
        // 显示路径没有那道守卫（probeIntrinsicSize 不对外导出，本轮不改管线），
        // 一旦某 UA 在旋转前 resize，画面会被拉伸 —— 用户就会在一张变形的图上摆黑框，
        // 而导出用的是**未变形**的几何 → 黑框落错位置。那是隐私事故，不是显示瑕疵。
        // 低端老 iPhone 的内存表现列进 §7 V11 真机项。
        const bmp = await createImageBitmap(file);
        const scale = Math.min(1, DISPLAY_LONG_EDGE / Math.max(bmp.width, bmp.height));
        const w = Math.max(1, Math.round(bmp.width * scale));
        const h = Math.max(1, Math.round(bmp.height * scale));
        const preset = topBandRect(PRESET_TOP_FRACTION);
        fileRef.current = file;
        pendingBitmapRef.current = bmp;
        setImgSize({ w, h });
        setRects([preset]);
        setCrop(FULL_RECT);
        setCropMode(false);
        setClickMode(false);
        setPendingCorner(null);
        setSelected(0);
        setDropped(0);
        setPhase('edit');
        announce(`已载入图片。${rectLabel(0, preset)}`);
      } catch (e) {
        releaseAll();
        setError(errorText(e));
        setPhase('pick');
      } finally {
        setBusy(false);
      }
    },
    [announce, releaseAll],
  );

  // ── 矩形写入口（一律经 redactGeometry 的纯函数夹进 [0,1]） ──
  const onEdge = useCallback(
    (index: number, edge: RectEdge, valuePct: number) => {
      const cur = rects[index];
      if (!cur) return;
      const next = setRectEdge(cur, edge, valuePct / 100, MIN_RECT_SIDE);
      setRects(rects.map((r, i) => (i === index ? next : r)));
      announce(rectLabel(index, next));
    },
    [announce, rects],
  );

  const addRect = useCallback(
    (rect: RedactRect) => {
      const next = [...rects, rect];
      setRects(next);
      setSelected(next.length - 1);
      announce(`已新增。${rectLabel(next.length - 1, rect)}。当前共 ${next.length} 个遮盖框。`);
    },
    [announce, rects],
  );

  const deleteRect = useCallback(
    (index: number) => {
      const out = rects.filter((_, i) => i !== index);
      setRects(out);
      setSelected((s) => Math.max(0, Math.min(s, out.length - 1)));
      announce(`已删除遮盖区 ${index + 1}。当前共 ${out.length} 个遮盖框。`);
    },
    [announce, rects],
  );

  const applyPreset = useCallback(
    (fraction: number) => {
      const rect = topBandRect(fraction);
      const out = rects.length > 0 ? [rect, ...rects.slice(1)] : [rect];
      setRects(out);
      setSelected(0);
      announce(`已套用预设。${rectLabel(0, rect)}`);
    },
    [announce, rects],
  );

  const onCropEdge = useCallback(
    (_index: number, edge: RectEdge, valuePct: number) => {
      const next = setRectEdge(crop, edge, valuePct / 100, MIN_CROP_SIDE);
      setCrop(next);
      announce(cropLabel(next));
    },
    [announce, crop],
  );

  const resetCrop = useCallback(() => {
    setCrop(FULL_RECT);
    announce('已取消裁剪，恢复整张图。');
  }, [announce]);

  // ── 指针交互（拖拽路径）。坐标经 pointToUnit 一次性转成归一化，之后不碰像素。 ──
  const onStagePointerDown = useCallback(
    (ev: ReactPointerEvent<HTMLDivElement>) => {
      const stage = stageRef.current;
      if (!stage || busy) return;
      const at = pointToUnit(stage, ev.clientX, ev.clientY);
      const hit = (ev.target as HTMLElement).closest<HTMLElement>('[data-yk-role]');
      const role = hit?.dataset.ykRole;
      const corner = (hit?.dataset.ykCorner ?? 'nw') as RectCorner;
      const index = Number(hit?.dataset.ykIndex ?? -1);

      if (role === 'handle' && index >= 0) {
        dragRef.current = { kind: 'resize', index, corner };
        setSelected(index);
      } else if (role === 'rect' && index >= 0) {
        const start = rects[index];
        if (!start) return;
        dragRef.current = { kind: 'move', index, grab: at, start };
        setSelected(index);
      } else if (role === 'crophandle') {
        dragRef.current = { kind: 'cropresize', corner };
      } else if (role === 'cropbox') {
        dragRef.current = { kind: 'cropmove', grab: at, start: crop };
      } else if (clickMode) {
        // 点击-再点击路径不进拖拽状态机（见 onStagePointerUp）
        dragRef.current = null;
        return;
      } else if (!cropMode) {
        dragRef.current = { kind: 'create', origin: at, moved: false };
      } else {
        return;
      }
      stage.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    },
    [busy, clickMode, crop, cropMode, rects],
  );

  const onStagePointerMove = useCallback((ev: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;
    const at = pointToUnit(stage, ev.clientX, ev.clientY);
    if (drag.kind === 'move') {
      const next = moveRect(drag.start, at.x - drag.grab.x, at.y - drag.grab.y);
      setRects((prev) => prev.map((r, i) => (i === drag.index ? next : r)));
    } else if (drag.kind === 'resize') {
      setRects((prev) =>
        prev.map((r, i) => (i === drag.index ? resizeRectCorner(r, drag.corner, at.x, at.y, MIN_RECT_SIDE) : r)),
      );
    } else if (drag.kind === 'create') {
      drag.moved =
        drag.moved || Math.abs(at.x - drag.origin.x) > CLICK_SLOP || Math.abs(at.y - drag.origin.y) > CLICK_SLOP;
    } else if (drag.kind === 'cropmove') {
      setCrop(moveRect(drag.start, at.x - drag.grab.x, at.y - drag.grab.y));
    } else if (drag.kind === 'cropresize') {
      setCrop((prev) => resizeRectCorner(prev, drag.corner, at.x, at.y, MIN_CROP_SIDE));
    }
  }, []);

  const onStagePointerUp = useCallback(
    (ev: ReactPointerEvent<HTMLDivElement>) => {
      const stage = stageRef.current;
      const drag = dragRef.current;
      if (stage?.hasPointerCapture(ev.pointerId)) stage.releasePointerCapture(ev.pointerId);
      dragRef.current = null;
      if (!stage) return;
      const at = pointToUnit(stage, ev.clientX, ev.clientY);

      if (drag?.kind === 'create') {
        // 位移不足即视为「点击」，不生成一个被 MIN_RECT_SIDE 撑出来的莫名小框
        if (drag.moved) addRect(rectFromPoints(drag.origin, at, MIN_RECT_SIDE));
        return;
      }
      if (drag) {
        // 拖拽**结束**才播报终值（拖拽期间逐帧播报是把读屏淹掉的经典写法）
        if (drag.kind === 'move' || drag.kind === 'resize') {
          const r = rects[drag.index];
          if (r) announce(rectLabel(drag.index, r));
        } else {
          announce(cropLabel(crop));
        }
        return;
      }

      // ── 点击-再点击（SC 2.5.7 的第三条路径：全程无 press-move-release，
      //    覆盖震颤 / 头控 / 眼动 / 开关设备用户） ──
      if (!clickMode || cropMode) return;
      if (!pendingCorner) {
        setPendingCorner(at);
        announce(`已记下第一个角：左 ${pct(at.x)}%，上 ${pct(at.y)}%。再点一次对角完成加框。`);
        return;
      }
      addRect(rectFromPoints(pendingCorner, at, MIN_RECT_SIDE));
      setPendingCorner(null);
      setClickMode(false);
    },
    [addRect, announce, clickMode, crop, cropMode, pendingCorner, rects],
  );

  // ── 预览（R3：展示 toBlob() 产物解码回来的图，不是编辑器画布的实时状态） ──
  const doPreview = useCallback(async () => {
    const file = fileRef.current;
    if (!file) {
      setError(`${FAIL_PREFIX}没有可用的图片。${FAIL_SUFFIX}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const geo = prepareExportGeometry(rects, crop);
      const blob = await exportRedacted(file, { crop: geo.crop, redactions: geo.redactions });
      releasePreview();
      const p = createRedactedPreview(blob);
      previewRef.current = p;
      setPreview(p);
      setDropped(geo.dropped);
      setPhase('preview');
      announce(`已生成预览：${geo.redactions.length} 个遮盖框，约 ${Math.round(blob.size / 1024)} KB。`);
      onPreviewReady?.(blob);
    } catch (e) {
      // ⛔ 这里没有、也绝不允许有 `catch { send(file) }` 之类的兜底（R1a-3）。
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }, [announce, crop, onPreviewReady, rects, releasePreview]);

  const doSend = useCallback(async () => {
    const p = previewRef.current;
    if (!p) return;
    setBusy(true);
    try {
      // 交出去的是**与预览同一个** Blob 实例 → 预览字节 === 上传字节（R3 / V3）
      await onSend(p.blob);
      releaseAll();
      setPhase('pick');
      setImgSize(null);
      setRects([]);
      setCrop(FULL_RECT);
      announce('已发送这张图。');
    } finally {
      setBusy(false);
    }
  }, [announce, onSend, releaseAll]);

  const doCancel = useCallback(() => {
    releaseAll();
    setPhase('pick');
    setImgSize(null);
    setRects([]);
    setCrop(FULL_RECT);
    setError(null);
    onCancel?.();
  }, [onCancel, releaseAll]);

  // ─────────────────────────── 渲染 ───────────────────────────

  const shades: { key: string; style: CSSProperties }[] = cropMode
    ? [
        { key: 't', style: { left: 0, top: 0, width: '100%', height: `${crop.y * 100}%` } },
        {
          key: 'b',
          style: {
            left: 0,
            top: `${(crop.y + crop.h) * 100}%`,
            width: '100%',
            height: `${(1 - crop.y - crop.h) * 100}%`,
          },
        },
        {
          key: 'l',
          style: { left: 0, top: `${crop.y * 100}%`, width: `${crop.x * 100}%`, height: `${crop.h * 100}%` },
        },
        {
          key: 'r',
          style: {
            left: `${(crop.x + crop.w) * 100}%`,
            top: `${crop.y * 100}%`,
            width: `${(1 - crop.x - crop.w) * 100}%`,
            height: `${crop.h * 100}%`,
          },
        },
      ]
    : [];

  const cropped = crop.w < 1 || crop.h < 1;

  return (
    <section className={`yk-redact${className ? ` ${className}` : ''}`} aria-label={TXT.title}>
      <style>{REDACT_EDITOR_CSS}</style>

      <header>
        <h2 className="yk-redact__title">{TXT.title}</h2>
        <p className="yk-redact__hint">{TXT.hint}</p>
        {/* R6a-4：这句不能删、不能软化。它是本组件对全盲用户唯一诚实的地方。 */}
        <p className="yk-redact__note">
          {TXT.presetHonesty}{' '}
          <a className="yk-redact__link" href={manualEntryHref}>
            {TXT.manualEntry}
          </a>
        </p>
        <p className="yk-redact__note">{TXT.exifNote}</p>
      </header>

      {error ? (
        <p className="yk-redact__error" role="alert">
          {error}{' '}
          <a className="yk-redact__link" href={manualEntryHref}>
            {TXT.manualEntry}
          </a>
        </p>
      ) : null}

      <input
        ref={inputRef}
        className="yk-redact__filepick"
        type="file"
        accept="image/*"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => void onPick(e)}
      />

      {phase === 'pick' ? (
        <div className="yk-redact__toolbar">
          <button
            ref={pickBtnRef}
            type="button"
            className="yk-redact__btn yk-redact__btn--primary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? TXT.busy : TXT.pick}
          </button>
          {onCancel ? (
            <button type="button" className="yk-redact__btn" onClick={doCancel}>
              {TXT.cancel}
            </button>
          ) : null}
        </div>
      ) : null}

      {phase === 'edit' && imgSize ? (
        <>
          <div className="yk-redact__toolbar">
            <button ref={editFirstBtnRef} type="button" className="yk-redact__btn" onClick={() => addRect(NEW_RECT)}>
              {TXT.addRect}
            </button>
            <button
              type="button"
              className="yk-redact__btn"
              aria-pressed={clickMode}
              onClick={() => {
                setClickMode((v) => !v);
                setPendingCorner(null);
                setCropMode(false);
              }}
            >
              {clickMode && pendingCorner ? TXT.clickClickOn : TXT.clickClick}
            </button>
            <button type="button" className="yk-redact__btn" onClick={() => applyPreset(0.25)}>
              {TXT.preset25}
            </button>
            <button type="button" className="yk-redact__btn" onClick={() => applyPreset(0.33)}>
              {TXT.preset33}
            </button>
            <button
              type="button"
              className="yk-redact__btn"
              aria-pressed={cropMode}
              onClick={() => {
                setCropMode((v) => !v);
                setClickMode(false);
                setPendingCorner(null);
              }}
            >
              {cropMode ? TXT.cropOff : TXT.cropOn}
            </button>
            {cropped ? (
              <button type="button" className="yk-redact__btn" onClick={resetCrop}>
                {TXT.cropReset}
              </button>
            ) : null}
            <button type="button" className="yk-redact__btn" onClick={() => inputRef.current?.click()}>
              {TXT.repick}
            </button>
          </div>

          {clickMode ? <p className="yk-redact__note">{TXT.clickClickHint}</p> : null}
          {cropMode ? <p className="yk-redact__note">{TXT.cropHint}</p> : null}
          {rects.length === 0 ? <p className="yk-redact__note yk-redact__note--caution">{TXT.noRect}</p> : null}

          <div className="yk-redact__stagewrap">
            <div
              ref={stageRef}
              className="yk-redact__stage"
              onPointerDown={onStagePointerDown}
              onPointerMove={onStagePointerMove}
              onPointerUp={onStagePointerUp}
              onPointerCancel={onStagePointerUp}
            >
              <canvas
                ref={canvasRef}
                className="yk-redact__canvas"
                width={imgSize.w}
                height={imgSize.h}
                role="img"
                aria-label={TXT.canvasAlt}
              />

              {/* 遮盖框叠层 —— 仅供操作与「所见即所发」的视觉对齐；导出不读 DOM（R1 陷阱 1） */}
              {rects.map((r, i) => (
                <div
                  key={i}
                  data-yk-role="rect"
                  data-yk-index={i}
                  className={`yk-redact__rect${i === selected ? ' yk-redact__rect--selected' : ''}`}
                  style={rectStyle(r)}
                  role="group"
                  aria-roledescription="遮盖框"
                  aria-label={rectLabel(i, r)}
                >
                  <span className="yk-redact__rect__tag" aria-hidden="true">
                    {i + 1}
                  </span>
                  {CORNERS.map((c) => (
                    <span
                      key={c}
                      aria-hidden="true"
                      data-yk-role="handle"
                      data-yk-index={i}
                      data-yk-corner={c}
                      className={`yk-redact__handle yk-redact__handle--${c}`}
                    />
                  ))}
                </div>
              ))}

              {cropMode ? (
                <>
                  {shades.map((s) => (
                    <div key={s.key} className="yk-redact__shade" style={s.style} />
                  ))}
                  <div
                    data-yk-role="cropbox"
                    className="yk-redact__cropbox"
                    style={rectStyle(crop)}
                    role="group"
                    aria-roledescription="裁剪框"
                    aria-label={cropLabel(crop)}
                  >
                    {CORNERS.map((c) => (
                      <span
                        key={c}
                        aria-hidden="true"
                        data-yk-role="crophandle"
                        data-yk-corner={c}
                        className={`yk-redact__handle yk-redact__handle--${c}`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* ── SC 2.5.7 的非拖拽等价路径。ARIA 没有二维选区 pattern → 四个一维 slider ── */}
          <h3 className="yk-redact__field__name">{cropMode ? TXT.fieldsCrop : TXT.fieldsRedact}</h3>
          <ul className="yk-redact__fields">
            {cropMode ? (
              <RectFields
                index={0}
                rect={crop}
                selected
                kind="裁剪框"
                slug="crop"
                minSide={MIN_CROP_SIDE}
                removeLabel={TXT.cropReset}
                onEdge={onCropEdge}
                onFocus={() => undefined}
                onRemove={resetCrop}
              />
            ) : (
              rects.map((r, i) => (
                <RectFields
                  key={i}
                  index={i}
                  rect={r}
                  selected={i === selected}
                  kind="遮盖框"
                  slug="rect"
                  minSide={MIN_RECT_SIDE}
                  removeLabel={TXT.delete}
                  onEdge={onEdge}
                  onFocus={setSelected}
                  onRemove={deleteRect}
                />
              ))
            )}
          </ul>

          <div className="yk-redact__toolbar">
            <button
              ref={previewBtnRef}
              type="button"
              className="yk-redact__btn yk-redact__btn--primary"
              disabled={busy}
              onClick={() => void doPreview()}
            >
              {busy ? TXT.busy : TXT.preview}
            </button>
            <button type="button" className="yk-redact__btn" onClick={doCancel}>
              {TXT.cancel}
            </button>
          </div>
        </>
      ) : null}

      {phase === 'preview' && preview ? (
        <>
          <p className="yk-redact__confirm">{TXT.confirm}</p>
          {dropped > 0 ? <p className="yk-redact__note yk-redact__note--caution">{TXT.dropped}</p> : null}
          <div className="yk-redact__previewwrap">
            {/* R3：src 是导出 blob 的 object URL —— 这张 <img> 里的像素**就是**要发出去的字节。 */}
            <img
              className={`yk-redact__previewimg${previewZoom ? ' yk-redact__previewimg--zoom' : ''}`}
              src={preview.url}
              alt={TXT.previewAlt}
            />
          </div>
          <p className="yk-redact__meta">
            {preview.blob.type} · {Math.round(preview.blob.size / 1024)} KB
          </p>
          <div className="yk-redact__toolbar">
            <button
              ref={sendBtnRef}
              type="button"
              className="yk-redact__btn yk-redact__btn--primary"
              disabled={busy}
              onClick={() => void doSend()}
            >
              {busy ? TXT.busy : TXT.send}
            </button>
            <button
              type="button"
              className="yk-redact__btn"
              aria-pressed={previewZoom}
              onClick={() => setPreviewZoom((v) => !v)}
            >
              {previewZoom ? TXT.zoomOut : TXT.zoomIn}
            </button>
            <button
              type="button"
              className="yk-redact__btn"
              onClick={() => {
                backFromPreviewRef.current = true;
                releasePreview();
                setPhase('edit');
              }}
            >
              {TXT.back}
            </button>
          </div>
        </>
      ) : null}

      <div className="yk-redact__srstatus" role="status" aria-live="polite">
        {live}
      </div>
    </section>
  );
}
