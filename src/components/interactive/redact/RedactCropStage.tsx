/**
 * RedactCropStage —— 裁剪舞台（`react-easy-crop` 适配层）
 *
 * SPEC: docs/specs/ai-chat-image-input.md T1 / T7（owner 已批准新增该运行时依赖）、
 *       §4.4a（裁剪是**正确性**前提：整页 A4 137 ppi vs 裁到表格区 406 ppi）、
 *       §3.2 R6 / SC 2.5.7、§10.1（旋转已裁掉，见下「三」）
 *
 * 引入它的**唯一**理由是双指缩放：手机拍化验单必然要放大对齐表格行，而手写矩形框
 * 做不出可用的 pinch。除此之外的一切（遮盖矩形层、导出管线、坐标契约）都不动。
 *
 * ┌ 一、坐标契约：**不新增第二个坐标空间**（本文件最重要的一条）
 * │ 库的 `croppedAreaPercentages` 是「相对媒体元素的百分比」。喂给它的 <img> 是
 * │ **已摆正整幅图**的等比缩放件（见二），所以 percentages / 100 就是编辑器既有的
 * │ 「已摆正整幅图归一化 [0,1]」空间 —— 除以 100 之外没有任何换算，导出前照旧只经
 * │ `toCropSpace()` 转一次。
 * │ 库内部的 `pan(px)` / `zoom` / `cropSize(px)` **不是**坐标空间，是显示状态：
 * │ 它们不参与几何真值，每次都由归一化 rect 现算（computeView），也随时可被 rect 覆盖。
 * │ → R1 陷阱 4 的根因（存在两个空间可供混用）没有被引入。
 * └
 *
 * ┌ 二、为什么喂给库的是 canvas 重编码的显示副本，而不是原 File 的 object URL
 * │ 库内部用 `<img src>` 显示，而 `<img>` 的方向语义有一条隐蔽分叉（csswg-drafts#4666
 * │ 至今 open）：全局 CSS 的 `image-orientation: none` 会让 Chrome 按存储像素躺倒显示、
 * │ Safari 仍摆正。用户于是在**一张躺倒的图**上取景，而导出走 `createImageBitmap`
 * │ （永远摆正）—— 裁剪区整体错位，且失败是静默的。
 * │ 解法：显示副本由编辑器的显示 canvas（内容来自 createImageBitmap，已摆正）重编码，
 * │ **不含 EXIF**，于是 `image-orientation` 取任何值都是恒等变换。
 * │ 该副本只用于显示，没有导出管线的 brand，结构上进不了上传路径。
 * └
 *
 * ┌ 三、反旋转（§10.1 已裁决删除「旋转 90°」）
 * │ 库的 `onPinchMove` / `onGestureChange` 会顺手算双指旋转并调 `onRotationChange`。
 * │ **我们不传这个回调**，并把 `rotation` 恒钉 0 —— 双指拧动只缩放、不旋转。
 * │ 旋转一旦进来，摆正基准就不再唯一，遮盖坐标与导出坐标会分叉。
 * └
 *
 * ┌ 四、与库的更新时序契约（**改本文件前必读**，这里踩过三次）
 * │ 库的 `componentDidUpdate` 是一条 if / else-if 链，一次 props 更新**只走一个分支**：
 * │     rotation → aspect → objectFit → zoom → cropSize → crop
 * │ 于是有两条硬纪律：
 * │
 * │ 1. **`aspect` 必须是常量。** 它只在 mediaSize 就位前给库一个临时取景框；一旦按 rect
 * │    现算，rect 一变就抢在 cropSize 之前触发 `computeSizes`（用**旧** cropSize），
 * │    随后带 cropSize 的那次更新又被 zoom 分支吃掉 → 库用旧 cropSize + 新 zoom 算
 * │    croppedArea，emit 出一个谁都没要过的裁剪区。
 * │ 2. **同步时绝不改 `zoom`。** zoom 分支排在 cropSize 前面，同时改就走不到
 * │    `computeSizes`，state.cropSize 停在旧值 —— 取景框不动，emit 也错。
 * │    所以「滑块改裁剪区」= 只改 cropSize + pan（zoom 保持用户当前倍数）；
 * │    「双指 / 缩放滑块」= 只改 zoom（cropSize 不动）。两条路径正交，互不打扰。
 * │
 * │ 再加上「预补偿 pan 重标定」与「同步在途丢弃过渡 emit」（各见其注释），同步才是
 * │ 不动点：库最终 emit 的裁剪区 === 外部写入的那一个。
 * │ 不是不动点的后果实测过两种：改「高」把「上」一点点带着漂移；以及两边互相纠正
 * │ 触发 React「Maximum update depth exceeded」，整棵编辑器树被卸载（滑块凭空消失）。
 * └
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { getInitialCropFromCroppedAreaPercentages } from 'react-easy-crop';
import type { Area, MediaSize, Point, Size } from 'react-easy-crop';
import type { RedactRect } from './exportRedacted';
import { MIN_CROP_SIDE, clampRect, pct } from './redactGeometry';

/** rect 相等判据。比 round4（1e-4）松一档，用来吸收库那侧的浮点尘。 */
const RECT_EPS = 5e-4;
/** pan 回声判据（CSS px）。库的重标定是纯乘法，误差远小于这个值。 */
const PAN_EPS = 0.5;
/** 首次同步前的默认放大倍数 */
const FIRST_ZOOM = 1;
/** 同步在途的看门狗（ms）。只在库行为异常时才会触发，见 watchdogRef。 */
const SYNC_WATCHDOG_MS = 300;

