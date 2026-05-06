/**
 * Version: 2.5.7
 * Description: ClamAV-backed file scanner. Implements the scanner contract:
 *                  scanFile(path) -> Promise<{ clean: boolean, viruses?: string[] }>
 *
 *              `clamscan` is loaded lazily so projects that don't need virus scanning aren't
 *              forced to install it. To enable: `npm install clamscan` and set CLAMAV_TCP_HOST
 *              (and optionally CLAMAV_TCP_PORT, default 3310). A clamd daemon must be reachable.
 * Author: Ali Kahwaji
 */

function loadNodeClam() {
  try {
    return require('clamscan');
  } catch {
    throw new Error(
      'ClamAV scanner requested but the "clamscan" package is not installed. ' +
      'Run `npm install clamscan` or unset CLAMAV_TCP_HOST to fall back to no scanning.'
    );
  }
}

function createClamavScanner({ host, port = 3310 } = {}) {
  if (!host) throw new Error('createClamavScanner: host is required');

  const NodeClam = loadNodeClam();
  const initPromise = new NodeClam().init({
    clamdscan: {
      host,
      port,
      bypassTest: false,
      timeout: 30_000,
    },
    debugMode: false,
  });

  return {
    name: 'clamav',
    async scanFile(filePath) {
      const clam = await initPromise;
      const { isInfected, viruses } = await clam.isInfected(filePath);
      return { clean: !isInfected, viruses: viruses || [] };
    },
  };
}

module.exports = { createClamavScanner };
