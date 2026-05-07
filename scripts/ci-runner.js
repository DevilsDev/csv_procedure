#!/usr/bin/env node
/**
 * Script: ci-runner.js
 * Version: 1.2.1
 * Purpose: Local-runnable CI script — lint, test, coverage upload, optional
 *          GitHub Release update. Used by `npm run ci` (and indirectly by
 *          `npm run release`). The hosted CI workflow at .github/workflows/ci.yml
 *          calls `npm run lint` + `npm test` directly and does not depend on
 *          this file; this script exists for hand-driven release runs and
 *          self-hosted CI environments.
 *
 *          Reads env: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_REF,
 *                     CODECOV_REPO. Missing values are logged and the
 *                     corresponding step is skipped, never fatal.
 *
 * Author: Ali Kahwaji
 */

require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const axios = require('axios');

function run(command, label) {
  console.log('\n[ci] ' + label + '...');
  try {
    execSync(command, { stdio: 'inherit' });
    console.log('[ci] ' + label + ' complete.');
  } catch {
    console.error('[ci] ' + label + ' failed.');
    process.exit(1);
  }
}

function uploadCoverage() {
  const relativePath = 'coverage/lcov.info';
  const repoSlug = process.env.CODECOV_REPO || process.env.GITHUB_REPOSITORY;

  if (!fs.existsSync(relativePath)) {
    console.warn('[ci] no coverage file at ' + relativePath + '; skipping codecov upload.');
    return;
  }
  if (!repoSlug) {
    console.warn('[ci] no CODECOV_REPO or GITHUB_REPOSITORY env var; skipping codecov upload.');
    return;
  }

  console.log('\n[ci] uploading coverage to codecov for ' + repoSlug + '...');
  try {
    execSync('npx codecov@3.1.0 -f "' + relativePath + '" -r "' + repoSlug + '" --disable=gcov', { stdio: 'inherit' });
    console.log('[ci] codecov upload complete.');
  } catch (err) {
    console.error('[ci] codecov upload failed:', err.message);
  }
}

async function postToGitHubRelease() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const tag = (process.env.GITHUB_REF && process.env.GITHUB_REF.split('/').pop())
    || ('v' + require('../package.json').version);

  if (!token || !repo) {
    console.warn('[ci] no GITHUB_TOKEN / GITHUB_REPOSITORY; skipping release update.');
    return;
  }

  const body = fs.existsSync('coverage/coverage-summary.json')
    ? fs.readFileSync('coverage/coverage-summary.json', 'utf-8')
    : 'No coverage summary found.';

  const headers = { Authorization: 'token ' + token, 'Content-Type': 'application/json' };
  const releaseApi = 'https://api.github.com/repos/' + repo + '/releases/tags/' + tag;

  console.log('\n[ci] updating GitHub release ' + tag + '...');

  try {
    const { data: release } = await axios.get(releaseApi, { headers });
    await axios.patch(
      'https://api.github.com/repos/' + repo + '/releases/' + release.id,
      { body: '### CI Report\n\n```json\n' + body + '\n```' },
      { headers }
    );
    console.log('[ci] release updated.');
  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.log('[ci] release not found; creating one for ' + tag + '...');
      try {
        await axios.post(
          'https://api.github.com/repos/' + repo + '/releases',
          {
            tag_name: tag,
            name: 'Release ' + tag,
            body: '### CI Report\n\n```json\n' + body + '\n```',
            draft: false,
            prerelease: false,
          },
          { headers }
        );
        console.log('[ci] release created.');
      } catch (postErr) {
        console.error('[ci] release create failed:', postErr.message);
      }
    } else {
      console.error('[ci] release update failed:', err.message);
    }
  }
}

async function main() {
  run('npm run lint', 'lint');
  run('npm test', 'tests');
  uploadCoverage();
  await postToGitHubRelease();
}

main();
