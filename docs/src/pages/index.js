/**
 * Version: 2.7.2
 * Description: Entry point for the Thresh documentation homepage. Injects schema.org
 *              structured data so search engines and rich-result systems can index it
 *              as both a SoftwareApplication and a WebSite.
 * Author: Ali Kahwaji
 */

import React from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import HomepageHeader from '../components/HomepageHeader';
import HomepageFeatures from '../components/HomepageFeatures';

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://devilsdev.github.io/csv_procedure/#website',
      url: 'https://devilsdev.github.io/csv_procedure/',
      name: 'Thresh',
      description: 'Privacy-first spreadsheet ETL. Strip identifiers, anonymize patient codes, convert dates of birth to ages, and ship analysis-ready CSVs.',
      inLanguage: 'en',
      publisher: {
        '@type': 'Person',
        name: 'Ali Kahwaji',
        url: 'https://github.com/alikahwaji',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://devilsdev.github.io/csv_procedure/#software',
      name: 'Thresh',
      applicationCategory: 'UtilitiesApplication',
      applicationSubCategory: 'Data privacy / ETL',
      operatingSystem: 'Any (web browser, Node.js)',
      url: 'https://devilsdev.github.io/csv_procedure/tool/',
      downloadUrl: 'https://github.com/DevilsDev/csv_procedure',
      description: 'Privacy-first spreadsheet ETL. Drop in an Excel workbook and get back de-identified per-sheet CSVs without uploading anything.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      license: 'https://opensource.org/licenses/MIT',
      isAccessibleForFree: true,
      softwareVersion: '2.7.1',
      featureList: [
        'Anonymize NHI to sequential ID',
        'Convert DOB to whole-year age',
        'Drop Address and Contact columns',
        'Deduplicate transformed rows',
        'Multi-sheet workbook support',
        'Per-sheet CSV download',
        'Manifest JSON download',
        '100% client-side processing in the in-browser tool',
      ],
      author: {
        '@type': 'Person',
        name: 'Ali Kahwaji',
        url: 'https://github.com/alikahwaji',
      },
    },
  ],
};

export default function Home() {
  return (
    <Layout
      title="Thresh — privacy-first spreadsheet ETL"
      description="Strip identifiers from spreadsheets, anonymize NHIs, convert DOBs to ages, and ship analysis-ready CSVs. Run as a server or in your browser."
    >
      <Head>
        <link rel="canonical" href="https://devilsdev.github.io/csv_procedure/" />
        <script type="application/ld+json">
          {JSON.stringify(STRUCTURED_DATA)}
        </script>
      </Head>
      <HomepageHeader />
      <HomepageFeatures />
    </Layout>
  );
}
