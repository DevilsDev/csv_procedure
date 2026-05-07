/**
 * Version: 2.7.0
 * Description: Thresh homepage hero. Renders only the <header> — surrounding Layout
 *              (navbar + footer) is provided by the parent page (src/pages/index.js).
 * Author: Ali Kahwaji
 */

import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

export default function HomepageHeader() {
  const toolUrl = useBaseUrl('/tool/');

  return (
    <header className={clsx('hero hero--dark', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className="hero__title">Thresh</h1>
            <p className="hero__subtitle">
              Privacy-first spreadsheet ETL. Strip identifiers, anonymize NHIs, convert dates of birth, and ship analysis-ready CSVs — without the workbook ever touching a database.
            </p>
            <div className={styles.heroButtons}>
              <a className="button button--primary button--lg" href={toolUrl}>
                Try it in your browser
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
