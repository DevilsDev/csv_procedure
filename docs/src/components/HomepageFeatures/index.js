/**
 * Version: 2.7.1
 * Description: Multi-section landing content for the Thresh docs homepage.
 * Author: Ali Kahwaji
 */

import React from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

function TwoFlavors() {
  const toolUrl = useBaseUrl('/tool/');
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Two ways to use it</h2>
        <p className={styles.sectionLede}>
          Same cleaning rules in both. Pick the surface that matches how you work.
        </p>
        <div className={styles.twoUp}>
          <div className={styles.flavor}>
            <h3>In your browser</h3>
            <div className={styles.flavorMeta}>
              <span className={styles.tag}>No upload</span>
              <span className={styles.tag}>No server</span>
              <span className={styles.tag}>Free</span>
            </div>
            <p>
              Open the page, drop a workbook in, and the cleaning runs locally on your machine. The file never leaves the tab. Best for one-off cleaning, demos, and privacy-sensitive workflows.
            </p>
            <div className={styles.flavorAction}>
              <a className="button button--primary" href={toolUrl}>Try the in-browser tool</a>
            </div>
          </div>

          <div className={styles.flavor}>
            <h3>As a server</h3>
            <div className={styles.flavorMeta}>
              <span className={styles.tag}>Express</span>
              <span className={styles.tag}>API key auth</span>
              <span className={styles.tag}>Rate limited</span>
              <span className={styles.tag}>Virus-scan hook</span>
            </div>
            <p>
              Run a Node process behind a <code>POST /upload</code> endpoint. Same cleaning, plus optional ClamAV scanning, Redis-backed rate limits, configurable retention, and downloadable per-sheet outputs.
            </p>
            <div className={styles.flavorAction}>
              <Link className="button button--secondary" to="/api-upload">See the API reference</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <div className="container">
        <h2 className={styles.sectionTitle}>How it works</h2>
        <p className={styles.sectionLede}>
          The pipeline is three small modules. Each does one thing, and they hand each other plain JavaScript values.
        </p>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>Extract</h3>
            <p>Read every sheet from the uploaded workbook into a 2-D array of cells. Empty sheets are skipped.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>Transform</h3>
            <p>Apply column rules (NHI&nbsp;→&nbsp;ID, DOB&nbsp;→&nbsp;Age, drop Address/Contact), skip blank rows, and dedupe. Per-sheet stats are emitted alongside the cleaned rows.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Load</h3>
            <p>Write one CSV per sheet plus a per-upload manifest. The route returns JSON pointing at every output file by name.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CodeSample() {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>One curl away</h2>
        <p className={styles.sectionLede}>
          The HTTP surface is small on purpose. One endpoint, one response shape, no surprises.
        </p>
        <pre className={styles.codeSample}>
{`$ `}<span className={styles.flag}>curl</span>{` -F `}<span className={styles.str}>"excel=@./case-mix.xlsx"</span>{` \\
       -H `}<span className={styles.str}>"Authorization: Bearer $CLINISYNC_API_KEY"</span>{` \\
       http://localhost:3000/upload

{
  `}<span className={styles.flag}>"message"</span>{`: "Upload and transformation completed successfully.",
  `}<span className={styles.flag}>"sheetsProcessed"</span>{`: 3,
  `}<span className={styles.flag}>"rowsProcessed"</span>{`: 17,
  `}<span className={styles.flag}>"duplicatesRemoved"</span>{`: 1,
  `}<span className={styles.flag}>"invalidDobCount"</span>{`: 1,
  `}<span className={styles.flag}>"missingNhiCount"</span>{`: 1,
  `}<span className={styles.flag}>"files"</span>{`: [...],
  `}<span className={styles.flag}>"manifest"</span>{`: "manifest-case_mix-...-.json"
}`}
        </pre>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Why Thresh</h2>
        <p className={styles.sectionLede}>
          Three principles the codebase actively defends.
        </p>
        <div className={styles.why}>
          <div className={styles.whyItem}>
            <h3>De-identify by default</h3>
            <p>Output never contains the original NHI, DOB, address, or contact details. The most common mistake (forgetting to scrub a column) is prevented by the pipeline, not procedure.</p>
          </div>
          <div className={styles.whyItem}>
            <h3>Hold no data</h3>
            <p>Cleaned files are swept by a TTL sweeper. There is no database, no patient registry, no audit table — just transient on-disk artifacts and a per-upload manifest.</p>
          </div>
          <div className={styles.whyItem}>
            <h3>Honest about scope</h3>
            <p>Thresh isn't HIPAA-certified, isn't a managed service, and isn't a place to store data. It is the cleaning layer that sits in front of one — and the docs say exactly that.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cta() {
  const toolUrl = useBaseUrl('/tool/');
  return (
    <section className={styles.cta}>
      <div className="container">
        <h2>Drop in a workbook?</h2>
        <p>The in-browser tool processes the file locally. Nothing is uploaded.</p>
        <div className={styles.ctaButtons}>
          <a className="button button--primary button--lg" href={toolUrl}>Open the in-browser tool</a>
          <Link className="button button--secondary button--lg" to="/intro">Read the docs</Link>
        </div>
      </div>
    </section>
  );
}

export default function HomepageFeatures() {
  return (
    <main>
      <TwoFlavors />
      <HowItWorks />
      <CodeSample />
      <Why />
      <Cta />
    </main>
  );
}