function sameRect(a: RedactRect, b: RedactRect): boolean {
  return (
    Math.abs(a.x - b.x) < RECT_EPS &&
    Math.abs(a.y - b.y) < RECT_EPS &&
    Math.abs(a.w - b.w) < RECT_EPS &&
    Math.abs(a.h - b.h) < RECT_EPS
  );
}

interface View {
  /** 传给库的媒体平移量（px）。同步时是**预补偿后**的值，见 syncFromRect。 */
  pan: Point;
  /** 放大倍数。只由用户改（双指 / 缩放滑块），同步时原样保留（头注四·2）。 */
  zoom: number;
  /** 取景框像素尺寸。由归一化 rect × 当前 zoom 现算 → 框的形状恒等于裁剪区形状。 */
  cropSize: Size;
  minZoom: number;
  maxZoom: number;
  /**
   * 本次同步**想要**的裁剪区（= 外部写入的真值）。非 null 期间称「同步在途」。
   * 只有 syncFromRect 设它；库确认到位、或用户开始新交互时清掉。
   * 存在理由：预补偿期 `pan` 故意不是最终值，libRect(view) 此时算不出真值。
   */
  intended: RedactRect | null;
  /**
   * 同步在途时**预测**库重标定后会落到的 pan。
   * 用来区分「库的重标定回声」（不能清 intended）与「用户真的在拖」（必须清，
   * 否则用户动作会被当成回声丢掉）。
   */
  expectPan: Point | null;
  /**
   * 此刻库 emit 出来的裁剪区是否可信（= 代表一次真实的状态变化）。
   *
   * 只有用户/库自发改了 pan 或 zoom 才为 true。同步期间为 false，因为库会把**同一个**
   * 裁剪区连发两次（recomputeCropPosition 的 emitCropData + pan 落地后的
   * emitCropAreaChange）。第一次用来确认同步到位，第二次要是也进真值，就会把用户
   * 在途期间按出来的更新值**回滚**回去 —— 表现为「按住方向键掉步」，并与滑块互相
   * 纠正到 React「Maximum update depth exceeded」。实测踩过。
   */
  trustEmits: boolean;
}

/**
 * 归一化 rect（+ 当前 zoom）→ 库的显示状态。**本文件唯一需要正确性论证的函数。**
 *
 * 取 cropSize = zoom·(rect.w·mediaW, rect.h·mediaH)，则库的
 *   width%  = cropSize.w / mediaW / zoom = rect.w
 *   height% = cropSize.h / mediaH / zoom = rect.h
 * （公式见库的 computeCroppedArea）。于是「取景框形状 === 裁剪区形状」恒成立，
 * 不需要库的 `aspect` 锁 —— 那会把裁剪区锁成固定比例，等于砍掉四个滑块的自由度。
 *
 * 缩放边界也由此闭式给出，避免用户拖到「取景框比图还大」或「裁剪区短边小于
 * MIN_CROP_SIDE」这两种会被 clampRect 静默改写的状态（静默改写 = 屏上看到的与实际
 * 导出的不一致）：
 *   下界 max(rect.w, rect.h)·zoom            → 该 zoom 处长边刚好占满整幅图
 *   上界 min(rect.w, rect.h)·zoom / MIN_CROP_SIDE → 该 zoom 处短边刚好等于下限
 */
