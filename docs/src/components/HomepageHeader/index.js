/**
 * Version: 2.6.1
 * Description: Clinisync homepage hero banner. Renders only the <header> — the surrounding
 *              Layout (navbar + footer) is provided by the parent page (src/pages/index.js).
 * Author: Ali Kahwaji
 */

import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

export default function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  const toolUrl = useBaseUrl('/tool/');

  return (
    <header className={clsx('hero hero--dark', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className="hero__title">{siteConfig.title} Documentation</h1>
            <p className="hero__subtitle">
              Everything you need to clean, convert, and secure clinical Excel data across multiple sheets.
            </p>
            <div className={styles.heroButtons}>
              <a className="button button--primary button--lg" href={toolUrl}>
                Try the demo
              </a>
              <Link className="button button--secondary button--lg" to="/about">
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
  );
}
