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
            {
              label: '雌二醇',
              translations: { en: 'Estrogens', ja: 'エストロゲン' },
              autogenerate: { directory: 'medications/estrogens' },
            },
            {
              label: '抗雄激素',
              translations: { en: 'Anti-Androgens', ja: '抗アンドロゲン' },
              autogenerate: { directory: 'medications/antiandrogens' },
            },
            {
              label: '孕激素',
              translations: { en: 'Progestogens', ja: 'プロゲストーゲン' },
              autogenerate: { directory: 'medications/progestogens' },
            },
            {
              label: '5α-还原酶抑制剂',
              translations: { en: '5α-Reductase Inhibitors', ja: '5α還元酵素阻害薬' },
              autogenerate: { directory: 'medications/five-alpha-reductase' },
            },
            {
              label: '绝对禁用药物',
              translations: { en: 'Banned Drugs', ja: '使用禁止薬物' },
              slug: 'medications/banned-drugs',
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
