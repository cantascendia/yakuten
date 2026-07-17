# SPEC: 绯英典籍 v2 的医学逻辑复用

- **状态**: 待双签（CONSTITUTION §4）
- **日期**: 2026-07-17
- **触及**: 血检判定算法、注射剂量↔浓度换算
- **关联 PR**: `feat/v2-sakura-journal-rebuild`
- **为什么需要本文档**: CONSTITUTION §1 —— 「血检算法 / 注射计算器修改必须
  spec-driven + 双 reviewer 签字（见 §4）」

---

## 1. 背景

设计交付包 `design_handoff_site_full/` 是 hrtyaku.com 全站重设计的高保真原型
（樱粉手账 / 绯英典籍 v2）。本次任务是把它 1:1 重建为 `/zh/v2/*` 下的 13 个真实路由。

原型的 13 屏中有两屏含医学计算逻辑：**血检 HUD** 与 **注射计算器**。
原型的 README 建议「逻辑照抄 JSX 内的计算函数」。

**本 SPEC 的结论是：这两屏的计算逻辑不能照抄。** 理由与替代方案见下。

---

## 2. 血检 HUD

### 2.1 问题

原型 `blood-checker-screen.jsx:13-32` 内联了自己的一套阈值与判定：

```js
const ranges = [ /* 5 项：e2 / t / prl / alt / k */ ];
const grade = (r) => {
  const v = vals[r.id];
  if (v > r.red) return ['red', '停药就医', ...];      // ← 只判上限
  if (v >= r.green[0] && v <= r.green[1]) return ['green', ...];
  for (const [lo, hi] of r.yellow) if (v >= lo && v <= hi) return ['yellow', ...];
  return ['yellow', '偏离', ...];                       // ← 兜底
};
```

与仓库既有的权威来源（`src/components/interactive/BloodTestChecker.tsx`，
classic 血检工具在用）对照：

| 差异点 | 原型 | 仓库 SSOT | 后果 |
|---|---|---|---|
| E2 下限红区 | 无 | `redBelow: 20` | **E2=10 原型判「注意」，SSOT 判「红区」** |
| Hb 下限红区 | 无该指标 | `redBelow: 110` | 贫血漏判 |
| 指标数 | 5 | **7**（多 `hb`、`ddimer`） | **D-二聚体是血栓标志物**，VTE 是本站头号风险 |
| 红区文案 | 通用一句「停药并尽快就医」 | `RED_WARNINGS` 逐指标 × 四语 | 丢失「高钾血症可能危及生命」这类指标特异信息 |

### 2.2 判定依据

CONSTITUTION §1 原文：

> 任何代码 / 内容 / 设计决策若可能造成用户身体伤害（**剂量计算错误**、危险药物组合
> 提示不显、紧急横幅被淡化、医疗免责声明被弱化），**直接否决**，无 PR 妥协空间。

原型的 `grade()` 会把 E2=10 判成「注意」而非红区 —— 正落在这一条上。
**设计文档管不到医学正确性。**

### 2.3 方案

给 `BloodTestChecker.tsx` 的以下符号加 `export`，v2 血检屏 import 同一份：

- `RangeSpec`（interface）
- `BLOOD_RANGES`（7 项阈值）
- `RED_WARNINGS`（四语急救文案）
- `Level`（type）
- `evaluate()`（判定）
- `barBounds()` / `pct()`（刻度域）

**diff 保值性**：7 行改动，每行**只在行首增加 `export ` 前缀**，
零逻辑改动、零数值改动、行尾（CRLF）原样保留。可用 `git diff` 逐行验证。

**为什么不抽取到 `src/lib/`**：先尝试过，会移动约 120 行代码、并改动一个
17 语种生产页面在用的 §1 保护组件。为「复用阈值」这个目的，风险收益不成比例。
加 `export` 让 SSOT **位置不变**，原注释「调整阈值请改这里」继续成立。

**为什么不用 `src/data/blood-ranges.json`**：该文件当前不被任何运行时代码消费
（仅作文档/规格参考），且不含四语 `RED_WARNINGS`。`BloodTestChecker.tsx` 里的
既有注释已明确说明：把安全阈值挪去那份 JSON 会丢失 en/ja/ko 急救提示，属 P0
i18n 安全回归。本 SPEC 尊重该既有决策。

**为什么不在 v2 复制一份**：会造出第二个医学 SSOT，必然漂移 —— 正是 §1 要防的事。

### 2.4 另两处偏离（原型代码与其自身 README 冲突，以 README 为准）

**a) 首屏假警报**

原型 `:9` 默认 `{ e2:128, t:68, prl:22, alt:142, k:4.6 }`，而 ALT 红线是 120
→ `142 > 120` → **每个首次访客一进页面就看到冷判定「1 项危险指标 / 停药并尽快就医」**，
用的是他从未输入过的数字。演示原型无所谓；生产医疗站上这是狼来了，会稀释真实警报的可信度。

→ 改为**空初始值**，有输入才判读。

**b) `yak_blood` localStorage**

原型 `:11` 把血检数值写入 `localStorage['yak_blood']`。但设计包 README 的
「Interactions」段白纸黑字：

> 血检/对比/注射工具输入均为纯前端计算，零上传；**输入值不持久化（隐私）**，对比选择除外。

且 README「State Management」段列出的键只有 `yak_route*` / `yak_theme` /
`yak_phase` / `yak_compare` —— **没有 `yak_blood`**。
即：**原型代码违反了它自己的设计规格**。