function computeView(rect: RedactRect, media: MediaSize, zoom: number): View {
  const cropSize: Size = { width: zoom * rect.w * media.width, height: zoom * rect.h * media.height };
  const minZoom = zoom * Math.max(rect.w, rect.h);
  const maxZoom = Math.max(minZoom, (zoom * Math.min(rect.w, rect.h)) / MIN_CROP_SIDE);
  const { crop: pan } = getInitialCropFromCroppedAreaPercentages(
    { x: rect.x * 100, y: rect.y * 100, width: rect.w * 100, height: rect.h * 100 },
    media,
    0,
    cropSize,
    minZoom,
    maxZoom,
  );
  return { pan, zoom, cropSize, minZoom, maxZoom, intended: rect, expectPan: pan, trustEmits: false };
}

/**
 * computeView 的**逆**：库当前显示状态 → 它此刻会 emit 的裁剪区。
 *
 * 与库的 `computeCroppedArea` 同一组公式（rotation 恒 0，故省掉 rotateSize）。
 * 存在意义：判断「库是否已经在真值上」不能依赖回调到达顺序 —— 库一次更新会连发多条
 * croppedArea，按「最后一条」判断会把先到的那条误判成外部写入 → 自激。
 */
function libRect(v: View, media: MediaSize): RedactRect {
  return clampRect(
    {
      x: (media.width - v.cropSize.width / v.zoom) / 2 / media.width - v.pan.x / v.zoom / media.width,
      y: (media.height - v.cropSize.height / v.zoom) / 2 / media.height - v.pan.y / v.zoom / media.height,
      w: v.cropSize.width / media.width / v.zoom,
      h: v.cropSize.height / media.height / v.zoom,
    },
    MIN_CROP_SIDE,
  );
}

export interface RedactCropStageProps {
  /** 显示副本的 object URL（已摆正、无 EXIF，见头注二）。 */
  imageUrl: string;
  /** 裁剪区（归一化全图空间）—— 唯一真值，由父组件持有。 */
  rect: RedactRect;
  /**
   * 已摆正整幅图的宽高比（w/h）。**必须是常量**（头注四·1）。
   * 只在 mediaSize 就位前用：库要有 aspect 才画得出第一个取景框，而 cropSize 又必须
   * 等 mediaSize 才能算 —— 首帧不渲染 Cropper 会死锁（取景框永远不出现）。
   */
  imageAspect: number;
  /** 交互产生的新裁剪区。父组件必须把它写回 state（受控）。 */
  onRect: (next: RedactRect) => void;
  /** 一次交互结束（松手 / 松开双指 / 松开方向键）。父组件用来做 aria-live 播报。 */
  onSettle?: () => void;
  /** 取景框的可读名（含数值）。 */
  label: string;
  /** 缩放滑块的可见标签。 */
  zoomLabel: string;
  /** 缩放滑块的读屏播报文本。 */
  zoomSpoken: (zoom: number, rect: RedactRect) => string;
}

