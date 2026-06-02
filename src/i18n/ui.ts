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
    'hero.title': 'HRT药典',
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
    'footer.brand': 'HRT药典',
    'footer.notice': '本サイトは処方箋の発行、薬物の販売、個人情報の収集を一切行いません。',
    'footer.navLabel': 'フッターリンク',
    'footer.link.guides': '実用ガイド',
    'footer.link.privacy': 'プライバシーポリシー',
    'footer.link.disclaimer': '免責事項',
    'footer.link.github': 'オープンソース',
    'footer.link.feedback': 'フィードバック',
    'footer.copy': 'HRT药典 · エビデンス · 害軽減 · 医療ガイド',

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
  return 'zh';
}