同时对照 `CLAUDE.md`：「Blood test tool · classic mode: pure frontend JS,
**zero storage**, zero transmission」。CONSTITUTION §6 允许 localStorage 的是
**具名的** sakura v3.2 血检手账（且配套「清空所有记录」UI），v2 血检 HUD 不是它。

→ **不持久化**。v2 只用 README 列出的三个键：`yak_theme` / `yak_phase` / `yak_compare`。

### 2.5 验证

| 检查 | 结果 |
|---|---|
| 空态无判读 | ✓ |
| **E2=10** | 「偏低就医」+ 冷判定 + 「雌二醇水平异常」急救文案 ✓（原型判「注意」） |
| E2=150 | 「全部在目标范围」✓ |
| 指标数 | 7（含 D-二聚体）✓ |
| `localStorage` | 无 `yak_blood` ✓ |
| classic 工具回归 | `/zh/tools/blood-checker/` 200 ✓ |

---

## 3. 注射计算器

### 3.1 问题

原型 `inject-tool-screen.jsx:16-24`：

```js
const ka = 0.9, ke = Math.log(2) / 4.5, K = 70;
const conc = (t) => {
  let c = 0;
  for (let inj = 0; inj <= t; inj += 7) {
    const dt = t - inj;
    c += K * sel * (Math.exp(-ke*dt) - Math.exp(-ka*dt));
  }
  return c;
};
```

- **形状有据**：原型 `:141` 注明「一室模型示意，半衰期 4.5 天 · 峰值 2–3 天
  (Oriowo 1980)」—— 这是 EV 肌注的经典 PK 文献。`ka`/`ke` 予以保留。
- **绝对值没有**：`K = 70` 是一个**没有出处的缩放常数**，且公式漏掉了 Bateman
  的 `ka/(ka−ke)` 归一化项。

但图上又画着真实的 **「100–200 目标带」** 与 **「300 风险线」**（单位 pg/mL），
等于向用户**声称 y 轴是 pg/mL** —— 于是用户读到的绝对浓度是编出来的。
用户可能据此判断「我这个剂量能不能达标」。

这同时触犯 `DESIGN_SYSTEM.md` 的「🚫 Never」清单：**「无含义装饰数据」**。

### 3.2 方案：用仓库权威数据锚定纵轴

`src/data/injection-doses.json` 的每档剂量都带 `expectedE2Range` —— 真实的、
有来源的预期 E2 **谷值**：

```
1mg → 30-60 pg/mL     4mg → 80-160
2mg → 40-80           5mg → 100-200
3mg → 60-120          7mg → null      10mg → null
```

令曲线的稳态谷值（第 5 针前，t=28d）等于该区间中点，反推缩放系数：

```
scale = troughMidpoint(expectedE2Range) / shape(28)
conc(t) = shape(t) × scale
```

于是：**形状来自文献，绝对值来自数据**，目标带与风险线才真正有意义。

### 3.3 7mg / 10mg：不画曲线

这两档的 `expectedE2Range` 是 `null` —— 因为它们**本就不该被使用**
（10mg 单次是红线禁止，7mg 属高风险）。没有可靠的预期谷值就**不画曲线**，
改为显示「该剂量没有可靠的预期谷值数据」。

**外推一条看起来很像回事的假曲线，比不画更危险。**

同样不写 `yak_inject_mg`（README 的 State Management 段未列该键）。

---

## 4. 影响面

| 文件 | 改动 | 风险 |
|---|---|---|
| `src/components/interactive/BloodTestChecker.tsx` | **+7 个 `export` 关键字** | 极低（可证明保值；classic 工具实测 200） |
| `src/components/v2/screens/BloodCheckerScreen.tsx` | 新增 | v2 预览表面（noindex） |
| `src/components/v2/screens/InjectToolScreen.tsx` | 新增 | 同上 |
| `src/data/*.json` | **零改动** | — |
| `api/**` | **零改动** | — |

`/zh/v2/*` 全部带 `<meta name="robots" content="noindex,follow">` 且已从 sitemap
剔除 —— 属**预览表面**，未对公众索引开放。

---

## 5. 待签字

CONSTITUTION §4 要求 ≥2 独立 reviewer：

- [ ] **Reviewer 1（人 / owner）**：确认 §2.3 的 `export` 方案与 §3.2 的锚定方案
- [ ] **Reviewer 2（跨模型）**：`/cto-cross-review`

### 请重点复核

1. **§2.3** —— 加 `export` vs 抽取到 `src/lib/`，哪个更符合本仓库的长期维护意图？
2. **§3.2** —— 用 `expectedE2Range` 锚定纵轴是否成立？还是宁可**去掉目标带/风险线**、
   把曲线降级为纯相对示意？（后者改动更小但丢失「我的剂量能否达标」这一核心信息）
3. **§2.4a** —— 空初始值 vs 原型的演示默认值。
4. **§3.3** —— 7/10mg 不画曲线，是否可接受？

---

## 6. 后续（不在本 PR）

- `src/data/blood-ranges.json` 与 `BLOOD_RANGES` 目前数值一致但两处维护。
  建议后续统一（需单独 spec，因涉及四语警告的承载位置）。
- v2 转正（四语补齐 + 视觉签字）时，移除 `V2Layout` 的 noindex meta 与
  `inject-sitemap-lastmod.mjs` 的 `EXCLUDED_PREFIXES`。
