/**
 * Version: 2.0.0
 * Description: Docusaurus configuration for Clinisync Docs
 * Author: Ali Kahwaji
 * Updated: Includes Algolia search and GitHub Pages deployment
 * @type {import('@docusaurus/types').Config}
 */

export default {
  title: 'Clinisync Docs',
  tagline: 'Clean. Convert. Protect.',
  url: 'https://your-org.github.io',
  baseUrl: '/clinisync/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon-from-original.png',
  organizationName: 'your-org', // GitHub org/user
  projectName: 'clinisync',     // GitHub repo name

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themeConfig: {
    navbar: {
      title: 'Clinisync Docs',
      logo: {
        alt: 'Clinisync Logo',
        src: 'img/clinisync-logo-final.svg',
        srcDark: 'img/clinisync-darkmode.png' // optional custom logo path
      },
      items: [
        { to: '/', label: 'Docs', position: 'left' },
        {
          href: 'https://github.com/your-org/clinisync',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/' },
            { label: 'API', to: '/api-upload' },
            { label: 'Cleaning Rules', to: '/cleaning-rules' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/your-org/clinisync' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Clinisync by Ali Kahwaji`,
    },

    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'clinisync_docs',
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
