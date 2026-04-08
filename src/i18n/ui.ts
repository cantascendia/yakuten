/**
 * UI string translations for Astro components.
 * Content pages (MDX) are localized via separate files under src/content/docs/{locale}/.
 * This file covers shared layout components (nav, hero, footer, banners).
 */

export const ui = {
  zh: {
    // HeroSection
    'hero.title': 'HRT药典',
    'hero.slogan': '愿此行，抵达真实的自己',

    // SplashNav
    'nav.before': '用药前准备',
    'nav.pathway': '用药路径',
    'nav.medications': '药物详解',
    'nav.doseLimits': '剂量红线',
    'nav.bloodTests': '血检指南',
    'nav.risks': '风险急症',
    'nav.tools': '工具',
    'nav.ariaLabel': '主导航',

    // ActionCards
    'action.notStarted.title': '我还没开始用药',
    'action.notStarted.desc': '了解基线检查和禁忌症，为您的医疗旅程建立科学的安全起点。',
    'action.onHRT.title': '我已经在用药',
    'action.onHRT.desc': '查看你的用药路径图，追踪生理变化指标，优化长期健康管理方案。',
    'action.problem.title': '我觉得身体出了问题',
    'action.problem.desc': '识别危险信号，掌握紧急自救指南。生命安全永远是首要准则。',
    'action.notStarted.cta': '查看基线检查',
    'action.onHRT.cta': '进入路径图',
    'action.problem.cta': '紧急行动指南',
    'action.ariaLabel': '快速入口',

    // HeroSection
    'hero.subtitle': '循证 · 减害 · 引导就医',

    // MissionStatement
    'mission.label': '严峻现实',
    'mission.ariaLabel': '使命声明',
    'mission.stat.before': '在中国，超过',
    'mission.stat.number': '84%',
    'mission.stat.after': '的跨性别激素使用者没有任何医疗指导。',
    'mission.body.before': '本站的建立，是为了在你找到愿意接诊的医生之前，',
    'mission.body.give': '给你一条',
    'mission.body.baseline': '安全的底线',

    // EmergencyBanner
    'emergency.text': '如果你正在经历以下任何情况，请立即停药并就医：',
    'emergency.symptoms': '单侧小腿肿胀疼痛 · 突发严重头痛伴视力变化 · 胸痛或呼吸困难 · 皮肤/眼白发黄 · 持续严重情绪崩溃或自杀意念',
    'emergency.link': '查看详情并立即行动',

    // SiteFooter
    'footer.disclaimer.title': '免责声明',
    'footer.disclaimer.text': '本站内容仅供参考，不构成医疗建议。在开始任何激素治疗前，请务必咨询专业医疗人员。',
    'footer.privacy.title': '隐私权协议',
    'footer.privacy.text': '我们重视您的隐私，不收集、不存储任何个人数据。所有工具均在浏览器本地运行，浏览记录不被追踪。',
    'footer.sources.title': '药理来源',
    'footer.sources.text': '所有数据均来自 WPATH SOC8 指南及经过同行评审的最新内分泌学研究论文。',
    'footer.dev.title': '开发者文档',
    'footer.dev.text': '项目基于开源精神构建，欢迎所有愿意为跨性别社群贡献的技术力量加入我们。',
    'footer.brand': 'HRT药典',
    'footer.notice': '本站不提供处方、不销售药物、不收集个人信息。',
    'footer.navLabel': '底部链接',
    'footer.link.privacy': '隐私政策',
    'footer.link.disclaimer': '免责声明',
    'footer.link.github': '开源项目',
    'footer.copy': 'HRT药典 · 循证 · 减害 · 引导就医',
  },

  en: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'May this journey bring you closer to your true self',

    // SplashNav
    'nav.before': 'Before You Start',
    'nav.pathway': 'HRT Pathway',
    'nav.medications': 'Medications',
    'nav.doseLimits': 'Dose Limits',
    'nav.bloodTests': 'Blood Tests',
    'nav.risks': 'Risks & Emergencies',
    'nav.tools': 'Tools',
    'nav.ariaLabel': 'Main navigation',

    // ActionCards
    'action.notStarted.title': "I haven't started HRT yet",
    'action.notStarted.desc': 'Understand baseline labs, contraindications, and informed consent \u2014 build a safe foundation before your first dose.',
    'action.onHRT.title': "I'm already on HRT",
    'action.onHRT.desc': 'Follow the clinical pathway, track your levels, and optimize your regimen for long-term health.',
    'action.problem.title': 'Something feels wrong',
    'action.problem.desc': 'Recognize danger signs and know when to seek emergency care. Your safety always comes first.',
    'action.notStarted.cta': 'Explore Baseline',
    'action.onHRT.cta': 'Trace Pathway',
    'action.problem.cta': 'Emergency Action',
    'action.ariaLabel': 'Quick start',

    // HeroSection
    'hero.subtitle': 'Evidence-Based · Harm Reduction · Guided Care',

    // MissionStatement
    'mission.label': 'The Critical Reality',
    'mission.ariaLabel': 'Mission statement',
    'mission.stat.before': 'Worldwide, countless transgender people on HRT lack access to',
    'mission.stat.number': 'any',
    'mission.stat.after': 'medical guidance or monitoring.',
    'mission.body.before': 'This site exists to give you an evidence-based',
    'mission.body.give': '',
    'mission.body.baseline': 'safety baseline',

    // EmergencyBanner
    'emergency.text': 'If you are experiencing any of the following, stop HRT and seek emergency care immediately:',
    'emergency.symptoms': 'Unilateral calf swelling or pain \u00b7 Sudden severe headache with vision changes \u00b7 Chest pain or difficulty breathing \u00b7 Yellowing of skin or eyes \u00b7 Persistent severe emotional crisis or suicidal ideation',
    'emergency.link': 'View emergency details',

    // SiteFooter
    'footer.disclaimer.title': 'Disclaimer',
    'footer.disclaimer.text': 'This site is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare provider before starting any hormone therapy.',
    'footer.privacy.title': 'Privacy',
    'footer.privacy.text': 'We respect your privacy. No personal data is collected or stored. Browsing history is never tracked.',
    'footer.sources.title': 'Evidence Sources',
    'footer.sources.text': 'All clinical data is sourced from WPATH SOC 8, Endocrine Society Guidelines, UCSF Transgender Care, and peer-reviewed research.',
    'footer.dev.title': 'Open Source',
    'footer.dev.text': 'This project is built in the open. Contributions from developers, clinicians, and community members are welcome.',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'This site does not prescribe medications, sell drugs, or collect personal information.',
    'footer.navLabel': 'Footer links',
    'footer.link.privacy': 'Privacy Policy',
    'footer.link.disclaimer': 'Medical Disclaimer',
    'footer.link.github': 'GitHub Project',
    'footer.copy': 'HRT Yakuten · Evidence-Based · Harm Reduction',
  },

  ja: {
    // HeroSection
    'hero.title': 'HRT药典',
    'hero.slogan': 'この旅が、本当の自分に届きますように',

    // SplashNav
    'nav.before': '服薬前の準備',
    'nav.pathway': 'HRT経路',
    'nav.medications': '薬物ガイド',
    'nav.doseLimits': '用量制限',
    'nav.bloodTests': '血液検査',
    'nav.risks': 'リスクと緊急',
    'nav.tools': 'ツール',
    'nav.ariaLabel': 'メインナビゲーション',

    // ActionCards
    'action.notStarted.title': 'まだHRTを始めていない',
    'action.notStarted.desc': 'ベースライン検査と禁忌症を確認し、安全な出発点を構築しましょう。',
    'action.onHRT.title': 'すでにHRTを使用中',
    'action.onHRT.desc': '経路マップを確認し、血液検査の数値を追跡し、長期的な健康管理を最適化しましょう。',
    'action.problem.title': '体に異変を感じている',
    'action.problem.desc': '危険な兆候を見分け、緊急時の対応を把握しましょう。安全が最優先です。',
    'action.notStarted.cta': 'ベースラインを確認',
    'action.onHRT.cta': '経路マップへ',
    'action.problem.cta': '緊急対応ガイド',
    'action.ariaLabel': 'クイックスタート',

    // HeroSection
    'hero.subtitle': 'エビデンス · 害軽減 · 医療ガイド',

    // MissionStatement
    'mission.label': '深刻な現実',
    'mission.ariaLabel': 'ミッションステートメント',
    'mission.stat.before': '世界中で、HRTを使用するトランスジェンダーの多くが',
    'mission.stat.number': '適切な',
    'mission.stat.after': '医療指導やモニタリングを受けられていません。',
    'mission.body.before': 'このサイトは、エビデンスに基づいた',
    'mission.body.give': '',
    'mission.body.baseline': '安全のベースライン',

    // EmergencyBanner
    'emergency.text': '以下の症状がある場合、直ちにHRTを中止し救急医療を受けてください：',
    'emergency.symptoms': '片側のふくらはぎの腫れや痛み · 突然の激しい頭痛と視力変化 · 胸痛または呼吸困難 · 皮膚や白目の黄変 · 持続的な重度の精神的危機や自殺念慮',
    'emergency.link': '緊急時の詳細を確認',

    // SiteFooter
    'footer.disclaimer.title': '免責事項',
    'footer.disclaimer.text': '本サイトの情報は参考目的であり、医療アドバイスではありません。ホルモン療法を開始する前に、必ず医療専門家にご相談ください。',
    'footer.privacy.title': 'プライバシー',
    'footer.privacy.text': '個人データの収集・保存は行いません。閲覧履歴の追跡もありません。',
    'footer.sources.title': 'エビデンス',
    'footer.sources.text': 'すべてのデータはWPATH SOC 8、内分泌学会ガイドライン、査読済み研究論文に基づいています。',
    'footer.dev.title': 'オープンソース',
    'footer.dev.text': 'このプロジェクトはオープンソースで構築されています。開発者・医療者・コミュニティからの貢献を歓迎します。',
    'footer.brand': 'HRT药典',
    'footer.notice': '本サイトは処方箋の発行、薬物の販売、個人情報の収集を一切行いません。',
    'footer.navLabel': 'フッターリンク',
    'footer.link.privacy': 'プライバシーポリシー',
    'footer.link.disclaimer': '免責事項',
    'footer.link.github': 'オープンソース',
    'footer.copy': 'HRT药典 · エビデンス · 害軽減 · 医療ガイド',
  },
} as const;

export type Locale = keyof typeof ui;
export type UIKey = keyof (typeof ui)['zh'];

/**
 * Get a localized UI string.
 * Falls back to Chinese if key is missing in target locale.
 */
export function t(locale: string, key: UIKey): string {
  const lang = (locale in ui ? locale : 'zh') as Locale;
  return ui[lang][key] ?? ui.zh[key] ?? key;
}

/**
 * Detect locale from Astro.currentLocale or URL path.
 */
export function getLocale(astroLocale?: string, pathname?: string): Locale {
  if (astroLocale && astroLocale in ui) return astroLocale as Locale;
  if (pathname?.startsWith('/en')) return 'en';
  return 'zh';
}
