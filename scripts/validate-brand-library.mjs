#!/usr/bin/env node
/**
 * validate-brand-library.mjs — 药物图鉴 v2 数据校验
 *
 * SSOT: src/data/brand-library.json
 * 类型: src/components/interactive/brand-library/types.ts
 * SPEC: docs/specs/brand-library-v2.md §4「数据纪律」第 4 条
 *
 * 校验内容：
 *   - 顶层 version === 2、lastReviewed 为 ISO 日期
 *   - ingredients / brands 为非空数组
 *   - 全部枚举字段合法（枚举清单与 types.ts 逐一对齐）
 *   - brand.ingredientId 必须存在于 ingredients
 *   - brand.drugId / ingredient.drugIds / ingredient.primaryDrugId 必须指向真实存在的药物：
 *     drugs.json 的 id **或** drugLinks.ts 的 slug 映射键。
 *     两个 id 宇宙不重合是有意的：drugs.json 是 20 条结构化药物数据（DrugCards 测试锁死条数），
 *     drugLinks.ts 是 25 条「有详情页」的 id。像 flutamide / gnrh-antagonist / mpa /
 *     norethisterone / banned-estrogens 有页面但无 drugs.json 记录，把它们塞进 drugs.json
 *     会打破 critical-paths.spec.ts 的「20 张药物卡」断言。所以这里校验的是
 *     「链接能不能落到真实页面」，而不是「有没有结构化记录」。
 *   - image.src 以 "/" 开头时对应 public/ 下文件必须存在；http(s):// 允许
 *   - appearance.color / secondaryColor 必须是 #RRGGBB
 *   - 每个 ingredient 至少 1 个 brand
 *   - id 全局唯一；plate 在同 category 内唯一
 *   - hrtUse 为 cautioned / banned 时 reason.zh 必填
 *   - confidence 合法
 *
 * 用法：
 *   node scripts/validate-brand-library.mjs                  # 校验 src/data/brand-library.json
 *   node scripts/validate-brand-library.mjs path/to/copy.json # 校验指定文件（用于故意破坏的副本）
 *
 * 退出码：0 = 通过（可能带 warning）；1 = 有 error。
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const argPath = process.argv.slice(2).find((a) => !a.startsWith('-'));
const dataPath = argPath
  ? path.resolve(rootDir, argPath)
  : path.join(rootDir, 'src', 'data', 'brand-library.json');
const drugsPath = path.join(rootDir, 'src', 'data', 'drugs.json');
const drugLinksPath = path.join(rootDir, 'src', 'utils', 'drugLinks.ts');
const publicDir = path.join(rootDir, 'public');

const errors = [];
const warnings = [];

const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// ── 枚举清单（与 types.ts 逐一对齐；改 types.ts 必须同步改这里） ──────────

const INGREDIENT_CATEGORY = ['estrogen', 'antiandrogen', 'gnrh', 'progestogen', '5ari', 'banned'];
const HRT_USE = ['standard', 'situational', 'cautioned', 'banned'];
const BRAND_STATUS = ['prescription', 'otc', 'approved', 'grey', 'discontinued', 'banned', 'cautioned'];
const BRAND_FORM = [
  'tablet', 'capsule', 'softgel', 'patch', 'gel-pump', 'gel-sachet', 'spray',
  'ampoule', 'vial', 'prefilled-syringe', 'implant', 'nasal-spray', 'pessary', 'powder-vial',
];
const TABLET_SHAPE = ['round', 'oval', 'oblong', 'triangle', 'octagon', 'apple', 'square', 'diamond', 'capsule'];
const COATING = ['sugar', 'film', 'none'];
const SCORE = ['none', 'single', 'cross'];
const MARKET_REGION = ['cn', 'tw-hk', 'jp', 'kr', 'sea', 'in', 'eu', 'na', 'oceania', 'latam', 'other'];
const CONFIDENCE = ['verified', 'reported', 'unverified'];
const REGULATORY_AUTHORITY = [
  'NMPA', 'TFDA', 'PMDA', 'MFDS', 'FDA', 'EMA', 'MHRA', 'Swissmedic', 'CDSCO',
  'TGA', 'Medsafe', 'HSA', 'ThaiFDA', 'BPOM', 'COFEPRIS', 'ANVISA', 'other',
];
const IMAGE_KIND = ['photo', 'schematic'];
const COLOR_FAMILY = [
  'white', 'blue', 'yellow', 'pink', 'red', 'orange', 'brown', 'green',
  'purple', 'peach', 'clear', 'multi',
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const ISO_COUNTRY = /^[A-Z]{2}$/;
const HTTP_URL = /^https?:\/\//;

// ── 通用断言 helper ────────────────────────────────────────────────────

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isIsoDate(v) {
  if (!isNonEmptyString(v) || !ISO_DATE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** 枚举字段（必填） */
