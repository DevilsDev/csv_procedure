/**
 * Version: 2.4.0
 * Sidebar configuration for Clinisync Docs
 * Author: Ali Kahwaji
 * Updated: Structured nav sections for About, API, Cleaning Rules, and Mission
 */

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {
      type: 'category',
      label: 'About',
      items: [
        'intro',
        'about/project-scope',
        'about/team',
        'about/technology',
      ],
    },
    {
      type: 'category',
      label: 'API',
      items: [
        'api-upload',
        'api/cli-usage',
        'api/endpoints',
        'api/examples',
      ],
    },
    {
      type: 'category',
      label: 'Cleaning Rules',
      items: [
        'cleaning-rules',
        'cleaning/fields',
        'cleaning/sensitive-data',
        'cleaning/dob-to-age',
        'cleaning/duplicates',
      ],
    },
    {
      type: 'category',
      label: 'Mission',
      items: [
        'mission/vision',
        'mission/etl-design',
        'mission/security',
        'mission/scalability',
      ],
    },
  ],
};

export default sidebars;
