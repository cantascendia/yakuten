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
    'nav.guides': '实操指南',
    'nav.blog': '博客',
    'nav.search': '搜索',
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
    'action.askAI.title': '我有医学问题',
    'action.askAI.desc': '基于循证文献的 AI 问答助手 24 小时可用，不存对话、不做个人化处方建议。',
    'action.askAI.cta': '问 AI 助手',
    'action.ariaLabel': '快速入口',

    // HeroSection
    'hero.subtitle': '循证 · 减害 · 引导就医',
    'hero.ctaPrimary': '问 AI 助手',
    'hero.ctaPathway': '开始我的路径',

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

    // a11y
    'a11y.skipToMain': '跳到主要内容',

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
    'footer.link.guides': '实操指南',
    'footer.link.privacy': '隐私政策',
    'footer.link.disclaimer': '免责声明',
    'footer.link.github': '开源项目',
    'footer.link.feedback': '意见反馈',
    'footer.copy': 'HRT药典 · 循证 · 减害 · 引导就医',

    // DrugBrandGallery
    'brandGallery.viewAll': '查看全部品牌索引 →',

    // Blog
    'blog.title': '专题文章',
    'blog.subtitle': '深入解析 HRT 常见问题',
    'blog.readMore': '阅读全文',
    'blog.readingTime': '约 {min} 分钟',
    'blog.publishedOn': '发布于',
    'blog.updatedOn': '更新于',
    'blog.relatedDocs': '相关参考资料',
    'blog.relatedArticles': '相关文章',
    'blog.backToIndex': '← 返回文章列表',
    'blog.backToDocs': '← 返回药典',
    'blog.allCategories': '全部',
    'blog.breadcrumb.home': '首页',
    'blog.breadcrumb.blog': '专题文章',
    'blog.disclaimer': '本文仅供参考，不构成医疗建议。具体用药方案请咨询专业医疗人员。',

    // DrugQuickNav
    'drugNav.title': '药物速查',
    'drugNav.ariaLabel': '常用药物快速导航',
    'drugNav.estrogens': '雌激素',
    'drugNav.antiandrogens': '抗雄激素',
    'drugNav.progestogens': '孕激素',
    'drugNav.viewAll': '查看全部 20 种药物 →',

    // HeroSearch
    'hero.searchPlaceholder': '搜索药物、症状或指南...',
    'hero.searchLabel': '全站搜索',

    // Links page
    'links.title': '快速链接',
    'links.subtitle': '循证 · 减害 · 引导就医',
  },

  en: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'May this journey lead you to your true self',

    // SplashNav
    'nav.before': 'Before You Start',
    'nav.pathway': 'HRT Pathway',
    'nav.medications': 'Medications',
    'nav.doseLimits': 'Dose Limits',
    'nav.bloodTests': 'Blood Tests',
    'nav.risks': 'Risks & Emergencies',
    'nav.tools': 'Tools',
    'nav.guides': 'Task Guides',
    'nav.blog': 'Blog',
    'nav.search': 'Search',
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
    'action.askAI.title': 'I have a medical question',
    'action.askAI.desc': 'Evidence-based AI assistant available 24/7. No conversation storage, no personalized prescriptions.',
    'action.askAI.cta': 'Ask AI Assistant',
    'action.ariaLabel': 'Quick start',

    // HeroSection
    'hero.subtitle': 'Evidence-Based · Harm Reduction · Guided Care',
    'hero.ctaPrimary': 'Ask AI Assistant',
    'hero.ctaPathway': 'Start My Pathway',

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

    // a11y
    'a11y.skipToMain': 'Skip to main content',

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
    'footer.link.guides': 'Task Guides',
    'footer.link.privacy': 'Privacy Policy',
    'footer.link.disclaimer': 'Medical Disclaimer',
    'footer.link.github': 'GitHub Project',
    'footer.link.feedback': 'Feedback',
    'footer.copy': 'HRT Yakuten · Evidence-Based · Harm Reduction',

    // DrugBrandGallery
    'brandGallery.viewAll': 'View full brand index →',

    // Blog
    'blog.title': 'Articles',
    'blog.subtitle': 'In-depth answers to common HRT questions',
    'blog.readMore': 'Read more',
    'blog.readingTime': '{min} min read',
    'blog.publishedOn': 'Published',
    'blog.updatedOn': 'Updated',
    'blog.relatedDocs': 'Related Resources',
    'blog.relatedArticles': 'Related Articles',
    'blog.backToIndex': '← Back to articles',
    'blog.backToDocs': '← Back to docs',
    'blog.allCategories': 'All',
    'blog.breadcrumb.home': 'Home',
    'blog.breadcrumb.blog': 'Articles',
    'blog.disclaimer': 'This article is for informational purposes only and does not constitute medical advice. Consult a qualified healthcare provider for treatment decisions.',

    // DrugQuickNav
    'drugNav.title': 'Quick Drug Lookup',
    'drugNav.ariaLabel': 'Quick drug navigation',
    'drugNav.estrogens': 'Estrogens',
    'drugNav.antiandrogens': 'Anti-Androgens',
    'drugNav.progestogens': 'Progestogens',
    'drugNav.viewAll': 'View all 20 medications →',

    // HeroSearch
    'hero.searchPlaceholder': 'Search drugs, symptoms, or guides...',
    'hero.searchLabel': 'Site search',

    // Links page
    'links.title': 'Quick Links',
    'links.subtitle': 'Evidence-Based · Harm Reduction · Guided Care',
  },

  ja: {
    // HeroSection
    'hero.title': 'HRT薬典',
    'hero.slogan': '願わくばこの旅路が、真の自分に届かんことを',

    // SplashNav
    'nav.before': '服薬前の準備',
    'nav.pathway': 'HRT経路',
    'nav.medications': '薬物ガイド',
    'nav.doseLimits': '用量制限',
    'nav.bloodTests': '血液検査',
    'nav.risks': 'リスクと緊急',
    'nav.tools': 'ツール',
    'nav.guides': '実用ガイド',
    'nav.blog': 'ブログ',
    'nav.search': '検索',
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
    'action.askAI.title': '医学的な質問がある',
    'action.askAI.desc': 'エビデンスに基づいたAIアシスタントが24時間対応。会話は保存せず、個別の処方提案も行いません。',
    'action.askAI.cta': 'AIに質問する',
    'action.ariaLabel': 'クイックスタート',

    // HeroSection
    'hero.subtitle': 'エビデンス · 害軽減 · 医療ガイド',
    'hero.ctaPrimary': 'AIアシスタントに質問',
    'hero.ctaPathway': 'あなたの道を始める',

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

    // a11y
    'a11y.skipToMain': 'メインコンテンツへスキップ',

    // SiteFooter
    'footer.disclaimer.title': '免責事項',
    'footer.disclaimer.text': '本サイトの情報は参考目的であり、医療アドバイスではありません。ホルモン療法を開始する前に、必ず医療専門家にご相談ください。',
    'footer.privacy.title': 'プライバシー',
    'footer.privacy.text': '個人データの収集・保存は行いません。閲覧履歴の追跡もありません。',
    'footer.sources.title': 'エビデンス',
    'footer.sources.text': 'すべてのデータはWPATH SOC 8、内分泌学会ガイドライン、査読済み研究論文に基づいています。',
    'footer.dev.title': 'オープンソース',
    'footer.dev.text': 'このプロジェクトはオープンソースで構築されています。開発者・医療者・コミュニティからの貢献を歓迎します。',
    'footer.brand': 'HRT薬典',
    'footer.notice': '本サイトは処方箋の発行、薬物の販売、個人情報の収集を一切行いません。',
    'footer.navLabel': 'フッターリンク',
    'footer.link.guides': '実用ガイド',
    'footer.link.privacy': 'プライバシーポリシー',
    'footer.link.disclaimer': '免責事項',
    'footer.link.github': 'オープンソース',
    'footer.link.feedback': 'フィードバック',
    'footer.copy': 'HRT薬典 · エビデンス · 害軽減 · 医療ガイド',

    // DrugBrandGallery
    'brandGallery.viewAll': 'すべてのブランド索引を見る →',

    // Blog
    'blog.title': '特集記事',
    'blog.subtitle': 'HRTの疑問を詳しく解説',
    'blog.readMore': '続きを読む',
    'blog.readingTime': '約{min}分',
    'blog.publishedOn': '公開日',
    'blog.updatedOn': '更新日',
    'blog.relatedDocs': '関連ドキュメント',
    'blog.relatedArticles': '関連記事',
    'blog.backToIndex': '← 記事一覧へ',
    'blog.backToDocs': '← 薬典へ',
    'blog.allCategories': 'すべて',
    'blog.breadcrumb.home': 'ホーム',
    'blog.breadcrumb.blog': '特集記事',
    'blog.disclaimer': 'この記事は情報提供のみを目的としており、医療アドバイスではありません。治療の決定は医療専門家にご相談ください。',

    // DrugQuickNav
    'drugNav.title': '薬物クイック検索',
    'drugNav.ariaLabel': '薬物クイックナビゲーション',
    'drugNav.estrogens': 'エストロゲン',
    'drugNav.antiandrogens': '抗アンドロゲン',
    'drugNav.progestogens': 'プロゲストーゲン',
    'drugNav.viewAll': '全20種の薬物を見る →',

    // HeroSearch
    'hero.searchPlaceholder': '薬物・症状・ガイドを検索...',
    'hero.searchLabel': 'サイト内検索',

    // Links page
    'links.title': 'クイックリンク',
    'links.subtitle': 'エビデンス · 減害 · 受診案内',
  },

  ko: {
    // HeroSection
    'hero.title': 'HRT약전',
    'hero.slogan': '이 여정이 진정한 나에게 닿기를',

    // SplashNav
    'nav.before': '시작 전 준비',
    'nav.pathway': 'HRT 경로',
    'nav.medications': '약물 가이드',
    'nav.doseLimits': '용량 한계',
    'nav.bloodTests': '혈액 검사',
    'nav.risks': '위험과 응급',
    'nav.tools': '도구',
    'nav.guides': '실용 가이드',
    'nav.blog': '블로그',
    'nav.search': '검색',
    'nav.ariaLabel': '주 내비게이션',

    // ActionCards
    'action.notStarted.title': '아직 HRT를 시작하지 않았습니다',
    'action.notStarted.desc': '기초 검사와 금기 사항을 확인하고 안전한 출발점을 만드세요.',
    'action.onHRT.title': '이미 HRT를 사용 중입니다',
    'action.onHRT.desc': '경로 맵을 확인하고 혈액 검사 수치를 추적하며 장기 건강 관리를 최적화하세요.',
    'action.problem.title': '몸에 이상을 느끼고 있습니다',
    'action.problem.desc': '위험 신호를 구별하고 응급 시 대처법을 파악하세요. 안전이 최우선입니다.',
    'action.notStarted.cta': '기초 검사 확인',
    'action.onHRT.cta': '경로 맵으로',
    'action.problem.cta': '응급 대응 가이드',
    'action.askAI.title': '의학적 질문이 있어요',
    'action.askAI.desc': '근거 기반 AI 어시스턴트가 24시간 대응. 대화 저장 안함, 개별 처방 제안 안함.',
    'action.askAI.cta': 'AI에게 질문하기',
    'action.ariaLabel': '빠른 시작',

    // HeroSection
    'hero.subtitle': '근거 기반 · 위해 감소 · 의료 안내',
    'hero.ctaPrimary': 'AI 어시스턴트에게 질문',
    'hero.ctaPathway': '나의 경로 시작하기',

    // MissionStatement
    'mission.label': '심각한 현실',
    'mission.ariaLabel': '미션 선언문',
    'mission.stat.before': '전 세계적으로 HRT를 사용하는 트랜스젠더 다수가',
    'mission.stat.number': '적절한',
    'mission.stat.after': '의료 지도나 모니터링을 받지 못하고 있습니다.',
    'mission.body.before': '이 사이트는 근거에 기반한',
    'mission.body.give': '',
    'mission.body.baseline': '안전 기준선',

    // EmergencyBanner
    'emergency.text': '다음 증상이 있으면 즉시 HRT를 중단하고 응급 진료를 받으세요:',
    'emergency.symptoms': '한쪽 종아리 부종이나 통증 · 갑작스러운 심한 두통과 시력 변화 · 흉통이나 호흡 곤란 · 피부나 눈의 황달 · 지속적인 심각한 감정 위기나 자살 충동',
    'emergency.link': '응급 상세 정보 확인',

    // a11y
    'a11y.skipToMain': '본문으로 건너뛰기',

    // SiteFooter
    'footer.disclaimer.title': '면책 조항',
    'footer.disclaimer.text': '이 사이트의 정보는 참고용이며 의료 조언이 아닙니다. 호르몬 치료를 시작하기 전에 반드시 의료 전문가와 상담하세요.',
    'footer.privacy.title': '개인정보 보호',
    'footer.privacy.text': '개인 데이터를 수집하거나 저장하지 않습니다. 검색 기록도 추적하지 않습니다.',
    'footer.sources.title': '근거 출처',
    'footer.sources.text': '모든 데이터는 WPATH SOC 8, 내분비학회 가이드라인 및 동료 심사 연구에 기반합니다.',
    'footer.dev.title': '오픈 소스',
    'footer.dev.text': '이 프로젝트는 오픈 소스로 구축되었습니다. 개발자, 의료인, 커뮤니티의 기여를 환영합니다.',
    'footer.brand': 'HRT약전',
    'footer.notice': '이 사이트는 처방전 발급, 약물 판매, 개인 정보 수집을 하지 않습니다.',
    'footer.navLabel': '하단 링크',
    'footer.link.guides': '실용 가이드',
    'footer.link.privacy': '개인정보 보호정책',
    'footer.link.disclaimer': '면책 조항',
    'footer.link.github': '오픈 소스 프로젝트',
    'footer.link.feedback': '피드백',
    'footer.copy': 'HRT약전 · 근거 기반 · 위해 감소 · 의료 안내',

    // DrugBrandGallery
    'brandGallery.viewAll': '전체 브랜드 색인 보기 →',

    // Blog
    'blog.title': '특집 기사',
    'blog.subtitle': 'HRT 자주 묻는 질문 심층 해설',
    'blog.readMore': '전체 읽기',
    'blog.readingTime': '약 {min}분',
    'blog.publishedOn': '게시일',
    'blog.updatedOn': '업데이트',
    'blog.relatedDocs': '관련 문서',
    'blog.relatedArticles': '관련 기사',
    'blog.backToIndex': '← 기사 목록으로',
    'blog.backToDocs': '← 약전으로',
    'blog.allCategories': '전체',
    'blog.breadcrumb.home': '홈',
    'blog.breadcrumb.blog': '특집 기사',
    'blog.disclaimer': '이 기사는 정보 제공 목적으로만 작성되었으며 의료 조언이 아닙니다. 치료 결정은 의료 전문가와 상담하세요.',

    // DrugQuickNav
    'drugNav.title': '약물 빠른 검색',
    'drugNav.ariaLabel': '약물 빠른 탐색',
    'drugNav.estrogens': '에스트로겐',
    'drugNav.antiandrogens': '항안드로겐',
    'drugNav.progestogens': '프로게스토겐',
    'drugNav.viewAll': '전체 20종 약물 보기 →',

    // HeroSearch
    'hero.searchPlaceholder': '약물, 증상 또는 가이드 검색...',
    'hero.searchLabel': '사이트 검색',

    // Links page
    'links.title': '빠른 링크',
    'links.subtitle': '근거 기반 · 위험 감소 · 진료 안내',
  },

  pt: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'Que esta jornada leve você ao seu verdadeiro eu',

    // SplashNav
    'nav.before': 'Antes de Começar',
    'nav.pathway': 'Trajetória da HRT',
    'nav.medications': 'Medicamentos',
    'nav.doseLimits': 'Limites de Dose',
    'nav.bloodTests': 'Exames de Sangue',
    'nav.risks': 'Riscos e Emergências',
    'nav.tools': 'Ferramentas',
    'nav.guides': 'Guias Práticos',
    'nav.blog': 'Blog',
    'nav.search': 'Buscar',
    'nav.ariaLabel': 'Navegação principal',

    // ActionCards
    'action.notStarted.title': 'Ainda não comecei a HRT',
    'action.notStarted.desc': 'Entenda os exames de base, as contraindicações e o consentimento informado — construa uma base segura antes da sua primeira dose.',
    'action.onHRT.title': 'Já estou fazendo HRT',
    'action.onHRT.desc': 'Siga a trajetória clínica, acompanhe seus níveis e otimize seu protocolo para a saúde a longo prazo.',
    'action.problem.title': 'Algo parece errado',
    'action.problem.desc': 'Reconheça os sinais de perigo e saiba quando procurar atendimento de emergência. Sua segurança vem sempre em primeiro lugar.',
    'action.notStarted.cta': 'Explorar Exames de Base',
    'action.onHRT.cta': 'Acompanhar Trajetória',
    'action.problem.cta': 'Ação de Emergência',
    'action.askAI.title': 'Tenho uma dúvida médica',
    'action.askAI.desc': 'Assistente de IA baseado em evidências disponível 24 horas. Sem armazenamento de conversas, sem prescrições personalizadas.',
    'action.askAI.cta': 'Perguntar ao Assistente de IA',
    'action.ariaLabel': 'Início rápido',

    // HeroSection
    'hero.subtitle': 'Baseado em Evidências · Redução de Danos · Cuidado Orientado',
    'hero.ctaPrimary': 'Perguntar ao Assistente de IA',
    'hero.ctaPathway': 'Iniciar Minha Trajetória',

    // MissionStatement
    'mission.label': 'A Realidade Crítica',
    'mission.ariaLabel': 'Declaração de missão',
    'mission.stat.before': 'Em todo o mundo, inúmeras pessoas transgênero em HRT não têm acesso a',
    'mission.stat.number': 'qualquer',
    'mission.stat.after': 'orientação ou monitoramento médico.',
    'mission.body.before': 'Este site existe para oferecer a você uma base de segurança baseada em evidências',
    'mission.body.give': '',
    'mission.body.baseline': 'base de segurança',

    // EmergencyBanner
    'emergency.text': 'Se você estiver passando por qualquer uma das situações a seguir, interrompa a HRT e procure atendimento de emergência imediatamente:',
    'emergency.symptoms': 'Inchaço ou dor unilateral na panturrilha · Dor de cabeça súbita e intensa com alterações na visão · Dor no peito ou dificuldade para respirar · Amarelamento da pele ou dos olhos · Crise emocional grave e persistente ou ideação suicida',
    'emergency.link': 'Ver detalhes de emergência',

    // a11y
    'a11y.skipToMain': 'Pular para o conteúdo principal',

    // SiteFooter
    'footer.disclaimer.title': 'Aviso Legal',
    'footer.disclaimer.text': 'Este site tem finalidade apenas informativa e não constitui aconselhamento médico. Sempre consulte um profissional de saúde qualificado antes de iniciar qualquer terapia hormonal.',
    'footer.privacy.title': 'Privacidade',
    'footer.privacy.text': 'Respeitamos sua privacidade. Nenhum dado pessoal é coletado ou armazenado. O histórico de navegação nunca é rastreado.',
    'footer.sources.title': 'Fontes de Evidência',
    'footer.sources.text': 'Todos os dados clínicos são provenientes do WPATH SOC 8, das Diretrizes da Endocrine Society, do UCSF Transgender Care e de pesquisas revisadas por pares.',
    'footer.dev.title': 'Código Aberto',
    'footer.dev.text': 'Este projeto é desenvolvido de forma aberta. Contribuições de desenvolvedores, profissionais de saúde e membros da comunidade são bem-vindas.',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'Este site não prescreve medicamentos, não vende remédios e não coleta informações pessoais.',
    'footer.navLabel': 'Links do rodapé',
    'footer.link.guides': 'Guias Práticos',
    'footer.link.privacy': 'Política de Privacidade',
    'footer.link.disclaimer': 'Aviso Médico',
    'footer.link.github': 'Projeto no GitHub',
    'footer.link.feedback': 'Feedback',
    'footer.copy': 'HRT Yakuten · Baseado em Evidências · Redução de Danos',

    // DrugBrandGallery
    'brandGallery.viewAll': 'Ver índice completo de marcas →',

    // Blog
    'blog.title': 'Artigos',
    'blog.subtitle': 'Respostas detalhadas para dúvidas comuns sobre HRT',
    'blog.readMore': 'Ler mais',
    'blog.readingTime': '{min} min de leitura',
    'blog.publishedOn': 'Publicado',
    'blog.updatedOn': 'Atualizado',
    'blog.relatedDocs': 'Recursos Relacionados',
    'blog.relatedArticles': 'Artigos Relacionados',
    'blog.backToIndex': '← Voltar aos artigos',
    'blog.backToDocs': '← Voltar aos documentos',
    'blog.allCategories': 'Todos',
    'blog.breadcrumb.home': 'Início',
    'blog.breadcrumb.blog': 'Artigos',
    'blog.disclaimer': 'Este artigo tem finalidade apenas informativa e não constitui aconselhamento médico. Consulte um profissional de saúde qualificado para decisões de tratamento.',

    // DrugQuickNav
    'drugNav.title': 'Consulta Rápida de Medicamentos',
    'drugNav.ariaLabel': 'Navegação rápida de medicamentos',
    'drugNav.estrogens': 'Estrogênios',
    'drugNav.antiandrogens': 'Antiandrógenos',
    'drugNav.progestogens': 'Progestógenos',
    'drugNav.viewAll': 'Ver todos os 20 medicamentos →',

    // HeroSearch
    'hero.searchPlaceholder': 'Buscar medicamentos, sintomas ou guias...',
    'hero.searchLabel': 'Busca no site',

    // Links page
    'links.title': 'Links Rápidos',
    'links.subtitle': 'Baseado em Evidências · Redução de Danos · Cuidado Orientado',
  },

  ru: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'Пусть этот путь приведёт вас к настоящей себе',

    // SplashNav
    'nav.before': 'Перед началом',
    'nav.pathway': 'Путь ЗГТ',
    'nav.medications': 'Препараты',
    'nav.doseLimits': 'Пределы доз',
    'nav.bloodTests': 'Анализы крови',
    'nav.risks': 'Риски и неотложные состояния',
    'nav.tools': 'Инструменты',
    'nav.guides': 'Практические руководства',
    'nav.blog': 'Блог',
    'nav.search': 'Поиск',
    'nav.ariaLabel': 'Основная навигация',

    // ActionCards
    'action.notStarted.title': 'Я ещё не начал(а) ЗГТ',
    'action.notStarted.desc': 'Изучите базовые анализы, противопоказания и информированное согласие — создайте безопасную основу до первой дозы.',
    'action.onHRT.title': 'Я уже на ЗГТ',
    'action.onHRT.desc': 'Следуйте клиническому пути, отслеживайте уровни гормонов и оптимизируйте схему для долгосрочного здоровья.',
    'action.problem.title': 'Что-то не так',
    'action.problem.desc': 'Распознавайте тревожные признаки и знайте, когда обращаться за неотложной помощью. Ваша безопасность всегда на первом месте.',
    'action.notStarted.cta': 'Изучить базовые анализы',
    'action.onHRT.cta': 'Проследить путь',
    'action.problem.cta': 'Экстренные действия',
    'action.askAI.title': 'У меня медицинский вопрос',
    'action.askAI.desc': 'ИИ-ассистент на основе доказательной медицины доступен круглосуточно. Без сохранения переписки, без персональных назначений.',
    'action.askAI.cta': 'Спросить ИИ-ассистента',
    'action.ariaLabel': 'Быстрый старт',

    // HeroSection
    'hero.subtitle': 'Доказательно · Снижение вреда · Сопровождение к помощи',
    'hero.ctaPrimary': 'Спросить ИИ-ассистента',
    'hero.ctaPathway': 'Начать мой путь',

    // MissionStatement
    'mission.label': 'Суровая реальность',
    'mission.ariaLabel': 'Заявление о миссии',
    'mission.stat.before': 'По всему миру бесчисленные трансгендерные люди на ЗГТ не имеют доступа к',
    'mission.stat.number': 'какому-либо',
    'mission.stat.after': 'медицинскому сопровождению или мониторингу.',
    'mission.body.before': 'Этот сайт существует, чтобы дать вам доказательную',
    'mission.body.give': '',
    'mission.body.baseline': 'основу безопасности',

    // EmergencyBanner
    'emergency.text': 'Если вы испытываете что-либо из перечисленного, прекратите ЗГТ и немедленно обратитесь за неотложной помощью:',
    'emergency.symptoms': 'Односторонний отёк или боль в голени · Внезапная сильная головная боль с нарушением зрения · Боль в груди или затруднённое дыхание · Пожелтение кожи или глаз · Стойкий тяжёлый эмоциональный кризис или суицидальные мысли',
    'emergency.link': 'Подробности о неотложных состояниях',

    // a11y
    'a11y.skipToMain': 'Перейти к основному содержанию',

    // SiteFooter
    'footer.disclaimer.title': 'Отказ от ответственности',
    'footer.disclaimer.text': 'Этот сайт носит исключительно информационный характер и не является медицинской консультацией. Всегда консультируйтесь с квалифицированным медицинским специалистом перед началом любой гормональной терапии.',
    'footer.privacy.title': 'Конфиденциальность',
    'footer.privacy.text': 'Мы уважаем вашу конфиденциальность. Персональные данные не собираются и не хранятся. История просмотров никогда не отслеживается.',
    'footer.sources.title': 'Источники доказательств',
    'footer.sources.text': 'Все клинические данные взяты из WPATH SOC 8, рекомендаций Endocrine Society, UCSF Transgender Care и рецензируемых исследований.',
    'footer.dev.title': 'Открытый код',
    'footer.dev.text': 'Этот проект разрабатывается открыто. Приветствуется вклад разработчиков, врачей и членов сообщества.',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'Этот сайт не выписывает рецепты, не продаёт лекарства и не собирает личную информацию.',
    'footer.navLabel': 'Ссылки в подвале',
    'footer.link.guides': 'Практические руководства',
    'footer.link.privacy': 'Политика конфиденциальности',
    'footer.link.disclaimer': 'Медицинский дисклеймер',
    'footer.link.github': 'Проект на GitHub',
    'footer.link.feedback': 'Обратная связь',
    'footer.copy': 'HRT Yakuten · Доказательно · Снижение вреда',

    // DrugBrandGallery
    'brandGallery.viewAll': 'Смотреть полный указатель брендов →',

    // Blog
    'blog.title': 'Статьи',
    'blog.subtitle': 'Подробные ответы на частые вопросы о ЗГТ',
    'blog.readMore': 'Читать далее',
    'blog.readingTime': '{min} мин чтения',
    'blog.publishedOn': 'Опубликовано',
    'blog.updatedOn': 'Обновлено',
    'blog.relatedDocs': 'Связанные материалы',
    'blog.relatedArticles': 'Похожие статьи',
    'blog.backToIndex': '← Назад к статьям',
    'blog.backToDocs': '← Назад к справочнику',
    'blog.allCategories': 'Все',
    'blog.breadcrumb.home': 'Главная',
    'blog.breadcrumb.blog': 'Статьи',
    'blog.disclaimer': 'Эта статья носит исключительно информационный характер и не является медицинской консультацией. Для решений о лечении обратитесь к квалифицированному медицинскому специалисту.',

    // DrugQuickNav
    'drugNav.title': 'Быстрый поиск препаратов',
    'drugNav.ariaLabel': 'Быстрая навигация по препаратам',
    'drugNav.estrogens': 'Эстрогены',
    'drugNav.antiandrogens': 'Антиандрогены',
    'drugNav.progestogens': 'Прогестагены',
    'drugNav.viewAll': 'Смотреть все 20 препаратов →',

    // HeroSearch
    'hero.searchPlaceholder': 'Поиск препаратов, симптомов или руководств...',
    'hero.searchLabel': 'Поиск по сайту',

    // Links page
    'links.title': 'Быстрые ссылки',
    'links.subtitle': 'Доказательно · Снижение вреда · Сопровождение к помощи',
  },

  es: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'Que este camino te lleve a tu verdadero yo',

    // SplashNav
    'nav.before': 'Antes de Empezar',
    'nav.pathway': 'Trayectoria de la THS',
    'nav.medications': 'Medicamentos',
    'nav.doseLimits': 'Límites de Dosis',
    'nav.bloodTests': 'Análisis de Sangre',
    'nav.risks': 'Riesgos y Emergencias',
    'nav.tools': 'Herramientas',
    'nav.guides': 'Guías Prácticas',
    'nav.blog': 'Blog',
    'nav.search': 'Buscar',
    'nav.ariaLabel': 'Navegación principal',

    // ActionCards
    'action.notStarted.title': 'Aún no he empezado la THS',
    'action.notStarted.desc': 'Comprende los análisis de base, las contraindicaciones y el consentimiento informado: construye una base segura antes de tu primera dosis.',
    'action.onHRT.title': 'Ya estoy en THS',
    'action.onHRT.desc': 'Sigue la trayectoria clínica, controla tus niveles y optimiza tu pauta para una salud a largo plazo.',
    'action.problem.title': 'Algo va mal',
    'action.problem.desc': 'Reconoce las señales de peligro y sabe cuándo buscar atención de emergencia. Tu seguridad siempre es lo primero.',
    'action.notStarted.cta': 'Explorar Análisis de Base',
    'action.onHRT.cta': 'Seguir la Trayectoria',
    'action.problem.cta': 'Acción de Emergencia',
    'action.askAI.title': 'Tengo una duda médica',
    'action.askAI.desc': 'Asistente de IA basado en evidencia disponible 24/7. Sin almacenamiento de conversaciones, sin recetas personalizadas.',
    'action.askAI.cta': 'Preguntar al Asistente de IA',
    'action.ariaLabel': 'Inicio rápido',

    // HeroSection
    'hero.subtitle': 'Basado en Evidencia · Reducción de Daños · Atención Guiada',
    'hero.ctaPrimary': 'Preguntar al Asistente de IA',
    'hero.ctaPathway': 'Iniciar Mi Trayectoria',

    // MissionStatement
    'mission.label': 'La Realidad Crítica',
    'mission.ariaLabel': 'Declaración de misión',
    'mission.stat.before': 'En todo el mundo, innumerables personas transgénero en THS no tienen acceso a',
    'mission.stat.number': 'ninguna',
    'mission.stat.after': 'orientación ni seguimiento médico.',
    'mission.body.before': 'Este sitio existe para darte una base de seguridad basada en evidencia',
    'mission.body.give': '',
    'mission.body.baseline': 'base de seguridad',

    // EmergencyBanner
    'emergency.text': 'Si experimentas cualquiera de las siguientes situaciones, suspende la THS y busca atención de emergencia de inmediato:',
    'emergency.symptoms': 'Hinchazón o dolor unilateral en la pantorrilla · Dolor de cabeza repentino e intenso con cambios en la visión · Dolor en el pecho o dificultad para respirar · Coloración amarilla de la piel o los ojos · Crisis emocional grave y persistente o ideación suicida',
    'emergency.link': 'Ver detalles de emergencia',

    // a11y
    'a11y.skipToMain': 'Saltar al contenido principal',

    // SiteFooter
    'footer.disclaimer.title': 'Aviso Legal',
    'footer.disclaimer.text': 'Este sitio tiene únicamente fines informativos y no constituye asesoramiento médico. Consulta siempre a un profesional de la salud cualificado antes de iniciar cualquier terapia hormonal.',
    'footer.privacy.title': 'Privacidad',
    'footer.privacy.text': 'Respetamos tu privacidad. No se recopila ni almacena ningún dato personal. El historial de navegación nunca se rastrea.',
    'footer.sources.title': 'Fuentes de Evidencia',
    'footer.sources.text': 'Todos los datos clínicos provienen de WPATH SOC 8, las Guías de la Endocrine Society, UCSF Transgender Care e investigaciones revisadas por pares.',
    'footer.dev.title': 'Código Abierto',
    'footer.dev.text': 'Este proyecto se desarrolla de forma abierta. Se agradecen las contribuciones de desarrolladores, profesionales clínicos y miembros de la comunidad.',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'Este sitio no receta medicamentos, no vende fármacos ni recopila información personal.',
    'footer.navLabel': 'Enlaces del pie de página',
    'footer.link.guides': 'Guías Prácticas',
    'footer.link.privacy': 'Política de Privacidad',
    'footer.link.disclaimer': 'Aviso Médico',
    'footer.link.github': 'Proyecto en GitHub',
    'footer.link.feedback': 'Comentarios',
    'footer.copy': 'HRT Yakuten · Basado en Evidencia · Reducción de Daños',

    // DrugBrandGallery
    'brandGallery.viewAll': 'Ver índice completo de marcas →',

    // Blog
    'blog.title': 'Artículos',
    'blog.subtitle': 'Respuestas detalladas a preguntas frecuentes sobre la THS',
    'blog.readMore': 'Leer más',
    'blog.readingTime': '{min} min de lectura',
    'blog.publishedOn': 'Publicado',
    'blog.updatedOn': 'Actualizado',
    'blog.relatedDocs': 'Recursos Relacionados',
    'blog.relatedArticles': 'Artículos Relacionados',
    'blog.backToIndex': '← Volver a los artículos',
    'blog.backToDocs': '← Volver a los documentos',
    'blog.allCategories': 'Todos',
    'blog.breadcrumb.home': 'Inicio',
    'blog.breadcrumb.blog': 'Artículos',
    'blog.disclaimer': 'Este artículo tiene únicamente fines informativos y no constituye asesoramiento médico. Consulta a un profesional de la salud cualificado para las decisiones de tratamiento.',

    // DrugQuickNav
    'drugNav.title': 'Consulta Rápida de Medicamentos',
    'drugNav.ariaLabel': 'Navegación rápida de medicamentos',
    'drugNav.estrogens': 'Estrógenos',
    'drugNav.antiandrogens': 'Antiandrógenos',
    'drugNav.progestogens': 'Progestágenos',
    'drugNav.viewAll': 'Ver los 20 medicamentos →',

    // HeroSearch
    'hero.searchPlaceholder': 'Buscar medicamentos, síntomas o guías...',
    'hero.searchLabel': 'Búsqueda en el sitio',

    // Links page
    'links.title': 'Enlaces Rápidos',
    'links.subtitle': 'Basado en Evidencia · Reducción de Daños · Atención Guiada',
  },

  id: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'Semoga perjalanan ini membawamu pada dirimu yang sejati',

    // SplashNav
    'nav.before': 'Sebelum Memulai',
    'nav.pathway': 'Jalur HRT',
    'nav.medications': 'Obat-obatan',
    'nav.doseLimits': 'Batas Dosis',
    'nav.bloodTests': 'Tes Darah',
    'nav.risks': 'Risiko & Darurat',
    'nav.tools': 'Alat',
    'nav.guides': 'Panduan Praktis',
    'nav.blog': 'Blog',
    'nav.search': 'Cari',
    'nav.ariaLabel': 'Navigasi utama',

    // ActionCards
    'action.notStarted.title': 'Saya belum memulai HRT',
    'action.notStarted.desc': 'Pahami pemeriksaan dasar, kontraindikasi, dan persetujuan berdasarkan informasi — bangun fondasi yang aman sebelum dosis pertama Anda.',
    'action.onHRT.title': 'Saya sudah menjalani HRT',
    'action.onHRT.desc': 'Ikuti jalur klinis, pantau kadar hormon Anda, dan optimalkan regimen untuk kesehatan jangka panjang.',
    'action.problem.title': 'Ada yang terasa tidak beres',
    'action.problem.desc': 'Kenali tanda bahaya dan ketahui kapan harus mencari perawatan darurat. Keselamatan Anda selalu yang utama.',
    'action.notStarted.cta': 'Jelajahi Pemeriksaan Dasar',
    'action.onHRT.cta': 'Telusuri Jalur',
    'action.problem.cta': 'Tindakan Darurat',
    'action.askAI.title': 'Saya punya pertanyaan medis',
    'action.askAI.desc': 'Asisten AI berbasis bukti tersedia 24/7. Tanpa penyimpanan percakapan, tanpa resep yang dipersonalisasi.',
    'action.askAI.cta': 'Tanya Asisten AI',
    'action.ariaLabel': 'Mulai cepat',

    // HeroSection
    'hero.subtitle': 'Berbasis Bukti · Pengurangan Dampak · Pendampingan Medis',
    'hero.ctaPrimary': 'Tanya Asisten AI',
    'hero.ctaPathway': 'Mulai Jalur Saya',

    // MissionStatement
    'mission.label': 'Realitas yang Genting',
    'mission.ariaLabel': 'Pernyataan misi',
    'mission.stat.before': 'Di seluruh dunia, banyak sekali orang transgender yang menjalani HRT tidak memiliki akses ke',
    'mission.stat.number': 'sama sekali',
    'mission.stat.after': 'panduan atau pemantauan medis.',
    'mission.body.before': 'Situs ini hadir untuk memberi Anda dasar keselamatan berbasis bukti',
    'mission.body.give': '',
    'mission.body.baseline': 'dasar keselamatan',

    // EmergencyBanner
    'emergency.text': 'Jika Anda mengalami salah satu kondisi berikut, hentikan HRT dan segera cari perawatan darurat:',
    'emergency.symptoms': 'Pembengkakan atau nyeri pada satu betis · Sakit kepala hebat mendadak disertai gangguan penglihatan · Nyeri dada atau kesulitan bernapas · Kulit atau mata menguning · Krisis emosional berat yang menetap atau pikiran untuk bunuh diri',
    'emergency.link': 'Lihat detail darurat',

    // a11y
    'a11y.skipToMain': 'Lewati ke konten utama',

    // SiteFooter
    'footer.disclaimer.title': 'Penafian',
    'footer.disclaimer.text': 'Situs ini hanya untuk tujuan informasi dan bukan merupakan nasihat medis. Selalu konsultasikan dengan tenaga kesehatan yang memenuhi syarat sebelum memulai terapi hormon apa pun.',
    'footer.privacy.title': 'Privasi',
    'footer.privacy.text': 'Kami menghormati privasi Anda. Tidak ada data pribadi yang dikumpulkan atau disimpan. Riwayat penelusuran tidak pernah dilacak.',
    'footer.sources.title': 'Sumber Bukti',
    'footer.sources.text': 'Semua data klinis bersumber dari WPATH SOC 8, Pedoman Endocrine Society, UCSF Transgender Care, dan penelitian yang ditinjau sejawat.',
    'footer.dev.title': 'Sumber Terbuka',
    'footer.dev.text': 'Proyek ini dibangun secara terbuka. Kontribusi dari pengembang, klinisi, dan anggota komunitas sangat diterima.',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'Situs ini tidak meresepkan obat, tidak menjual obat, dan tidak mengumpulkan informasi pribadi.',
    'footer.navLabel': 'Tautan footer',
    'footer.link.guides': 'Panduan Praktis',
    'footer.link.privacy': 'Kebijakan Privasi',
    'footer.link.disclaimer': 'Penafian Medis',
    'footer.link.github': 'Proyek GitHub',
    'footer.link.feedback': 'Masukan',
    'footer.copy': 'HRT Yakuten · Berbasis Bukti · Pengurangan Dampak',

    // DrugBrandGallery
    'brandGallery.viewAll': 'Lihat indeks merek lengkap →',

    // Blog
    'blog.title': 'Artikel',
    'blog.subtitle': 'Jawaban mendalam untuk pertanyaan umum seputar HRT',
    'blog.readMore': 'Baca selengkapnya',
    'blog.readingTime': '{min} menit baca',
    'blog.publishedOn': 'Diterbitkan',
    'blog.updatedOn': 'Diperbarui',
    'blog.relatedDocs': 'Sumber Terkait',
    'blog.relatedArticles': 'Artikel Terkait',
    'blog.backToIndex': '← Kembali ke artikel',
    'blog.backToDocs': '← Kembali ke dokumen',
    'blog.allCategories': 'Semua',
    'blog.breadcrumb.home': 'Beranda',
    'blog.breadcrumb.blog': 'Artikel',
    'blog.disclaimer': 'Artikel ini hanya untuk tujuan informasi dan bukan merupakan nasihat medis. Konsultasikan dengan tenaga kesehatan yang memenuhi syarat untuk keputusan pengobatan.',

    // DrugQuickNav
    'drugNav.title': 'Pencarian Cepat Obat',
    'drugNav.ariaLabel': 'Navigasi cepat obat',
    'drugNav.estrogens': 'Estrogen',
    'drugNav.antiandrogens': 'Anti-Androgen',
    'drugNav.progestogens': 'Progestogen',
    'drugNav.viewAll': 'Lihat semua 20 obat →',

    // HeroSearch
    'hero.searchPlaceholder': 'Cari obat, gejala, atau panduan...',
    'hero.searchLabel': 'Pencarian situs',

    // Links page
    'links.title': 'Tautan Cepat',
    'links.subtitle': 'Berbasis Bukti · Pengurangan Dampak · Pendampingan Medis',
  },

  th: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'ขอให้เส้นทางนี้นำคุณไปสู่ตัวตนที่แท้จริง',

    // SplashNav
    'nav.before': 'ก่อนเริ่ม',
    'nav.pathway': 'เส้นทาง HRT',
    'nav.medications': 'ยา',
    'nav.doseLimits': 'ขีดจำกัดขนาดยา',
    'nav.bloodTests': 'การตรวจเลือด',
    'nav.risks': 'ความเสี่ยงและภาวะฉุกเฉิน',
    'nav.tools': 'เครื่องมือ',
    'nav.guides': 'คู่มือปฏิบัติ',
    'nav.blog': 'บล็อก',
    'nav.search': 'ค้นหา',
    'nav.ariaLabel': 'การนำทางหลัก',

    // ActionCards
    'action.notStarted.title': 'ฉันยังไม่ได้เริ่ม HRT',
    'action.notStarted.desc': 'ทำความเข้าใจการตรวจพื้นฐาน ข้อห้าม และการยินยอมโดยได้รับข้อมูล — สร้างรากฐานที่ปลอดภัยก่อนรับยาครั้งแรก',
    'action.onHRT.title': 'ฉันกำลังใช้ HRT อยู่แล้ว',
    'action.onHRT.desc': 'ทำตามเส้นทางทางคลินิก ติดตามระดับฮอร์โมนของคุณ และปรับสูตรยาให้เหมาะกับสุขภาพระยะยาว',
    'action.problem.title': 'รู้สึกว่ามีบางอย่างผิดปกติ',
    'action.problem.desc': 'รู้จักสัญญาณอันตรายและรู้ว่าเมื่อใดควรขอความช่วยเหลือฉุกเฉิน ความปลอดภัยของคุณสำคัญที่สุดเสมอ',
    'action.notStarted.cta': 'สำรวจการตรวจพื้นฐาน',
    'action.onHRT.cta': 'ติดตามเส้นทาง',
    'action.problem.cta': 'การดำเนินการฉุกเฉิน',
    'action.askAI.title': 'ฉันมีคำถามทางการแพทย์',
    'action.askAI.desc': 'ผู้ช่วย AI ที่อิงหลักฐานพร้อมให้บริการตลอด 24 ชั่วโมง ไม่จัดเก็บบทสนทนา ไม่ให้ใบสั่งยาเฉพาะบุคคล',
    'action.askAI.cta': 'ถามผู้ช่วย AI',
    'action.ariaLabel': 'เริ่มต้นอย่างรวดเร็ว',

    // HeroSection
    'hero.subtitle': 'อิงหลักฐาน · ลดอันตราย · นำทางสู่การรักษา',
    'hero.ctaPrimary': 'ถามผู้ช่วย AI',
    'hero.ctaPathway': 'เริ่มเส้นทางของฉัน',

    // MissionStatement
    'mission.label': 'ความเป็นจริงที่วิกฤต',
    'mission.ariaLabel': 'คำแถลงพันธกิจ',
    'mission.stat.before': 'ทั่วโลก คนข้ามเพศจำนวนนับไม่ถ้วนที่ใช้ HRT ไม่สามารถเข้าถึง',
    'mission.stat.number': 'ใดๆ',
    'mission.stat.after': 'คำแนะนำหรือการติดตามทางการแพทย์',
    'mission.body.before': 'เว็บไซต์นี้มีอยู่เพื่อมอบพื้นฐานความปลอดภัยที่อิงหลักฐานให้แก่คุณ',
    'mission.body.give': '',
    'mission.body.baseline': 'พื้นฐานความปลอดภัย',

    // EmergencyBanner
    'emergency.text': 'หากคุณกำลังประสบกับอาการใดต่อไปนี้ ให้หยุด HRT และรีบไปพบแพทย์ฉุกเฉินทันที:',
    'emergency.symptoms': 'บวมหรือปวดน่องข้างเดียว · ปวดศีรษะรุนแรงเฉียบพลันร่วมกับการมองเห็นเปลี่ยนแปลง · เจ็บหน้าอกหรือหายใจลำบาก · ผิวหนังหรือตาเหลือง · ภาวะวิกฤติทางอารมณ์รุนแรงต่อเนื่องหรือความคิดฆ่าตัวตาย',
    'emergency.link': 'ดูรายละเอียดฉุกเฉิน',

    // a11y
    'a11y.skipToMain': 'ข้ามไปยังเนื้อหาหลัก',

    // SiteFooter
    'footer.disclaimer.title': 'ข้อปฏิเสธความรับผิด',
    'footer.disclaimer.text': 'เว็บไซต์นี้มีไว้เพื่อให้ข้อมูลเท่านั้นและไม่ถือเป็นคำแนะนำทางการแพทย์ โปรดปรึกษาบุคลากรทางการแพทย์ที่มีคุณสมบัติเสมอก่อนเริ่มการบำบัดด้วยฮอร์โมนใดๆ',
    'footer.privacy.title': 'ความเป็นส่วนตัว',
    'footer.privacy.text': 'เราเคารพความเป็นส่วนตัวของคุณ ไม่มีการเก็บหรือจัดเก็บข้อมูลส่วนบุคคล ประวัติการเรียกดูไม่เคยถูกติดตาม',
    'footer.sources.title': 'แหล่งหลักฐาน',
    'footer.sources.text': 'ข้อมูลทางคลินิกทั้งหมดมาจาก WPATH SOC 8, แนวทางของ Endocrine Society, UCSF Transgender Care และงานวิจัยที่ผ่านการทบทวนโดยผู้เชี่ยวชาญ',
    'footer.dev.title': 'โอเพนซอร์ส',
    'footer.dev.text': 'โครงการนี้พัฒนาแบบเปิด ยินดีรับการมีส่วนร่วมจากนักพัฒนา แพทย์ และสมาชิกชุมชน',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'เว็บไซต์นี้ไม่สั่งจ่ายยา ไม่ขายยา และไม่เก็บข้อมูลส่วนบุคคล',
    'footer.navLabel': 'ลิงก์ส่วนท้าย',
    'footer.link.guides': 'คู่มือปฏิบัติ',
    'footer.link.privacy': 'นโยบายความเป็นส่วนตัว',
    'footer.link.disclaimer': 'ข้อปฏิเสธทางการแพทย์',
    'footer.link.github': 'โครงการ GitHub',
    'footer.link.feedback': 'ข้อเสนอแนะ',
    'footer.copy': 'HRT Yakuten · อิงหลักฐาน · ลดอันตราย',

    // DrugBrandGallery
    'brandGallery.viewAll': 'ดูดัชนีแบรนด์ทั้งหมด →',

    // Blog
    'blog.title': 'บทความ',
    'blog.subtitle': 'คำตอบเชิงลึกสำหรับคำถามที่พบบ่อยเกี่ยวกับ HRT',
    'blog.readMore': 'อ่านเพิ่มเติม',
    'blog.readingTime': 'อ่าน {min} นาที',
    'blog.publishedOn': 'เผยแพร่เมื่อ',
    'blog.updatedOn': 'อัปเดตเมื่อ',
    'blog.relatedDocs': 'แหล่งข้อมูลที่เกี่ยวข้อง',
    'blog.relatedArticles': 'บทความที่เกี่ยวข้อง',
    'blog.backToIndex': '← กลับไปยังบทความ',
    'blog.backToDocs': '← กลับไปยังเอกสาร',
    'blog.allCategories': 'ทั้งหมด',
    'blog.breadcrumb.home': 'หน้าแรก',
    'blog.breadcrumb.blog': 'บทความ',
    'blog.disclaimer': 'บทความนี้มีไว้เพื่อให้ข้อมูลเท่านั้นและไม่ถือเป็นคำแนะนำทางการแพทย์ โปรดปรึกษาบุคลากรทางการแพทย์ที่มีคุณสมบัติสำหรับการตัดสินใจรักษา',

    // DrugQuickNav
    'drugNav.title': 'ค้นหายาอย่างรวดเร็ว',
    'drugNav.ariaLabel': 'การนำทางยาอย่างรวดเร็ว',
    'drugNav.estrogens': 'เอสโตรเจน',
    'drugNav.antiandrogens': 'แอนติแอนโดรเจน',
    'drugNav.progestogens': 'โปรเจสโตเจน',
    'drugNav.viewAll': 'ดูยาทั้งหมด 20 ชนิด →',

    // HeroSearch
    'hero.searchPlaceholder': 'ค้นหายา อาการ หรือคู่มือ...',
    'hero.searchLabel': 'ค้นหาในเว็บไซต์',

    // Links page
    'links.title': 'ลิงก์ด่วน',
    'links.subtitle': 'อิงหลักฐาน · ลดอันตราย · นำทางสู่การรักษา',
  },

  fil: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'Nawa\'y dalhin ka ng paglalakbay na ito sa tunay mong sarili',

    // SplashNav
    'nav.before': 'Bago Magsimula',
    'nav.pathway': 'Landas ng HRT',
    'nav.medications': 'Mga Gamot',
    'nav.doseLimits': 'Mga Limitasyon sa Dosis',
    'nav.bloodTests': 'Mga Pagsusuri sa Dugo',
    'nav.risks': 'Mga Panganib at Emerhensiya',
    'nav.tools': 'Mga Kasangkapan',
    'nav.guides': 'Mga Praktikal na Gabay',
    'nav.blog': 'Blog',
    'nav.search': 'Maghanap',
    'nav.ariaLabel': 'Pangunahing nabigasyon',

    // ActionCards
    'action.notStarted.title': 'Hindi pa ako nagsisimula ng HRT',
    'action.notStarted.desc': 'Unawain ang mga baseline na pagsusuri, kontraindikasyon, at informed consent — magtayo ng ligtas na pundasyon bago ang iyong unang dosis.',
    'action.onHRT.title': 'Nasa HRT na ako',
    'action.onHRT.desc': 'Sundin ang klinikal na landas, subaybayan ang iyong mga antas, at i-optimize ang iyong regimen para sa pangmatagalang kalusugan.',
    'action.problem.title': 'May pakiramdam akong mali',
    'action.problem.desc': 'Kilalanin ang mga senyales ng panganib at malaman kung kailan hihingi ng emergency na pangangalaga. Ang iyong kaligtasan ang laging nauuna.',
    'action.notStarted.cta': 'Tuklasin ang Baseline',
    'action.onHRT.cta': 'Sundan ang Landas',
    'action.problem.cta': 'Aksyon sa Emerhensiya',
    'action.askAI.title': 'May tanong ako tungkol sa medisina',
    'action.askAI.desc': 'Available 24/7 ang AI assistant na nakabatay sa ebidensiya. Walang pag-iimbak ng usapan, walang personalisadong reseta.',
    'action.askAI.cta': 'Magtanong sa AI Assistant',
    'action.ariaLabel': 'Mabilis na simula',

    // HeroSection
    'hero.subtitle': 'Batay sa Ebidensiya · Pagbawas ng Pinsala · Gabay na Pangangalaga',
    'hero.ctaPrimary': 'Magtanong sa AI Assistant',
    'hero.ctaPathway': 'Simulan ang Aking Landas',

    // MissionStatement
    'mission.label': 'Ang Kritikal na Katotohanan',
    'mission.ariaLabel': 'Pahayag ng misyon',
    'mission.stat.before': 'Sa buong mundo, hindi mabilang na transgender na nasa HRT ang walang access sa',
    'mission.stat.number': 'anumang',
    'mission.stat.after': 'gabay o pagsubaybay na medikal.',
    'mission.body.before': 'Umiiral ang site na ito upang bigyan ka ng isang baseline ng kaligtasan na nakabatay sa ebidensiya',
    'mission.body.give': '',
    'mission.body.baseline': 'baseline ng kaligtasan',

    // EmergencyBanner
    'emergency.text': 'Kung nararanasan mo ang alinman sa mga sumusunod, itigil ang HRT at humingi kaagad ng emergency na pangangalaga:',
    'emergency.symptoms': 'Pamamaga o sakit sa isang binti · Biglaang matinding pananakit ng ulo na may pagbabago sa paningin · Pananakit ng dibdib o hirap sa paghinga · Paninilaw ng balat o mga mata · Tuloy-tuloy na matinding emosyonal na krisis o pag-iisip ng pagpapakamatay',
    'emergency.link': 'Tingnan ang mga detalye ng emerhensiya',

    // a11y
    'a11y.skipToMain': 'Laktawan papunta sa pangunahing nilalaman',

    // SiteFooter
    'footer.disclaimer.title': 'Pagtatatwa',
    'footer.disclaimer.text': 'Ang site na ito ay para lamang sa layuning pang-impormasyon at hindi bumubuo ng payong medikal. Palaging kumonsulta sa isang kwalipikadong propesyonal sa kalusugan bago simulan ang anumang hormone therapy.',
    'footer.privacy.title': 'Privacy',
    'footer.privacy.text': 'Iginagalang namin ang iyong privacy. Walang personal na datos na kinokolekta o iniimbak. Hindi kailanman sinusubaybayan ang kasaysayan ng pagba-browse.',
    'footer.sources.title': 'Mga Pinagkunan ng Ebidensiya',
    'footer.sources.text': 'Ang lahat ng klinikal na datos ay mula sa WPATH SOC 8, mga Patnubay ng Endocrine Society, UCSF Transgender Care, at mga pananaliksik na sinuri ng kapwa.',
    'footer.dev.title': 'Open Source',
    'footer.dev.text': 'Ang proyektong ito ay binuo nang bukas. Malugod na tinatanggap ang mga ambag mula sa mga developer, klinisyan, at miyembro ng komunidad.',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'Ang site na ito ay hindi nagrereseta ng gamot, hindi nagbebenta ng gamot, at hindi nangongolekta ng personal na impormasyon.',
    'footer.navLabel': 'Mga link sa footer',
    'footer.link.guides': 'Mga Praktikal na Gabay',
    'footer.link.privacy': 'Patakaran sa Privacy',
    'footer.link.disclaimer': 'Pagtatatwang Medikal',
    'footer.link.github': 'Proyekto sa GitHub',
    'footer.link.feedback': 'Feedback',
    'footer.copy': 'HRT Yakuten · Batay sa Ebidensiya · Pagbawas ng Pinsala',

    // DrugBrandGallery
    'brandGallery.viewAll': 'Tingnan ang buong index ng mga brand →',

    // Blog
    'blog.title': 'Mga Artikulo',
    'blog.subtitle': 'Malalim na mga sagot sa mga karaniwang tanong tungkol sa HRT',
    'blog.readMore': 'Magbasa pa',
    'blog.readingTime': '{min} min na pagbasa',
    'blog.publishedOn': 'Inilathala',
    'blog.updatedOn': 'Na-update',
    'blog.relatedDocs': 'Mga Kaugnay na Mapagkukunan',
    'blog.relatedArticles': 'Mga Kaugnay na Artikulo',
    'blog.backToIndex': '← Bumalik sa mga artikulo',
    'blog.backToDocs': '← Bumalik sa mga dokumento',
    'blog.allCategories': 'Lahat',
    'blog.breadcrumb.home': 'Tahanan',
    'blog.breadcrumb.blog': 'Mga Artikulo',
    'blog.disclaimer': 'Ang artikulong ito ay para lamang sa layuning pang-impormasyon at hindi bumubuo ng payong medikal. Kumonsulta sa isang kwalipikadong propesyonal sa kalusugan para sa mga desisyon sa paggamot.',

    // DrugQuickNav
    'drugNav.title': 'Mabilis na Paghahanap ng Gamot',
    'drugNav.ariaLabel': 'Mabilis na nabigasyon ng gamot',
    'drugNav.estrogens': 'Mga Estrogen',
    'drugNav.antiandrogens': 'Mga Anti-Androgen',
    'drugNav.progestogens': 'Mga Progestogen',
    'drugNav.viewAll': 'Tingnan ang lahat ng 20 gamot →',

    // HeroSearch
    'hero.searchPlaceholder': 'Maghanap ng gamot, sintomas, o gabay...',
    'hero.searchLabel': 'Paghahanap sa site',

    // Links page
    'links.title': 'Mga Mabilis na Link',
    'links.subtitle': 'Batay sa Ebidensiya · Pagbawas ng Pinsala · Gabay na Pangangalaga',
  },

  hi: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'यह यात्रा आपको आपके सच्चे स्वरूप तक पहुंचाए',

    // SplashNav
    'nav.before': 'शुरू करने से पहले',
    'nav.pathway': 'HRT मार्ग',
    'nav.medications': 'दवाइयां',
    'nav.doseLimits': 'खुराक सीमाएं',
    'nav.bloodTests': 'रक्त जांच',
    'nav.risks': 'जोखिम और आपातकाल',
    'nav.tools': 'उपकरण',
    'nav.guides': 'व्यावहारिक मार्गदर्शिकाएं',
    'nav.blog': 'ब्लॉग',
    'nav.search': 'खोजें',
    'nav.ariaLabel': 'मुख्य नेविगेशन',

    // ActionCards
    'action.notStarted.title': 'मैंने अभी तक HRT शुरू नहीं किया है',
    'action.notStarted.desc': 'आधारभूत जांच, विरोधाभास और सूचित सहमति को समझें — अपनी पहली खुराक से पहले एक सुरक्षित आधार बनाएं।',
    'action.onHRT.title': 'मैं पहले से ही HRT पर हूं',
    'action.onHRT.desc': 'नैदानिक मार्ग का पालन करें, अपने स्तरों को ट्रैक करें, और दीर्घकालिक स्वास्थ्य के लिए अपनी योजना को अनुकूलित करें।',
    'action.problem.title': 'कुछ गड़बड़ लग रहा है',
    'action.problem.desc': 'खतरे के संकेतों को पहचानें और जानें कि आपातकालीन देखभाल कब लेनी है। आपकी सुरक्षा हमेशा सर्वोपरि है।',
    'action.notStarted.cta': 'आधारभूत जांच देखें',
    'action.onHRT.cta': 'मार्ग का अनुसरण करें',
    'action.problem.cta': 'आपातकालीन कार्रवाई',
    'action.askAI.title': 'मेरा एक चिकित्सीय प्रश्न है',
    'action.askAI.desc': 'साक्ष्य-आधारित AI सहायक 24/7 उपलब्ध है। कोई वार्तालाप संग्रहण नहीं, कोई व्यक्तिगत नुस्खा नहीं।',
    'action.askAI.cta': 'AI सहायक से पूछें',
    'action.ariaLabel': 'त्वरित प्रारंभ',

    // HeroSection
    'hero.subtitle': 'साक्ष्य-आधारित · हानि न्यूनीकरण · निर्देशित देखभाल',
    'hero.ctaPrimary': 'AI सहायक से पूछें',
    'hero.ctaPathway': 'मेरा मार्ग शुरू करें',

    // MissionStatement
    'mission.label': 'गंभीर वास्तविकता',
    'mission.ariaLabel': 'मिशन वक्तव्य',
    'mission.stat.before': 'दुनिया भर में, HRT पर असंख्य ट्रांसजेंडर लोगों के पास',
    'mission.stat.number': 'किसी भी',
    'mission.stat.after': 'चिकित्सा मार्गदर्शन या निगरानी तक पहुंच नहीं है।',
    'mission.body.before': 'यह साइट आपको एक साक्ष्य-आधारित सुरक्षा आधार देने के लिए मौजूद है',
    'mission.body.give': '',
    'mission.body.baseline': 'सुरक्षा आधार',

    // EmergencyBanner
    'emergency.text': 'यदि आप निम्नलिखित में से किसी का अनुभव कर रहे हैं, तो HRT बंद करें और तुरंत आपातकालीन देखभाल लें:',
    'emergency.symptoms': 'एक तरफ की पिंडली में सूजन या दर्द · दृष्टि परिवर्तन के साथ अचानक तेज सिरदर्द · सीने में दर्द या सांस लेने में कठिनाई · त्वचा या आंखों का पीला पड़ना · लगातार गंभीर भावनात्मक संकट या आत्मघाती विचार',
    'emergency.link': 'आपातकालीन विवरण देखें',

    // a11y
    'a11y.skipToMain': 'मुख्य सामग्री पर जाएं',

    // SiteFooter
    'footer.disclaimer.title': 'अस्वीकरण',
    'footer.disclaimer.text': 'यह साइट केवल सूचनात्मक उद्देश्यों के लिए है और चिकित्सा सलाह नहीं है। कोई भी हार्मोन थेरेपी शुरू करने से पहले हमेशा एक योग्य स्वास्थ्य पेशेवर से परामर्श करें।',
    'footer.privacy.title': 'गोपनीयता',
    'footer.privacy.text': 'हम आपकी गोपनीयता का सम्मान करते हैं। कोई व्यक्तिगत डेटा एकत्र या संग्रहीत नहीं किया जाता। ब्राउज़िंग इतिहास कभी ट्रैक नहीं किया जाता।',
    'footer.sources.title': 'साक्ष्य स्रोत',
    'footer.sources.text': 'सभी नैदानिक डेटा WPATH SOC 8, Endocrine Society दिशानिर्देश, UCSF Transgender Care और सहकर्मी-समीक्षित शोध से लिए गए हैं।',
    'footer.dev.title': 'ओपन सोर्स',
    'footer.dev.text': 'यह परियोजना खुले तौर पर बनाई गई है। डेवलपर्स, चिकित्सकों और समुदाय के सदस्यों का योगदान स्वागत योग्य है।',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'यह साइट दवाइयां नहीं लिखती, दवाएं नहीं बेचती और व्यक्तिगत जानकारी एकत्र नहीं करती।',
    'footer.navLabel': 'फुटर लिंक',
    'footer.link.guides': 'व्यावहारिक मार्गदर्शिकाएं',
    'footer.link.privacy': 'गोपनीयता नीति',
    'footer.link.disclaimer': 'चिकित्सा अस्वीकरण',
    'footer.link.github': 'GitHub परियोजना',
    'footer.link.feedback': 'प्रतिक्रिया',
    'footer.copy': 'HRT Yakuten · साक्ष्य-आधारित · हानि न्यूनीकरण',

    // DrugBrandGallery
    'brandGallery.viewAll': 'पूर्ण ब्रांड सूची देखें →',

    // Blog
    'blog.title': 'लेख',
    'blog.subtitle': 'HRT के सामान्य प्रश्नों के विस्तृत उत्तर',
    'blog.readMore': 'और पढ़ें',
    'blog.readingTime': '{min} मिनट का पठन',
    'blog.publishedOn': 'प्रकाशित',
    'blog.updatedOn': 'अद्यतन',
    'blog.relatedDocs': 'संबंधित संसाधन',
    'blog.relatedArticles': 'संबंधित लेख',
    'blog.backToIndex': '← लेखों पर वापस जाएं',
    'blog.backToDocs': '← दस्तावेज़ों पर वापस जाएं',
    'blog.allCategories': 'सभी',
    'blog.breadcrumb.home': 'होम',
    'blog.breadcrumb.blog': 'लेख',
    'blog.disclaimer': 'यह लेख केवल सूचनात्मक उद्देश्यों के लिए है और चिकित्सा सलाह नहीं है। उपचार के निर्णयों के लिए एक योग्य स्वास्थ्य पेशेवर से परामर्श करें।',

    // DrugQuickNav
    'drugNav.title': 'त्वरित दवा खोज',
    'drugNav.ariaLabel': 'त्वरित दवा नेविगेशन',
    'drugNav.estrogens': 'एस्ट्रोजन',
    'drugNav.antiandrogens': 'एंटी-एंड्रोजन',
    'drugNav.progestogens': 'प्रोजेस्टोजन',
    'drugNav.viewAll': 'सभी 20 दवाइयां देखें →',

    // HeroSearch
    'hero.searchPlaceholder': 'दवाइयां, लक्षण या मार्गदर्शिकाएं खोजें...',
    'hero.searchLabel': 'साइट खोज',

    // Links page
    'links.title': 'त्वरित लिंक',
    'links.subtitle': 'साक्ष्य-आधारित · हानि न्यूनीकरण · निर्देशित देखभाल',
  },

  vi: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'Mong hành trình này đưa bạn đến với con người thật của mình',

    // SplashNav
    'nav.before': 'Trước Khi Bắt Đầu',
    'nav.pathway': 'Lộ Trình HRT',
    'nav.medications': 'Thuốc',
    'nav.doseLimits': 'Giới Hạn Liều',
    'nav.bloodTests': 'Xét Nghiệm Máu',
    'nav.risks': 'Rủi Ro & Cấp Cứu',
    'nav.tools': 'Công Cụ',
    'nav.guides': 'Hướng Dẫn Thực Hành',
    'nav.blog': 'Blog',
    'nav.search': 'Tìm kiếm',
    'nav.ariaLabel': 'Điều hướng chính',

    // ActionCards
    'action.notStarted.title': 'Tôi chưa bắt đầu HRT',
    'action.notStarted.desc': 'Tìm hiểu về xét nghiệm cơ bản, chống chỉ định và sự đồng thuận có hiểu biết — xây dựng nền tảng an toàn trước liều đầu tiên của bạn.',
    'action.onHRT.title': 'Tôi đã đang dùng HRT',
    'action.onHRT.desc': 'Theo dõi lộ trình lâm sàng, theo dõi các chỉ số của bạn và tối ưu hóa phác đồ cho sức khỏe lâu dài.',
    'action.problem.title': 'Có gì đó không ổn',
    'action.problem.desc': 'Nhận biết các dấu hiệu nguy hiểm và biết khi nào cần tìm chăm sóc cấp cứu. An toàn của bạn luôn là trên hết.',
    'action.notStarted.cta': 'Khám Phá Xét Nghiệm Cơ Bản',
    'action.onHRT.cta': 'Theo Dõi Lộ Trình',
    'action.problem.cta': 'Hành Động Khẩn Cấp',
    'action.askAI.title': 'Tôi có một câu hỏi y tế',
    'action.askAI.desc': 'Trợ lý AI dựa trên bằng chứng có sẵn 24/7. Không lưu trữ hội thoại, không kê đơn cá nhân hóa.',
    'action.askAI.cta': 'Hỏi Trợ Lý AI',
    'action.ariaLabel': 'Bắt đầu nhanh',

    // HeroSection
    'hero.subtitle': 'Dựa Trên Bằng Chứng · Giảm Tác Hại · Hướng Dẫn Chăm Sóc',
    'hero.ctaPrimary': 'Hỏi Trợ Lý AI',
    'hero.ctaPathway': 'Bắt Đầu Lộ Trình Của Tôi',

    // MissionStatement
    'mission.label': 'Thực Tế Nghiêm Trọng',
    'mission.ariaLabel': 'Tuyên bố sứ mệnh',
    'mission.stat.before': 'Trên toàn thế giới, vô số người chuyển giới đang dùng HRT không có quyền tiếp cận',
    'mission.stat.number': 'bất kỳ',
    'mission.stat.after': 'hướng dẫn hoặc giám sát y tế nào.',
    'mission.body.before': 'Trang web này tồn tại để mang đến cho bạn một nền tảng an toàn dựa trên bằng chứng',
    'mission.body.give': '',
    'mission.body.baseline': 'nền tảng an toàn',

    // EmergencyBanner
    'emergency.text': 'Nếu bạn đang gặp bất kỳ tình trạng nào sau đây, hãy ngừng HRT và tìm chăm sóc cấp cứu ngay lập tức:',
    'emergency.symptoms': 'Sưng hoặc đau bắp chân một bên · Đau đầu dữ dội đột ngột kèm thay đổi thị lực · Đau ngực hoặc khó thở · Da hoặc mắt vàng · Khủng hoảng cảm xúc nghiêm trọng kéo dài hoặc ý nghĩ tự tử',
    'emergency.link': 'Xem chi tiết cấp cứu',

    // a11y
    'a11y.skipToMain': 'Chuyển đến nội dung chính',

    // SiteFooter
    'footer.disclaimer.title': 'Tuyên Bố Miễn Trừ',
    'footer.disclaimer.text': 'Trang web này chỉ nhằm mục đích cung cấp thông tin và không cấu thành lời khuyên y tế. Luôn tham khảo ý kiến chuyên gia y tế có trình độ trước khi bắt đầu bất kỳ liệu pháp hormone nào.',
    'footer.privacy.title': 'Quyền Riêng Tư',
    'footer.privacy.text': 'Chúng tôi tôn trọng quyền riêng tư của bạn. Không thu thập hoặc lưu trữ dữ liệu cá nhân. Lịch sử duyệt web không bao giờ bị theo dõi.',
    'footer.sources.title': 'Nguồn Bằng Chứng',
    'footer.sources.text': 'Tất cả dữ liệu lâm sàng được lấy từ WPATH SOC 8, Hướng dẫn của Endocrine Society, UCSF Transgender Care và các nghiên cứu được bình duyệt.',
    'footer.dev.title': 'Mã Nguồn Mở',
    'footer.dev.text': 'Dự án này được xây dựng công khai. Hoan nghênh đóng góp từ các nhà phát triển, bác sĩ lâm sàng và thành viên cộng đồng.',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'Trang web này không kê đơn thuốc, không bán thuốc và không thu thập thông tin cá nhân.',
    'footer.navLabel': 'Liên kết chân trang',
    'footer.link.guides': 'Hướng Dẫn Thực Hành',
    'footer.link.privacy': 'Chính Sách Quyền Riêng Tư',
    'footer.link.disclaimer': 'Tuyên Bố Miễn Trừ Y Tế',
    'footer.link.github': 'Dự Án GitHub',
    'footer.link.feedback': 'Phản Hồi',
    'footer.copy': 'HRT Yakuten · Dựa Trên Bằng Chứng · Giảm Tác Hại',

    // DrugBrandGallery
    'brandGallery.viewAll': 'Xem toàn bộ danh mục thương hiệu →',

    // Blog
    'blog.title': 'Bài Viết',
    'blog.subtitle': 'Câu trả lời chuyên sâu cho các câu hỏi thường gặp về HRT',
    'blog.readMore': 'Đọc thêm',
    'blog.readingTime': '{min} phút đọc',
    'blog.publishedOn': 'Đã xuất bản',
    'blog.updatedOn': 'Đã cập nhật',
    'blog.relatedDocs': 'Tài Nguyên Liên Quan',
    'blog.relatedArticles': 'Bài Viết Liên Quan',
    'blog.backToIndex': '← Quay lại bài viết',
    'blog.backToDocs': '← Quay lại tài liệu',
    'blog.allCategories': 'Tất cả',
    'blog.breadcrumb.home': 'Trang chủ',
    'blog.breadcrumb.blog': 'Bài Viết',
    'blog.disclaimer': 'Bài viết này chỉ nhằm mục đích cung cấp thông tin và không cấu thành lời khuyên y tế. Hãy tham khảo ý kiến chuyên gia y tế có trình độ cho các quyết định điều trị.',

    // DrugQuickNav
    'drugNav.title': 'Tra Cứu Thuốc Nhanh',
    'drugNav.ariaLabel': 'Điều hướng thuốc nhanh',
    'drugNav.estrogens': 'Estrogen',
    'drugNav.antiandrogens': 'Kháng Androgen',
    'drugNav.progestogens': 'Progestogen',
    'drugNav.viewAll': 'Xem tất cả 20 loại thuốc →',

    // HeroSearch
    'hero.searchPlaceholder': 'Tìm kiếm thuốc, triệu chứng hoặc hướng dẫn...',
    'hero.searchLabel': 'Tìm kiếm trang web',

    // Links page
    'links.title': 'Liên Kết Nhanh',
    'links.subtitle': 'Dựa Trên Bằng Chứng · Giảm Tác Hại · Hướng Dẫn Chăm Sóc',
  },

  ar: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'لتقُدك هذه الرحلة إلى ذاتك الحقيقية',

    // SplashNav
    'nav.before': 'قبل أن تبدأ',
    'nav.pathway': 'مسار العلاج الهرموني',
    'nav.medications': 'الأدوية',
    'nav.doseLimits': 'حدود الجرعات',
    'nav.bloodTests': 'تحاليل الدم',
    'nav.risks': 'المخاطر والطوارئ',
    'nav.tools': 'الأدوات',
    'nav.guides': 'أدلة عملية',
    'nav.blog': 'المدونة',
    'nav.search': 'بحث',
    'nav.ariaLabel': 'التنقل الرئيسي',

    // ActionCards
    'action.notStarted.title': 'لم أبدأ العلاج الهرموني بعد',
    'action.notStarted.desc': 'افهم الفحوصات الأساسية وموانع الاستعمال والموافقة المستنيرة — ابنِ أساسًا آمنًا قبل جرعتك الأولى.',
    'action.onHRT.title': 'أنا بالفعل أتلقى العلاج الهرموني',
    'action.onHRT.desc': 'اتبع المسار السريري وتابع مستوياتك وحسّن نظامك العلاجي من أجل صحة طويلة الأمد.',
    'action.problem.title': 'أشعر أن هناك خطأ ما',
    'action.problem.desc': 'تعرّف على علامات الخطر واعرف متى تطلب الرعاية الطارئة. سلامتك تأتي دائمًا في المقام الأول.',
    'action.notStarted.cta': 'استكشف الفحوصات الأساسية',
    'action.onHRT.cta': 'تتبّع المسار',
    'action.problem.cta': 'إجراء الطوارئ',
    'action.askAI.title': 'لديّ سؤال طبي',
    'action.askAI.desc': 'مساعد ذكاء اصطناعي قائم على الأدلة متاح على مدار الساعة. لا تخزين للمحادثات، ولا وصفات مخصصة.',
    'action.askAI.cta': 'اسأل المساعد الذكي',
    'action.ariaLabel': 'بداية سريعة',

    // HeroSection
    'hero.subtitle': 'قائم على الأدلة · الحد من الضرر · رعاية موجَّهة',
    'hero.ctaPrimary': 'اسأل المساعد الذكي',
    'hero.ctaPathway': 'ابدأ مساري',

    // MissionStatement
    'mission.label': 'الواقع الحرج',
    'mission.ariaLabel': 'بيان المهمة',
    'mission.stat.before': 'في جميع أنحاء العالم، لا يحصل عدد لا يُحصى من المتحولين جنسيًا الذين يتلقون العلاج الهرموني على',
    'mission.stat.number': 'أي',
    'mission.stat.after': 'إرشاد أو متابعة طبية.',
    'mission.body.before': 'وُجد هذا الموقع ليمنحك أساس أمان قائمًا على الأدلة',
    'mission.body.give': '',
    'mission.body.baseline': 'أساس الأمان',

    // EmergencyBanner
    'emergency.text': 'إذا كنت تعاني من أي مما يلي، فأوقف العلاج الهرموني واطلب الرعاية الطارئة فورًا:',
    'emergency.symptoms': 'تورم أو ألم في ساق واحدة · صداع شديد مفاجئ مع تغيرات في الرؤية · ألم في الصدر أو صعوبة في التنفس · اصفرار الجلد أو العينين · أزمة عاطفية شديدة مستمرة أو أفكار انتحارية',
    'emergency.link': 'عرض تفاصيل الطوارئ',

    // a11y
    'a11y.skipToMain': 'تخطَّ إلى المحتوى الرئيسي',

    // SiteFooter
    'footer.disclaimer.title': 'إخلاء المسؤولية',
    'footer.disclaimer.text': 'هذا الموقع لأغراض إعلامية فقط ولا يشكّل نصيحة طبية. استشر دائمًا مختصًا صحيًا مؤهلًا قبل البدء بأي علاج هرموني.',
    'footer.privacy.title': 'الخصوصية',
    'footer.privacy.text': 'نحن نحترم خصوصيتك. لا يتم جمع أو تخزين أي بيانات شخصية. لا يتم تتبع سجل التصفح أبدًا.',
    'footer.sources.title': 'مصادر الأدلة',
    'footer.sources.text': 'جميع البيانات السريرية مأخوذة من WPATH SOC 8 وإرشادات Endocrine Society وUCSF Transgender Care والأبحاث المُحكَّمة.',
    'footer.dev.title': 'مصدر مفتوح',
    'footer.dev.text': 'هذا المشروع مبني بشكل مفتوح. مساهمات المطورين والأطباء وأعضاء المجتمع مرحب بها.',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'هذا الموقع لا يصف الأدوية ولا يبيعها ولا يجمع المعلومات الشخصية.',
    'footer.navLabel': 'روابط التذييل',
    'footer.link.guides': 'أدلة عملية',
    'footer.link.privacy': 'سياسة الخصوصية',
    'footer.link.disclaimer': 'إخلاء المسؤولية الطبية',
    'footer.link.github': 'مشروع GitHub',
    'footer.link.feedback': 'ملاحظات',
    'footer.copy': 'HRT Yakuten · قائم على الأدلة · الحد من الضرر',

    // DrugBrandGallery
    'brandGallery.viewAll': 'عرض فهرس العلامات التجارية الكامل →',

    // Blog
    'blog.title': 'مقالات',
    'blog.subtitle': 'إجابات معمّقة عن الأسئلة الشائعة حول العلاج الهرموني',
    'blog.readMore': 'اقرأ المزيد',
    'blog.readingTime': 'قراءة {min} دقيقة',
    'blog.publishedOn': 'نُشر في',
    'blog.updatedOn': 'حُدّث في',
    'blog.relatedDocs': 'مصادر ذات صلة',
    'blog.relatedArticles': 'مقالات ذات صلة',
    'blog.backToIndex': '← العودة إلى المقالات',
    'blog.backToDocs': '← العودة إلى الوثائق',
    'blog.allCategories': 'الكل',
    'blog.breadcrumb.home': 'الرئيسية',
    'blog.breadcrumb.blog': 'مقالات',
    'blog.disclaimer': 'هذه المقالة لأغراض إعلامية فقط ولا تشكّل نصيحة طبية. استشر مختصًا صحيًا مؤهلًا لاتخاذ قرارات العلاج.',

    // DrugQuickNav
    'drugNav.title': 'بحث سريع عن الأدوية',
    'drugNav.ariaLabel': 'تنقل سريع في الأدوية',
    'drugNav.estrogens': 'الإستروجينات',
    'drugNav.antiandrogens': 'مضادات الأندروجين',
    'drugNav.progestogens': 'البروجستوجينات',
    'drugNav.viewAll': 'عرض جميع الأدوية الـ 20 →',

    // HeroSearch
    'hero.searchPlaceholder': 'ابحث عن الأدوية أو الأعراض أو الأدلة...',
    'hero.searchLabel': 'بحث الموقع',

    // Links page
    'links.title': 'روابط سريعة',
    'links.subtitle': 'قائم على الأدلة · الحد من الضرر · رعاية موجَّهة',
  },

  fa: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'باشد که این سفر تو را به خویشتن حقیقی‌ات برساند',

    // SplashNav
    'nav.before': 'پیش از شروع',
    'nav.pathway': 'مسیر هورمون‌درمانی',
    'nav.medications': 'داروها',
    'nav.doseLimits': 'محدودیت‌های دوز',
    'nav.bloodTests': 'آزمایش‌های خون',
    'nav.risks': 'خطرها و اورژانس‌ها',
    'nav.tools': 'ابزارها',
    'nav.guides': 'راهنماهای عملی',
    'nav.blog': 'وبلاگ',
    'nav.search': 'جستجو',
    'nav.ariaLabel': 'ناوبری اصلی',

    // ActionCards
    'action.notStarted.title': 'هنوز هورمون‌درمانی را شروع نکرده‌ام',
    'action.notStarted.desc': 'آزمایش‌های پایه، موارد منع مصرف و رضایت آگاهانه را بشناسید — پیش از نخستین دوز، پایه‌ای امن بسازید.',
    'action.onHRT.title': 'هم‌اکنون هورمون‌درمانی می‌کنم',
    'action.onHRT.desc': 'مسیر بالینی را دنبال کنید، سطوح هورمونی خود را پایش کنید و رژیم خود را برای سلامت بلندمدت بهینه کنید.',
    'action.problem.title': 'احساس می‌کنم چیزی درست نیست',
    'action.problem.desc': 'نشانه‌های خطر را بشناسید و بدانید چه زمانی باید به اورژانس مراجعه کنید. ایمنی شما همیشه در اولویت است.',
    'action.notStarted.cta': 'بررسی آزمایش‌های پایه',
    'action.onHRT.cta': 'دنبال‌کردن مسیر',
    'action.problem.cta': 'اقدام اورژانسی',
    'action.askAI.title': 'یک پرسش پزشکی دارم',
    'action.askAI.desc': 'دستیار هوش مصنوعی مبتنی بر شواهد به‌صورت شبانه‌روزی در دسترس است. بدون ذخیره‌سازی گفتگو، بدون نسخه‌ی شخصی‌سازی‌شده.',
    'action.askAI.cta': 'از دستیار هوش مصنوعی بپرسید',
    'action.ariaLabel': 'شروع سریع',

    // HeroSection
    'hero.subtitle': 'مبتنی بر شواهد · کاهش آسیب · مراقبت هدایت‌شده',
    'hero.ctaPrimary': 'از دستیار هوش مصنوعی بپرسید',
    'hero.ctaPathway': 'شروع مسیر من',

    // MissionStatement
    'mission.label': 'واقعیت بحرانی',
    'mission.ariaLabel': 'بیانیه مأموریت',
    'mission.stat.before': 'در سراسر جهان، شمار بی‌شماری از افراد تراجنسیتی تحت هورمون‌درمانی به',
    'mission.stat.number': 'هیچ‌گونه',
    'mission.stat.after': 'راهنمایی یا پایش پزشکی دسترسی ندارند.',
    'mission.body.before': 'این سایت برای آن است که به شما یک پایه‌ی ایمنی مبتنی بر شواهد ارائه دهد',
    'mission.body.give': '',
    'mission.body.baseline': 'پایه‌ی ایمنی',

    // EmergencyBanner
    'emergency.text': 'اگر هر یک از موارد زیر را تجربه می‌کنید، هورمون‌درمانی را متوقف کنید و فوراً به اورژانس مراجعه کنید:',
    'emergency.symptoms': 'تورم یا درد یک‌طرفه‌ی ساق پا · سردرد شدید ناگهانی همراه با تغییر بینایی · درد قفسه‌ی سینه یا دشواری در تنفس · زردی پوست یا چشم‌ها · بحران عاطفی شدید و پایدار یا افکار خودکشی',
    'emergency.link': 'مشاهده جزئیات اورژانسی',

    // a11y
    'a11y.skipToMain': 'پرش به محتوای اصلی',

    // SiteFooter
    'footer.disclaimer.title': 'سلب مسئولیت',
    'footer.disclaimer.text': 'این سایت تنها برای اهداف اطلاع‌رسانی است و توصیه‌ی پزشکی محسوب نمی‌شود. پیش از شروع هر هورمون‌درمانی همواره با یک متخصص واجد شرایط مشورت کنید.',
    'footer.privacy.title': 'حریم خصوصی',
    'footer.privacy.text': 'ما به حریم خصوصی شما احترام می‌گذاریم. هیچ داده‌ی شخصی‌ای جمع‌آوری یا ذخیره نمی‌شود. تاریخچه‌ی مرور هرگز ردیابی نمی‌شود.',
    'footer.sources.title': 'منابع شواهد',
    'footer.sources.text': 'تمام داده‌های بالینی از WPATH SOC 8، دستورالعمل‌های Endocrine Society، UCSF Transgender Care و پژوهش‌های داوری‌شده گرفته شده‌اند.',
    'footer.dev.title': 'متن‌باز',
    'footer.dev.text': 'این پروژه به‌صورت متن‌باز ساخته شده است. مشارکت توسعه‌دهندگان، پزشکان و اعضای جامعه پذیرفته می‌شود.',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'این سایت دارو تجویز نمی‌کند، دارو نمی‌فروشد و اطلاعات شخصی جمع‌آوری نمی‌کند.',
    'footer.navLabel': 'پیوندهای پاورقی',
    'footer.link.guides': 'راهنماهای عملی',
    'footer.link.privacy': 'سیاست حریم خصوصی',
    'footer.link.disclaimer': 'سلب مسئولیت پزشکی',
    'footer.link.github': 'پروژه‌ی گیت‌هاب',
    'footer.link.feedback': 'بازخورد',
    'footer.copy': 'HRT Yakuten · مبتنی بر شواهد · کاهش آسیب',

    // DrugBrandGallery
    'brandGallery.viewAll': 'مشاهده فهرست کامل برندها →',

    // Blog
    'blog.title': 'مقالات',
    'blog.subtitle': 'پاسخ‌های عمیق به پرسش‌های رایج درباره‌ی هورمون‌درمانی',
    'blog.readMore': 'ادامه مطلب',
    'blog.readingTime': '{min} دقیقه مطالعه',
    'blog.publishedOn': 'منتشرشده در',
    'blog.updatedOn': 'به‌روزشده در',
    'blog.relatedDocs': 'منابع مرتبط',
    'blog.relatedArticles': 'مقالات مرتبط',
    'blog.backToIndex': '← بازگشت به مقالات',
    'blog.backToDocs': '← بازگشت به مستندات',
    'blog.allCategories': 'همه',
    'blog.breadcrumb.home': 'خانه',
    'blog.breadcrumb.blog': 'مقالات',
    'blog.disclaimer': 'این مقاله تنها برای اهداف اطلاع‌رسانی است و توصیه‌ی پزشکی محسوب نمی‌شود. برای تصمیم‌های درمانی با یک متخصص واجد شرایط مشورت کنید.',

    // DrugQuickNav
    'drugNav.title': 'جستجوی سریع دارو',
    'drugNav.ariaLabel': 'ناوبری سریع دارو',
    'drugNav.estrogens': 'استروژن‌ها',
    'drugNav.antiandrogens': 'آنتی‌آندروژن‌ها',
    'drugNav.progestogens': 'پروژستوژن‌ها',
    'drugNav.viewAll': 'مشاهده همه‌ی ۲۰ دارو →',

    // HeroSearch
    'hero.searchPlaceholder': 'جستجوی داروها، علائم یا راهنماها...',
    'hero.searchLabel': 'جستجوی سایت',

    // Links page
    'links.title': 'پیوندهای سریع',
    'links.subtitle': 'مبتنی بر شواهد · کاهش آسیب · مراقبت هدایت‌شده',
  },

  fr: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'Que ce voyage vous mène vers votre véritable soi',

    // SplashNav
    'nav.before': 'Avant de Commencer',
    'nav.pathway': 'Parcours THS',
    'nav.medications': 'Médicaments',
    'nav.doseLimits': 'Limites de Dose',
    'nav.bloodTests': 'Analyses de Sang',
    'nav.risks': 'Risques et Urgences',
    'nav.tools': 'Outils',
    'nav.guides': 'Guides Pratiques',
    'nav.blog': 'Blog',
    'nav.search': 'Rechercher',
    'nav.ariaLabel': 'Navigation principale',

    // ActionCards
    'action.notStarted.title': "Je n'ai pas encore commencé le THS",
    'action.notStarted.desc': 'Comprenez les analyses de base, les contre-indications et le consentement éclairé — construisez une base sûre avant votre première dose.',
    'action.onHRT.title': 'Je suis déjà sous THS',
    'action.onHRT.desc': 'Suivez le parcours clinique, surveillez vos taux et optimisez votre protocole pour une santé à long terme.',
    'action.problem.title': 'Quelque chose ne va pas',
    'action.problem.desc': "Reconnaissez les signes de danger et sachez quand consulter en urgence. Votre sécurité passe toujours en premier.",
    'action.notStarted.cta': 'Explorer les Analyses de Base',
    'action.onHRT.cta': 'Suivre le Parcours',
    'action.problem.cta': "Action d'Urgence",
    'action.askAI.title': "J'ai une question médicale",
    'action.askAI.desc': "Assistant IA fondé sur des preuves disponible 24h/24. Aucune conservation des conversations, aucune prescription personnalisée.",
    'action.askAI.cta': "Demander à l'Assistant IA",
    'action.ariaLabel': 'Démarrage rapide',

    // HeroSection
    'hero.subtitle': 'Fondé sur des Preuves · Réduction des Risques · Soins Guidés',
    'hero.ctaPrimary': "Demander à l'Assistant IA",
    'hero.ctaPathway': 'Démarrer Mon Parcours',

    // MissionStatement
    'mission.label': 'La Réalité Critique',
    'mission.ariaLabel': 'Déclaration de mission',
    'mission.stat.before': "Dans le monde entier, d'innombrables personnes transgenres sous THS n'ont accès à",
    'mission.stat.number': 'aucun',
    'mission.stat.after': 'accompagnement ni suivi médical.',
    'mission.body.before': 'Ce site existe pour vous offrir une base de sécurité fondée sur des preuves',
    'mission.body.give': '',
    'mission.body.baseline': 'base de sécurité',

    // EmergencyBanner
    'emergency.text': "Si vous présentez l'un des symptômes suivants, arrêtez le THS et consultez en urgence immédiatement :",
    'emergency.symptoms': "Gonflement ou douleur unilatérale au mollet · Maux de tête soudains et intenses avec troubles de la vision · Douleur thoracique ou difficulté à respirer · Jaunissement de la peau ou des yeux · Crise émotionnelle grave et persistante ou idées suicidaires",
    'emergency.link': "Voir les détails d'urgence",

    // a11y
    'a11y.skipToMain': 'Passer au contenu principal',

    // SiteFooter
    'footer.disclaimer.title': 'Avertissement',
    'footer.disclaimer.text': "Ce site est fourni à titre informatif uniquement et ne constitue pas un avis médical. Consultez toujours un professionnel de santé qualifié avant de commencer toute hormonothérapie.",
    'footer.privacy.title': 'Confidentialité',
    'footer.privacy.text': "Nous respectons votre vie privée. Aucune donnée personnelle n'est collectée ni stockée. L'historique de navigation n'est jamais suivi.",
    'footer.sources.title': 'Sources des Preuves',
    'footer.sources.text': "Toutes les données cliniques proviennent du WPATH SOC 8, des recommandations de l'Endocrine Society, de l'UCSF Transgender Care et de recherches évaluées par les pairs.",
    'footer.dev.title': 'Open Source',
    'footer.dev.text': "Ce projet est développé de manière ouverte. Les contributions des développeurs, cliniciens et membres de la communauté sont les bienvenues.",
    'footer.brand': 'HRT Yakuten',
    'footer.notice': "Ce site ne prescrit pas de médicaments, ne vend pas de médicaments et ne collecte aucune information personnelle.",
    'footer.navLabel': 'Liens de pied de page',
    'footer.link.guides': 'Guides Pratiques',
    'footer.link.privacy': 'Politique de Confidentialité',
    'footer.link.disclaimer': 'Avertissement Médical',
    'footer.link.github': 'Projet GitHub',
    'footer.link.feedback': 'Retour',
    'footer.copy': 'HRT Yakuten · Fondé sur des Preuves · Réduction des Risques',

    // DrugBrandGallery
    'brandGallery.viewAll': "Voir l'index complet des marques →",

    // Blog
    'blog.title': 'Articles',
    'blog.subtitle': 'Réponses détaillées aux questions fréquentes sur le THS',
    'blog.readMore': 'Lire la suite',
    'blog.readingTime': '{min} min de lecture',
    'blog.publishedOn': 'Publié',
    'blog.updatedOn': 'Mis à jour',
    'blog.relatedDocs': 'Ressources Connexes',
    'blog.relatedArticles': 'Articles Connexes',
    'blog.backToIndex': '← Retour aux articles',
    'blog.backToDocs': '← Retour aux documents',
    'blog.allCategories': 'Tous',
    'blog.breadcrumb.home': 'Accueil',
    'blog.breadcrumb.blog': 'Articles',
    'blog.disclaimer': "Cet article est fourni à titre informatif uniquement et ne constitue pas un avis médical. Consultez un professionnel de santé qualifié pour les décisions de traitement.",

    // DrugQuickNav
    'drugNav.title': 'Recherche Rapide de Médicaments',
    'drugNav.ariaLabel': 'Navigation rapide des médicaments',
    'drugNav.estrogens': 'Œstrogènes',
    'drugNav.antiandrogens': 'Anti-Androgènes',
    'drugNav.progestogens': 'Progestatifs',
    'drugNav.viewAll': 'Voir les 20 médicaments →',

    // HeroSearch
    'hero.searchPlaceholder': 'Rechercher des médicaments, symptômes ou guides...',
    'hero.searchLabel': 'Recherche sur le site',

    // Links page
    'links.title': 'Liens Rapides',
    'links.subtitle': 'Fondé sur des Preuves · Réduction des Risques · Soins Guidés',
  },

  de: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'Möge diese Reise dich zu deinem wahren Selbst führen',

    // SplashNav
    'nav.before': 'Bevor du beginnst',
    'nav.pathway': 'HRT-Weg',
    'nav.medications': 'Medikamente',
    'nav.doseLimits': 'Dosisgrenzen',
    'nav.bloodTests': 'Bluttests',
    'nav.risks': 'Risiken & Notfälle',
    'nav.tools': 'Werkzeuge',
    'nav.guides': 'Praktische Leitfäden',
    'nav.blog': 'Blog',
    'nav.search': 'Suchen',
    'nav.ariaLabel': 'Hauptnavigation',

    // ActionCards
    'action.notStarted.title': 'Ich habe noch nicht mit HRT begonnen',
    'action.notStarted.desc': 'Verstehe Basisuntersuchungen, Kontraindikationen und informierte Einwilligung — schaffe eine sichere Grundlage vor deiner ersten Dosis.',
    'action.onHRT.title': 'Ich mache bereits HRT',
    'action.onHRT.desc': 'Folge dem klinischen Weg, überwache deine Werte und optimiere dein Regime für langfristige Gesundheit.',
    'action.problem.title': 'Etwas stimmt nicht',
    'action.problem.desc': 'Erkenne Warnzeichen und wisse, wann du Notfallversorgung suchen solltest. Deine Sicherheit hat immer Vorrang.',
    'action.notStarted.cta': 'Basisuntersuchungen erkunden',
    'action.onHRT.cta': 'Weg verfolgen',
    'action.problem.cta': 'Notfallmaßnahme',
    'action.askAI.title': 'Ich habe eine medizinische Frage',
    'action.askAI.desc': 'Evidenzbasierter KI-Assistent rund um die Uhr verfügbar. Keine Speicherung von Gesprächen, keine personalisierten Verschreibungen.',
    'action.askAI.cta': 'KI-Assistenten fragen',
    'action.ariaLabel': 'Schnellstart',

    // HeroSection
    'hero.subtitle': 'Evidenzbasiert · Schadensminderung · Begleitete Versorgung',
    'hero.ctaPrimary': 'KI-Assistenten fragen',
    'hero.ctaPathway': 'Meinen Weg beginnen',

    // MissionStatement
    'mission.label': 'Die kritische Realität',
    'mission.ariaLabel': 'Leitbild',
    'mission.stat.before': 'Weltweit haben unzählige Transgender-Menschen unter HRT keinen Zugang zu',
    'mission.stat.number': 'jeglicher',
    'mission.stat.after': 'medizinischen Begleitung oder Überwachung.',
    'mission.body.before': 'Diese Website existiert, um dir eine evidenzbasierte Sicherheitsgrundlage zu bieten',
    'mission.body.give': '',
    'mission.body.baseline': 'Sicherheitsgrundlage',

    // EmergencyBanner
    'emergency.text': 'Wenn du eines der folgenden Symptome erlebst, beende die HRT und suche sofort eine Notfallversorgung auf:',
    'emergency.symptoms': 'Einseitige Wadenschwellung oder -schmerzen · Plötzliche starke Kopfschmerzen mit Sehstörungen · Brustschmerzen oder Atembeschwerden · Gelbfärbung von Haut oder Augen · Anhaltende schwere emotionale Krise oder Suizidgedanken',
    'emergency.link': 'Notfalldetails ansehen',

    // a11y
    'a11y.skipToMain': 'Zum Hauptinhalt springen',

    // SiteFooter
    'footer.disclaimer.title': 'Haftungsausschluss',
    'footer.disclaimer.text': 'Diese Website dient ausschließlich Informationszwecken und stellt keine medizinische Beratung dar. Konsultiere vor Beginn einer Hormontherapie immer eine qualifizierte medizinische Fachkraft.',
    'footer.privacy.title': 'Datenschutz',
    'footer.privacy.text': 'Wir respektieren deine Privatsphäre. Es werden keine personenbezogenen Daten erhoben oder gespeichert. Der Browserverlauf wird niemals verfolgt.',
    'footer.sources.title': 'Evidenzquellen',
    'footer.sources.text': 'Alle klinischen Daten stammen aus WPATH SOC 8, den Leitlinien der Endocrine Society, UCSF Transgender Care und begutachteten Studien.',
    'footer.dev.title': 'Open Source',
    'footer.dev.text': 'Dieses Projekt wird offen entwickelt. Beiträge von Entwicklern, Kliniker:innen und Community-Mitgliedern sind willkommen.',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'Diese Website verschreibt keine Medikamente, verkauft keine Arzneimittel und sammelt keine persönlichen Informationen.',
    'footer.navLabel': 'Fußzeilen-Links',
    'footer.link.guides': 'Praktische Leitfäden',
    'footer.link.privacy': 'Datenschutzrichtlinie',
    'footer.link.disclaimer': 'Medizinischer Haftungsausschluss',
    'footer.link.github': 'GitHub-Projekt',
    'footer.link.feedback': 'Feedback',
    'footer.copy': 'HRT Yakuten · Evidenzbasiert · Schadensminderung',

    // DrugBrandGallery
    'brandGallery.viewAll': 'Vollständigen Markenindex ansehen →',

    // Blog
    'blog.title': 'Artikel',
    'blog.subtitle': 'Ausführliche Antworten auf häufige HRT-Fragen',
    'blog.readMore': 'Weiterlesen',
    'blog.readingTime': '{min} Min. Lesezeit',
    'blog.publishedOn': 'Veröffentlicht',
    'blog.updatedOn': 'Aktualisiert',
    'blog.relatedDocs': 'Verwandte Ressourcen',
    'blog.relatedArticles': 'Verwandte Artikel',
    'blog.backToIndex': '← Zurück zu den Artikeln',
    'blog.backToDocs': '← Zurück zu den Dokumenten',
    'blog.allCategories': 'Alle',
    'blog.breadcrumb.home': 'Startseite',
    'blog.breadcrumb.blog': 'Artikel',
    'blog.disclaimer': 'Dieser Artikel dient ausschließlich Informationszwecken und stellt keine medizinische Beratung dar. Konsultiere für Behandlungsentscheidungen eine qualifizierte medizinische Fachkraft.',

    // DrugQuickNav
    'drugNav.title': 'Schnelle Medikamentensuche',
    'drugNav.ariaLabel': 'Schnelle Medikamentennavigation',
    'drugNav.estrogens': 'Östrogene',
    'drugNav.antiandrogens': 'Antiandrogene',
    'drugNav.progestogens': 'Gestagene',
    'drugNav.viewAll': 'Alle 20 Medikamente ansehen →',

    // HeroSearch
    'hero.searchPlaceholder': 'Medikamente, Symptome oder Leitfäden suchen...',
    'hero.searchLabel': 'Seitensuche',

    // Links page
    'links.title': 'Schnelllinks',
    'links.subtitle': 'Evidenzbasiert · Schadensminderung · Begleitete Versorgung',
  },

  tr: {
    // HeroSection
    'hero.title': 'HRT Yakuten',
    'hero.slogan': 'Bu yolculuk seni gerçek benliğine ulaştırsın',

    // SplashNav
    'nav.before': 'Başlamadan Önce',
    'nav.pathway': 'HRT Yolu',
    'nav.medications': 'İlaçlar',
    'nav.doseLimits': 'Doz Sınırları',
    'nav.bloodTests': 'Kan Testleri',
    'nav.risks': 'Riskler ve Acil Durumlar',
    'nav.tools': 'Araçlar',
    'nav.guides': 'Pratik Rehberler',
    'nav.blog': 'Blog',
    'nav.search': 'Ara',
    'nav.ariaLabel': 'Ana gezinme',

    // ActionCards
    'action.notStarted.title': 'HRT\'ye henüz başlamadım',
    'action.notStarted.desc': 'Başlangıç tetkiklerini, kontrendikasyonları ve bilgilendirilmiş onamı öğrenin — ilk dozunuzdan önce güvenli bir temel oluşturun.',
    'action.onHRT.title': 'Zaten HRT alıyorum',
    'action.onHRT.desc': 'Klinik yolu izleyin, seviyelerinizi takip edin ve uzun vadeli sağlık için tedavi planınızı optimize edin.',
    'action.problem.title': 'Bir şeyler yolunda değil gibi',
    'action.problem.desc': 'Tehlike işaretlerini tanıyın ve acil bakıma ne zaman başvurmanız gerektiğini bilin. Güvenliğiniz her zaman önce gelir.',
    'action.notStarted.cta': 'Başlangıç Tetkiklerini Keşfet',
    'action.onHRT.cta': 'Yolu Takip Et',
    'action.problem.cta': 'Acil Eylem',
    'action.askAI.title': 'Tıbbi bir sorum var',
    'action.askAI.desc': 'Kanıta dayalı yapay zeka asistanı 7/24 hizmette. Konuşma kaydı yok, kişiye özel reçete yok.',
    'action.askAI.cta': 'Yapay Zeka Asistanına Sor',
    'action.ariaLabel': 'Hızlı başlangıç',

    // HeroSection
    'hero.subtitle': 'Kanıta Dayalı · Zarar Azaltma · Rehberli Bakım',
    'hero.ctaPrimary': 'Yapay Zeka Asistanına Sor',
    'hero.ctaPathway': 'Yolculuğuma Başla',

    // MissionStatement
    'mission.label': 'Kritik Gerçeklik',
    'mission.ariaLabel': 'Misyon beyanı',
    'mission.stat.before': 'Dünya genelinde, HRT alan sayısız transgender bireyin',
    'mission.stat.number': 'hiçbir',
    'mission.stat.after': 'tıbbi rehberliğe veya takibe erişimi yok.',
    'mission.body.before': 'Bu site, size kanıta dayalı bir güvenlik temeli sunmak için var',
    'mission.body.give': '',
    'mission.body.baseline': 'güvenlik temeli',

    // EmergencyBanner
    'emergency.text': 'Aşağıdakilerden herhangi birini yaşıyorsanız, HRT\'yi bırakın ve hemen acil bakım alın:',
    'emergency.symptoms': 'Tek taraflı baldır şişmesi veya ağrısı · Görme değişiklikleriyle birlikte ani şiddetli baş ağrısı · Göğüs ağrısı veya nefes darlığı · Cilt veya gözlerde sararma · Sürekli ağır duygusal kriz veya intihar düşünceleri',
    'emergency.link': 'Acil durum ayrıntılarını gör',

    // a11y
    'a11y.skipToMain': 'Ana içeriğe geç',

    // SiteFooter
    'footer.disclaimer.title': 'Yasal Uyarı',
    'footer.disclaimer.text': 'Bu site yalnızca bilgilendirme amaçlıdır ve tıbbi tavsiye niteliği taşımaz. Herhangi bir hormon tedavisine başlamadan önce daima nitelikli bir sağlık uzmanına danışın.',
    'footer.privacy.title': 'Gizlilik',
    'footer.privacy.text': 'Gizliliğinize saygı duyuyoruz. Hiçbir kişisel veri toplanmaz veya saklanmaz. Tarama geçmişi asla izlenmez.',
    'footer.sources.title': 'Kanıt Kaynakları',
    'footer.sources.text': 'Tüm klinik veriler WPATH SOC 8, Endocrine Society Kılavuzları, UCSF Transgender Care ve hakemli araştırmalardan alınmıştır.',
    'footer.dev.title': 'Açık Kaynak',
    'footer.dev.text': 'Bu proje açık şekilde geliştirilmektedir. Geliştiricilerin, klinisyenlerin ve topluluk üyelerinin katkıları memnuniyetle karşılanır.',
    'footer.brand': 'HRT Yakuten',
    'footer.notice': 'Bu site ilaç reçete etmez, ilaç satmaz ve kişisel bilgi toplamaz.',
    'footer.navLabel': 'Alt bilgi bağlantıları',
    'footer.link.guides': 'Pratik Rehberler',
    'footer.link.privacy': 'Gizlilik Politikası',
    'footer.link.disclaimer': 'Tıbbi Yasal Uyarı',
    'footer.link.github': 'GitHub Projesi',
    'footer.link.feedback': 'Geri Bildirim',
    'footer.copy': 'HRT Yakuten · Kanıta Dayalı · Zarar Azaltma',

    // DrugBrandGallery
    'brandGallery.viewAll': 'Tüm marka dizinini gör →',

    // Blog
    'blog.title': 'Makaleler',
    'blog.subtitle': 'HRT hakkında sık sorulan soruların ayrıntılı yanıtları',
    'blog.readMore': 'Devamını oku',
    'blog.readingTime': '{min} dk okuma',
    'blog.publishedOn': 'Yayımlandı',
    'blog.updatedOn': 'Güncellendi',
    'blog.relatedDocs': 'İlgili Kaynaklar',
    'blog.relatedArticles': 'İlgili Makaleler',
    'blog.backToIndex': '← Makalelere dön',
    'blog.backToDocs': '← Belgelere dön',
    'blog.allCategories': 'Tümü',
    'blog.breadcrumb.home': 'Ana Sayfa',
    'blog.breadcrumb.blog': 'Makaleler',
    'blog.disclaimer': 'Bu makale yalnızca bilgilendirme amaçlıdır ve tıbbi tavsiye niteliği taşımaz. Tedavi kararları için nitelikli bir sağlık uzmanına danışın.',

    // DrugQuickNav
    'drugNav.title': 'Hızlı İlaç Arama',
    'drugNav.ariaLabel': 'Hızlı ilaç gezinmesi',
    'drugNav.estrogens': 'Östrojenler',
    'drugNav.antiandrogens': 'Anti-Androjenler',
    'drugNav.progestogens': 'Progestojenler',
    'drugNav.viewAll': 'Tüm 20 ilacı gör →',

    // HeroSearch
    'hero.searchPlaceholder': 'İlaç, semptom veya rehber ara...',
    'hero.searchLabel': 'Site araması',

    // Links page
    'links.title': 'Hızlı Bağlantılar',
    'links.subtitle': 'Kanıta Dayalı · Zarar Azaltma · Rehberli Bakım',
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
  if (pathname?.startsWith('/ja')) return 'ja';
  if (pathname?.startsWith('/ko')) return 'ko';
  if (pathname?.startsWith('/pt')) return 'pt';
  if (pathname?.startsWith('/ru')) return 'ru';
  if (pathname?.startsWith('/es')) return 'es';
  if (pathname?.startsWith('/id')) return 'id';
  if (pathname?.startsWith('/th')) return 'th';
  if (pathname?.startsWith('/fil')) return 'fil';
  if (pathname?.startsWith('/hi')) return 'hi';
  if (pathname?.startsWith('/vi')) return 'vi';
  if (pathname?.startsWith('/ar')) return 'ar';
  if (pathname?.startsWith('/fa')) return 'fa';
  if (pathname?.startsWith('/fr')) return 'fr';
  if (pathname?.startsWith('/de')) return 'de';
  if (pathname?.startsWith('/tr')) return 'tr';
  return 'zh';
}

/**
 * Locale-aware brand wordmark. The default Chinese form "HRT药典" uses the
 * simplified 药; Japanese must use the kanji 薬 ("HRT薬典"), and Latin/Korean
 * locales use their own forms. Use everywhere the brand is shown to users or
 * emitted in structured data so non-zh pages never leak the zh wordmark.
 */
const BRAND_NAME: Record<string, string> = { ja: 'HRT薬典', en: 'HRT Yakuten', ko: 'HRT 약전' };
export function brandName(locale?: string): string {
  const lang = (locale ?? '').split('-')[0];
  return BRAND_NAME[lang] ?? 'HRT药典';
}

/** Locale-aware editorial-team byline (brand + "editorial team"). */
const BRAND_BYLINE: Record<string, string> = {
  ja: 'HRT薬典編集部',
  en: 'HRT Yakuten Editorial',
  ko: 'HRT 약전 편집부',
};
export function brandByline(locale?: string): string {
  const lang = (locale ?? '').split('-')[0];
  return BRAND_BYLINE[lang] ?? 'HRT药典编辑部';
}