function checkEnum(where, field, value, allowed) {
  if (!allowed.includes(value)) {
    err(`${where}: ${field} 必须是 ${allowed.join(' | ')}（实际: ${JSON.stringify(value)}）`);
  }
}

/** 枚举字段（可选） */
function checkOptionalEnum(where, field, value, allowed) {
  if (value === undefined) return;
  checkEnum(where, field, value, allowed);
}

/** L10n：zh 必填字符串，en/ja/ko 可选字符串 */
function checkL10n(where, field, value, { required = false } = {}) {
  if (value === undefined) {
    if (required) err(`${where}: 缺少必填字段 ${field}`);
    return;
  }
  if (!isPlainObject(value)) {
    err(`${where}: ${field} 必须是对象 { zh, en?, ja?, ko? }`);
    return;
  }
  if (!isNonEmptyString(value.zh)) {
    err(`${where}: ${field}.zh 必填且必须是非空字符串`);
  }
  for (const k of ['en', 'ja', 'ko']) {
    if (value[k] !== undefined && !isNonEmptyString(value[k])) {
      err(`${where}: ${field}.${k} 如存在必须是非空字符串`);
    }
  }
  for (const k of Object.keys(value)) {
    if (!['zh', 'en', 'ja', 'ko'].includes(k)) {
      warn(`${where}: ${field} 含未知语言键 "${k}"（types.ts L10n 只有 zh/en/ja/ko）`);
    }
  }
}

/** L10nList：zh 必填 string[]，en/ja/ko 可选 string[] */
function checkL10nList(where, field, value) {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    err(`${where}: ${field} 必须是对象 { zh: string[], ... }`);
    return;
  }
  for (const k of ['zh', 'en', 'ja', 'ko']) {
    const list = value[k];
    if (list === undefined) {
      if (k === 'zh') err(`${where}: ${field}.zh 必填且必须是字符串数组`);
      continue;
    }
    if (!Array.isArray(list) || list.length === 0 || !list.every(isNonEmptyString)) {
      err(`${where}: ${field}.${k} 必须是非空字符串数组`);
    }
  }
}

function checkOptionalString(where, field, value) {
  if (value === undefined) return;
  if (!isNonEmptyString(value)) err(`${where}: ${field} 如存在必须是非空字符串`);
}

function checkHexColor(where, field, value) {
  if (value === undefined) return;
  if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
    err(`${where}: ${field} 必须是 #RRGGBB 格式的六位十六进制颜色（实际: ${JSON.stringify(value)}）`);
  }
}

function checkUrl(where, field, value) {
  if (value === undefined) return;
  if (!isNonEmptyString(value) || !HTTP_URL.test(value)) {
    err(`${where}: ${field} 必须是绝对 http(s) URL（实际: ${JSON.stringify(value)}）`);
  }
}

// ── 载入数据 ───────────────────────────────────────────────────────────

async function loadJson(p, label) {
  if (!existsSync(p)) {
    console.error(`品牌图鉴数据校验失败：找不到 ${label} — ${path.relative(rootDir, p)}`);
    process.exit(1);
  }
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch (e) {
    console.error(`品牌图鉴数据校验失败：${label} 不是合法 JSON — ${e.message}`);
    process.exit(1);
  }
}

const data = await loadJson(dataPath, 'brand-library.json');
const drugs = await loadJson(drugsPath, 'drugs.json');
const referencesPath = path.join(rootDir, 'src', 'data', 'references.json');
const referencesRaw = existsSync(referencesPath) ? await loadJson(referencesPath, 'references.json') : [];
const referenceIds = new Set(
  (Array.isArray(referencesRaw) ? referencesRaw : Object.values(referencesRaw ?? {}))
    .map((r) => r?.id)
    .filter(isNonEmptyString)
);

