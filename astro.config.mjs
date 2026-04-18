// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://hrtyaku.com',
  integrations: [
    starlight({
      title: 'HRT药典',
      description: '循证 · 减害 · 引导就医 — 面向跨性别女性的 HRT 安全底线信息站',
      defaultLocale: 'zh',
      locales: {
        zh: { label: '中文', lang: 'zh-CN' },
        en: { label: 'English', lang: 'en' },
        ja: { label: '日本語', lang: 'ja' },
        ko: { label: '한국어', lang: 'ko' },
      },
      components: {
        Head: './src/components/overrides/Head.astro',
        Footer: './src/components/overrides/Footer.astro',
        SiteTitle: './src/components/overrides/SiteTitle.astro',
      },
      customCss: [
        './src/styles/global.css',
        './src/styles/glass.css',
        './src/styles/emergency.css',
        './src/styles/pathway.css',
        './src/styles/starlight-override.css',
        './src/styles/sakura-theme.css',
        './src/styles/sakura-skin.css',
      ],
      sidebar: [
        // ── 开始 ──
        {
          label: '开始',
          translations: { en: 'Getting Started', ja: 'はじめに', ko: '시작하기' },
          items: [
            {
              label: '用药前准备',
              translations: { en: 'Before You Start', ja: '服薬前の準備', ko: '복용 전 준비' },
              slug: 'before-you-start',
            },
            {
              label: '中国 HRT 现实路径图',
              translations: { en: 'China HRT Guide', ja: '中国HRTガイド', ko: '중국 HRT 가이드' },
              slug: 'china-reality',
            },
            {
              label: '用药路径图',
              translations: { en: 'HRT Pathway', ja: 'HRT経路マップ', ko: 'HRT 경로 맵' },
              slug: 'pathway',
            },
          ],
        },
        // ── 安全底线 ──
        {
          label: '安全底线',
          translations: { en: 'Safety Baseline', ja: '安全基準', ko: '안전 기준' },
          items: [
            {
              label: '风险与急症识别',
              translations: { en: 'Risks & Emergencies', ja: 'リスクと緊急対応', ko: '위험 및 응급 상황' },
              slug: 'risks',
              badge: { text: { 'zh-CN': '必读', en: 'Must Read', ja: '必読', ko: '필독' }, variant: 'danger' },
            },
            {
              label: '剂量红线与混用禁忌',
              translations: { en: 'Dose Limits & Contraindications', ja: '用量レッドライン', ko: '용량 한계 및 금기' },
              slug: 'dose-limits',
            },
            {
              label: '血检指南与自查工具',
              translations: { en: 'Blood Tests & Self-Check', ja: '血液検査ガイド', ko: '혈액 검사 가이드' },
              slug: 'blood-tests',
            },
          ],
        },
        // ── 实操指南 ──
        {
          label: '实操指南',
          translations: { en: 'Task Guides', ja: '実用ガイド', ko: '실용 가이드' },
          items: [
            { label: '总览', translations: { en: 'Overview', ja: '概要', ko: '개요' }, slug: 'guides' },
            { label: '首次注射', translations: { en: 'First Injection', ja: '初回注射', ko: '첫 주사' }, slug: 'guides/first-injection' },
            { label: '抗雄切换', translations: { en: 'Switch Antiandrogen', ja: '抗アンドロゲン切り替え', ko: '항안드로겐 전환' }, slug: 'guides/switch-antiandrogen' },
            { label: '切换 E2 途径', translations: { en: 'Switch E2 Route', ja: 'E2 投与経路の切り替え', ko: 'E2 투여 경로 전환' }, slug: 'guides/switch-e2-route' },
          ],
        },
        // ── 药物详解 ──
        {
          label: '药物详解',
          translations: { en: 'Medications', ja: '薬物ガイド', ko: '약물 가이드' },
          items: [
            // ── 雌二醇：去掉途径中间层，直接列药物 ──
            {
              label: '雌二醇',
              translations: { en: 'Estrogens', ja: 'エストロゲン', ko: '에스트로겐' },
              items: [
                {
                  label: '总览与选择指南',
                  translations: { en: 'Overview & Selection', ja: '概要と選び方', ko: '개요 및 선택 가이드' },
                  slug: 'medications/estrogens/overview',
                },
                {
                  label: '口服（补佳乐）',
                  translations: { en: 'Oral (Pills)', ja: '経口（飲み薬）', ko: '경구 (알약)' },
                  slug: 'medications/estrogens/oral',
                  badge: { text: { 'zh-CN': '常用', en: 'Common', ja: '基本', ko: '일반' }, variant: 'tip' },
                },
                {
                  label: '舌下含服',
                  translations: { en: 'Sublingual', ja: '舌下投与', ko: '설하 투여' },
                  slug: 'medications/estrogens/sublingual',
                },
                {
                  label: '凝胶',
                  translations: { en: 'Gel', ja: 'ゲル', ko: '겔' },
                  slug: 'medications/estrogens/gel',
                },
                {
                  label: '贴片',
                  translations: { en: 'Patches', ja: 'パッチ', ko: '패치' },
                  slug: 'medications/estrogens/transdermal-patch',
                },
                {
                  label: '戊酸雌二醇注射 (EV)',
                  translations: { en: 'Estradiol Valerate (EV)', ja: '吉草酸エストラジオール (EV)', ko: '에스트라디올 발레레이트 (EV)' },
                  slug: 'medications/estrogens/injection',
                  badge: { text: { 'zh-CN': '常用', en: 'Common', ja: '基本', ko: '일반' }, variant: 'tip' },
                },
                {
                  label: '其他注射酯类',
                  translations: { en: 'Other Injectable Esters', ja: 'その他の注射エステル', ko: '기타 주사 에스테르' },
                  collapsed: true,
                  items: [
                    {
                      label: '环戊丙酸酯 (EC)',
                      translations: { en: 'Estradiol Cypionate (EC)', ja: 'シピオネート (EC)', ko: '시피오네이트 (EC)' },
                      slug: 'medications/estrogens/cypionate',
                    },
                    {
                      label: '庚酸酯 (EEn)',
                      translations: { en: 'Estradiol Enanthate (EEn)', ja: 'エナント酸 (EEn)', ko: '에난테이트 (EEn)' },
                      slug: 'medications/estrogens/enanthate',
                    },
                    {
                      label: '十一酸酯 (EU)',
                      translations: { en: 'Estradiol Undecylate (EU)', ja: 'ウンデシル酸 (EU)', ko: '운데실레이트 (EU)' },
                      slug: 'medications/estrogens/undecylate',
                    },
                  ],
                },
                {
                  label: '禁用雌激素',
                  translations: { en: 'Banned Estrogens', ja: '禁止エストロゲン', ko: '금지 에스트로겐' },
                  slug: 'medications/estrogens/banned-estrogens',
                  badge: { text: '⚠', variant: 'danger' },
                },
              ],
            },
            // ── 抗雄激素 ──
            {
              label: '抗雄激素',
              translations: { en: 'Anti-Androgens', ja: '抗アンドロゲン', ko: '항안드로겐' },
              items: [
                {
                  label: '概述',
                  translations: { en: 'Overview', ja: '概要', ko: '개요' },
                  slug: 'medications/antiandrogens/overview',
                },
                {
                  label: 'CPA（色谱龙）',
                  translations: { en: 'CPA (Cyproterone)', ja: 'CPA（酢酸シプロテロン）', ko: 'CPA (시프로테론)' },
                  slug: 'medications/antiandrogens/cpa',
                  badge: { text: { 'zh-CN': '常用', en: 'Common', ja: '基本', ko: '일반' }, variant: 'tip' },
                },
                {
                  label: '螺内酯',
                  translations: { en: 'Spironolactone', ja: 'スピロノラクトン', ko: '스피로노락톤' },
                  slug: 'medications/antiandrogens/spironolactone',
                },
                {
                  label: 'GnRH 激动剂',
                  translations: { en: 'GnRH Agonists', ja: 'GnRHアゴニスト', ko: 'GnRH 작용제' },
                  slug: 'medications/antiandrogens/gnrh-agonists',
                },
                {
                  label: '比卡鲁胺',
                  translations: { en: 'Bicalutamide', ja: 'ビカルタミド', ko: '비칼루타마이드' },
                  slug: 'medications/antiandrogens/bicalutamide',
                  badge: { text: { 'zh-CN': '慎用', en: 'Caution', ja: '要注意', ko: '주의' }, variant: 'caution' },
                },
              ],
            },
            // ── 孕激素：扁平化，去掉推荐/替代中间层 ──
            {
              label: '孕激素',
              translations: { en: 'Progestogens', ja: 'プロゲストーゲン', ko: '프로게스토겐' },
              collapsed: true,
              items: [
                {
                  label: '概述',
                  translations: { en: 'Overview', ja: '概要', ko: '개요' },
                  slug: 'medications/progestogens/overview',
                  badge: { text: { 'zh-CN': '非必需', en: 'Optional', ja: '任意', ko: '선택' }, variant: 'note' },
                },
                {
                  label: '微粒化黄体酮',
                  translations: { en: 'Micronized Progesterone', ja: '微粉化プロゲステロン', ko: '미분화 프로게스테론' },
                  slug: 'medications/progestogens/progesterone',
                  badge: { text: { 'zh-CN': '首选', en: 'Preferred', ja: '推奨', ko: '권장' }, variant: 'tip' },
                },
                {
                  label: '羟孕酮注射',
                  translations: { en: 'Hydroxyprogesterone', ja: 'ヒドロキシプロゲステロン', ko: '하이드록시프로게스테론' },
                  slug: 'medications/progestogens/hydroxyprogesterone',
                },
                {
                  label: '地屈孕酮',
                  translations: { en: 'Dydrogesterone', ja: 'ジドロゲステロン', ko: '디드로게스테론' },
                  slug: 'medications/progestogens/dydrogesterone',
                },
                {
                  label: '屈螺酮',
                  translations: { en: 'Drospirenone', ja: 'ドロスピレノン', ko: '드로스피레논' },
                  slug: 'medications/progestogens/drospirenone',
                },
                {
                  label: '不推荐孕激素 (MPA)',
                  translations: { en: 'Not Recommended (MPA)', ja: '非推奨 (MPA)', ko: '비권장 (MPA)' },
                  slug: 'medications/progestogens/cautioned-progestins',
                  badge: { text: '⚠', variant: 'danger' },
                },
              ],
            },
            // ── 5α-还原酶抑制剂 ──
            {
              label: '5α-还原酶抑制剂',
              translations: { en: '5α-Reductase Inhibitors', ja: '5α還元酵素阻害薬', ko: '5α-환원효소 억제제' },
              collapsed: true,
              autogenerate: { directory: 'medications/five-alpha-reductase' },
            },
            // ── 绝对禁用药物 ──
            {
              label: '绝对禁用药物',
              translations: { en: 'Banned Drugs', ja: '使用禁止薬物', ko: '사용 금지 약물' },
              slug: 'medications/banned-drugs',
              badge: { text: '⚠', variant: 'danger' },
            },
          ],
        },
        // ── 专题与工具 ──
        {
          label: '专题与工具',
          translations: { en: 'Topics & Tools', ja: '特集とツール', ko: '특집 및 도구' },
          items: [
            {
              label: '乳房发育专题',
              translations: { en: 'Breast Development', ja: '乳房発育ガイド', ko: '유방 발달 가이드' },
              slug: 'breast-development',
            },
            {
              label: '血检自查工具',
              translations: { en: 'Blood Test Checker', ja: '血液検査チェッカー', ko: '혈액 검사 체커' },
              slug: 'tools/blood-checker',
              badge: { text: { 'zh-CN': '常用', en: 'Popular', ja: '人気', ko: '인기' }, variant: 'success' },
            },
            {
              label: '注射剂量换算',
              translations: { en: 'Injection Calculator', ja: '注射量計算機', ko: '주사 용량 계산기' },
              slug: 'tools/injection-calculator',
              badge: { text: { 'zh-CN': '常用', en: 'Popular', ja: '人気', ko: '인기' }, variant: 'success' },
            },
            { label: '剂量模拟器', translations: { en: 'Dose Simulator', ja: '用量シミュレーター', ko: '용량 시뮬레이터' }, slug: 'tools/dose-simulator' },
            { label: 'AI 问答助手', translations: { en: 'AI Assistant', ja: 'AIアシスタント', ko: 'AI 어시스턴트' }, slug: 'tools/ai-assistant' },
            { label: '友好医疗资源', translations: { en: 'Medical Directory', ja: '医療施設情報', ko: '의료 시설 정보' }, slug: 'tools/hospital-finder' },
            { label: '药物比较器', translations: { en: 'Drug Comparator', ja: '薬物比較ツール', ko: '약물 비교 도구' }, slug: 'tools/drug-comparator' },
            { label: '风险自评', translations: { en: 'Risk Screener', ja: 'リスク自己評価', ko: '위험 자가 평가' }, slug: 'tools/risk-screener' },
            { label: '品牌索引', translations: { en: 'Brand Index', ja: 'ブランド索引', ko: '브랜드 색인' }, slug: 'tools/brand-index' },
            { label: '速查卡片', translations: { en: 'Drug Cards', ja: 'クイックカード', ko: '퀵 카드' }, slug: 'tools/drug-cards', badge: { text: { 'zh-CN': '新', en: 'New', ja: '新', ko: '새' }, variant: 'success' } },
          ],
        },
        // ── 附录 ──
        {
          label: '附录',
          translations: { en: 'Appendix', ja: '付録', ko: '부록' },
          collapsed: true,
          items: [
            { label: '关于本站', translations: { en: 'About', ja: 'サイトについて', ko: '사이트 소개' }, slug: 'about' },
            { label: '参考文献库', translations: { en: 'Reference Library', ja: '参考文献ライブラリ', ko: '참고 문헌 라이브러리' }, slug: 'appendix-references' },
          ],
        },
      ],
      head: [
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#0D0B14' },
        },
        // OG Image for social sharing
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: 'https://hrtyaku.com/og-image.svg' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:width', content: '1200' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:height', content: '630' },
        },
        // Twitter Card
        {
          tag: 'meta',
          attrs: { name: 'twitter:image', content: 'https://hrtyaku.com/og-image.svg' },
        },
        // Google Fonts — preconnect + stylesheet
        // CJK fonts auto-subset via unicode-range (~80-150KB per page instead of 6MB)
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        },
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'style',
            href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&family=Manrope:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;600&family=Noto+Sans+KR:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+JP:wght@400;600;700&family=Noto+Serif+KR:wght@400;600;700&family=Noto+Serif+SC:wght@400;600;700&family=Space+Grotesk:wght@300;500&display=swap',
            onload: "this.onload=null;this.rel='stylesheet'",
          },
        },
        // Fallback for no-JS browsers
        {
          tag: 'noscript',
          content: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&family=Manrope:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+JP:wght@400;600;700&family=Noto+Serif+SC:wght@400;600;700&family=Space+Grotesk:wght@300;500&display=swap" />',
        },
      ],
    }),
    react(),
  ],
});
