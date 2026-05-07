/**
 * Version: 2.6.1
 * Description: UI logic for the in-browser Clinisync demo. Reads the dropped file as
 *              an ArrayBuffer, runs window.ClinisyncETL.processWorkbook on it, and
 *              renders the cleaned per-sheet CSVs as downloadable Blobs plus inline
 *              previews. No fetch / XHR calls are made beyond loading the static
 *              sample workbook from the same origin.
 * Author: Ali Kahwaji
 */

(function () {
  'use strict';

  // ----- DOM handles -----
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadButton = document.getElementById('uploadBtn');
  const sampleButton = document.getElementById('sampleBtn');
  const removeButton = document.getElementById('removeBtn');
  const selectedFileEl = document.getElementById('selectedFile');
  const statusEl = document.getElementById('status');
  const progressEl = document.getElementById('progress');
  const progressBarEl = document.getElementById('progressBar');
  const resultsEl = document.getElementById('results');
  const resultsTitleEl = document.getElementById('resultsTitle');
  const resultsSubtitleEl = document.getElementById('resultsSubtitle');
  const statsGridEl = document.getElementById('statsGrid');
  const tabsEl = document.getElementById('resultsTabs');
  const panelsEl = document.getElementById('resultsPanels');
  const historyCardEl = document.getElementById('historyCard');
  const historyListEl = document.getElementById('historyList');
  const rulesEditorEl = document.getElementById('rulesEditor');
  const rulesStatusEl = document.getElementById('rulesStatus');
  const rulesPillEl = document.getElementById('rulesPill');
  const rulesValidateBtn = document.getElementById('rulesValidateBtn');
  const rulesResetBtn = document.getElementById('rulesResetBtn');

  // ----- Constants -----
  const MAX_BYTES = 5 * 1024 * 1024;
  const VALID_EXT = /\.(xlsx|xls|ods)$/i;
  const SAMPLE_URL = './samples/case-mix-sample.xlsx';
  const SAMPLE_FILENAME = 'case-mix-sample.xlsx';
  const PREVIEW_ROW_LIMIT = 50;
  const HISTORY_LIMIT = 5;

  // ----- State -----
  let selectedFile = null;
  let activeRuleSet = null; // null = use defaults
  const history = [];
  let nextRunId = 1;

  // ===== Helpers =====

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setStatus(text, kind) {
    statusEl.textContent = text || '';
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString();
  }

  function showProgress(determinate) {
    progressEl.classList.add('visible');
    progressEl.classList.toggle('indeterminate', !determinate);
    progressEl.setAttribute('aria-hidden', 'false');
    progressBarEl.style.width = determinate ? '0%' : '';
  }
  function setProgress(percent) {
    progressEl.classList.remove('indeterminate');
    progressBarEl.style.width = Math.max(0, Math.min(100, percent)) + '%';
  }
  function hideProgress() {
    progressEl.classList.remove('visible', 'indeterminate');
    progressEl.setAttribute('aria-hidden', 'true');
    progressBarEl.style.width = '0%';
  }

  // ===== File selection =====

  function handleFileSelection(file) {
    if (!file || !VALID_EXT.test(file.name)) {
      setStatus('Please choose an Excel file (.xlsx, .xls, or .ods).', 'error');
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus('File is ' + formatBytes(file.size) + ' — the limit is 5 MB.', 'error');
      return;
    }
    selectedFile = file;
    selectedFileEl.hidden = false;
    selectedFileEl.textContent = 'Selected: ' + file.name + ' (' + formatBytes(file.size) + ')';
    removeButton.hidden = false;
    setStatus('');
  }

  function clearSelection() {
    selectedFile = null;
    fileInput.value = '';
    selectedFileEl.hidden = true;
    selectedFileEl.textContent = '';
    removeButton.hidden = true;
    setStatus('');
  }

  dropZone.addEventListener('click', function () { fileInput.click(); });
  dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFileSelection(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function () { handleFileSelection(fileInput.files[0]); });
  removeButton.addEventListener('click', clearSelection);

  // ===== Read file -> ArrayBuffer =====

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      let lastReported = 0;
      reader.onprogress = function (e) {
        if (e.lengthComputable) {
          const pct = (e.loaded / e.total) * 50; // first half: read
          if (pct - lastReported >= 1) {
            setProgress(pct);
            lastReported = pct;
          }
        }
      };
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error || new Error('FileReader error')); };
      reader.readAsArrayBuffer(file);
    });
  }

  // ===== Drive the in-browser ETL =====

  function processCurrent() {
    if (!selectedFile) {
      setStatus('Choose a file first, or click "Try with sample workbook".', 'error');
      return;
    }
    return processFile(selectedFile);
  }

  function processFile(file) {
    // Validate the editor's rule set up front so we don't burn time on parsing
    // before realizing the JSON is broken.
    let ruleSet;
    try { ruleSet = readRuleSet(); }
    catch (err) {
      setStatus('Custom rules invalid: ' + err.message, 'error');
      return Promise.resolve();
    }

    setStatus('Reading ' + file.name + '...');
    uploadButton.disabled = true;
    sampleButton.disabled = true;
    showProgress(true);

    return readFileAsArrayBuffer(file)
      .then(function (buf) {
        setProgress(50);
        setStatus('Cleaning ' + file.name + '...');
        showProgress(false); // indeterminate during processing
        // Defer to next tick so the browser repaints the indeterminate bar
        // before xlsx.read potentially burns the main thread.
        return new Promise(function (resolve) { setTimeout(function () { resolve(buf); }, 16); });
      })
      .then(function (buf) {
        const result = window.ClinisyncETL.processWorkbook(buf, file.name, { ruleSet: ruleSet });
        setStatus(result.message || 'Cleaning complete.', 'success');
        renderResults(result, file.name);
        pushHistory({ sourceName: file.name, result: result, ts: Date.now() });
      })
      .catch(function (err) {
        console.error('ETL error:', err);
        setStatus('Could not clean this file: ' + (err && err.message ? err.message : err), 'error');
      })
      .then(function () {
        hideProgress();
        uploadButton.disabled = false;
        sampleButton.disabled = false;
      });
  }

  // ===== Results rendering =====

  function statCard(value, label) {
    return '<div class="stat"><div class="value">' + escapeHtml(value) + '</div><div class="label">' + escapeHtml(label) + '</div></div>';
  }

  function renderResults(result, sourceName) {
    const summary = result.summary || {};
    resultsTitleEl.textContent = 'Cleaning result';
    resultsSubtitleEl.textContent = sourceName
      ? 'Source: ' + sourceName + ' · processed ' + (summary.sheetsProcessed || 0) + ' sheet' + ((summary.sheetsProcessed || 0) === 1 ? '' : 's')
      : '';

    statsGridEl.innerHTML = [
      statCard(summary.sheetsProcessed     != null ? summary.sheetsProcessed     : 0, 'Sheets'),
      statCard(summary.rowsProcessed       != null ? summary.rowsProcessed       : 0, 'Rows processed'),
      statCard(summary.duplicatesRemoved   != null ? summary.duplicatesRemoved   : 0, 'Duplicates removed'),
      statCard(summary.invalidDobCount     != null ? summary.invalidDobCount     : 0, 'Invalid DOB'),
      statCard(summary.missingNhiCount     != null ? summary.missingNhiCount     : 0, 'Missing NHI'),
    ].join('');

    const sheets = Array.isArray(result.sheets) ? result.sheets : [];
    renderTabs(sheets, result.manifest);

    resultsEl.classList.add('visible');
  }

  function renderTabs(sheets, manifest) {
    tabsEl.innerHTML = '';
    panelsEl.innerHTML = '';

    sheets.forEach(function (sheet, idx) {
      const tabId = 'tab-sheet-' + idx;
      const panelId = 'panel-sheet-' + idx;

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'tab';
      tab.id = tabId;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
      tab.setAttribute('aria-controls', panelId);
      tab.innerHTML = escapeHtml(sheet.sheetName) +
        '<span class="badge">' + (sheet.rowsProcessed | 0) + '</span>';
      tab.addEventListener('click', function () { activateTab(idx); });
      tabsEl.appendChild(tab);

      const panel = document.createElement('div');
      panel.className = 'tab-panel' + (idx === 0 ? ' active' : '');
      panel.id = panelId;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabId);
      panel.innerHTML = sheetPanelHtml(sheet);

      const previewHost = panel.querySelector('.preview-host');
      const previewMeta = panel.querySelector('.preview-meta');
      const out = renderPreviewTable(sheet.rows);
      previewHost.innerHTML = out.html;
      previewMeta.textContent = out.meta;

      const downloadBtn = panel.querySelector('[data-action="download-csv"]');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', function () {
          downloadAsBlob(sheet.csv, 'text/csv;charset=utf-8', sheet.fileName);
        });
      }

      panelsEl.appendChild(panel);
    });

    if (manifest && manifest.json) {
      const tabId = 'tab-manifest';
      const panelId = 'panel-manifest';

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'tab';
      tab.id = tabId;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', 'false');
      tab.setAttribute('aria-controls', panelId);
      tab.textContent = 'Manifest';
      tab.addEventListener('click', function () { activateTabById(tabId); });
      tabsEl.appendChild(tab);

      const panel = document.createElement('div');
      panel.className = 'tab-panel';
      panel.id = panelId;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabId);
      panel.innerHTML = (
        '<div class="panel-header">' +
          '<span class="grow"><strong>Manifest</strong> · ' + escapeHtml(manifest.name) + '</span>' +
          '<button class="btn-secondary" data-action="download-manifest" type="button">Download manifest</button>' +
        '</div>' +
        '<pre class="json-preview"></pre>'
      );

      panel.querySelector('.json-preview').textContent = JSON.stringify(manifest.json, null, 2);
      panel.querySelector('[data-action="download-manifest"]').addEventListener('click', function () {
        downloadAsBlob(JSON.stringify(manifest.json, null, 2), 'application/json;charset=utf-8', manifest.name);
      });

      panelsEl.appendChild(panel);
    }
  }

  function sheetPanelHtml(sheet) {
    const stats = [
      sheet.rowsProcessed + ' rows',
      sheet.duplicatesRemoved ? sheet.duplicatesRemoved + ' duplicate' + (sheet.duplicatesRemoved === 1 ? '' : 's') + ' removed' : null,
      sheet.invalidDobCount  ? sheet.invalidDobCount  + ' invalid DOB' : null,
      sheet.missingNhiCount  ? sheet.missingNhiCount  + ' missing NHI' : null,
    ].filter(Boolean).join(' · ');

    return (
      '<div class="panel-header">' +
        '<span class="grow"><strong>' + escapeHtml(sheet.sheetName) + '</strong> · ' + escapeHtml(stats) + '</span>' +
        '<button class="btn-secondary" data-action="download-csv" type="button">Download CSV</button>' +
      '</div>' +
      '<div class="preview-host"></div>' +
      '<div class="preview-meta"></div>'
    );
  }

  function renderPreviewTable(rows) {
    if (!rows || rows.length === 0) {
      return { html: '<div class="preview-empty">Empty CSV.</div>', meta: '' };
    }
    const header = rows[0];
    const body = rows.slice(1, 1 + PREVIEW_ROW_LIMIT);
    const totalDataRows = Math.max(0, rows.length - 1);

    let html = '<div class="table-wrap"><table class="preview"><thead><tr>';
    header.forEach(function (h) { html += '<th>' + escapeHtml(h) + '</th>'; });
    html += '</tr></thead><tbody>';
    body.forEach(function (r) {
      html += '<tr>';
      for (let c = 0; c < header.length; c++) {
        html += '<td>' + escapeHtml(r[c] != null ? r[c] : '') + '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    const showing = body.length;
    const meta = totalDataRows > showing
      ? 'Showing first ' + showing + ' of ' + totalDataRows + ' data rows. Download the CSV for the full file.'
      : 'Showing all ' + showing + ' data rows.';
    return { html: html, meta: meta };
  }

  function activateTab(index) {
    const tabs = tabsEl.querySelectorAll('.tab');
    const panels = panelsEl.querySelectorAll('.tab-panel');
    tabs.forEach(function (t, i) { t.setAttribute('aria-selected', i === index ? 'true' : 'false'); });
    panels.forEach(function (p, i) { p.classList.toggle('active', i === index); });
  }

  function activateTabById(id) {
    const tabs = tabsEl.querySelectorAll('.tab');
    const panels = panelsEl.querySelectorAll('.tab-panel');
    tabs.forEach(function (t) {
      const selected = t.id === id;
      t.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    panels.forEach(function (p) {
      const labelTab = p.getAttribute('aria-labelledby');
      p.classList.toggle('active', labelTab === id);
    });
  }

  // ===== Download as Blob =====

  function downloadAsBlob(text, mime, filename) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ===== Sample loader =====

  function loadSampleAndProcess() {
    setStatus('Loading sample workbook...');
    sampleButton.disabled = true;
    uploadButton.disabled = true;
    showProgress(false);

    fetch(SAMPLE_URL)
      .then(function (resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.blob();
      })
      .then(function (blob) {
        const file = new File([blob], SAMPLE_FILENAME, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        handleFileSelection(file);
        return processFile(file);
      })
      .catch(function (err) {
        hideProgress();
        setStatus('Could not load the sample workbook: ' + err.message, 'error');
        sampleButton.disabled = false;
        uploadButton.disabled = false;
      });
  }

  // ===== Session history =====

  function pushHistory(entry) {
    entry.id = nextRunId++;
    history.unshift(entry);
    while (history.length > HISTORY_LIMIT) history.pop();
    renderHistory();
  }

  function renderHistory() {
    if (history.length === 0) {
      historyCardEl.hidden = true;
      historyListEl.innerHTML = '';
      return;
    }
    historyCardEl.hidden = false;
    historyListEl.innerHTML = history.map(function (h) {
      const summary = h.result && h.result.summary ? h.result.summary : {};
      const sheets = summary.sheetsProcessed || 0;
      const rows = summary.rowsProcessed || 0;
      return (
        '<div class="history-row" data-run-id="' + h.id + '">' +
          '<span class="name">' + escapeHtml(h.sourceName) + '</span>' +
          '<span class="meta">' + sheets + ' sheet' + (sheets === 1 ? '' : 's') + ' · ' + rows + ' rows · ' + escapeHtml(formatTime(h.ts)) + '</span>' +
          '<button class="btn-ghost" type="button" data-action="restore">View results</button>' +
        '</div>'
      );
    }).join('');

    historyListEl.querySelectorAll('[data-action="restore"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const row = btn.closest('[data-run-id]');
        const id = Number(row.getAttribute('data-run-id'));
        const entry = history.find(function (h) { return h.id === id; });
        if (!entry) return;
        renderResults(entry.result, entry.sourceName);
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ===== Rules editor =====

  function defaultRulesText() {
    return JSON.stringify(window.ClinisyncETL.DEFAULT_RULE_SET, null, 2);
  }

  function setRulesStatus(msg, kind) {
    if (!rulesStatusEl) return;
    rulesStatusEl.textContent = msg || '';
    rulesStatusEl.className = 'rules-status' + (kind ? ' ' + kind : '');
  }

  function setRulesPill(custom) {
    if (!rulesPillEl) return;
    rulesPillEl.textContent = custom ? 'custom' : 'defaults';
    rulesPillEl.classList.toggle('custom', !!custom);
  }

  /**
   * Read the rule set from the editor. Returns:
   *   - undefined when the editor matches the defaults (let the engine use its own)
   *   - a validated rule-set object when the user has a custom one
   * Throws if the textarea has invalid JSON or fails schema validation.
   */
  function readRuleSet() {
    if (!rulesEditorEl) return activeRuleSet || undefined;
    const text = rulesEditorEl.value.trim();
    if (text === '' || text === defaultRulesText().trim()) {
      activeRuleSet = null;
      setRulesPill(false);
      return undefined;
    }
    let parsed;
    try { parsed = JSON.parse(text); }
    catch (err) { throw new Error('JSON: ' + err.message); }
    window.ClinisyncETL.validateRuleSet(parsed);
    activeRuleSet = parsed;
    setRulesPill(true);
    return parsed;
  }

  function initRulesEditor() {
    if (!rulesEditorEl) return;
    if (rulesEditorEl.value.trim() === '') {
      rulesEditorEl.value = defaultRulesText();
    }
    setRulesPill(false);

    rulesEditorEl.addEventListener('input', function () {
      // Clear any prior status when the user starts editing again.
      setRulesStatus('');
    });

    if (rulesValidateBtn) {
      rulesValidateBtn.addEventListener('click', function () {
        try {
          const rs = readRuleSet();
          const count = rs ? rs.rules.length : window.ClinisyncETL.DEFAULT_RULE_SET.rules.length;
          setRulesStatus('Valid · ' + count + ' rule' + (count === 1 ? '' : 's') + (rs ? ' (custom)' : ' (defaults)'), 'success');
        } catch (err) {
          setRulesStatus(err.message, 'error');
        }
      });
    }

    if (rulesResetBtn) {
      rulesResetBtn.addEventListener('click', function () {
        rulesEditorEl.value = defaultRulesText();
        activeRuleSet = null;
        setRulesPill(false);
        setRulesStatus('Reset to defaults.', 'success');
      });
    }
  }

  initRulesEditor();

  // ===== Wire =====

  uploadButton.addEventListener('click', processCurrent);
  sampleButton.addEventListener('click', loadSampleAndProcess);

  if (typeof window !== 'undefined') {
    window.__clinisyncTool = {
      get selectedFile() { return selectedFile; },
      get history() { return history.slice(); },
      handleFileSelection: handleFileSelection,
    };
  }
})();
