/**
 * Version: 2.7.1
 * Description: Entry point for the Thresh documentation homepage.
 * Author: Ali Kahwaji
 */

import React from 'react';
import Layout from '@theme/Layout';
import HomepageHeader from '../components/HomepageHeader';
import HomepageFeatures from '../components/HomepageFeatures';

export default function Home() {
  return (
    <Layout
      title="Thresh — privacy-first spreadsheet ETL"
      description="Strip identifiers from spreadsheets, anonymize NHIs, convert DOBs to ages, and ship analysis-ready CSVs. Run as a server or in your browser."
    >
      <HomepageHeader />
      <HomepageFeatures />
    </Layout>
  );
}
