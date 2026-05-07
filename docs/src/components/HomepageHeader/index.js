/**
 * Version: 2.7.1
 * Description: Thresh docs homepage hero. The surrounding Layout (navbar + footer)
 *              comes from src/pages/index.js.
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
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>
            <span className={styles.dot}></span>
            Privacy-first ETL · Open source
          </span>
          <h1 className="hero__title">Thresh</h1>
          <p className="hero__subtitle">
            Strip identifiers from spreadsheets, anonymize patient codes, convert dates of birth to ages, and ship analysis-ready CSVs — without the workbook ever touching a database. Run it as a server or run it in a browser tab.
          </p>
          <div className={styles.heroButtons}>
            <a className="button button--primary button--lg" href={toolUrl}>
              Try it in your browser
            </a>
            <Link className="button button--secondary button--lg" to="/intro">
              Read the docs
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
