/**
 * Version: 2.6.0
 * Description: Clinisync frontend logic. Handles upload (with progress), parses each
 *              cleaned CSV into an inline preview table, fetches the manifest as JSON,
 *              tabs sheets, downloads via auth-gated /downloads, and keeps a small
 *              in-memory session history of recent uploads.
 * Author: Ali Kahwaji
 */

(function () {
  // ----- DOM handles -----
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadButton = document.getElementById('uploadBtn');
  const sampleButton = document.getElementById('sampleBtn');
  const removeButton = document.getElementById('removeBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');
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

  // ----- Constants -----
  const MAX_BYTES = 5 * 1024 * 1024;
  const VALID_EXT = /\.(xlsx|xls|ods)$/i;
  const SAMPLE_URL = '/samples/case-mix-sample.xlsx';
  const SAMPLE_FILENAME = 'case-mix-sample.xlsx';
  const PREVIEW_ROW_LIMIT = 50;
  const HISTORY_LIMIT = 5;

  // ----- State -----
  let selectedFile = null;
  let activePayload = null;             // last successful upload response
  let activeSourceName = null;          // original filename of last upload
  const history = [];                   // [{ id, sourceName, payload, ts }]
  const previewCache = new Map();       // filename -> parsed CSV rows
  const manifestCache = new Map();      // filename -> parsed manifest JSON
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

  function authHeaders() {
    const key = apiKeyInput && apiKeyInput.value.trim();
    return key ? { Authorization: 'Bearer ' + key } : {};
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
    const d = new Date(ts);
    return d.toLocaleTimeString();
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

  // ===== Upload (XHR for progress) =====

  function uploadCurrent() {
    if (!selectedFile) {
      setStatus('Choose a file first, or click "Try with sample workbook".', 'error');
      return;
    }
    return doUpload(selectedFile);
  }

  function doUpload(file) {
    return new Promise(function (resolve) {
      setStatus('Uploading ' + file.name + '...');
      uploadButton.disabled = true;
      sampleButton.disabled = true;
      showProgress(true);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/upload');

      const headers = authHeaders();
      Object.keys(headers).forEach(function (k) { xhr.setRequestHeader(k, headers[k]); });

      if (xhr.upload) {
        xhr.upload.addEventListener('progress', function (e) {
          if (e.lengthComputable) setProgress((e.loaded / e.total) * 100);
        });
        xhr.upload.addEventListener('load', function () {
          // Switch to indeterminate while server processes
          showProgress(false);
          setStatus('Processing on the server...');
        });
      }

      xhr.addEventListener('load', function () {
        finishUpload(xhr, file);
        resolve();
      });
      xhr.addEventListener('error', function () {
        hideProgress();
        setStatus('Network error while uploading.', 'error');
        uploadButton.disabled = false;
        sampleButton.disabled = false;
        resolve();
      });
      xhr.addEventListener('abort', function () {
        hideProgress();
        setStatus('Upload cancelled.', 'error');
        uploadButton.disabled = false;
        sampleButton.disabled = false;
        resolve();
      });

      const form = new FormData();
      form.append('excel', file);
      xhr.send(form);
    });
  }

  function finishUpload(xhr, file) {
    hideProgress();
    uploadButton.disabled = false;
    sampleButton.disabled = false;

    const ct = xhr.getResponseHeader('content-type') || '';
    const isJson = ct.indexOf('application/json') !== -1;
    let payload = xhr.responseText;
    if (isJson) {
      try { payload = JSON.parse(xhr.responseText); } catch (e) { payload = {}; }
    }

    if (xhr.status >= 200 && xhr.status < 300 && isJson) {
      setStatus(payload.message || 'Upload completed.', 'success');
      const sourceName = file.name;
      activePayload = payload;
      activeSourceName = sourceName;
      previewCache.clear();
      manifestCache.clear();
      renderResults(payload, sourceName);
      pushHistory({ sourceName: sourceName, payload: payload, ts: Date.now() });
    } else {
      const message = isJson
        ? (payload && payload.error) || ('Upload failed (HTTP ' + xhr.status + ').')
        : (payload || ('HTTP ' + xhr.status));
      setStatus(message, 'error');
    }
  }

  // ===== Results rendering =====

  function statCard(value, label) {
    return '<div class="stat"><div class="value">' + escapeHtml(value) + '</div><div class="label">' + escapeHtml(label) + '</div></div>';
  }

  function renderResults(payload, sourceName) {
    resultsTitleEl.textContent = 'Cleaning result';
    resultsSubtitleEl.textContent = sourceName
      ? 'Source: ' + sourceName + ' · processed ' + (payload.sheetsProcessed || 0) + ' sheet' + ((payload.sheetsProcessed || 0) === 1 ? '' : 's')
      : '';

    statsGridEl.innerHTML = [
      statCard(payload.sheetsProcessed != null ? payload.sheetsProcessed : 0, 'Sheets'),
      statCard(payload.rowsProcessed     != null ? payload.rowsProcessed     : 0, 'Rows processed'),
      statCard(payload.duplicatesRemoved != null ? payload.duplicatesRemoved : 0, 'Duplicates removed'),
      statCard(payload.invalidDobCount   != null ? payload.invalidDobCount   : 0, 'Invalid DOB'),
      statCard(payload.missingNhiCount   != null ? payload.missingNhiCount   : 0, 'Missing NHI'),
    ].join('');

    const sheets = Array.isArray(payload.sheets) ? payload.sheets : [];
    renderTabs(sheets, payload.manifest);

    resultsEl.classList.add('visible');
  }

  function renderTabs(sheets, manifestName) {
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
      panelsEl.appendChild(panel);

      const previewBtn = panel.querySelector('[data-action="preview-csv"]');
      const downloadBtn = panel.querySelector('[data-action="download-csv"]');
      if (previewBtn) previewBtn.addEventListener('click', function () { loadCsvPreview(panel, sheet.fileName); });
      if (downloadBtn) downloadBtn.addEventListener('click', function () { downloadFile(sheet.fileName, downloadBtn); });

      // Auto-load preview for the first sheet so the user sees the cleaned table immediately.
      if (idx === 0 && previewBtn) loadCsvPreview(panel, sheet.fileName);
    });

    if (manifestName) {
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
      tab.addEventListener('click', function () {
        activateTabById(tabId);
        loadManifestPreview(document.getElementById(panelId), manifestName);
      });
      tabsEl.appendChild(tab);

      const panel = document.createElement('div');
      panel.className = 'tab-panel';
      panel.id = panelId;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabId);
      panel.innerHTML = manifestPanelHtml(manifestName);
      panelsEl.appendChild(panel);

      const downloadBtn = panel.querySelector('[data-action="download-manifest"]');
      if (downloadBtn) downloadBtn.addEventListener('click', function () { downloadFile(manifestName, downloadBtn); });
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
        '<button class="btn-ghost" data-action="preview-csv" type="button">Reload preview</button>' +
        '<button class="btn-secondary" data-action="download-csv" type="button">Download CSV</button>' +
      '</div>' +
      '<div class="preview-host"><div class="preview-empty">Loading preview…</div></div>' +
      '<div class="preview-meta"></div>'
    );
  }

  function manifestPanelHtml(manifestName) {
    return (
      '<div class="panel-header">' +
        '<span class="grow"><strong>Manifest</strong> · ' + escapeHtml(manifestName) + '</span>' +
        '<button class="btn-secondary" data-action="download-manifest" type="button">Download manifest</button>' +
      '</div>' +
      '<pre class="json-preview" data-role="json-host">Loading…</pre>'
    );
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
      const panelId = t.getAttribute('aria-controls');
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.toggle('active', selected);
    });
    // Ensure non-tab panels are deactivated too
    panels.forEach(function (p) {
      const labelTab = p.getAttribute('aria-labelledby');
      if (labelTab !== id) p.classList.remove('active');
    });
  }

  // ===== CSV preview =====

  // Minimal RFC-4180 parser sufficient for the CSVs xlsx.utils.sheet_to_csv produces.
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { cell += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
        else if (ch === '\r') { /* drop */ }
        else { cell += ch; }
      }
    }
    if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
    return rows;
  }

  function renderPreviewTable(rows) {
    if (!rows || rows.length === 0) {
      return '<div class="preview-empty">Empty CSV.</div>';
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

  function loadCsvPreview(panel, filename) {
    const host = panel.querySelector('.preview-host');
    const meta = panel.querySelector('.preview-meta');
    if (!host) return;

    if (previewCache.has(filename)) {
      const out = renderPreviewTable(previewCache.get(filename));
      host.innerHTML = out.html;
      meta.textContent = out.meta;
      return;
    }

    host.innerHTML = '<div class="preview-empty">Loading preview…</div>';
    meta.textContent = '';

    fetch('/downloads/' + encodeURIComponent(filename), { headers: authHeaders() })
      .then(function (resp) {
        if (!resp.ok) {
          return resp.text().then(function (t) {
            throw new Error('HTTP ' + resp.status + (t ? ': ' + t : ''));
          });
        }
        return resp.text();
      })
      .then(function (text) {
        const rows = parseCsv(text);
        previewCache.set(filename, rows);
        const out = renderPreviewTable(rows);
        host.innerHTML = out.html;
        meta.textContent = out.meta;
      })
      .catch(function (err) {
        host.innerHTML = '<div class="preview-empty">Could not load preview: ' + escapeHtml(err.message) + '</div>';
        meta.textContent = '';
      });
  }

  // ===== Manifest preview =====

  function loadManifestPreview(panel, filename) {
    if (!panel) return;
    const host = panel.querySelector('[data-role="json-host"]');
    if (!host) return;

    if (manifestCache.has(filename)) {
      host.textContent = JSON.stringify(manifestCache.get(filename), null, 2);
      return;
    }

    host.textContent = 'Loading…';
    fetch('/downloads/' + encodeURIComponent(filename), { headers: authHeaders() })
      .then(function (resp) {
        if (!resp.ok) {
          return resp.text().then(function (t) {
            throw new Error('HTTP ' + resp.status + (t ? ': ' + t : ''));
          });
        }
        return resp.json();
      })
      .then(function (json) {
        manifestCache.set(filename, json);
        host.textContent = JSON.stringify(json, null, 2);
      })
      .catch(function (err) {
        host.textContent = 'Could not load manifest: ' + err.message;
      });
  }

  // ===== Download (auth-aware) =====

  function downloadFile(filename, triggerEl) {
    if (!filename) return;
    const original = triggerEl ? triggerEl.textContent : null;
    if (triggerEl) {
      triggerEl.disabled = true;
      triggerEl.textContent = 'Downloading...';
    }
    fetch('/downloads/' + encodeURIComponent(filename), { headers: authHeaders() })
      .then(function (resp) {
        if (!resp.ok) {
          const ct = resp.headers.get('content-type') || '';
          if (ct.indexOf('application/json') !== -1) {
            return resp.json().then(function (b) { throw new Error(b.error || 'HTTP ' + resp.status); });
          }
          return resp.text().then(function (t) { throw new Error(t || ('HTTP ' + resp.status)); });
        }
        return resp.blob();
      })
      .then(function (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(function (err) {
        setStatus('Download failed: ' + err.message, 'error');
      })
      .then(function () {
        if (triggerEl) {
          triggerEl.disabled = false;
          triggerEl.textContent = original;
        }
      });
  }

  // ===== Sample loader =====

  function loadSampleAndUpload() {
    setStatus('Loading sample workbook...');
    sampleButton.disabled = true;
    uploadButton.disabled = true;

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
        return doUpload(file);
      })
      .catch(function (err) {
        setStatus('Could not load the sample workbook: ' + err.message, 'error');
      })
      .then(function () {
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
      const sheets = h.payload && h.payload.sheetsProcessed ? h.payload.sheetsProcessed : 0;
      const rows = h.payload && h.payload.rowsProcessed ? h.payload.rowsProcessed : 0;
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
        activePayload = entry.payload;
        activeSourceName = entry.sourceName;
        previewCache.clear();
        manifestCache.clear();
        renderResults(entry.payload, entry.sourceName);
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ===== Wire =====

  uploadButton.addEventListener('click', uploadCurrent);
  sampleButton.addEventListener('click', loadSampleAndUpload);

  // Expose a tiny test API for DOM tests.
  if (typeof window !== 'undefined') {
    window.__clinisync = {
      get selectedFile() { return selectedFile; },
      get history() { return history.slice(); },
      handleFileSelection: handleFileSelection,
      parseCsv: parseCsv,
    };
  }
})();
