/**
 * Version: 2.5.5
 * Description: Sweeps the csvs/ output directory for files older than CLINISYNC_CSV_TTL_HOURS.
 *              Defaults to 24h. Best-effort — failures are logged but never thrown to the caller.
 * Author: Ali Kahwaji
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_TTL_HOURS = 24;
const CSVS_DIR = path.resolve(__dirname, '../../csvs');

function getTtlMs() {
  const raw = process.env.CLINISYNC_CSV_TTL_HOURS;
  const hours = raw ? Number(raw) : DEFAULT_TTL_HOURS;
  if (!Number.isFinite(hours) || hours <= 0) return DEFAULT_TTL_HOURS * 3600 * 1000;
  return hours * 3600 * 1000;
}

function sweepCsvDirectory(now = Date.now()) {
  const ttlMs = getTtlMs();
  let removed = 0;

  let entries;
  try {
    entries = fs.readdirSync(CSVS_DIR);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('[retention] failed to read csvs dir:', err.message);
    }
    return removed;
  }

  for (const name of entries) {
    const fullPath = path.join(CSVS_DIR, name);
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;
      if (now - stat.mtimeMs > ttlMs) {
        fs.unlinkSync(fullPath);
        removed += 1;
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn(`[retention] failed to evaluate ${name}:`, err.message);
      }
    }
  }

  return removed;
}

module.exports = { sweepCsvDirectory };
