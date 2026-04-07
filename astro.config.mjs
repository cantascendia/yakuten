// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://hrtyaku.com',
  integrations: [
    starlight({
      title: 'HRT薬典',
      description: '循証 · 减害 · 引导就医 — 面向跨性别女性的 HRT 安全底线信息站',
      defaultLocale: 'zh',
      locales: {
        zh: { label: '中文', lang: 'zh-CN' },
      },
      customCss: [
        './src/styles/global.css',
        './src/styles/glass.css',
        './src/styles/emergency.css',
        './src/styles/starlight-override.css',
      ],
      sidebar: [
        {
          label: '用药前：你准备好了吗？',
          slug: 'before-you-start',
        },
        {
          label: '用药路径图',
          slug: 'pathway',
        },
        {
          label: '药物详解',
          items: [
            {
              label: '雌二醇',
              autogenerate: { directory: 'medications/estrogens' },
            },
            {
              label: '抗雄激素',
              autogenerate: { directory: 'medications/antiandrogens' },
            },
            {
              label: '孕激素',
              autogenerate: { directory: 'medications/progestogens' },
            },
            {
              label: '绝对禁用药物',
              slug: 'medications/banned-drugs',
            },
          ],
        },
        {
          label: '剂量红线与混用禁忌',
          slug: 'dose-limits',
        },
        {
          label: '血检指南与自查工具',
          slug: 'blood-tests',
        },
        {
          label: '风险与急症识别',
          slug: 'risks',
        },
        {
          label: '工具',
          items: [
            { label: '血检自查工具', slug: 'tools/blood-checker' },
            { label: '注射剂量换算', slug: 'tools/injection-calculator' },
          ],
        },
        {
          label: '附录',
          items: [
            { label: '关于本站', slug: 'about' },
          ],
        },
      ],
      head: [
        {
          tag: 'meta',
          attrs: {
            name: 'theme-color',
            content: '#0D0B14',
          },
        },
      ],
      components: {
        Head: './src/components/overrides/Head.astro',
      },
    }),
    react(),
  ],
});
