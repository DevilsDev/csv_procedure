/**
 * Sidebar configuration for Clinisync Docs
 */

export default {
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'About',
      items: [
        'about/project-scope',
        'about/team',
        'about/technology',
      ],
    },
    {
      type: 'category',
      label: 'API',
      items: [
        'api/cli-usage',
        'api/endpoints',
        'api/examples',
        'upload', // ✅ No slash
      ],
    },
    {
      type: 'category',
      label: 'Cleaning Rules',
      items: [
        'cleaning/dob-to-age',
        'cleaning/duplicates',
        'cleaning/fields',
        'rules', // ✅ No slash
        'cleaning/sensitive-data',
      ],
    },
    {
      type: 'category',
      label: 'Mission',
      items: [
        'mission/vision',
        'mission/etl-design',
        'mission/scalability',
        'mission/security',
      ],
    },
  ],
};
