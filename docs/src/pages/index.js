/**
 * Version: 2.4.0
 * Description: Entry point for Clinisync documentation homepage with enhanced hero design.
 * Author: Ali Kahwaji
 */

import React from 'react';
import HomepageHeader from '../components/HomepageHeader';
import Layout from '@theme/Layout';

export default function Home() {
  return (
    <Layout
      title="Clinisync"
      description="Clinisync Documentation - Clean, convert, and secure clinical Excel data"
    >
      <HomepageHeader />
    </Layout>
  );
}
