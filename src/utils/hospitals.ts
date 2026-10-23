/**
 * hospitals.json 的分区 / 分组 / 计数 —— 单一事实来源。
 *
 * 背景（2026-09 P0）：zh 医院页曾手写 13 城白名单，导致 25 家大陆医院只渲染 15 家；
 * 文案里的「49 家位于中国大陆」「46 个城市」把 24 家海外条目也算了进去。
 * 规则：页面上出现的任何数字都必须由这里从数据推导，不许手写。
 *
 * 归属判定用「全部 31 个省级行政区」的完整列表（GB/T 2260 顺序），不是城市白名单：
 * 大陆新增任何城市的医院都会自动出现；港澳台单独成组，需要显式决策，不会被静默并入大陆。
 */
import hospitalsRaw from '../data/hospitals.json';

export interface Hospital {
  id: string;
  name: string;
  nameEn?: string;
  city: string;
  province: string;
  tier: string;
  department: string;
  address?: string;
  services: string[];
  registrationMethod: string;
  estimatedCost: string;
  communityFeedback: string;
  notes?: string;
  verificationLevel: 'community-verified' | 'community-reported';
  lastVerified: string;
}

export const allHospitals = hospitalsRaw as unknown as Hospital[];

/** 中国大陆 31 个省级行政区，按 GB/T 2260 行政区划代码顺序（同时作为展示顺序）。 */
export const MAINLAND_PROVINCES = [
  '北京', '天津', '河北', '山西', '内蒙古',
  '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '广西', '海南',
  '重庆', '四川', '贵州', '云南', '西藏',
  '陕西', '甘肃', '青海', '宁夏', '新疆',
] as const;

/** 港澳台：若数据中出现，单独分区展示，绝不计入「大陆」。 */
export const HK_MO_TW_REGIONS = ['香港', '澳门', '台湾'] as const;

const mainlandSet = new Set<string>(MAINLAND_PROVINCES);
const hkMoTwSet = new Set<string>(HK_MO_TW_REGIONS);

export const isMainland = (h: Hospital): boolean => mainlandSet.has(h.province);
export const isHkMoTw = (h: Hospital): boolean =>
  hkMoTwSet.has(h.province) || hkMoTwSet.has(h.city);

export const mainlandHospitals = allHospitals.filter(isMainland);
export const hkMoTwHospitals = allHospitals.filter((h) => !isMainland(h) && isHkMoTw(h));

export interface CityGroup {
  city: string;
  hospitals: Hospital[];
}

export interface ProvinceGroup {
  province: string;
  /** 页面锚点 id（中文 id 在 HTML5 合法，href 由浏览器自动编码） */
  anchor: string;
  count: number;
  cities: CityGroup[];
}

/**
 * 按「省 → 市」分组。省份顺序跟随 order；市按医院数降序、同数按拼音序；
 * 市内医院保持 hospitals.json 原顺序（数据维护者的排序意图）。
 */
export function groupByProvinceCity(
  list: Hospital[],
  order: readonly string[],
  anchorPrefix = 'province',
): ProvinceGroup[] {
  const byProvince = new Map<string, Map<string, Hospital[]>>();
  for (const h of list) {
    const cities = byProvince.get(h.province) ?? new Map<string, Hospital[]>();
    const bucket = cities.get(h.city) ?? [];
    bucket.push(h);
    cities.set(h.city, bucket);
    byProvince.set(h.province, cities);
  }
  const rank = (p: string) => {
    const i = order.indexOf(p);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...byProvince.keys()]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'zh-Hans-CN'))
    .map((province) => {
      const cities = [...byProvince.get(province)!.entries()]
        .map(([city, hospitals]) => ({ city, hospitals }))
        .sort(
          (a, b) =>
            b.hospitals.length - a.hospitals.length || a.city.localeCompare(b.city, 'zh-Hans-CN'),
        );
      return {
        province,
        anchor: `${anchorPrefix}-${province}`,
        count: cities.reduce((n, c) => n + c.hospitals.length, 0),
        cities,
      };
    });
}

export const countCities = (list: Hospital[]): number =>
  new Set(list.map((h) => `${h.province}/${h.city}`)).size;

export const countProvinces = (list: Hospital[]): number =>
  new Set(list.map((h) => h.province)).size;

/** 「最后核实」超过多少个月视为待核实。 */
export const STALE_AFTER_MONTHS = 6;

/**
 * lastVerified（YYYY-MM-DD）距 now 是否已超过 months 个自然月。
 * 无法解析的日期视为过期（宁可提示核实，也不默认可信）。
 */
export function isStale(lastVerified: string, now: Date = new Date(), months = STALE_AFTER_MONTHS): boolean {
  const verified = new Date(`${lastVerified}T00:00:00Z`);
  if (Number.isNaN(verified.getTime())) return true;
  const threshold = new Date(verified);
  threshold.setUTCMonth(threshold.getUTCMonth() + months);
  return now.getTime() >= threshold.getTime();
}
