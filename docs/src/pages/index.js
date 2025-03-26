import React from 'react';
import Layout from '@theme/Layout';

export default function Home() {
  return (
    <Layout title="Clinisync Docs" description="Clean. Convert. Protect.">
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>🚀 Clinisync Documentation</h1>
        <p>Everything you need to clean, convert, and secure clinical Excel data.</p>
        <p style={{ marginTop: '2rem' }}>
          🧭 Use the sidebar to explore setup, API, rules, and testing.
        </p>
        <img src="/img/secure-docs.svg" alt="docs" style={{ marginTop: '2rem', maxWidth: 400 }} />
      </main>
    </Layout>
  );
}