export default function RedactCropStage({
  imageUrl,
  rect,
  imageAspect,
  onRect,
  onSettle,
  label,
  zoomLabel,
  zoomSpoken,
}: RedactCropStageProps) {
  const mediaRef = useRef<MediaSize | null>(null);
  /** 显示状态的**同步**副本：syncFromRect 要读上一次的 cropSize/zoom，等不了 state 落地。 */
  const viewRef = useRef<View | null>(null);
  const [view, setView] = useState<View | null>(null);
  /** 媒体尺寸变化（首帧就位 / 容器 resize / 旋屏）的重算信号 */
  const [geomEpoch, setGeomEpoch] = useState(0);

  /**
   * 同步在途看门狗。
   * 正常路径下同步会在同一批更新里完成（库 emit 出 intended → 接受 → 清 intended）。
   * 万一库改了行为、那条 emit 永不到来，没有看门狗的话取景框会**永久**停在旧状态，
   * 而滑块仍在动 —— 屏上看到的与真值不一致，属于必须避免的静默失败。
   */
  const watchdogRef = useRef<number | null>(null);

  const applyView = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
  }, []);

  const syncFromRect = useCallback(
    (r: RedactRect) => {
      const media = mediaRef.current;
      if (!media || !(media.width > 0 && media.height > 0)) return;
      const prev = viewRef.current;
      const next = computeView(r, media, prev?.zoom ?? FIRST_ZOOM);

      /**
       * ⚠️ 预补偿库的 pan 重标定（react-easy-crop 6.2 `recomputeCropPosition`）：
       * cropSize 变化时，库会把传入的 pan 乘以 `newCropSize / previousCropSize` 再用。
       * 不补偿 → 同步进去的 rect 与库随后 emit 的不相等 → 不是不动点 → 改「高」会把
       * 「上」一点点带着走，几十次方向键后裁剪区明显下漂。
       * 这里先除以同一比值，让库的重标定正好落回我们要的 pan（记在 expectPan）。
       *
       * 这是对库内部行为的依赖，所以有专门的回归断言钉住：
       * tests/redact-crop.spec.ts「只改高不会把上一起带偏」。库改语义那条会红。
       */
      let pan = next.pan;
      if (
        prev &&
        (Math.abs(prev.cropSize.width - next.cropSize.width) > 1e-6 ||
          Math.abs(prev.cropSize.height - next.cropSize.height) > 1e-6)
      ) {
        pan = {
          x: next.pan.x * (prev.cropSize.width / next.cropSize.width),
          y: next.pan.y * (prev.cropSize.height / next.cropSize.height),
        };
      }
      if (watchdogRef.current !== null) window.clearTimeout(watchdogRef.current);
      watchdogRef.current = window.setTimeout(() => {
        watchdogRef.current = null;
        const v = viewRef.current;
        // 超时即认输：把控制权交回库（trustEmits），宁可让真值跟着库走，也不要卡住不动
        if (v?.intended) applyView({ ...v, intended: null, expectPan: null, trustEmits: true });
      }, SYNC_WATCHDOG_MS);
      applyView({ ...next, pan });
    },
    [applyView],
  );

  useEffect(
    () => () => {
      if (watchdogRef.current !== null) window.clearTimeout(watchdogRef.current);
    },
    [],
  );

  /** 库算出的媒体显示尺寸。每次 computeSizes 都回调，因此它也承担容器 resize。 */
  const onMediaSize = useCallback((media: MediaSize) => {
    const prev = mediaRef.current;
    mediaRef.current = media;
    if (!prev || Math.abs(prev.width - media.width) > 0.5 || Math.abs(prev.height - media.height) > 0.5) {
      setGeomEpoch((v) => v + 1);
    }
  }, []);

  /**
   * 外部写入（滑块 / 预设 / 取消裁剪 / 首帧就位 / resize）→ 推回库。
   *
   * ⚠️ **同一时刻只允许一次同步在途**（实测踩出来的）：按住方向键连发时，若在上一次
   * 同步还没被库确认时就发起下一次，上一次的 pan 回声会与新的 expectPan 对不上 →
   * 被误判成「用户在拖」→ 过渡态 emit 被当成真值 → 两边互相纠正 → React
   * 「Maximum update depth exceeded」，整棵编辑器树卸载。
   * 在途时直接返回即可，不需要队列：本 effect 依赖 `view`，同步一结束就会再跑一次，
   * 那时读到的 props.rect 就是最新值。
   */
  useEffect(() => {
    const media = mediaRef.current;
    const v = viewRef.current;
    if (v && media) {
      // 同步在途看 intended，稳态看现算的 libRect —— 任一命中即「库已经在真值上」
      if (v.intended && sameRect(v.intended, rect)) return;
      if (v.intended) return;
      if (sameRect(libRect(v, media), rect)) return;
    }
    syncFromRect(rect);
  }, [rect, view, geomEpoch, syncFromRect]);

  /** 用户开始新交互 → 同步在途状态作废，且从此刻起库的 emit 可信。 */
  const dropIntent = useCallback(() => {
    const v = viewRef.current;
    if (v && (v.intended || v.expectPan || !v.trustEmits)) {
      applyView({ ...v, intended: null, expectPan: null, trustEmits: true });
    }
  }, [applyView]);

  /**
   * 库 → 真值。百分比除以 100 就是既有归一化空间。
   *
   * 同步在途时要丢掉**过渡态** emit：预补偿的 pan 会让库先 emit 一个「按补偿前 pan
   * 算出来的」裁剪区，那不是任何人要的状态；让它进真值就会与同步互相纠正 → 自激。
   * 只接受与 intended 相等的那一次，接受即同步结束。
   */
  const onCropAreaChange = useCallback(
    (area: Area) => {
      const next = clampRect(
        { x: area.x / 100, y: area.y / 100, w: area.width / 100, h: area.height / 100 },
        MIN_CROP_SIDE,
      );
      const v = viewRef.current;
      if (v?.intended) {
        if (!sameRect(v.intended, next)) return;
        // 同步完成：**不回写** onRect。intended 本来就是从真值来的，而在途期间用户可能
        // 又按了几下方向键 —— 回写等于把更新的值回滚，表现为「按住方向键掉步」。
        applyView({ ...v, intended: null, expectPan: null });
        return;
      }
      // 同步刚结束、用户又没动 → 这是库把同一个裁剪区连发的第二次，丢掉（见 trustEmits）
      if (v && !v.trustEmits) return;
      onRect(next);
    },
    [applyView, onRect],
  );

  return (
    <div className="yk-redact__cropstage" data-yk-cropstage="ready">
      <Cropper
        image={imageUrl}
        crop={view?.pan ?? { x: 0, y: 0 }}
        zoom={view?.zoom ?? FIRST_ZOOM}
        cropSize={view?.cropSize}
        minZoom={view?.minZoom ?? FIRST_ZOOM}
        maxZoom={view?.maxZoom ?? FIRST_ZOOM / MIN_CROP_SIDE}
        /* 常量！按 rect 现算会破坏库的更新时序（头注四·1）。只在 cropSize 就位前生效。 */
        aspect={imageAspect}
        /* §10.1：旋转已删除 —— rotation 恒 0 且不传 onRotationChange。 */
        rotation={0}
        objectFit="contain"
        showGrid
        restrictPosition
        /* 滚轮缩放关掉：页面滚过取景框会变成「悄悄改了裁剪区」，而裁剪区是正确性量
           （§4.4a）。缩放只走双指与缩放滑块两条显式路径。 */
        zoomWithScroll={false}
        onCropChange={(pan) => {
          const v = viewRef.current;
          if (!v) return;
          const echo =
            v.expectPan !== null &&
            Math.abs(pan.x - v.expectPan.x) < PAN_EPS &&
            Math.abs(pan.y - v.expectPan.y) < PAN_EPS;
          applyView(
            echo ? { ...v, pan, expectPan: null } : { ...v, pan, intended: null, expectPan: null, trustEmits: true },
          );
        }}
        onZoomChange={(zoom) => {
          const v = viewRef.current;
          if (v) applyView({ ...v, zoom, intended: null, expectPan: null, trustEmits: true });
        }}
        onCropAreaChange={onCropAreaChange}
        onInteractionStart={dropIntent}
        onInteractionEnd={() => onSettle?.()}
        setMediaSize={onMediaSize}
        classes={{
          containerClassName: 'yk-redact__cropbox',
          mediaClassName: 'yk-redact__cropmedia',
          cropAreaClassName: 'yk-redact__cropframe',
        }}
        /* 取景框是库渲染的 div（tabIndex=0 + 方向键平移）。给它可读名与角色描述，
           否则键盘用户会 Tab 到一个无名可聚焦元素。 */
        cropperProps={{ 'aria-label': label, 'aria-roledescription': '裁剪取景框' }}
        mediaProps={{ alt: '' }}
      />
      {view ? (
        <div className="yk-redact__zoomrow">
          <label className="yk-redact__slider__label" htmlFor="yk-redact-crop-zoom">
            {zoomLabel}
          </label>
          <input
            id="yk-redact-crop-zoom"
            type="range"
            min={view.minZoom}
            max={view.maxZoom}
            step={0.01}
            value={view.zoom}
            aria-valuetext={zoomSpoken(view.zoom, rect)}
            onChange={(e) => {
              const zoom = Number(e.target.value);
              const v = viewRef.current;
              // 只改 zoom，不动 cropSize（头注四·2）：库走 zoom 分支重算裁剪区
              if (v) applyView({ ...v, zoom, intended: null, expectPan: null, trustEmits: true });
            }}
            onPointerUp={() => onSettle?.()}
            onKeyUp={() => onSettle?.()}
          />
          <span className="yk-redact__slider__value" aria-hidden="true">
            {view.zoom.toFixed(2)}×
          </span>
        </div>
      ) : null}
      <p className="yk-redact__cropreadout" aria-hidden="true">
        {`宽 ${pct(rect.w)}% · 高 ${pct(rect.h)}%`}
      </p>
    </div>
  );
}
