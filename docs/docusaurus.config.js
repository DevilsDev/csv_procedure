/**
 * Version: 2.4.0
 * Description: Docusaurus configuration for Clinisync Docs with refined UX
 * Author: Ali Kahwaji
 * Updated: Modern UI polish, footer simplification, GitHub Pages ready
 * @type {import('@docusaurus/types').Config}
 */

export default {
  title: 'Thresh',
  tagline: 'Spreadsheet de-identification, in your browser.',
  url: 'https://devilsdev.github.io',
  baseUrl: '/csv_procedure/',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon-from-original.png',
  organizationName: 'DevilsDev', // GitHub user/org
  projectName: 'csv_procedure',  // GitHub repo

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themeConfig: {
    navbar: {
      title: 'Thresh',
      logo: {
        alt: 'Thresh',
        src: 'img/thresh-mark.svg',
      },
      items: [
        {
          href: 'pathname:///csv_procedure/tool/',
          label: 'Try the demo',
          position: 'left',
        },
        {
          href: 'https://github.com/DevilsDev/csv_procedure',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: 'Mission',
          items: [
            { label: 'About', to: '/about' },
            { label: 'API', to: '/api-upload' },
            { label: 'Cleaning Rules', to: '/cleaning-rules' },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/DevilsDev/csv_procedure',
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Thresh by Ali Kahwaji · MIT licensed`,
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
