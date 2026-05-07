/**
 * Version: 2.6.1
 * Description: Browser-side ETL pipeline. Mirrors src/etl/transform.js and
 *              src/etl/idMapper.js so the cleaning rules behave identically to the
 *              server. When you change the server-side rules, mirror the change here.
 *
 *              This file is intentionally self-contained and exposes a single global,
 *              window.ClinisyncETL. It depends on the xlsx library being loaded first
 *              (window.XLSX from xlsx.full.min.js).
 *
 *              No data leaves the browser. Workbooks are parsed via XLSX.read on an
 *              in-memory ArrayBuffer; cleaned CSVs are produced as strings and handed
 *              to upload.js to wrap as Blobs for download.
 * Author: Ali Kahwaji
 */

(function (global) {
  'use strict';

  // ---------- helpers shared with server transform.js ----------

  function isMissingNhi(value) {
    return typeof value !== 'string' || value.trim() === '';
  }

  function isBlankCell(value) {
    return value === null || value === undefined || value === '';
  }

  function getEmptyStats() {
    return {
      rowsProcessed: 0,
      duplicatesRemoved: 0,
      invalidDobCount: 0,
      missingNhiCount: 0,
    };
  }

  function calculateAgeFromDOB(dobRaw) {
    try {
      const dob = new Date(dobRaw);
      if (isNaN(dob)) return '';
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const hasHadBirthday =
        (now.getMonth() > dob.getMonth()) ||
        (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
      if (!hasHadBirthday) age--;
      return age >= 0 && age < 130 ? age : '';
    } catch (e) {
      return '';
    }
  }

  // ---------- idMapper (mirror of server) ----------

  function createIdMapper() {
    const map = new Map();
    let counter = 1;
    return {
      getAnonymizedId: function (nhi) {
        if (typeof nhi !== 'string' || nhi.trim() === '') return '';
        const key = nhi.trim();
        if (!map.has(key)) {
          map.set(key, 'ID-' + String(counter++).padStart(3, '0'));
        }
        return map.get(key);
      },
      reset: function () { map.clear(); counter = 1; },
    };
  }

  // ---------- transform (mirror of server) ----------

  function transformSheetWithStats(rows, idMapper) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { rows: [], stats: getEmptyStats() };
    }

    const mapper = idMapper || createIdMapper();
    const rawHeader = rows[0];
    const cleaned = [];
    const columnMap = [];
    const stats = getEmptyStats();

    for (let i = 0; i < rawHeader.length; i++) {
      const rawCol = String(rawHeader[i] || '').trim().toLowerCase();
      if (!rawCol || rawCol.indexOf('column') === 0) {
        columnMap.push(null);
      } else if (rawCol === 'nhi') {
        columnMap.push('ID');
      } else if (rawCol === 'dob') {
        columnMap.push('Age');
      } else if (rawCol === 'contact' || rawCol === 'address') {
        columnMap.push(null);
      } else {
        columnMap.push(rawHeader[i]);
      }
    }

    cleaned.push(columnMap.filter(Boolean));

    const seen = new Set();

    for (let i = 1; i < rows.length; i++) {
      const rawRow = rows[i];
      if (!Array.isArray(rawRow) || rawRow.every(isBlankCell)) continue;

      stats.rowsProcessed += 1;
      const cleanedRow = [];

      for (let j = 0; j < columnMap.length; j++) {
        const label = columnMap[j];
        if (!label) continue;
        const cellValue = rawRow[j];
        if (label === 'ID') {
          if (isMissingNhi(cellValue)) {
            stats.missingNhiCount += 1;
            cleanedRow.push('');
          } else {
            cleanedRow.push(mapper.getAnonymizedId(cellValue));
          }
        } else if (label === 'Age') {
          const age = calculateAgeFromDOB(cellValue);
          if (age === '' && !isBlankCell(cellValue)) stats.invalidDobCount += 1;
          cleanedRow.push(age);
        } else {
          cleanedRow.push(cellValue);
        }
      }

      const key = JSON.stringify(cleanedRow);
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push(cleanedRow);
      } else {
        stats.duplicatesRemoved += 1;
      }
    }

    return { rows: cleaned, stats: stats };
  }

  // ---------- browser-only helpers ----------

  function extractSheets(arrayBuffer) {
    if (!global.XLSX) throw new Error('xlsx library not loaded');
    const workbook = global.XLSX.read(arrayBuffer, { type: 'array' });
    const extracted = [];
    for (let i = 0; i < workbook.SheetNames.length; i++) {
      const name = workbook.SheetNames[i];
      const rawRows = global.XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        header: 1,
        defval: '',
      });
      if (Array.isArray(rawRows) && rawRows.length > 0) {
        extracted.push({ name: name, rows: rawRows });
      }
    }
    return extracted;
  }

  function csvFromRows(rows) {
    if (!global.XLSX) throw new Error('xlsx library not loaded');
    const sheet = global.XLSX.utils.aoa_to_sheet(rows);
    return global.XLSX.utils.sheet_to_csv(sheet);
  }

  function sanitizeName(value, fallback) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_') || fallback;
  }

  function makeFilename(sourceBase, sheetName, counter, timestamp) {
    const safeBase = sanitizeName(sourceBase, 'workbook');
    const safeSheet = sanitizeName(sheetName, 'sheet');
    return 'converted-' + safeBase + '-' + timestamp + '-' + counter + '-' + safeSheet + '.csv';
  }

  function manifestFilename(sourceBase, counter, timestamp) {
    const safeBase = sanitizeName(sourceBase, 'workbook');
    return 'manifest-' + safeBase + '-' + timestamp + '-' + counter + '.json';
  }

  /**
   * Run the full pipeline against an in-memory ArrayBuffer.
   * Returns a structured result that upload.js renders directly — no network round-trip.
   */
  function processWorkbook(arrayBuffer, sourceFileName) {
    const idMapper = createIdMapper();
    const sheets = extractSheets(arrayBuffer);
    const sourceBase = String(sourceFileName || 'workbook').replace(/\.[^.]+$/, '');
    const timestamp = Date.now();

    const summary = {
      sheetsProcessed: 0,
      rowsProcessed: 0,
      duplicatesRemoved: 0,
      invalidDobCount: 0,
      missingNhiCount: 0,
    };

    const sheetOutputs = [];
    let counter = 0;

    for (let i = 0; i < sheets.length; i++) {
      counter += 1;
      const sheet = sheets[i];
      const result = transformSheetWithStats(sheet.rows, idMapper);
      const csv = csvFromRows(result.rows);
      const fileName = makeFilename(sourceBase, sheet.name, counter, timestamp);

      sheetOutputs.push({
        sheetName: sheet.name,
        fileName: fileName,
        csv: csv,
        rows: result.rows, // already 2-D for the in-page preview
        rowsProcessed: result.stats.rowsProcessed,
        duplicatesRemoved: result.stats.duplicatesRemoved,
        invalidDobCount: result.stats.invalidDobCount,
        missingNhiCount: result.stats.missingNhiCount,
      });

      summary.sheetsProcessed += 1;
      summary.rowsProcessed += result.stats.rowsProcessed;
      summary.duplicatesRemoved += result.stats.duplicatesRemoved;
      summary.invalidDobCount += result.stats.invalidDobCount;
      summary.missingNhiCount += result.stats.missingNhiCount;
    }

    counter += 1;
    const manifestName = manifestFilename(sourceBase, counter, timestamp);
    const manifest = Object.assign(
      {
        sourceFileName: sourceFileName,
        generatedAt: new Date().toISOString(),
      },
      summary,
      {
        files: sheetOutputs.map(function (s) { return s.fileName; }),
        sheets: sheetOutputs.map(function (s) {
          return {
            sheetName: s.sheetName,
            fileName: s.fileName,
            rowsProcessed: s.rowsProcessed,
            duplicatesRemoved: s.duplicatesRemoved,
            invalidDobCount: s.invalidDobCount,
            missingNhiCount: s.missingNhiCount,
          };
        }),
      }
    );

    return {
      message: 'Upload and transformation completed successfully.',
      sheets: sheetOutputs,
      manifest: { name: manifestName, json: manifest },
      summary: summary,
    };
  }

  global.ClinisyncETL = {
    createIdMapper: createIdMapper,
    transformSheetWithStats: transformSheetWithStats,
    extractSheets: extractSheets,
    csvFromRows: csvFromRows,
    processWorkbook: processWorkbook,
    sanitizeName: sanitizeName,
  };

})(typeof window !== 'undefined' ? window : globalThis);
