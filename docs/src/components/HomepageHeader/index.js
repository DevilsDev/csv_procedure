/**
 * Version: 2.4.0
 * Description: Clinisync homepage hero banner with modern layout, mobile responsiveness, and call-to-action buttons.
 * Author: Ali Kahwaji
 */

import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout>
      <header className={clsx('hero hero--dark', styles.heroBanner)}>
        <div className="container">
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className="hero__title">{siteConfig.title} Documentation</h1>
              <p className="hero__subtitle">
                Everything you need to clean, convert, and secure clinical Excel data across multiple sheets.
              </p>
              <div className={styles.heroButtons}>
                <Link className="button button--primary button--lg" to="/about">
                  About
                </Link>
                <Link className="button button--secondary button--lg" to="/api-upload">
                  API Reference
                </Link>
                <Link className="button button--secondary button--lg" to="/cleaning-rules">
                  Cleaning Rules
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>
    </Layout>
  );
}
