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
      ],
      sidebar: [
        {
          label: '用药前：你准备好了吗？',
          translations: { en: 'Before You Start', ja: '服薬前の準備' },
          slug: 'before-you-start',
        },
        {
          label: '用药路径图',
          translations: { en: 'HRT Pathway', ja: 'HRT経路マップ' },
          slug: 'pathway',
        },
        {
          label: '药物详解',
          translations: { en: 'Medications', ja: '薬物ガイド' },
          items: [
            // ── 雌二醇：按给药途径分组 ──
            {
              label: '雌二醇',
              translations: { en: 'Estrogens', ja: 'エストロゲン' },
              items: [
                {
                  label: '总览与选择指南',
                  translations: { en: 'Overview & Selection', ja: '概要と選び方' },
                  slug: 'medications/estrogens/overview',
                },
                {
                  label: '口服途径',
                  translations: { en: 'Oral Route', ja: '経口投与' },
                  items: [
                    {
                      label: '口服（补佳乐）',
                      translations: { en: 'Oral (Pills)', ja: '経口（飲み薬）' },
                      slug: 'medications/estrogens/oral',
                    },
                    {
                      label: '舌下含服',
                      translations: { en: 'Sublingual', ja: '舌下投与' },
                      slug: 'medications/estrogens/sublingual',
                    },
                  ],
                },
                {
                  label: '透皮途径',
                  translations: { en: 'Transdermal Route', ja: '経皮投与' },
                  items: [
                    {
                      label: '凝胶',
                      translations: { en: 'Gel', ja: 'ゲル' },
                      slug: 'medications/estrogens/gel',
                    },
                    {
                      label: '贴片',
                      translations: { en: 'Patches', ja: 'パッチ' },
                      slug: 'medications/estrogens/transdermal-patch',
                    },
                  ],
                },
                {
                  label: '注射途径',
                  translations: { en: 'Injectable Route', ja: '注射投与' },
                  collapsed: true,
                  items: [
                    {
                      label: '戊酸雌二醇 (EV)',
                      translations: { en: 'Estradiol Valerate (EV)', ja: '吉草酸エストラジオール (EV)' },
                      slug: 'medications/estrogens/injection',
                      badge: { text: { 'zh-CN': '常用', en: 'Common', ja: '基本' }, variant: 'tip' },
                    },
                    {
                      label: '环戊丙酸酯 (EC)',
                      translations: { en: 'Estradiol Cypionate (EC)', ja: 'シピオネート (EC)' },
                      slug: 'medications/estrogens/cypionate',
                    },
                    {
                      label: '庚酸酯 (EEn)',
                      translations: { en: 'Estradiol Enanthate (EEn)', ja: 'エナント酸 (EEn)' },
                      slug: 'medications/estrogens/enanthate',
                    },
                    {
                      label: '十一酸酯 (EU)',
                      translations: { en: 'Estradiol Undecylate (EU)', ja: 'ウンデシル酸 (EU)' },
                      slug: 'medications/estrogens/undecylate',
                    },
                  ],
                },
                {
                  label: '禁用雌激素',
                  translations: { en: 'Banned Estrogens', ja: '禁止エストロゲン' },
                  slug: 'medications/estrogens/banned-estrogens',
                  badge: { text: '⚠', variant: 'danger' },
                },
              ],
            },
            // ── 抗雄激素：平铺 + badge 标注 ──
            {
              label: '抗雄激素',
              translations: { en: 'Anti-Androgens', ja: '抗アンドロゲン' },
              items: [
                {
                  label: '概述',
                  translations: { en: 'Overview', ja: '概要' },
                  slug: 'medications/antiandrogens/overview',
                },
                {
                  label: 'CPA（色谱龙）',
                  translations: { en: 'CPA (Cyproterone)', ja: 'CPA（酢酸シプロテロン）' },
                  slug: 'medications/antiandrogens/cpa',
                  badge: { text: { 'zh-CN': '常用', en: 'Common', ja: '基本' }, variant: 'tip' },
                },
                {
                  label: '螺内酯',
                  translations: { en: 'Spironolactone', ja: 'スピロノラクトン' },
                  slug: 'medications/antiandrogens/spironolactone',
                },
                {
                  label: 'GnRH 激动剂',
                  translations: { en: 'GnRH Agonists', ja: 'GnRHアゴニスト' },
                  slug: 'medications/antiandrogens/gnrh-agonists',
                },
                {
                  label: '比卡鲁胺',
                  translations: { en: 'Bicalutamide', ja: 'ビカルタミド' },
                  slug: 'medications/antiandrogens/bicalutamide',
                  badge: { text: { 'zh-CN': '慎用', en: 'Caution', ja: '要注意' }, variant: 'caution' },
                },
              ],
            },
            // ── 孕激素：推荐 vs 替代分组 ──
            {
              label: '孕激素',
              translations: { en: 'Progestogens', ja: 'プロゲストーゲン' },
              items: [
                {
                  label: '概述',
                  translations: { en: 'Overview', ja: '概要' },
                  slug: 'medications/progestogens/overview',
                  badge: { text: { 'zh-CN': '非必需', en: 'Optional', ja: '任意' }, variant: 'note' },
                },
                {
                  label: '推荐选项',
                  translations: { en: 'Recommended', ja: '推奨' },
                  items: [
                    {
                      label: '微粒化黄体酮',
                      translations: { en: 'Micronized Progesterone', ja: '微粉化プロゲステロン' },
                      slug: 'medications/progestogens/progesterone',
                      badge: { text: { 'zh-CN': '首选', en: 'Preferred', ja: '推奨' }, variant: 'tip' },
                    },
                    {
                      label: '羟孕酮注射',
                      translations: { en: 'Hydroxyprogesterone', ja: 'ヒドロキシプロゲステロン' },
                      slug: 'medications/progestogens/hydroxyprogesterone',
                    },
                  ],
                },
                {
                  label: '替代选项',
                  translations: { en: 'Alternatives', ja: '代替選択肢' },
                  collapsed: true,
                  items: [
                    {
                      label: '地屈孕酮',
                      translations: { en: 'Dydrogesterone', ja: 'ジドロゲステロン' },
                      slug: 'medications/progestogens/dydrogesterone',
                    },
                    {
                      label: '屈螺酮',
                      translations: { en: 'Drospirenone', ja: 'ドロスピレノン' },
                      slug: 'medications/progestogens/drospirenone',
                    },
                  ],
                },
                {
                  label: '不推荐孕激素 (MPA)',
                  translations: { en: 'Not Recommended (MPA)', ja: '非推奨 (MPA)' },
                  slug: 'medications/progestogens/cautioned-progestins',
                  badge: { text: '⚠', variant: 'danger' },
                },
              ],
            },
            // ── 5α-还原酶抑制剂：仅 3 项，保持 autogenerate ──
            {
              label: '5α-还原酶抑制剂',
              translations: { en: '5α-Reductase Inhibitors', ja: '5α還元酵素阻害薬' },
              autogenerate: { directory: 'medications/five-alpha-reductase' },
            },
            // ── 绝对禁用药物 ──
            {
              label: '绝对禁用药物',
              translations: { en: 'Banned Drugs', ja: '使用禁止薬物' },
              slug: 'medications/banned-drugs',
              badge: { text: '⚠', variant: 'danger' },
            },
          ],
        },
        {
          label: '剂量红线与混用禁忌',
          translations: { en: 'Dose Limits & Contraindications', ja: '用量レッドライン' },
          slug: 'dose-limits',
        },
        {
          label: '乳房发育专题',
          translations: { en: 'Breast Development', ja: '乳房発育ガイド' },
          slug: 'breast-development',
        },
        {
          label: '血检指南与自查工具',
          translations: { en: 'Blood Tests & Self-Check', ja: '血液検査ガイド' },
          slug: 'blood-tests',
        },
        {
          label: '风险与急症识别',
          translations: { en: 'Risks & Emergencies', ja: 'リスクと緊急対応' },
          slug: 'risks',
        },
        {
          label: '中国现实',
          translations: { en: 'Regional Access', ja: '各国の現状' },
          slug: 'china-reality',
        },
        {
          label: '工具',
          translations: { en: 'Tools', ja: 'ツール' },
          items: [
            { label: '血检自查工具', translations: { en: 'Blood Test Checker', ja: '血液検査チェッカー' }, slug: 'tools/blood-checker' },
            { label: '注射剂量换算', translations: { en: 'Injection Calculator', ja: '注射量計算機' }, slug: 'tools/injection-calculator' },
            { label: '剂量模拟器', translations: { en: 'Dose Simulator', ja: '用量シミュレーター' }, slug: 'tools/dose-simulator' },
            { label: 'AI 问答助手', translations: { en: 'AI Assistant', ja: 'AIアシスタント' }, slug: 'tools/ai-assistant' },
            { label: '友好医疗资源', translations: { en: 'Medical Directory', ja: '医療施設情報' }, slug: 'tools/hospital-finder' },
            { label: '药物比较器', translations: { en: 'Drug Comparator', ja: '薬物比較ツール' }, slug: 'tools/drug-comparator' },
            { label: '风险自评', translations: { en: 'Risk Screener', ja: 'リスク自己評価' }, slug: 'tools/risk-screener' },
          ],
        },
        {
          label: '附录',
          translations: { en: 'Appendix', ja: '付録' },
          items: [
            { label: '关于本站', translations: { en: 'About', ja: 'サイトについて' }, slug: 'about' },
            { label: '参考文献库', translations: { en: 'Reference Library', ja: '参考文献ライブラリ' }, slug: 'appendix-references' },
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
            href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&family=Noto+Sans+JP:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+JP:wght@400;600;700&family=Noto+Serif+SC:wght@400;600;700&display=swap',
            onload: "this.onload=null;this.rel='stylesheet'",
          },
        },
        // Fallback for no-JS browsers
        {
          tag: 'noscript',
          content: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&family=Noto+Sans+JP:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600&family=Noto+Serif+JP:wght@400;600;700&family=Noto+Serif+SC:wght@400;600;700&display=swap" />',
        },
      ],
    }),
    react(),
  ],
});