const drugIds = new Set(
  (Array.isArray(drugs) ? drugs : []).map((d) => d?.id).filter(isNonEmptyString)
);
if (drugIds.size === 0) {
  err('drugs.json 未解析出任何 id，无法校验 drugId 引用');
}

/** drugLinks.ts 的 slug 映射：有详情页的 drugId */
let mappedDrugIds = null;
if (existsSync(drugLinksPath)) {
  const src = await readFile(drugLinksPath, 'utf8');
  const block = src.match(/DRUG_ID_TO_SLUG[^{]*\{([\s\S]*?)\n\};/);
  if (block) {
    mappedDrugIds = new Set([...block[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)].map((m) => m[1]));
  }
}
if (!mappedDrugIds) {
  warn('未能从 src/utils/drugLinks.ts 解析出 DRUG_ID_TO_SLUG，drugId 只按 drugs.json 校验');
}

/**
 * 校验一个 drugId 引用。
 * error：drugs.json 和 drugLinks.ts 都不认识 → 这是个不存在的药物。
 * warning：drugs.json 有记录但没有详情页 → getDrugPageUrl 会返回 null，页面上丢链接
 *          （estradiol-injection 当年就是栽在这里，见 SPEC §2）。
 */
function checkDrugRef(where, field, id) {
  const inDrugs = drugIds.has(id);
  const inLinks = mappedDrugIds ? mappedDrugIds.has(id) : false;
  if (!inDrugs && !inLinks) {
    err(
      `${where}: ${field} "${id}" 既不在 src/data/drugs.json 的 id 集合，` +
        `也不在 src/utils/drugLinks.ts 的 slug 映射里（指向了不存在的药物）`
    );
    return;
  }
  if (inDrugs && mappedDrugIds && !inLinks) {
    warn(`${where}: ${field} "${id}" 在 src/utils/drugLinks.ts 中无 slug 映射，「药物详情」链接会是 null`);
  }
}

// ── 顶层 ──────────────────────────────────────────────────────────────

if (!isPlainObject(data)) {
  console.error('品牌图鉴数据校验失败：brand-library.json 顶层必须是对象。');
  process.exit(1);
}

if (data.version !== 2) {
  err(`顶层: version 必须是数字 2（实际: ${JSON.stringify(data.version)}）`);
}
if (!isIsoDate(data.lastReviewed)) {
  err(`顶层: lastReviewed 必须是 ISO 日期 YYYY-MM-DD（实际: ${JSON.stringify(data.lastReviewed)}）`);
}

const ingredients = data.ingredients;
const brands = data.brands;

if (!Array.isArray(ingredients) || ingredients.length === 0) {
  err('顶层: ingredients 必须是非空数组');
}
if (!Array.isArray(brands) || brands.length === 0) {
  err('顶层: brands 必须是非空数组');
}

const ingredientList = Array.isArray(ingredients) ? ingredients : [];
const brandList = Array.isArray(brands) ? brands : [];

// ── ingredients ───────────────────────────────────────────────────────

const globalIds = new Map(); // id -> 首次出现位置描述
const ingredientIds = new Set();
const platesByCategory = new Map(); // category -> Map<plate, ingredientId>

function claimId(id, where) {
  if (!isNonEmptyString(id)) return;
  if (globalIds.has(id)) {
    err(`${where}: id "${id}" 与 ${globalIds.get(id)} 重复（id 必须全局唯一）`);
    return;
  }
  globalIds.set(id, where);
}

ingredientList.forEach((ing, i) => {
  const where = `ingredients[${i}]${isNonEmptyString(ing?.id) ? ` (${ing.id})` : ''}`;
  if (!isPlainObject(ing)) {
    err(`${where}: 必须是对象`);
    return;
  }

  if (!isNonEmptyString(ing.id)) {
    err(`${where}: id 必填且必须是非空字符串`);
  } else {
    claimId(ing.id, where);
    ingredientIds.add(ing.id);
  }

  if (!Number.isInteger(ing.plate) || ing.plate < 1) {
    err(`${where}: plate 必须是 ≥ 1 的整数（图版号）`);
  }
  checkEnum(where, 'category', ing.category, INGREDIENT_CATEGORY);
  checkEnum(where, 'hrtUse', ing.hrtUse, HRT_USE);

  // plate 在同 category 内唯一
  if (Number.isInteger(ing.plate) && INGREDIENT_CATEGORY.includes(ing.category)) {
    if (!platesByCategory.has(ing.category)) platesByCategory.set(ing.category, new Map());
    const seen = platesByCategory.get(ing.category);
    if (seen.has(ing.plate)) {
      err(`${where}: plate ${ing.plate} 在 category "${ing.category}" 内与 "${seen.get(ing.plate)}" 重复`);
    } else {
      seen.set(ing.plate, ing.id ?? `ingredients[${i}]`);
    }
  }

  // drugIds / primaryDrugId
  if (!Array.isArray(ing.drugIds) || ing.drugIds.length === 0) {
    err(`${where}: drugIds 必须是非空字符串数组`);
  } else {
    ing.drugIds.forEach((id, j) => {
      if (!isNonEmptyString(id)) {
        err(`${where}: drugIds[${j}] 必须是非空字符串`);
      } else {
        checkDrugRef(where, `drugIds[${j}]`, id);
      }
    });
  }
  if (!isNonEmptyString(ing.primaryDrugId)) {
    err(`${where}: primaryDrugId 必填且必须是非空字符串`);
  } else {
    checkDrugRef(where, 'primaryDrugId', ing.primaryDrugId);
    if (Array.isArray(ing.drugIds) && !ing.drugIds.includes(ing.primaryDrugId)) {
      err(`${where}: primaryDrugId "${ing.primaryDrugId}" 必须也出现在 drugIds 中`);
    }
  }
    if (ing.references !== undefined) {
      if (!Array.isArray(ing.references) || ing.references.some((r) => !isNonEmptyString(r))) {
        err(`${where}: references 必须是字符串数组`);
      } else {
        for (const rid of ing.references) {
          if (!referenceIds.has(rid)) err(`${where}: references 含未知引用 id "${rid}"（不在 src/data/references.json）`);
        }
      }
    }
    if (!(Array.isArray(ing.references) && ing.references.length > 0)) {
      warn(`${where}: role/equivalence 缺 references（成分级医学/药理陈述建议附引用）`);
    }
    if ((ing.hrtUse === 'cautioned' || ing.hrtUse === 'banned') && !(Array.isArray(ing.references) && ing.references.length > 0)) {
      err(`${where}: hrtUse=${ing.hrtUse} 但没有 references —— reason 里的医学结论缺少引用依据（Constitution：无引用 = 无内容）`);
    }

  // name：zh / en 必填，inn / ja / ko 可选
  if (!isPlainObject(ing.name)) {
    err(`${where}: name 必须是对象 { zh, en, inn?, ja?, ko? }`);
  } else {
    if (!isNonEmptyString(ing.name.zh)) err(`${where}: name.zh 必填`);
    if (!isNonEmptyString(ing.name.en)) err(`${where}: name.en 必填`);
    for (const k of ['inn', 'ja', 'ko']) checkOptionalString(where, `name.${k}`, ing.name[k]);
  }

  checkL10n(where, 'ester', ing.ester);
  checkL10n(where, 'role', ing.role, { required: true });
  checkL10n(where, 'equivalence', ing.equivalence);
  checkL10n(where, 'reason', ing.reason);

  // hrtUse cautioned / banned → reason.zh 必填
  if ((ing.hrtUse === 'cautioned' || ing.hrtUse === 'banned') && !isNonEmptyString(ing.reason?.zh)) {
    err(`${where}: hrtUse 为 "${ing.hrtUse}" 时必须提供 reason.zh（一句话原因）`);
  }
});

// ── brands ────────────────────────────────────────────────────────────

const brandCountByIngredient = new Map();
const statusCounts = new Map();
const regionCounts = new Map();
const confidenceCounts = new Map();
let photoCount = 0;
let schematicImageCount = 0;
let externalImageCount = 0;

brandList.forEach((b, i) => {
  const where = `brands[${i}]${isNonEmptyString(b?.id) ? ` (${b.id})` : ''}`;
  if (!isPlainObject(b)) {
    err(`${where}: 必须是对象`);
    return;
  }

  if (!isNonEmptyString(b.id)) {
    err(`${where}: id 必填且必须是非空字符串`);
  } else {
    claimId(b.id, where);
  }

  // ingredientId → ingredients
  if (!isNonEmptyString(b.ingredientId)) {
    err(`${where}: ingredientId 必填`);
  } else if (!ingredientIds.has(b.ingredientId)) {
    err(`${where}: ingredientId "${b.ingredientId}" 不存在于 ingredients`);
  } else {
    brandCountByIngredient.set(b.ingredientId, (brandCountByIngredient.get(b.ingredientId) ?? 0) + 1);
  }

  // drugId → drugs.json 或 drugLinks.ts
  if (!isNonEmptyString(b.drugId)) {
    err(`${where}: drugId 必填`);
  } else {
    checkDrugRef(where, 'drugId', b.drugId);
  }

  // name
  if (!isPlainObject(b.name)) {
    err(`${where}: name 必须是对象 { display, local?, intl?, aliases?, en?, ja?, ko? }`);
  } else {
    if (!isNonEmptyString(b.name.display)) err(`${where}: name.display 必填`);
    for (const k of ['local', 'intl', 'en', 'ja', 'ko']) checkOptionalString(where, `name.${k}`, b.name[k]);
    if (b.name.aliases !== undefined) {
      if (!Array.isArray(b.name.aliases) || !b.name.aliases.every(isNonEmptyString)) {
        err(`${where}: name.aliases 如存在必须是非空字符串数组`);
      }
    }
  }

  // manufacturer
  if (!isPlainObject(b.manufacturer)) {
    err(`${where}: manufacturer 必须是对象 { name, parent?, country }`);
  } else {
    checkL10n(where, 'manufacturer.name', b.manufacturer.name, { required: true });
    checkOptionalString(where, 'manufacturer.parent', b.manufacturer.parent);
    if (!isNonEmptyString(b.manufacturer.country) || !ISO_COUNTRY.test(b.manufacturer.country)) {
      err(`${where}: manufacturer.country 必须是 ISO 3166-1 alpha-2 两位大写字母（实际: ${JSON.stringify(b.manufacturer.country)}）`);
    }
  }

  // market
  if (!isPlainObject(b.market)) {
    err(`${where}: market 必须是对象 { country, countryName, region }`);
  } else {
    if (!isNonEmptyString(b.market.country) || !ISO_COUNTRY.test(b.market.country)) {
      err(`${where}: market.country 必须是 ISO 3166-1 alpha-2 两位大写字母（实际: ${JSON.stringify(b.market.country)}）`);
    }
    checkL10n(where, 'market.countryName', b.market.countryName, { required: true });
    checkEnum(where, 'market.region', b.market.region, MARKET_REGION);
    if (MARKET_REGION.includes(b.market.region)) {
      regionCounts.set(b.market.region, (regionCounts.get(b.market.region) ?? 0) + 1);
    }
  }

  checkEnum(where, 'status', b.status, BRAND_STATUS);
  if (BRAND_STATUS.includes(b.status)) {
    statusCounts.set(b.status, (statusCounts.get(b.status) ?? 0) + 1);
  }
  checkEnum(where, 'form', b.form, BRAND_FORM);
  checkEnum(where, 'confidence', b.confidence, CONFIDENCE);
  if (CONFIDENCE.includes(b.confidence)) {
    confidenceCounts.set(b.confidence, (confidenceCounts.get(b.confidence) ?? 0) + 1);
  }

  if (!Array.isArray(b.strengths) || b.strengths.length === 0 || !b.strengths.every(isNonEmptyString)) {
    err(`${where}: strengths 必须是非空字符串数组（如 ["1 mg", "2 mg"]）`);
  }

  checkL10n(where, 'pack', b.pack);
  checkL10n(where, 'packaging', b.packaging);
  checkL10nList(where, 'identification', b.identification);
  checkL10n(where, 'notes', b.notes);

  // appearance
  if (!isPlainObject(b.appearance)) {
    err(`${where}: appearance 必填且必须是对象`);
  } else {
    const a = b.appearance;
    checkOptionalEnum(where, 'appearance.shape', a.shape, TABLET_SHAPE);
    checkOptionalEnum(where, 'appearance.coating', a.coating, COATING);
    checkOptionalEnum(where, 'appearance.score', a.score, SCORE);
    checkOptionalEnum(where, 'appearance.colorFamily', a.colorFamily, COLOR_FAMILY);
    checkHexColor(where, 'appearance.color', a.color);
    checkHexColor(where, 'appearance.secondaryColor', a.secondaryColor);
    checkL10n(where, 'appearance.colorName', a.colorName);
    checkL10n(where, 'appearance.description', a.description, { required: true });
    checkOptionalString(where, 'appearance.imprint', a.imprint);
  }

  // image
  if (b.image !== undefined) {
    if (!isPlainObject(b.image)) {
      err(`${where}: image 必须是对象 { src, kind, credit?, alt }`);
    } else {
      const img = b.image;
      checkEnum(where, 'image.kind', img.kind, IMAGE_KIND);
      checkL10n(where, 'image.credit', img.credit);
      checkL10n(where, 'image.alt', img.alt, { required: true });

      if (!isNonEmptyString(img.src)) {
        err(`${where}: image.src 必填且必须是非空字符串`);
      } else if (img.src.startsWith('/')) {
        const rel = img.src.split(/[?#]/)[0].replace(/^\/+/, '');
        const abs = path.join(publicDir, rel);
        if (!existsSync(abs)) {
          err(`${where}: image.src "${img.src}" 对应文件不存在 — public/${rel}`);
        }
      } else if (HTTP_URL.test(img.src)) {
        externalImageCount += 1;
      } else {
        err(`${where}: image.src 必须以 "/" 开头（public/ 下的本地文件）或是 http(s):// 外链（实际: ${JSON.stringify(img.src)}）`);
      }

      if (img.kind === 'photo') photoCount += 1;
      if (img.kind === 'schematic') schematicImageCount += 1;
    }
  }

  // links
  if (b.links !== undefined) {
    if (!isPlainObject(b.links)) {
      err(`${where}: links 必须是对象 { official?, leaflet?, regulator? }`);
    } else {
      for (const k of ['official', 'leaflet', 'regulator']) checkUrl(where, `links.${k}`, b.links[k]);
    }
  }

  // regulatory
  if (b.regulatory !== undefined) {
    if (!isPlainObject(b.regulatory)) {
      err(`${where}: regulatory 必须是对象 { authority, code? }`);
    } else {
      checkEnum(where, 'regulatory.authority', b.regulatory.authority, REGULATORY_AUTHORITY);
      checkOptionalString(where, 'regulatory.code', b.regulatory.code);
    }
  }

  if (b.lastVerified !== undefined && !isIsoDate(b.lastVerified)) {
    err(`${where}: lastVerified 必须是 ISO 日期 YYYY-MM-DD（实际: ${JSON.stringify(b.lastVerified)}）`);
  }
});

// ── 每个 ingredient ≥ 1 brand ─────────────────────────────────────────

for (const ing of ingredientList) {
  if (!isNonEmptyString(ing?.id)) continue;
  if ((brandCountByIngredient.get(ing.id) ?? 0) === 0) {
    err(`ingredients (${ing.id}): 没有任何 brand 引用该成分（每个成分至少需要 1 个品牌）`);
  }
}

// ── 输出 ──────────────────────────────────────────────────────────────

function fmtCounts(map, order) {
  const keys = order ? order.filter((k) => map.has(k)) : [...map.keys()].sort();
  if (keys.length === 0) return '（无）';
  return keys.map((k) => `${k}=${map.get(k)}`).join(' · ');
}

const dataRel = path.relative(rootDir, dataPath) || dataPath;
const schematicRendered = brandList.length - photoCount;

if (warnings.length > 0) {
  console.warn(`\n品牌图鉴数据警告（不阻断）：${warnings.length}\n`);
  for (const w of warnings) console.warn(`- ${w}`);
  console.warn('');
}

if (errors.length > 0) {
  console.error(`\n品牌图鉴数据校验失败（${dataRel}）：${errors.length} 个错误\n`);
  for (const e of errors) console.error(`- ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`品牌图鉴数据校验通过（${dataRel}）${warnings.length > 0 ? ` — 含 ${warnings.length} 条警告` : ''}`);
console.log(`  成分（图版）: ${ingredientList.length}   品牌（标本）: ${brandList.length}`);
console.log(`  实拍图: ${photoCount}   示意图: ${schematicRendered}（其中显式 image.kind=schematic: ${schematicImageCount}，外链图: ${externalImageCount}）`);
console.log(`  按状态: ${fmtCounts(statusCounts, BRAND_STATUS)}`);
console.log(`  按地区: ${fmtCounts(regionCounts, MARKET_REGION)}`);
console.log(`  可信度: ${fmtCounts(confidenceCounts, CONFIDENCE)}`);
